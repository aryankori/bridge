import path from 'node:path';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import {
  GitCommandError,
  blobIdAt,
  createGitRunner,
  findMergeBase,
  listChangedFiles,
  listCommits,
  parseCommitLog,
  readFileAt,
  resolveEndpoint,
  type GitRunner,
} from '../../src/effective-directive/git.js';
import { createTempRepo, FIXTURE_AUTHOR, type TempRepo } from './git-fixture.js';

const ALICE = { name: 'Alice', email: 'alice@example.com' };

describe('parseCommitLog', () => {
  it('parses commit headers and touched files', () => {
    const output = [
      '\x1eabc123\x1fAlice\x1falice@example.com\x1fG\x1fAlice <alice@example.com>',
      '',
      'src/a.ts',
      'src/b.ts',
      '\x1edef456\x1fBot\x1fbot@example.com\x1fN\x1f',
      '',
      'README.md',
      '',
    ].join('\n');

    expect(parseCommitLog(output)).toEqual([
      {
        sha: 'abc123',
        authorName: 'Alice',
        authorEmail: 'alice@example.com',
        signatureStatus: 'G',
        signer: 'Alice <alice@example.com>',
        files: ['src/a.ts', 'src/b.ts'],
      },
      {
        sha: 'def456',
        authorName: 'Bot',
        authorEmail: 'bot@example.com',
        signatureStatus: 'N',
        signer: '',
        files: ['README.md'],
      },
    ]);
  });

  it('maps unknown signature letters to E and fills missing fields', () => {
    const [unknown, short] = parseCommitLog('\x1eaaa\x1fA\x1fa@x\x1fZ\x1f\r\n\x1ebbb\x1f\n');
    expect(unknown?.signatureStatus).toBe('E');
    expect(short).toEqual({
      sha: 'bbb',
      authorName: '',
      authorEmail: '',
      signatureStatus: 'N',
      signer: '',
      files: [],
    });
  });

  it('skips chunks without a header', () => {
    expect(parseCommitLog('garbage\n')).toEqual([]);
    expect(parseCommitLog('')).toEqual([]);
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

  it('rethrows merge-base failures other than "no common ancestor"', async () => {
    const fatal = new GitCommandError(['merge-base'], 128, 'fatal: bad object');
    await expect(findMergeBase(failing(fatal), '.', 'a', 'b')).rejects.toBe(fatal);
  });

  it('rethrows non-Git errors from file reads', async () => {
    const boom = new Error('runner crashed');
    await expect(readFileAt(failing(boom), '.', 'HEAD', 'x')).rejects.toBe(boom);
    await expect(blobIdAt(failing(boom), '.', 'HEAD', 'x')).rejects.toBe(boom);
  });
});

describe('git adapter against a real repository', () => {
  let repo: TempRepo;
  let git: GitRunner;
  let baseSha: string;
  let featureSha: string;

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

    repo.git(['checkout', '-q', '--orphan', 'unrelated']);
    repo.git(['rm', '-rf', '-q', '.']);
    repo.write('other.txt', 'other\n');
    repo.commit('unrelated root', FIXTURE_AUTHOR);
    repo.git(['checkout', '-q', 'main']);

    repo.git(['worktree', 'add', '-q', '../wt-feature', 'feature']);
    repo.git(['worktree', 'add', '-q', '--detach', '../wt-detached', 'main']);
  });

  afterAll(() => repo.cleanup());

  it('resolves revisions and worktree directories', async () => {
    await expect(resolveEndpoint(git, repo.dir, 'feature')).resolves.toEqual({
      label: 'feature',
      sha: featureSha,
    });

    const fromWorktree = await resolveEndpoint(git, repo.dir, '../wt-feature');
    expect(fromWorktree).toMatchObject({ label: 'feature', sha: featureSha });
    expect(fromWorktree.worktree).toBe(path.resolve(repo.dir, '../wt-feature'));

    const detached = await resolveEndpoint(git, repo.dir, 'wt-detached', repo.root);
    expect(detached).toMatchObject({ label: 'wt-detached', sha: baseSha });
  });

  it('rejects unknown revisions with GitCommandError', async () => {
    await expect(resolveEndpoint(git, repo.dir, 'no-such-branch')).rejects.toBeInstanceOf(
      GitCommandError,
    );
  });

  it('finds the merge base, or undefined for unrelated histories', async () => {
    await expect(findMergeBase(git, repo.dir, 'main', 'feature')).resolves.toBe(baseSha);
    await expect(findMergeBase(git, repo.dir, 'main', 'unrelated')).resolves.toBeUndefined();
  });

  it('lists changed files and commits, including paths with spaces', async () => {
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
  });

  it('reads files and blob ids at a revision', async () => {
    await expect(readFileAt(git, repo.dir, baseSha, 'README.md')).resolves.toBe('base\n');
    await expect(readFileAt(git, repo.dir, baseSha, 'missing.md')).resolves.toBeUndefined();

    const blob = await blobIdAt(git, repo.dir, featureSha, 'src/a.ts');
    expect(blob).toMatch(/^[0-9a-f]{40,64}$/);
    await expect(blobIdAt(git, repo.dir, baseSha, 'src/new file.ts')).resolves.toBeUndefined();
  });
});
