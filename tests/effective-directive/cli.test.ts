import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, it, expect, vi } from 'vitest';
import {
  EXIT_CODES,
  USAGE,
  buildResolutionPlan,
  formatPlanText,
  loadIdentityMap,
  parseCliArgs,
  runCli,
  type CliIo,
} from '../../src/effective-directive/cli.js';
import type { ResolutionPlan } from '../../src/effective-directive/arbitration.js';
import { createGitRunner } from '../../src/effective-directive/git.js';
import { createTempRepo, FIXTURE_AUTHOR, type Author, type TempRepo } from './git-fixture.js';

const ALICE: Author = { name: 'Alice', email: 'alice@example.com' };
const BOB_NOREPLY: Author = { name: 'Bob', email: '4242+bob@users.noreply.github.com' };
const CAROL: Author = { name: 'Carol', email: 'carol@corp.example' };
const AGENT_A: Author = { name: 'Agent A', email: 'agent-a@bots.example' };
const AGENT_B: Author = { name: 'Agent B', email: 'agent-b@bots.example' };

function captureIo(cwd: string): CliIo & { out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return { cwd, out, err, stdout: (t) => out.push(t), stderr: (t) => err.push(t) };
}

describe('exit codes', () => {
  it('match the documented values', () => {
    expect(EXIT_CODES).toEqual({
      PERMITTED: 0,
      PERMITTED_WITH_OVERRIDE: 0,
      AMBIGUOUS: 2,
      BLOCKED_CONFLICT: 3,
      ERROR: 1,
    });
    expect(USAGE).toContain(
      '0  PERMITTED or PERMITTED_WITH_OVERRIDE\n  2  AMBIGUOUS\n  3  BLOCKED_CONFLICT\n  1  Usage error or Git error',
    );
  });
});

describe('parseCliArgs', () => {
  const cwd = path.resolve('/work/repo');

  it('returns help for no command, help, --help, -h, and resolve --help', () => {
    for (const argv of [
      [],
      ['help'],
      ['--help'],
      ['-h'],
      ['resolve', '--help'],
      ['resolve', '-h'],
    ]) {
      expect(parseCliArgs(argv, cwd)).toEqual({ kind: 'help' });
    }
  });

  it('rejects unknown commands, unknown options, and wrong endpoint counts', () => {
    expect(parseCliArgs(['merge'], cwd)).toEqual({
      kind: 'error',
      message: 'Unknown command "merge".',
    });
    expect(parseCliArgs(['resolve', 'a', 'b', '--force'], cwd).kind).toBe('error');
    expect(parseCliArgs(['resolve', 'a', 'b', '--repo'], cwd).kind).toBe('error');
    for (const argv of [['resolve'], ['resolve', 'a'], ['resolve', 'a', 'b', 'c']]) {
      expect(parseCliArgs(argv, cwd)).toEqual({
        kind: 'error',
        message: 'Give exactly two endpoints: <left> <right>.',
      });
    }
  });

  it('resolves option paths against the working directory', () => {
    expect(parseCliArgs(['resolve', 'agent-a', '../wt-b'], cwd)).toEqual({
      kind: 'resolve',
      options: {
        repo: cwd,
        left: 'agent-a',
        right: '../wt-b',
        cwd,
        identitiesPath: undefined,
        allowUnsigned: false,
        json: false,
      },
    });

    const parsed = parseCliArgs(
      [
        'resolve',
        'a',
        'b',
        '--repo',
        '../other',
        '--identities',
        'ids.json',
        '--allow-unsigned',
        '--json',
      ],
      cwd,
    );
    expect(parsed).toMatchObject({
      kind: 'resolve',
      options: {
        repo: path.resolve(cwd, '../other'),
        identitiesPath: path.resolve(cwd, 'ids.json'),
        allowUnsigned: true,
        json: true,
      },
    });
  });
});

