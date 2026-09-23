import path from 'node:path';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import {
  DELETED_BLOB,
  GitCommandError,
  blobIdAt,
  createGitRunner,
  findMergeBases,
  isAncestor,
  listChangedFiles,
  listCommits,
  parseRawLog,
  readFileAt,
  resolveEndpoint,
  resolveRepoRoot,
  type GitRunner,
} from '../../src/effective-directive/git.js';
import { createTempRepo, FIXTURE_AUTHOR, type TempRepo } from './git-fixture.js';

const ALICE = { name: 'Alice', email: 'alice@example.com' };
const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const Z = '0'.repeat(40);

describe('parseRawLog', () => {
  it('parses headers, post-image blobs, deletions, and exact path names', () => {
    const output = [
      `\x1eabc123\x1fAlice\x1falice@example.com\x1fG\x1fAlice <alice@example.com>\0\n`,
      `:100644 100644 ${Z} ${A} M\0src/a.ts\0`,
      `:100644 000000 ${B} ${Z} D\0 lead space.md\0`,
      `:000000 100644 ${Z} ${B} A\0q"uo\tte.md \0`,
      `\x1edef456\x1fBot\x1fbot@example.com\x1fN\x1f\0\n`,
      `:100644 100644 ${A} ${B} M\0README.md\0`,
    ].join('');

    expect(parseRawLog(output)).toEqual([
      {
        sha: 'abc123',
        authorName: 'Alice',
        authorEmail: 'alice@example.com',
        signatureStatus: 'G',
        signer: 'Alice <alice@example.com>',
        files: ['src/a.ts', ' lead space.md', 'q"uo\tte.md '],
        blobs: { 'src/a.ts': A, ' lead space.md': Z, 'q"uo\tte.md ': B },
      },
      {
        sha: 'def456',
        authorName: 'Bot',
        authorEmail: 'bot@example.com',
        signatureStatus: 'N',
        signer: '',
        files: ['README.md'],
        blobs: { 'README.md': B },
      },
    ]);
    expect(DELETED_BLOB.test(Z)).toBe(true);
    expect(DELETED_BLOB.test(A)).toBe(false);
  });

  it('handles commits without changes, unknown letters, short headers, and junk', () => {
    const [merge, unknown, short] = parseRawLog(
      '\x1emerge\x1fM\x1fm@x\x1fN\x1f\0\n\x1eaaa\x1fA\x1fa@x\x1fZ\x1f\0\x1ebbb\x1f',
    );
    expect(merge).toMatchObject({ sha: 'merge', files: [], blobs: {} });
    expect(unknown?.signatureStatus).toBe('E');
    expect(short).toEqual({
      sha: 'bbb',
      authorName: '',
      authorEmail: '',
      signatureStatus: 'N',
      signer: '',
      files: [],
      blobs: {},
    });
    expect(parseRawLog('garbage\n')).toEqual([]);
    expect(parseRawLog('')).toEqual([]);
    const [junk] = parseRawLog(`\x1ex\x1fA\x1fa@x\x1fN\x1f\0not-a-record\0path\0:bad\0p\0:x\0\0`);
    expect(junk).toMatchObject({ files: ['p'], blobs: { p: '' } });
  });
});

describe('git adapter error handling', () => {
  const failing =
    (error: Error): GitRunner =>
    async () => {
      throw error;
    };

  it('reports a missing git binary as GitCommandError without an exit code', async () => {
    const git = createGitRunner('bridge-no-such-git-binary');
    const error = await git(['status'], process.cwd()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GitCommandError);
    expect((error as GitCommandError).exitCode).toBeNull();
    expect((error as GitCommandError).message).toContain('exit unknown');
  });

  it('rethrows failures other than the documented "not found" exit status', async () => {
    const fatal = new GitCommandError(['x'], 128, 'fatal: bad object');
    await expect(findMergeBases(failing(fatal), '.', 'a', 'b')).rejects.toBe(fatal);
    await expect(isAncestor(failing(fatal), '.', 'a', 'b')).rejects.toBe(fatal);
    await expect(blobIdAt(failing(fatal), '.', 'HEAD', 'x')).rejects.toBe(fatal);
    await expect(readFileAt(failing(fatal), '.', 'HEAD', 'x')).rejects.toBe(fatal);

    const boom = new Error('runner crashed');
    await expect(blobIdAt(failing(boom), '.', 'HEAD', 'x')).rejects.toBe(boom);
  });
});

