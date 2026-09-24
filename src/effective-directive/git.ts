import { execFile } from 'node:child_process';
import { statSync } from 'node:fs';
import path from 'node:path';

/**
 * Minimal read-only Git adapter for divergence arbitration.
 *
 * Every call runs `git` through execFile (no shell). Fixed `-c` overrides keep
 * the output format stable against user configuration such as
 * `log.showSignature`, `color.ui`, or `diff.relative`. Path lists use `-z`, so
 * file names with spaces, quotes, or control characters stay exact.
 */

export type GitRunner = (args: readonly string[], cwd: string) => Promise<string>;

/**
 * Signature status letters from `git log --format=%G?`.
 * G good, U good with unknown validity, X good but expired, Y good but made by
 * an expired key, R good but made by a revoked key, E cannot be checked,
 * B bad, N no signature.
 */
export type SignatureStatus = 'G' | 'U' | 'X' | 'Y' | 'R' | 'E' | 'B' | 'N';

/** Blob id that Git reports for a deleted path. */
export const DELETED_BLOB = /^0+$/;

export interface CommitRecord {
  sha: string;
  authorName: string;
  authorEmail: string;
  signatureStatus: SignatureStatus;
  /** Signer from `%GS`: the key's user ID (OpenPGP) or the allowed-signers principal (SSH). */
  signer: string;
  /** Signing key fingerprint from `%GF`. SSH fingerprints start with "SHA256:". */
  signingKey: string;
  /** Primary key fingerprint from `%GP` (OpenPGP only). */
  primaryKey: string;
  /**
   * Identities that a verifier-controlled binding ties to the signing key: the
   * allowed-signers principal for SSH, or the user IDs that the keyring marks
   * valid for OpenPGP. Empty unless the signature is good (G). Filled by
   * {@link verifiedSignersFor}; arbitration treats a missing list as empty.
   */
  verifiedSigners?: string[];
  files: string[];
  /** Blob id of each changed path after this commit. All zeros means the commit deleted the path. */
  blobs: Record<string, string>;
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
  '-c',
  'diff.relative=false',
];

const SIGNATURE_STATUSES: ReadonlySet<string> = new Set(['G', 'U', 'X', 'Y', 'R', 'E', 'B', 'N']);

/** Runs an external program and resolves with its standard output. */
export type CommandRunner = (
  program: string,
  args: readonly string[],
  cwd: string,
) => Promise<string>;

/**
 * Create a CommandRunner that executes programs with execFile (no shell).
 */
export function createCommandRunner(): CommandRunner {
  return (program, args, cwd) =>
    new Promise((resolve, reject) => {
      execFile(
        program,
        [...args],
        { cwd, maxBuffer: 16 * 1024 * 1024, windowsHide: true },
        (error, stdout) => (error ? reject(error) : resolve(stdout)),
      );
    });
}

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
 * Return the top-level directory of the repository that contains `dir`.
 */