describe('bridge resolve against real worktrees', () => {
  let repo: TempRepo;
  let identitiesPath: string;

  beforeAll(() => {
    repo = createTempRepo();
    repo.write(
      '.github/CODEOWNERS',
      [
        '# Authority source for bridge resolve tests',
        '/src/auth/   alice@example.com',
        '/src/ui/     @bob',
        '/src/core/   @org/core',
      ].join('\n'),
    );
    repo.write('src/auth/token.ts', 'export const ttl = 60;\n');
    repo.write('src/ui/view.ts', 'export const theme = "light";\n');
    repo.write('src/core/engine.ts', 'export const workers = 1;\n');
    repo.write('src/shared/util.ts', 'export const x = 1;\n');
    repo.write('README.md', '# Project\n');
    repo.commit('base', FIXTURE_AUTHOR);

    repo.git(['worktree', 'add', '-q', '-b', 'agent-a', '../wt-a', 'main']);
    repo.git(['worktree', 'add', '-q', '-b', 'agent-b', '../wt-b', 'main']);
    const wtA = path.join(repo.root, 'wt-a');
    const wtB = path.join(repo.root, 'wt-b');

    repo.write('src/auth/token.ts', 'export const ttl = 120;\n', wtA);
    repo.commit('owner changes token ttl', ALICE, wtA);
    repo.write('src/ui/view.ts', 'export const theme = "dark";\n', wtA);
    repo.write('src/shared/util.ts', 'export const x = 2;\n', wtA);
    repo.write('README.md', '# Project A\n', wtA);
    repo.write('a-only.ts', 'export {};\n', wtA);
    repo.commit('agent a changes', AGENT_A, wtA);

    repo.write('src/auth/token.ts', 'export const ttl = 30;\n', wtB);
    repo.write('src/shared/util.ts', 'export const x = 2;\n', wtB);
    repo.write('README.md', '# Project B\n', wtB);
    repo.commit('agent b changes', AGENT_B, wtB);
    repo.write('src/ui/view.ts', 'export const theme = "system";\n', wtB);
    repo.commit('owner changes theme', BOB_NOREPLY, wtB);

    // Branches for single-outcome cases.
    repo.git(['branch', 'override-a', 'main']);
    repo.git(['branch', 'override-b', 'main']);
    repo.git(['checkout', '-q', 'override-a']);
    repo.write('src/auth/token.ts', 'export const ttl = 90;\n');
    repo.commit('owner edit', ALICE);
    repo.git(['checkout', '-q', 'override-b']);
    repo.write('src/auth/token.ts', 'export const ttl = 10;\n');
    repo.commit('agent edit', AGENT_B);

    repo.git(['checkout', '-q', '-b', 'team-a', 'main']);
    repo.write('src/core/engine.ts', 'export const workers = 4;\n');
    repo.commit('team member edit', CAROL);
    repo.git(['checkout', '-q', '-b', 'team-b', 'main']);
    repo.write('src/core/engine.ts', 'export const workers = 8;\n');
    repo.commit('agent edit', AGENT_A);

    repo.git(['checkout', '-q', '-b', 'rewrite-owners', 'main']);
    repo.write('.github/CODEOWNERS', '* agent-b@bots.example\n');
    repo.commit('agent claims ownership', AGENT_B);

    repo.git(['checkout', '-q', '--orphan', 'orphan']);
    repo.git(['rm', '-rf', '-q', '.']);
    repo.write('x.txt', 'x\n');
    repo.commit('orphan root', FIXTURE_AUTHOR);
    repo.git(['checkout', '-q', 'main']);

    identitiesPath = path.join(repo.root, 'identities.json');
    writeFileSync(identitiesPath, JSON.stringify({ '@org/core': ['carol@corp.example'] }));
  });

  afterAll(() => repo.cleanup());

  it('blocks owned-file conflicts when owner commits are unsigned (default policy)', async () => {
    const io = captureIo(repo.dir);
    const code = await runCli(['resolve', '../wt-a', '../wt-b'], io);

    expect(code).toBe(EXIT_CODES.BLOCKED_CONFLICT);
    const text = io.out.join('');
    expect(text).toContain('bridge resolve: BLOCKED_CONFLICT');
    expect(text).toContain('Authority source: .github/CODEOWNERS at merge base');
    expect(text).toContain('Policy: owner signature required for owner standing');
    expect(text).toContain('src/auth/token.ts');
    expect(text).toContain('UNVERIFIED_OWNER  alice@example.com  sig N');
    expect(text).toContain('Files changed on one side only: left 1, right 0.');
    expect(text).toContain('It is not a claim of objective truth.');
  });

  it('arbitrates per file when unsigned owner commits are accepted', async () => {
    const io = captureIo(repo.root);
    const code = await runCli(
      ['resolve', 'wt-a', 'wt-b', '--repo', 'repo', '--allow-unsigned', '--json'],
      io,
    );

    expect(code).toBe(EXIT_CODES.AMBIGUOUS);
    const plan = JSON.parse(io.out.join('')) as ResolutionPlan;
    expect(plan.left.label).toBe('agent-a');
    expect(plan.right.label).toBe('agent-b');
    expect(plan.diverged).toBe(true);
    expect(plan.isObjectiveTruthClaim).toBe(false);
    expect(
      Object.fromEntries(plan.files.map((f) => [f.path, [f.status, f.reason, f.governingSide]])),
    ).toEqual({
      'README.md': ['AMBIGUOUS', 'NO_OWNER', undefined],
      'src/auth/token.ts': ['PERMITTED_WITH_OVERRIDE', 'SINGLE_SIDE_STANDING', 'left'],
      'src/shared/util.ts': ['PERMITTED', 'IDENTICAL_CHANGE', undefined],
      'src/ui/view.ts': ['PERMITTED_WITH_OVERRIDE', 'SINGLE_SIDE_STANDING', 'right'],
    });
  });

  it('exits 0 with PERMITTED_WITH_OVERRIDE for a single owned conflict', async () => {
    const io = captureIo(repo.dir);
    const code = await runCli(
      ['resolve', 'override-a', 'override-b', '--allow-unsigned'],
      io,
      createGitRunner(),
    );
    expect(code).toBe(0);
    expect(io.out.join('')).toContain(
      'Action: Keep the override-a version. Discard the override-b change to this file.',
    );
  });

  it('uses the identity map to resolve team owners', async () => {
    const without = captureIo(repo.dir);
    expect(await runCli(['resolve', 'team-a', 'team-b', '--allow-unsigned'], without)).toBe(
      EXIT_CODES.BLOCKED_CONFLICT,
    );

    const withMap = captureIo(repo.dir);
    const code = await runCli(
      ['resolve', 'team-a', 'team-b', '--allow-unsigned', '--identities', identitiesPath],
      withMap,
    );
    expect(code).toBe(0);
    expect(withMap.out.join('')).toContain('Owners: @org/core (rule "/src/core/", line 4)');
  });

  it('blocks a branch that rewrites CODEOWNERS', async () => {
    const io = captureIo(repo.dir);
    expect(await runCli(['resolve', 'rewrite-owners', 'override-b', '--allow-unsigned'], io)).toBe(
      EXIT_CODES.BLOCKED_CONFLICT,
    );
    const text = io.out.join('');
    expect(text).toContain('.github/CODEOWNERS');
    expect(text).toContain('AUTHORITY_SOURCE_MODIFIED');
    expect(text).toContain('(no commit on this side changed the file)');
  });

  it('reports no conflict when one side contains the other', async () => {
    const io = captureIo(repo.dir);
    expect(await runCli(['resolve', 'main', 'agent-a'], io)).toBe(0);
    const text = io.out.join('');
    expect(text).toContain('bridge resolve: PERMITTED');
    expect(text).toContain('(no divergence: one side contains the other)');
    expect(text).toContain('No file is changed on both sides.');
  });

  it('builds a plan with the default Git runner', async () => {
    const plan = await buildResolutionPlan({
      repo: repo.dir,
      cwd: repo.dir,
      left: 'override-a',
      right: 'override-b',
      allowUnsigned: false,
      json: false,
    });
    expect(plan.status).toBe('BLOCKED_CONFLICT');
  });

  it('reports errors with exit code 1', async () => {
    const cases: Array<[string[], string]> = [
      [['resolve', 'main', 'orphan'], 'have no common ancestor'],
      [['resolve', 'main', 'no-such-branch'], 'bridge resolve: error:'],
      [['resolve', 'main', 'agent-a', '--identities', 'missing.json'], 'Cannot read identity map'],
      [['frobnicate'], 'Unknown command "frobnicate".'],
    ];
    for (const [argv, message] of cases) {
      const io = captureIo(repo.dir);
      expect(await runCli(argv, io)).toBe(EXIT_CODES.ERROR);
      expect(io.err.join('')).toContain(message);
    }
  });

  it('rejects a worktree from a different repository', async () => {
    const other = createTempRepo('bridge-other-');
    try {
      other.write('f.txt', 'f\n');
      other.commit('other root', FIXTURE_AUTHOR);
      const io = captureIo(repo.dir);
      expect(await runCli(['resolve', 'main', other.dir], io)).toBe(EXIT_CODES.ERROR);
      expect(io.err.join('')).toContain('Both worktrees must share one repository.');
    } finally {
      other.cleanup();
    }
  });

  it('gives the same plan from a subdirectory, even with diff.relative set', async () => {
    repo.git(['config', 'diff.relative', 'true']);
    try {
      const io = captureIo(repo.dir);
      const code = await runCli(
        ['resolve', 'override-a', 'override-b', '--allow-unsigned', '--repo', 'src/auth', '--json'],
        io,
      );
      expect(code).toBe(0);
      const plan = JSON.parse(io.out.join('')) as ResolutionPlan;
      expect(plan.files.map((f) => [f.path, f.status])).toEqual([
        ['src/auth/token.ts', 'PERMITTED_WITH_OVERRIDE'],
      ]);
    } finally {
      repo.git(['config', '--unset', 'diff.relative']);
    }
  });

  it('prints usage for help', async () => {
    const io = captureIo(repo.dir);
    expect(await runCli(['resolve', '--help'], io)).toBe(0);
    expect(io.out.join('')).toBe(USAGE);
  });
});

