import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
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
    expect(text).toContain('Policy: signed commits required for owner standing');
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
        commit: { signatureStatus: 'G' },
      });
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
            commit: { sha: 'd'.repeat(40), authorEmail: 'e@x', signatureStatus: 'N' },
          },
          action: 'Request a review.',
        },
      ],
      exclusiveChanges: { left: 0, right: 0 },
      isObjectiveTruthClaim: false,
    };
    const text = formatPlanText(plan);
    expect(text).toContain('Policy: unsigned owner commits accepted');
    expect(text).toContain('Left:   l (bbbbbbb), 0 commits, 1 file changed');
    expect(text).toContain('Right:  r (ccccccc), 1 commit, 1 file changed');
    expect(text).toContain('Owners: @x\n');
    expect(text).toContain('Left  [l]: NON_OWNER (no commit on this side changed the file)');
    expect(text).toContain('Right [r]: NON_OWNER  e@x  sig N  commit ddddddd');
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
      expect(process.exitCode).toBe(EXIT_CODES.ERROR);
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