export async function resolveRepoRoot(git: GitRunner, dir: string): Promise<string> {
  return path.resolve((await git(['rev-parse', '--show-toplevel'], dir)).trim());
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
 * Resolve a revision strictly (never a directory) to a commit and its full ref
 * name. The full name is empty for a raw commit id.
 */
export async function resolveRevision(
  git: GitRunner,
  repoDir: string,
  spec: string,
): Promise<{ sha: string; fullName: string }> {
  const sha = (
    await git(['rev-parse', '--verify', '--end-of-options', `${spec}^{commit}`], repoDir)
  ).trim();
  // spec is now a valid revision (git ref names cannot start with "-").
  const fullName = (await git(['rev-parse', '--symbolic-full-name', spec], repoDir)).trim();
  return { sha, fullName };
}

/**
 * Return the object type ("blob", "tree", "commit") of a path at a revision.
 */
export async function objectTypeAt(
  git: GitRunner,
  repoDir: string,
  rev: string,
  filePath: string,
): Promise<string> {
  // ls-tree reads the tree entry, so a gitlink reports "commit" even when the
  // submodule commit is not in this repository.
  const entry = await git(['ls-tree', '-z', '--full-tree', rev, '--', filePath], repoDir);
  return /^\d+ (\w+) /.exec(entry)?.[1] ?? 'missing';
}

/**
 * Return every merge base of two commits. The list is empty when the histories
 * are unrelated, and has more than one entry for criss-cross histories.
 */
export async function findMergeBases(
  git: GitRunner,
  repoDir: string,
  a: string,
  b: string,
): Promise<string[]> {
  try {
    const out = await git(['merge-base', '--all', a, b], repoDir);
    return out
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch (error) {
    // git merge-base exits with status 1 and no output when no common ancestor exists.
    if (error instanceof GitCommandError && error.exitCode === 1) return [];
    throw error;
  }
}

/**
 * Return true when `ancestor` is an ancestor of (or equal to) `descendant`.
 */
export async function isAncestor(
  git: GitRunner,
  repoDir: string,
  ancestor: string,
  descendant: string,
): Promise<boolean> {
  try {
    await git(['merge-base', '--is-ancestor', ancestor, descendant], repoDir);
    return true;
  } catch (error) {
    if (error instanceof GitCommandError && error.exitCode === 1) return false;
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
  const out = await git(['diff', '-z', '--name-only', '--no-renames', base, tip], repoDir);
  return out.split('\0').filter((p) => p.length > 0);
}

/**
 * Parse the output of `git log -z --raw --no-abbrev --no-renames` with the
 * format `%x1e%H%x1f%an%x1f%ae%x1f%G?%x1f%GS%x1f%GF%x1f%GP`.
 *
 * Each commit is a `\x1e`-prefixed header ended by NUL, followed by raw diff
 * records of the form `:<mode> <mode> <sha> <sha> <status>\0<path>\0`.
 */
export function parseRawLog(output: string): CommitRecord[] {
  const records: CommitRecord[] = [];
  for (const chunk of output.split('\x1e')) {
    const headerEnd = chunk.indexOf('\0');
    const header = headerEnd === -1 ? chunk : chunk.slice(0, headerEnd);
    if (!header.includes('\x1f')) continue;

    const [
      sha = '',
      authorName = '',
      authorEmail = '',
      status = 'N',
      signer = '',
      signingKey = '',
      primaryKey = '',
    ] = header.split('\x1f');
    const blobs: Record<string, string> = {};
    const files: string[] = [];
    const tokens = headerEnd === -1 ? [] : chunk.slice(headerEnd + 1).split('\0');
    // Tokens alternate: raw record metadata, then the path it applies to.
    let meta: string | undefined;
    for (const token of tokens) {
      if (meta === undefined) {
        meta = token.replace(/^\s+/, '');
        continue;
      }
      const record = meta;
      meta = undefined;
      if (!record.startsWith(':') || token.length === 0) continue;
      files.push(token);
      blobs[token] = record.split(' ')[3] ?? '';
    }

    records.push({
      sha,
      authorName,
      authorEmail,
      signatureStatus: (SIGNATURE_STATUSES.has(status) ? status : 'E') as SignatureStatus,
      signer: signer.trim(),
      signingKey: signingKey.trim(),
      primaryKey: primaryKey.trim(),
      files,
      blobs,
    });
  }
  return records;
}

/**
 * List commits reachable from `tip` but not from `base`, newest first in
 * topological order, with author, signature status, and the post-image blob of
 * every path each commit changed.
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
      '-z',
      '--raw',
      '--no-abbrev',
      '--no-renames',
      '--topo-order',
      '--format=%x1e%H%x1f%an%x1f%ae%x1f%G?%x1f%GS%x1f%GF%x1f%GP',
      `${base}..${tip}`,
    ],
    repoDir,
  );
  return parseRawLog(out);
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
  if ((await blobIdAt(git, repoDir, rev, filePath)) === undefined) return undefined;
  return git(['cat-file', '-p', `${rev}:${filePath}`], repoDir);
}

/**
 * Return the blob id of a file at a revision, or undefined when the path does
 * not exist there. Any other failure is an error, so a lookup problem can never
 * look like a deletion.
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
    // --verify --quiet exits with status 1 and no output when the object does not exist.
    if (error instanceof GitCommandError && error.exitCode === 1) return undefined;
    throw error;
  }
}

/**
 * Return the email in an OpenPGP user ID ("Name <email>"), or the whole string
 * when it has no angle brackets.
 */
export function userIdEmail(userId: string): string {
  return (/<([^>]+)>/.exec(userId)?.[1] ?? userId).trim();
}

/**
 * Parse `gpg --with-colons --list-keys` output and return the email of every
 * user ID that the keyring marks valid: ultimate (u), full (f), or marginal (m).
 * Colon-format fields escape ":" and other bytes as \xNN.
 */
export function parseValidUserIds(colonOutput: string): string[] {
  const emails: string[] = [];
  for (const line of colonOutput.split(/\r?\n/)) {
    const fields = line.split(':');
    if (fields[0] !== 'uid' || !['u', 'f', 'm'].includes(fields[1] ?? '')) continue;
    const userId = (fields[9] ?? '').replace(/\\x([0-9a-fA-F]{2})/g, (_m, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
    if (userId.length > 0) emails.push(userIdEmail(userId));
  }
  return emails;
}

/** Returns the identities that the local keyring validates for an OpenPGP key. */
export type OpenPgpIdentityLookup = (fingerprint: string) => Promise<string[]>;

async function configValue(git: GitRunner, repoDir: string, key: string): Promise<string> {
  try {
    return (await git(['config', '--get', key], repoDir)).trim();
  } catch {
    return '';
  }
}

/**
 * Create a lookup that asks the same OpenPGP program that Git uses
 * (gpg.openpgp.program, then gpg.program, then "gpg") which user IDs of a key
 * are valid in the local keyring. Results are cached per fingerprint. Any
 * failure yields no identities, so standing fails closed.
 */
export function createOpenPgpIdentityLookup(
  git: GitRunner,
  repoDir: string,
  run: CommandRunner = createCommandRunner(),
): OpenPgpIdentityLookup {
  const cache = new Map<string, Promise<string[]>>();
  let program: Promise<string> | undefined;
  const resolveProgram = async () =>
    (await configValue(git, repoDir, 'gpg.openpgp.program')) ||
    (await configValue(git, repoDir, 'gpg.program')) ||
    'gpg';

  return (fingerprint) => {
    let result = cache.get(fingerprint);
    if (!result) {
      program ??= resolveProgram();
      result = program
        .then((gpg) =>
          run(gpg, ['--batch', '--with-colons', '--list-keys', '--', fingerprint], repoDir),
        )
        .then(parseValidUserIds, () => []);
      cache.set(fingerprint, result);
    }
    return result;
  };
}

/**
 * Return the identities that a verifier-controlled binding ties to the key that
 * signed a commit. Only good signatures (G) count. For SSH, the principal in
 * `%GS` comes from the allowed-signers file. For OpenPGP, `%GS` is a user ID
 * that the key holder chose, so the identities come from the keyring instead.
 */
export async function verifiedSignersFor(
  commit: CommitRecord,
  lookupOpenPgp: OpenPgpIdentityLookup,
): Promise<string[]> {
  if (commit.signatureStatus !== 'G') return [];
  if (/^SHA\d+:/.test(commit.signingKey)) {
    return commit.signer.length > 0 ? [commit.signer] : [];
  }
  const fingerprint = commit.primaryKey || commit.signingKey;
  return fingerprint.length > 0 ? lookupOpenPgp(fingerprint) : [];
}