function hasSshKeygen(): boolean {
  try {
    execFileSync('ssh-keygen', ['-?'], { stdio: 'ignore' });
    return true;
  } catch (error) {
    // ssh-keygen prints usage and exits non-zero for -?; only a missing binary is fatal.
    return (error as NodeJS.ErrnoException).code !== 'ENOENT';
  }
}

describe.skipIf(!hasSshKeygen())('bridge resolve with SSH-signed commits', () => {
  it('gives verified owner standing to a signed owner commit under the default policy', async () => {
    const repo = createTempRepo('bridge-ssh-');
    try {
      const key = path.join(repo.root, 'alice_ed25519');
      execFileSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-C', 'alice', '-f', key]);
      const publicKey = readFileSync(`${key}.pub`, 'utf-8').trim();
      const allowedSigners = path.join(repo.root, 'allowed_signers');
      writeFileSync(allowedSigners, `alice@example.com namespaces="git" ${publicKey}\n`);
      repo.git(['config', 'gpg.format', 'ssh']);
      repo.git(['config', 'gpg.ssh.allowedSignersFile', allowedSigners]);

      repo.write('.github/CODEOWNERS', '/src/ alice@example.com\n');
      repo.write('src/app.ts', 'v1\n');
      repo.commit('base', FIXTURE_AUTHOR);

      repo.git(['checkout', '-q', '-b', 'owner']);
      repo.write('src/app.ts', 'owner\n');
      repo.git(['add', '-A']);
      repo.git([
        '-c',
        'user.name=Alice',
        '-c',
        'user.email=alice@example.com',
        '-c',
        `user.signingkey=${key}`,
        'commit',
        '-q',
        '-S',
        '-m',
        'signed owner edit',
      ]);

      // An agent with its own trusted key, and a key that no allowed-signers entry lists.
      const agentKey = path.join(repo.root, 'agent_ed25519');
      const rogueKey = path.join(repo.root, 'rogue_ed25519');
      for (const k of [agentKey, rogueKey]) {
        execFileSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-C', 'k', '-f', k]);
      }
      writeFileSync(
        allowedSigners,
        [
          `alice@example.com namespaces="git" ${publicKey}`,
          `agent-a@bots.example namespaces="git" ${readFileSync(`${agentKey}.pub`, 'utf-8').trim()}`,
          '',
        ].join('\n'),
      );
      const spoofAs = (branch: string, signingKey: string) => {
        repo.git(['checkout', '-q', '-b', branch, 'main']);
        repo.write('src/app.ts', `${branch}\n`);
        repo.git(['add', '-A']);
        repo.git([
          '-c',
          `user.signingkey=${signingKey}`,
          'commit',
          '-q',
          '-S',
          '--author=Alice <alice@example.com>',
          '-m',
          'claims to be alice',
        ]);
      };
      spoofAs('spoofed', agentKey);
      spoofAs('rogue', rogueKey);

      repo.git(['checkout', '-q', '-b', 'agent', 'main']);
      repo.write('src/app.ts', 'agent\n');
      repo.commit('agent edit', AGENT_A);

      const io = captureIo(repo.dir);
      expect(await runCli(['resolve', 'owner', 'agent', '--json'], io)).toBe(0);
      const plan = JSON.parse(io.out.join('')) as ResolutionPlan;
      expect(plan.status).toBe('PERMITTED_WITH_OVERRIDE');
      expect(plan.files[0]?.left).toMatchObject({
        level: 'VERIFIED_OWNER',
        hasStanding: true,
        commit: { signatureStatus: 'G', signer: 'alice@example.com' },
      });

      for (const [branch, status] of [
        ['spoofed', 'G'],
        ['rogue', 'U'],
      ] as const) {
        const spoofIo = captureIo(repo.dir);
        expect(await runCli(['resolve', branch, 'agent', '--json'], spoofIo)).toBe(
          EXIT_CODES.BLOCKED_CONFLICT,
        );
        const spoofPlan = JSON.parse(spoofIo.out.join('')) as ResolutionPlan;
        expect(spoofPlan.files[0]).toMatchObject({
          reason: 'NO_STANDING',
          left: { level: 'UNVERIFIED_OWNER', commit: { signatureStatus: status } },
        });
      }
    } finally {
      repo.cleanup();
    }
  });
});

