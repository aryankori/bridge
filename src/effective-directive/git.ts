import { execFile } from 'node:child_process';
import { statSync } from 'node:fs';
import path from 'node:path';

/**
 * Minimal read-only Git adapter for divergence arbitration.
 *
 * Every call runs `git` through execFile (no shell). Fixed `-c` overrides keep
 * the output format stable against user configuration such as
 * `log.showSignature` or `color.ui`.
 */

export type GitRunner = (args: readonly string[], cwd: string) => Promise<string>;

/**
 * Signature status letters from `git log --format=%G?`.
 * G good, U good with unknown validity, X good but expired, Y good but made by
 * an expired key, R good but made by a revoked key, E cannot be checked,
 * B bad, N no signature.
 */
export type SignatureStatus = 'G' | 'U' | 'X' | 'Y' | 'R' | 'E' | 'B' | 'N';

export interface CommitRecord {
  sha: string;
  authorName: string;
  authorEmail: string;
  signatureStatus: SignatureStatus;
  signer: string;
  files: string[];
}

export interface BranchEndpoint {
  /** Branch name, ref, or worktree label shown to the user. */
  label: string;
  sha: string;
  /** Absolute worktree path when the endpoint was given as a directory. */
  worktree?: string;
}

export class GitCommandError extends Error {
  constructor(
    readonly args: readonly string[],
    readonly exitCode: number | null,
    readonly stderr: string,
  ) {
    super(`git ${args.join(' ')} failed (exit ${exitCode ?? 'unknown'}): ${stderr.trim()}`);
    this.name = 'GitCommandError';
  }
}

const STABLE_OUTPUT_CONFIG = [
  '-c',
  'core.quotepath=off',
  '-c',
  'log.showSignature=false',
  '-c',
  'color.ui=never',
];

const SIGNATURE_STATUSES: ReadonlySet<string> = new Set(['G', 'U', 'X', 'Y', 'R', 'E', 'B', 'N']);

/**
 * Create a GitRunner that executes the given git binary.
 */
export function createGitRunner(gitBinary = 'git'): GitRunner {
  return (args, cwd) =>
    new Promise((resolve, reject) => {
      execFile(
        gitBinary,
        [...STABLE_OUTPUT_CONFIG, ...args],
        { cwd, maxBuffer: 64 * 1024 * 1024, windowsHide: true },
        (error, stdout, stderr) => {
          if (error) {
            const code = typeof error.code === 'number' ? error.code : null;
            reject(new GitCommandError(args, code, stderr || error.message));
            return;
          }
          resolve(stdout);
        },
      );
    });
}

function isDirectory(candidate: string): boolean {
  try {
    return statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Resolve a branch endpoint. The spec is either a worktree directory (relative
 * to `baseDir`) or a revision that exists in the repository at `repoDir`.
 * An existing directory takes precedence over a revision with the same name.
 */
export async function resolveEndpoint(
  git: GitRunner,
  repoDir: string,
  spec: string,
  baseDir: string = repoDir,
): Promise<BranchEndpoint> {
  const candidate = path.resolve(baseDir, spec);
  if (isDirectory(candidate)) {
    const sha = (await git(['rev-parse', 'HEAD'], candidate)).trim();
    const branch = (await git(['rev-parse', '--abbrev-ref', 'HEAD'], candidate)).trim();
    return {
      label: branch === 'HEAD' ? path.basename(candidate) : branch,
      sha,
      worktree: candidate,
    };
  }

  const sha = (
    await git(['rev-parse', '--verify', '--end-of-options', `${spec}^{commit}`], repoDir)
  ).trim();
  return { label: spec, sha };
}

/**
 * Return the merge base of two commits, or undefined when the histories are unrelated.
 */
export async function findMergeBase(
  git: GitRunner,
  repoDir: string,
  a: string,
  b: string,
): Promise<string | undefined> {
  try {
    return (await git(['merge-base', a, b], repoDir)).trim();
  } catch (error) {
    // git merge-base exits with status 1 and no output when no common ancestor exists.
    if (error instanceof GitCommandError && error.exitCode === 1) return undefined;
    throw error;
  }
}

/**
 * List files whose content differs between two commits.
 */
export async function listChangedFiles(
  git: GitRunner,
  repoDir: string,
  base: string,
  tip: string,
): Promise<string[]> {
  const out = await git(['diff', '--name-only', '--no-renames', base, tip], repoDir);
  return out
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Parse the output of `git log --format=%x1e%H%x1f%an%x1f%ae%x1f%G?%x1f%GS --name-only`.
 */
export function parseCommitLog(output: string): CommitRecord[] {
  const records: CommitRecord[] = [];
  for (const chunk of output.split('\x1e')) {
    const lines = chunk.split(/\r?\n/);
    const header = lines[0];
    if (!header || !header.includes('\x1f')) continue;

    const [sha = '', authorName = '', authorEmail = '', status = 'N', signer = ''] =
      header.split('\x1f');
    records.push({
      sha,
      authorName,
      authorEmail,
      signatureStatus: (SIGNATURE_STATUSES.has(status) ? status : 'E') as SignatureStatus,
      signer,
      files: lines
        .slice(1)
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    });
  }
  return records;
}

/**
 * List commits reachable from `tip` but not from `base`, newest first,
 * with author, signature status, and touched files.
 */
export async function listCommits(
  git: GitRunner,
  repoDir: string,
  base: string,
  tip: string,
): Promise<CommitRecord[]> {
  const out = await git(
    [
      'log',
      '--no-renames',
      '--name-only',
      '--format=%x1e%H%x1f%an%x1f%ae%x1f%G?%x1f%GS',
      `${base}..${tip}`,
    ],
    repoDir,
  );
  return parseCommitLog(out);
}

/**
 * Read a file at a revision. Returns undefined when the file does not exist there.
 */
export async function readFileAt(
  git: GitRunner,
  repoDir: string,
  rev: string,
  filePath: string,
): Promise<string | undefined> {
  try {
    return await git(['cat-file', '-p', `${rev}:${filePath}`], repoDir);
  } catch (error) {
    if (error instanceof GitCommandError) return undefined;
    throw error;
  }
}

/**
 * Return the blob id of a file at a revision, or undefined when the file does not exist there.
 */
export async function blobIdAt(
  git: GitRunner,
  repoDir: string,
  rev: string,
  filePath: string,
): Promise<string | undefined> {
  try {
    return (await git(['rev-parse', '--verify', '--quiet', `${rev}:${filePath}`], repoDir)).trim();
  } catch (error) {
    if (error instanceof GitCommandError) return undefined;
    throw error;
  }
}