describe('git adapter against a real repository', () => {
  let repo: TempRepo;
  let git: GitRunner;
  let baseSha: string;
  let featureSha: string;
  let oddSha: string;

  beforeAll(() => {
    repo = createTempRepo();
    git = createGitRunner();
    repo.write('README.md', 'base\n');
    repo.write('src/a.ts', 'export const a = 1;\n');
    baseSha = repo.commit('base', FIXTURE_AUTHOR);

    repo.git(['checkout', '-q', '-b', 'feature']);
    repo.write('src/a.ts', 'export const a = 2;\n');
    repo.write('src/new file.ts', 'export const n = 1;\n');
    featureSha = repo.commit('feature change', ALICE);
    repo.git(['checkout', '-q', 'main']);

    // Paths with a quote, a tab, and leading or trailing spaces. Built with plumbing,
    // so the test also runs on file systems that reject these names.
    const blob = repo.git(['hash-object', '-w', '--stdin'], repo.dir, 'odd\n').trim();
    const tree = repo
      .git(['mktree', '-z'], repo.dir, `100644 blob ${blob}\t q"uo\tte.md \0`)
      .trim();
    oddSha = repo.git(['commit-tree', tree, '-p', baseSha, '-m', 'odd names']).trim();
    repo.git(['update-ref', 'refs/heads/odd', oddSha]);

    repo.git(['checkout', '-q', '--orphan', 'unrelated']);
    repo.git(['rm', '-rf', '-q', '.']);
    repo.write('other.txt', 'other\n');
    repo.commit('unrelated root', FIXTURE_AUTHOR);
    repo.git(['checkout', '-q', 'main']);

    repo.git(['worktree', 'add', '-q', '../wt-feature', 'feature']);
    repo.git(['worktree', 'add', '-q', '--detach', '../wt-detached', 'main']);
  });

  afterAll(() => repo.cleanup());

  it('resolves revisions, worktree directories, and the repository root', async () => {
    await expect(resolveEndpoint(git, repo.dir, 'feature')).resolves.toEqual({
      label: 'feature',
      sha: featureSha,
    });

    const fromWorktree = await resolveEndpoint(git, repo.dir, '../wt-feature');
    expect(fromWorktree).toMatchObject({ label: 'feature', sha: featureSha });
    expect(fromWorktree.worktree).toBe(path.resolve(repo.dir, '../wt-feature'));

    const detached = await resolveEndpoint(git, repo.dir, 'wt-detached', repo.root);
    expect(detached).toMatchObject({ label: 'wt-detached', sha: baseSha });

    const root = await resolveRepoRoot(git, path.join(repo.dir, 'src'));
    expect(root.toLowerCase()).toBe(path.resolve(repo.dir).toLowerCase());
  });

  it('rejects unknown revisions with GitCommandError', async () => {
    await expect(resolveEndpoint(git, repo.dir, 'no-such-branch')).rejects.toBeInstanceOf(
      GitCommandError,
    );
  });

  it('finds merge bases and ancestry, or nothing for unrelated histories', async () => {
    await expect(findMergeBases(git, repo.dir, 'main', 'feature')).resolves.toEqual([baseSha]);
    await expect(findMergeBases(git, repo.dir, 'main', 'unrelated')).resolves.toEqual([]);
    await expect(isAncestor(git, repo.dir, baseSha, 'feature')).resolves.toBe(true);
    await expect(isAncestor(git, repo.dir, 'feature', 'main')).resolves.toBe(false);
  });

  it('lists changed files and commits with exact paths and post-image blobs', async () => {
    await expect(listChangedFiles(git, repo.dir, baseSha, featureSha)).resolves.toEqual([
      'src/a.ts',
      'src/new file.ts',
    ]);

    const commits = await listCommits(git, repo.dir, baseSha, featureSha);
    expect(commits).toHaveLength(1);
    expect(commits[0]).toMatchObject({
      sha: featureSha,
      authorName: 'Alice',
      authorEmail: 'alice@example.com',
      signatureStatus: 'N',
      files: ['src/a.ts', 'src/new file.ts'],
    });
    expect(commits[0]?.blobs['src/a.ts']).toBe(
      await blobIdAt(git, repo.dir, featureSha, 'src/a.ts'),
    );

    const odd = ' q"uo\tte.md ';
    await expect(listChangedFiles(git, repo.dir, baseSha, oddSha)).resolves.toContain(odd);
    const oddCommits = await listCommits(git, repo.dir, baseSha, oddSha);
    expect(oddCommits[0]?.blobs[odd]).toBe(await blobIdAt(git, repo.dir, oddSha, odd));
    expect(oddCommits[0]?.blobs['README.md']).toMatch(DELETED_BLOB);
  });

  it('ignores a diff.relative setting when run from a subdirectory', async () => {
    repo.git(['config', 'diff.relative', 'true']);
    try {
      const sub = path.join(repo.dir, 'src');
      await expect(listChangedFiles(git, sub, baseSha, featureSha)).resolves.toEqual([
        'src/a.ts',
        'src/new file.ts',
      ]);
    } finally {
      repo.git(['config', '--unset', 'diff.relative']);
    }
  });

  it('reads files and blob ids at a revision', async () => {
    await expect(readFileAt(git, repo.dir, baseSha, 'README.md')).resolves.toBe('base\n');
    await expect(readFileAt(git, repo.dir, baseSha, 'missing.md')).resolves.toBeUndefined();

    const blob = await blobIdAt(git, repo.dir, featureSha, 'src/a.ts');
    expect(blob).toMatch(/^[0-9a-f]{40,64}$/);
    await expect(blobIdAt(git, repo.dir, baseSha, 'src/new file.ts')).resolves.toBeUndefined();
  });
});