/** The `Home:` line of `gpg --version`, or undefined when gpg is not installed. */
function gpgHome(): string | undefined {
  try {
    const version = execFileSync('gpg', ['--version'], { encoding: 'utf-8' });
    return /^Home: (.*)$/m.exec(version)?.[1] ?? '';
  } catch {
    return undefined;
  }
}

const GPG_HOME = gpgHome();

/** MSYS gpg (Git for Windows) needs POSIX paths such as /c/Users/... in GNUPGHOME. */
function toGpgPath(p: string): string {
  if (!GPG_HOME?.startsWith('/') || !/^[A-Za-z]:/.test(p)) return p;
  return `/${p.charAt(0).toLowerCase()}${p.slice(2).replace(/\\/g, '/')}`;
}

describe.skipIf(GPG_HOME === undefined)('bridge resolve with OpenPGP-signed commits', () => {
  it('takes identities from keyring-valid user IDs, not from the claimed %GS user ID', async () => {
    const repo = createTempRepo('bridge-gpg-');
    const verifier = path.join(repo.root, 'verifier-gnupg');
    const attacker = path.join(repo.root, 'attacker-gnupg');
    const homes = [verifier, attacker];
    for (const home of homes) mkdirSync(home, { mode: 0o700 });
    const envFor = (home: string) => ({
      ...process.env,
      GIT_CONFIG_GLOBAL: path.join(repo.root, 'empty.gitconfig'),
      GIT_CONFIG_NOSYSTEM: '1',
      GNUPGHOME: toGpgPath(home),
    });
    const gpg = (home: string, args: string[], input?: string) =>
      execFileSync('gpg', ['--batch', '--pinentry-mode', 'loopback', '--passphrase', '', ...args], {
        env: envFor(home),
        encoding: 'utf-8',
        input,
        stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
      });
    const fingerprint = (home: string) =>
      /^fpr:+([0-9A-F]+):/m.exec(gpg(home, ['--with-colons', '--list-secret-keys']))?.[1] ?? '';
    const signedCommit = (home: string, key: string, branch: string, author: string) => {
      repo.git(['checkout', '-q', '-b', branch, 'main']);
      repo.write('src/app.ts', `${branch}\n`);
      repo.git(['add', '-A']);
      execFileSync(
        'git',
        [
          '-c',
          'gpg.format=openpgp',
          '-c',
          `user.signingkey=${key}`,
          'commit',
          '-q',
          '-S',
          `--author=${author}`,
          '-m',
          branch,
        ],
        { cwd: repo.dir, env: envFor(home), stdio: 'ignore' },
      );
    };
    const savedHome = process.env.GNUPGHOME;
    try {
      // The verifier owns an ultimately trusted owner key. The attacker key's primary
      // user ID claims the owner email; the verifier certifies only its agent user ID.
      gpg(verifier, ['--quick-gen-key', 'Owner <owner@example.com>', 'ed25519', 'sign', 'never']);
      gpg(attacker, [
        '--quick-gen-key',
        'Impersonated <owner@example.com>',
        'ed25519',
        'sign',
        'never',
      ]);
      const ownerKey = fingerprint(verifier);
      const attackerKey = fingerprint(attacker);
      gpg(attacker, ['--quick-add-uid', attackerKey, 'Agent <agent-a@bots.example>']);
      gpg(attacker, ['--quick-set-primary-uid', attackerKey, 'Impersonated <owner@example.com>']);
      gpg(verifier, ['--import'], gpg(attacker, ['--armor', '--export', attackerKey]));
      gpg(verifier, ['--quick-lsign-key', attackerKey, 'Agent <agent-a@bots.example>']);

      repo.write('.github/CODEOWNERS', '/src/ owner@example.com\n');
      repo.write('src/app.ts', 'v1\n');
      repo.commit('base', FIXTURE_AUTHOR);
      signedCommit(verifier, ownerKey, 'owner', 'Owner <owner@example.com>');
      signedCommit(attacker, attackerKey, 'spoofed', 'Owner <owner@example.com>');
      repo.git(['checkout', '-q', '-b', 'agent', 'main']);
      repo.write('src/app.ts', 'agent\n');
      repo.commit('agent edit', AGENT_B);

      process.env.GNUPGHOME = toGpgPath(verifier);
      // Git reports a good signature and the forged user ID for the attacker commit.
      const status = execFileSync('git', ['log', '-1', '--format=%G?|%GS', 'spoofed'], {
        cwd: repo.dir,
        env: envFor(verifier),
        encoding: 'utf-8',
      });
      expect(status.trim()).toBe('G|Impersonated <owner@example.com>');

      const owner = captureIo(repo.dir);
      expect(await runCli(['resolve', 'owner', 'agent', '--json'], owner)).toBe(0);
      expect((JSON.parse(owner.out.join('')) as ResolutionPlan).files[0]).toMatchObject({
        reason: 'SINGLE_SIDE_STANDING',
        left: {
          level: 'VERIFIED_OWNER',
          commit: { signatureStatus: 'G', signer: 'Owner <owner@example.com>' },
        },
      });

      const spoofed = captureIo(repo.dir);
      expect(await runCli(['resolve', 'spoofed', 'agent', '--json'], spoofed)).toBe(3);
      expect((JSON.parse(spoofed.out.join('')) as ResolutionPlan).files[0]).toMatchObject({
        reason: 'NO_STANDING',
        left: {
          level: 'UNVERIFIED_OWNER',
          hasStanding: false,
          commit: {
            signatureStatus: 'G',
            signer: 'Impersonated <owner@example.com>',
          },
        },
      });
    } finally {
      if (savedHome === undefined) delete process.env.GNUPGHOME;
      else process.env.GNUPGHOME = savedHome;
      for (const home of homes) {
        try {
          execFileSync('gpgconf', ['--kill', 'gpg-agent'], { env: envFor(home), stdio: 'ignore' });
        } catch {
          // No agent is running, or gpgconf is not installed.
        }
      }
      repo.cleanup();
    }
  }, 120_000);
});

describe('history shapes that must not grant standing', () => {
  const OWNER: Author = { name: 'Owner', email: 'owner@example.com' };

  it('does not lend standing through a merge that discarded the owner change', async () => {
    const repo = createTempRepo();
    try {
      repo.write('CODEOWNERS', '/src/ owner@example.com\n');
      repo.write('src/f.ts', 'v1\n');
      repo.commit('base', FIXTURE_AUTHOR);
      repo.git(['checkout', '-q', '-b', 'agent-a']);
      repo.write('src/f.ts', 'agent-a\n');
      repo.commit('agent a edit', AGENT_A);
      repo.git(['checkout', '-q', 'main']);
      repo.write('src/f.ts', 'owner\n');
      repo.commit('owner edit', OWNER);
      repo.git(['checkout', '-q', 'agent-a']);
      repo.git(['merge', '-q', '-s', 'ours', '-m', 'keep agent version', 'main']);
      repo.git(['checkout', '-q', '-b', 'agent-b', 'main~1']);
      repo.write('src/f.ts', 'agent-b\n');
      repo.commit('agent b edit', AGENT_B);

      const io = captureIo(repo.dir);
      const code = await runCli(
        ['resolve', 'agent-a', 'agent-b', '--allow-unsigned', '--json'],
        io,
      );
      expect(code).toBe(EXIT_CODES.BLOCKED_CONFLICT);
      const plan = JSON.parse(io.out.join('')) as ResolutionPlan;
      expect(plan.files[0]).toMatchObject({
        path: 'src/f.ts',
        reason: 'NO_STANDING',
        left: { level: 'NON_OWNER', commit: { authorEmail: AGENT_A.email } },
      });
    } finally {
      repo.cleanup();
    }
  });

  it('compares exact path names, including quotes, tabs, and edge spaces', async () => {
    const repo = createTempRepo();
    try {
      const odd = ' q"uo\tte.md ';
      const tree = (content: string) => {
        const owners = repo
          .git(['hash-object', '-w', '--stdin'], repo.dir, '* owner@example.com\n')
          .trim();
        const blob = repo.git(['hash-object', '-w', '--stdin'], repo.dir, content).trim();
        return repo
          .git(
            ['mktree', '-z'],
            repo.dir,
            `100644 blob ${owners}\tCODEOWNERS\x00100644 blob ${blob}\t${odd}\0`,
          )
          .trim();
      };
      const commitTree = (t: string, parents: string[], author: Author) =>
        repo
          .git([
            '-c',
            `user.name=${author.name}`,
            '-c',
            `user.email=${author.email}`,
            'commit-tree',
            t,
            ...parents.flatMap((p) => ['-p', p]),
            '-m',
            'x',
          ])
          .trim();
      const base = commitTree(tree('base\n'), [], FIXTURE_AUTHOR);
      repo.git(['update-ref', 'refs/heads/left', commitTree(tree('left\n'), [base], AGENT_A)]);
      repo.git(['update-ref', 'refs/heads/right', commitTree(tree('right\n'), [base], AGENT_B)]);

      const io = captureIo(repo.dir);
      expect(await runCli(['resolve', 'left', 'right', '--allow-unsigned', '--json'], io)).toBe(
        EXIT_CODES.BLOCKED_CONFLICT,
      );
      const plan = JSON.parse(io.out.join('')) as ResolutionPlan;
      expect(plan.files).toMatchObject([{ path: odd, reason: 'NO_STANDING' }]);
    } finally {
      repo.cleanup();
    }
  });

  it('refuses criss-cross histories with more than one merge base', async () => {
    const repo = createTempRepo();
    try {
      repo.write('f.txt', 'base\n');
      repo.commit('base', FIXTURE_AUTHOR);
      repo.git(['checkout', '-q', '-b', 'x']);
      repo.write('x.txt', 'x1\n');
      const x1 = repo.commit('x1', AGENT_A);
      repo.git(['checkout', '-q', '-b', 'y', 'main']);
      repo.write('y.txt', 'y1\n');
      const y1 = repo.commit('y1', AGENT_B);
      repo.git(['merge', '-q', '--no-ff', '-m', 'y takes x1', x1]);
      repo.git(['checkout', '-q', 'x']);
      repo.git(['merge', '-q', '--no-ff', '-m', 'x takes y1', y1]);

      const io = captureIo(repo.dir);
      expect(await runCli(['resolve', 'x', 'y'], io)).toBe(EXIT_CODES.ERROR);
      expect(io.err.join('')).toContain('have 2 merge bases (criss-cross history)');
    } finally {
      repo.cleanup();
    }
  });

  it('reads CODEOWNERS from a trusted ref and blocks a shared untrusted base', async () => {
    const repo = createTempRepo();
    try {
      repo.write('CODEOWNERS', '/src/ owner@example.com\n');
      repo.write('src/f.ts', 'v1\n');
      repo.commit('base', FIXTURE_AUTHOR);
      repo.git(['checkout', '-q', '-b', 'x']);
      repo.write('CODEOWNERS', '/src/ agent-a@bots.example\n');
      const x1 = repo.commit('agent claims ownership', AGENT_A);
      repo.git(['checkout', '-q', '-b', 'y', x1]);
      repo.write('src/f.ts', 'y\n');
      repo.commit('agent b edit', AGENT_B);
      repo.git(['checkout', '-q', 'x']);
      repo.write('src/f.ts', 'x\n');
      repo.commit('agent a edit', AGENT_A);

      // Without a trusted ref, the shared agent commit is the merge base and decides owners.
      const naive = captureIo(repo.dir);
      expect(await runCli(['resolve', 'x', 'y', '--allow-unsigned'], naive)).toBe(0);

      const trusted = captureIo(repo.dir);
      const code = await runCli(
        ['resolve', 'x', 'y', '--allow-unsigned', '--trusted', 'main', '--json'],
        trusted,
      );
      expect(code).toBe(EXIT_CODES.BLOCKED_CONFLICT);
      const plan = JSON.parse(trusted.out.join('')) as ResolutionPlan;
      expect(plan.authorityRef).toBe('main');
      expect(plan.authorityFullRef).toBe('refs/heads/main');
      expect(plan.files.map((f) => [f.path, f.reason])).toEqual([
        ['CODEOWNERS', 'UNTRUSTED_MERGE_BASE'],
        ['src/f.ts', 'NO_STANDING'],
      ]);
      expect(plan.files[1]?.owners).toEqual(['owner@example.com']);

      // Merge base on the trusted ref: no UNTRUSTED_MERGE_BASE finding. y still
      // blocks because it changes CODEOWNERS.
      repo.git(['checkout', '-q', '-b', 'z', 'main']);
      repo.write('src/f.ts', 'z\n');
      repo.commit('owner edit', OWNER);
      const onMain = captureIo(repo.dir);
      expect(
        await runCli(
          ['resolve', 'z', 'y', '--allow-unsigned', '--trusted', 'main', '--json'],
          onMain,
        ),
      ).toBe(3);
      expect(
        (JSON.parse(onMain.out.join('')) as ResolutionPlan).files.map((f) => [f.path, f.reason]),
      ).toEqual([
        ['CODEOWNERS', 'AUTHORITY_SOURCE_MODIFIED'],
        ['src/f.ts', 'SINGLE_SIDE_STANDING'],
      ]);

      // Both sides on main and CODEOWNERS unchanged: the trusted owners decide, exit 0.
      repo.git(['checkout', '-q', '-b', 'w', 'main']);
      repo.write('src/f.ts', 'w\n');
      repo.commit('agent edit', AGENT_B);
      const clean = captureIo(repo.dir);
      expect(
        await runCli(['resolve', 'z', 'w', '--allow-unsigned', '--trusted', 'main'], clean),
      ).toBe(0);
      expect(clean.out.join('')).toMatch(
        /Authority source: CODEOWNERS at main \(refs\/heads\/main [0-9a-f]{7}\)/,
      );
      expect(clean.out.join('')).toContain(
        'Status: PERMITTED_WITH_OVERRIDE (SINGLE_SIDE_STANDING)',
      );

      // A directory named like the trusted ref must not redirect the authority source.
      repo.git(['worktree', 'add', '-q', 'main', 'x']);
      const redirected = captureIo(repo.dir);
      expect(
        await runCli(
          ['resolve', 'z', 'w', '--allow-unsigned', '--trusted', 'main', '--json'],
          redirected,
        ),
      ).toBe(0);
      const redirectedPlan = JSON.parse(redirected.out.join('')) as ResolutionPlan;
      expect(redirectedPlan.files[0]?.owners).toEqual(['owner@example.com']);

      // A raw commit id works as a trusted ref and is shown as a commit.
      const mainSha = repo.git(['rev-parse', 'refs/heads/main']).trim();
      const bySha = captureIo(repo.dir);
      expect(
        await runCli(['resolve', 'z', 'w', '--allow-unsigned', '--trusted', mainSha], bySha),
      ).toBe(0);
      expect(bySha.out.join('')).toContain(`(commit ${mainSha.slice(0, 7)})`);
    } finally {
      repo.cleanup();
    }
  });
});

describe('CODEOWNERS locations that are not files', () => {
  it('stops with a clear error when a CODEOWNERS path holds a gitlink', async () => {
    const repo = createTempRepo();
    try {
      repo.write('app.ts', 'v1\n');
      repo.commit('base', FIXTURE_AUTHOR);
      repo.git([
        'update-index',
        '--add',
        '--cacheinfo',
        `160000,${'1'.repeat(40)},.github/CODEOWNERS`,
      ]);
      repo.git(['-c', 'user.name=F', '-c', 'user.email=f@x', 'commit', '-q', '-m', 'gitlink']);
      repo.git(['checkout', '-q', '-b', 'x']);
      repo.write('app.ts', 'x\n');
      repo.commit('x', AGENT_A);
      repo.git(['checkout', '-q', '-b', 'y', 'main']);
      repo.write('app.ts', 'y\n');
      repo.commit('y', AGENT_B);

      const io = captureIo(repo.dir);
      expect(await runCli(['resolve', 'x', 'y'], io)).toBe(1);
      expect(io.err.join('')).toContain(
        '.github/CODEOWNERS at merge base is a commit, not a file.',
      );
    } finally {
      repo.cleanup();
    }
  });
});

describe('plans without CODEOWNERS', () => {
  it('marks every overlap as AMBIGUOUS', async () => {
    const repo = createTempRepo();
    try {
      repo.write('app.ts', 'v1\n');
      repo.commit('base', FIXTURE_AUTHOR);
      repo.git(['checkout', '-q', '-b', 'x']);
      repo.write('app.ts', 'x\n');
      repo.commit('x', AGENT_A);
      repo.git(['checkout', '-q', '-b', 'y', 'main']);
      repo.write('app.ts', 'y\n');
      repo.commit('y', AGENT_B);

      const io = captureIo(repo.dir);
      expect(await runCli(['resolve', 'x', 'y'], io)).toBe(EXIT_CODES.AMBIGUOUS);
      expect(io.out.join('')).toContain('Authority source: no CODEOWNERS file at merge base');
    } finally {
      repo.cleanup();
    }
  });
});

describe('loadIdentityMap', () => {
  it('accepts a handle-to-emails object and rejects other shapes', () => {
    const repo = createTempRepo('bridge-ids-');
    try {
      const file = path.join(repo.root, 'ids.json');
      writeFileSync(file, JSON.stringify({ '@bob': ['bob@example.com'] }));
      expect(loadIdentityMap(file)).toEqual({ '@bob': ['bob@example.com'] });

      for (const bad of ['[]', 'null', '"text"', '{"@bob": "bob@example.com"}', '{"@bob": [1]}']) {
        writeFileSync(file, bad);
        expect(() => loadIdentityMap(file)).toThrow('must be a JSON object');
      }

      writeFileSync(file, '{not json');
      expect(() => loadIdentityMap(file)).toThrow('Cannot read identity map');
    } finally {
      repo.cleanup();
    }
  });
});

describe('formatPlanText', () => {
  it('describes standing for a side without a commit', () => {
    const plan: ResolutionPlan = {
      status: 'BLOCKED_CONFLICT',
      base: 'a'.repeat(40),
      left: { label: 'l', sha: 'b'.repeat(40), commitCount: 0, changedFileCount: 1 },
      right: { label: 'r', sha: 'c'.repeat(40), commitCount: 1, changedFileCount: 1 },
      diverged: true,
      authorityRef: 'main',
      authorityFullRef: '',
      authoritySha: 'e'.repeat(40),
      policy: { requireSignedCommits: false },
      files: [
        {
          path: 'f.ts',
          status: 'BLOCKED_CONFLICT',
          reason: 'NO_STANDING',
          owners: ['@x'],
          left: { level: 'NON_OWNER', hasStanding: false },
          right: {
            level: 'NON_OWNER',
            hasStanding: false,
            commit: { sha: 'd'.repeat(40), authorEmail: 'e@x', signatureStatus: 'N', signer: '' },
          },
          action: 'Request a review.',
        },
      ],
      exclusiveChanges: { left: 0, right: 0 },
      isObjectiveTruthClaim: false,
    };
    const text = formatPlanText(plan);
    expect(text).toContain('Policy: unsigned owner-authored commits accepted');
    expect(text).toContain('Authority source: no CODEOWNERS file at main (commit eeeeeee)');
    expect(text).toContain('Left:   l (bbbbbbb), 0 commits, 1 file changed');
    expect(text).toContain('Right:  r (ccccccc), 1 commit, 1 file changed');
    expect(text).toContain('Owners: @x\n');
    expect(text).toContain('Left  [l]: NON_OWNER (no commit on this side changed the file)');
    expect(text).toContain('Right [r]: NON_OWNER  e@x  sig N  commit ddddddd');

    const signed = formatPlanText({
      ...plan,
      files: plan.files.map((file) => ({
        ...file,
        right: {
          ...file.right,
          commit: { sha: 'd'.repeat(40), authorEmail: 'e@x', signatureStatus: 'G', signer: 'k@x' },
        },
      })),
    });
    expect(signed).toContain('Right [r]: NON_OWNER  e@x  sig G by k@x  commit ddddddd');
  });
});

describe('bin entrypoint', () => {
  it('runs the CLI with process arguments and sets the exit code', async () => {
    const originalArgv = process.argv;
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      process.argv = ['node', 'bridge', '--help'];
      await import('../../src/bin/bridge.js');
      expect(process.exitCode).toBe(0);
      expect(stdout).toHaveBeenCalledWith(USAGE);

      vi.resetModules();
      process.argv = ['node', 'bridge', 'unknown-command'];
      await import('../../src/bin/bridge.js');
      expect(process.exitCode).toBe(1);
      expect(stderr).toHaveBeenCalledWith(
        expect.stringContaining('Unknown command "unknown-command".'),
      );
    } finally {
      process.argv = originalArgv;
      process.exitCode = undefined;
      stdout.mockRestore();
      stderr.mockRestore();
    }
  });
});
