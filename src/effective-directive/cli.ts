import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import {
  arbitrateDivergence,
  type FileArbitration,
  type IdentityMap,
  type PlanStatus,
  type ResolutionPlan,
  type SideHistory,
  type SideStanding,
} from './arbitration.js';
import { CODEOWNERS_LOCATIONS, parseCodeowners, type CodeownersRule } from './codeowners.js';
import {
  blobIdAt,
  createGitRunner,
  createOpenPgpIdentityLookup,
  findMergeBases,
  isAncestor,
  listChangedFiles,
  listCommits,
  objectTypeAt,
  resolveEndpoint,
  resolveRepoRoot,
  resolveRevision,
  verifiedSignersFor,
  type BranchEndpoint,
  type GitRunner,
  type OpenPgpIdentityLookup,
} from './git.js';

/**
 * `bridge resolve`: arbitrate a divergence between two agent branches or worktrees
 * against CODEOWNERS and commit signatures.
 */

export interface ResolveCommandOptions {
  repo: string;
  left: string;
  right: string;
  /** Directory against which relative worktree paths resolve. */
  cwd: string;
  identitiesPath?: string;
  /** Trusted ref (for example "main") to read CODEOWNERS from instead of the merge base. */
  trusted?: string;
  allowUnsigned: boolean;
  json: boolean;
}

export type ParsedCli =
  | { kind: 'help' }
  | { kind: 'resolve'; options: ResolveCommandOptions }
  | { kind: 'error'; message: string };

export interface CliIo {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  cwd: string;
}

export class ResolveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResolveError';
  }
}

export const EXIT_CODES: Record<PlanStatus, number> & { ERROR: number } = {
  PERMITTED: 0,
  PERMITTED_WITH_OVERRIDE: 0,
  AMBIGUOUS: 2,
  BLOCKED_CONFLICT: 3,
  ERROR: 1,
};

export const USAGE = `Usage: bridge resolve <left> <right> [options]

Arbitrate a divergence between two agent branches or worktrees.
Bridge reads CODEOWNERS at the merge base (or at --trusted) and, for each
conflicting file on each side, the signature of the newest commit that
produced the tip version of the file. Owner standing needs a good signature
(%G? = G) by a key that your allowed-signers file (SSH) or your keyring
(OpenPGP, through a valid user ID) ties to an owner. Only committed work is
compared: uncommitted changes in a worktree are not part of the plan.

Arguments:
  <left>, <right>      A worktree directory or a Git revision (branch, tag, SHA).
                       An existing directory takes precedence. Use
                       refs/heads/<name> to select a branch that has the same
                       name as a directory.

Options:
  --repo <dir>         Repository to read (default: current directory)
  --identities <file>  JSON map from CODEOWNERS handles or teams to emails or
                       signing principals
  --trusted <ref>      Read CODEOWNERS from this revision (for example main; never
                       a directory) and block when the merge base is not on it
  --allow-unsigned     Give owner standing to owner-authored commits without an
                       owner signature (the author email is not verified)
  --json               Print the plan as JSON
  -h, --help           Show this help

Exit status:
  0  PERMITTED or PERMITTED_WITH_OVERRIDE
  2  AMBIGUOUS
  3  BLOCKED_CONFLICT
  1  Usage error or Git error
`;

/**
 * Parse command-line arguments (without the node executable and script path).
 */
export function parseCliArgs(argv: readonly string[], cwd: string): ParsedCli {
  const [command, ...rest] = argv;
  if (command === undefined || command === 'help' || command === '--help' || command === '-h') {
    return { kind: 'help' };
  }
  if (command !== 'resolve') {
    return { kind: 'error', message: `Unknown command "${command}".` };
  }

  let parsed;
  try {
    parsed = parseArgs({
      args: [...rest],
      allowPositionals: true,
      strict: true,
      options: {
        repo: { type: 'string' },
        identities: { type: 'string' },
        trusted: { type: 'string' },
        'allow-unsigned': { type: 'boolean', default: false },
        json: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
      },
    });
  } catch (error) {
    return { kind: 'error', message: (error as Error).message };
  }

  const { values, positionals } = parsed;
  if (values.help) return { kind: 'help' };

  const [left, right, ...extra] = positionals;
  if (left === undefined || right === undefined || extra.length > 0) {
    return { kind: 'error', message: 'Give exactly two endpoints: <left> <right>.' };
  }

  return {
    kind: 'resolve',
    options: {
      repo: path.resolve(cwd, values.repo ?? '.'),
      left,
      right,
      cwd,
      identitiesPath:
        values.identities === undefined ? undefined : path.resolve(cwd, values.identities),
      trusted: values.trusted,
      allowUnsigned: values['allow-unsigned'],
      json: values.json,
    },
  };
}

/**
 * Load and validate an identity map file.
 */
export function loadIdentityMap(filePath: string): IdentityMap {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (error) {
    throw new ResolveError(`Cannot read identity map ${filePath}: ${(error as Error).message}`);
  }

  const isValid =
    typeof data === 'object' &&
    data !== null &&
    !Array.isArray(data) &&
    Object.values(data).every((v) => Array.isArray(v) && v.every((e) => typeof e === 'string'));
  if (!isValid) {
    throw new ResolveError(
      `Identity map ${filePath} must be a JSON object that maps each handle to an array of strings.`,
    );
  }
  return data as IdentityMap;
}

async function loadCodeowners(
  git: GitRunner,
  repo: string,
  rev: string,
  authorityRef: string,
): Promise<{ path: string; rules: CodeownersRule[] } | undefined> {
  for (const location of CODEOWNERS_LOCATIONS) {
    if ((await blobIdAt(git, repo, rev, location)) === undefined) continue;
    const type = await objectTypeAt(git, repo, rev, location);
    if (type !== 'blob') {
      throw new ResolveError(
        `${location} at ${authorityRef} is a ${type}, not a file. Bridge cannot read CODEOWNERS from it.`,
      );
    }
    const content = await git(['cat-file', '-p', `${rev}:${location}`], repo);
    return { path: location, rules: parseCodeowners(content) };
  }
  return undefined;
}

async function ensureCommitInRepo(
  git: GitRunner,
  repo: string,
  endpoint: BranchEndpoint,
): Promise<void> {
  try {
    await git(['cat-file', '-e', `${endpoint.sha}^{commit}`], repo);
  } catch {
    throw new ResolveError(
      `Commit ${endpoint.sha} (${endpoint.label}) is not in the repository at ${repo}. Both worktrees must share one repository.`,
    );
  }
}

/**
 * Read both sides from Git and produce a resolution plan.
 */
export async function buildResolutionPlan(
  options: ResolveCommandOptions,
  git: GitRunner = createGitRunner(),
  openPgpLookup?: OpenPgpIdentityLookup,
): Promise<ResolutionPlan> {
  const repo = await resolveRepoRoot(git, options.repo);
  const lookupOpenPgp = openPgpLookup ?? createOpenPgpIdentityLookup(git, repo);
  const leftEndpoint = await resolveEndpoint(git, repo, options.left, options.cwd);
  const rightEndpoint = await resolveEndpoint(git, repo, options.right, options.cwd);
  await ensureCommitInRepo(git, repo, leftEndpoint);
  await ensureCommitInRepo(git, repo, rightEndpoint);

  const bases = await findMergeBases(git, repo, leftEndpoint.sha, rightEndpoint.sha);
  const base = bases[0];
  if (base === undefined) {
    throw new ResolveError(
      `${leftEndpoint.label} and ${rightEndpoint.label} have no common ancestor.`,
    );
  }
  if (bases.length > 1) {
    throw new ResolveError(
      `${leftEndpoint.label} and ${rightEndpoint.label} have ${bases.length} merge bases (criss-cross history). Arbitration needs one merge base: merge or rebase one side first.`,
    );
  }

  let authoritySha = base;
  let authorityRef = 'merge base';
  let authorityFullRef: string | undefined;
  let untrustedBase = false;
  if (options.trusted !== undefined) {
    // A revision only: a directory with the same name must never redirect the authority source.
    const trusted = await resolveRevision(git, repo, options.trusted);
    authoritySha = trusted.sha;
    authorityRef = options.trusted;
    authorityFullRef = trusted.fullName;
    untrustedBase = !(await isAncestor(git, repo, base, trusted.sha));
  }

  const identities = options.identitiesPath ? loadIdentityMap(options.identitiesPath) : {};
  const codeowners = await loadCodeowners(git, repo, authoritySha, authorityRef);

  const leftChanged = await listChangedFiles(git, repo, base, leftEndpoint.sha);
  const rightChanged = await listChangedFiles(git, repo, base, rightEndpoint.sha);
  const rightSet = new Set(rightChanged);
  const sources = new Set<string>(CODEOWNERS_LOCATIONS);
  const lookups = [
    ...new Set([
      ...leftChanged.filter((file) => rightSet.has(file) || sources.has(file)),
      ...rightChanged.filter((file) => sources.has(file)),
    ]),
  ];

  const collect = async (
    endpoint: BranchEndpoint,
    changedFiles: string[],
  ): Promise<SideHistory> => {
    const blobIds: Record<string, string | undefined> = {};
    for (const file of lookups) {
      blobIds[file] = await blobIdAt(git, repo, endpoint.sha, file);
    }
    const commits = await listCommits(git, repo, base, endpoint.sha);
    for (const commit of commits) {
      commit.verifiedSigners = await verifiedSignersFor(commit, lookupOpenPgp);
    }
    return { endpoint, changedFiles, commits, blobIds };
  };

  return arbitrateDivergence({
    base,
    left: await collect(leftEndpoint, leftChanged),
    right: await collect(rightEndpoint, rightChanged),
    codeowners,
    authorityRef,
    authorityFullRef,
    authoritySha,
    untrustedBase,
    identities,
    policy: { requireSignedCommits: !options.allowUnsigned },
  });
}

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

function describeEndpoint(side: ResolutionPlan['left']): string {
  return `${side.label} (${side.sha.slice(0, 7)}), ${count(side.commitCount, 'commit')}, ${count(side.changedFileCount, 'file')} changed`;
}

function describeAuthority(plan: ResolutionPlan): string {
  if (plan.authorityFullRef === undefined || plan.authoritySha === undefined) {
    return plan.authorityRef;
  }
  return `${plan.authorityRef} (${plan.authorityFullRef || 'commit'} ${plan.authoritySha.slice(0, 7)})`;
}

function describeStanding(standing: SideStanding): string {
  if (!standing.commit) return `${standing.level} (no commit on this side changed the file)`;
  const { authorEmail, signatureStatus, signer, sha } = standing.commit;
  const signedBy = signer ? ` by ${signer}` : '';
  return `${standing.level}  ${authorEmail}  sig ${signatureStatus}${signedBy}  commit ${sha.slice(0, 7)}`;
}

function describeFile(file: FileArbitration, plan: ResolutionPlan): string[] {
  const owners = file.owners.length > 0 ? file.owners.join(' ') : '(none)';
  const rule = file.ownerRule
    ? ` (rule "${file.ownerRule.pattern}", line ${file.ownerRule.line})`
    : '';
  return [
    `  ${file.path}`,
    `    Status: ${file.status} (${file.reason})`,
    `    Owners: ${owners}${rule}`,
    `    Left  [${plan.left.label}]: ${describeStanding(file.left)}`,
    `    Right [${plan.right.label}]: ${describeStanding(file.right)}`,
    `    Action: ${file.action}`,
  ];
}

/**
 * Format a resolution plan as plain text.
 */
export function formatPlanText(plan: ResolutionPlan): string {
  const lines = [
    `bridge resolve: ${plan.status}`,
    `Left:   ${describeEndpoint(plan.left)}`,
    `Right:  ${describeEndpoint(plan.right)}`,
    `Merge base: ${plan.base.slice(0, 7)}${plan.diverged ? '' : ' (no divergence: one side contains the other)'}`,
    `Authority source: ${plan.codeownersPath ?? 'no CODEOWNERS file'} at ${describeAuthority(plan)}`,
    `Policy: ${plan.policy.requireSignedCommits ? 'owner signature required for owner standing' : 'unsigned owner-authored commits accepted'}`,
    '',
  ];

  if (plan.files.length === 0) {
    lines.push('No file is changed on both sides. No conflict to arbitrate.');
  } else {
    lines.push(`Findings (${plan.files.length}):`);
    for (const file of plan.files) {
      lines.push(...describeFile(file, plan));
    }
  }

  lines.push(
    '',
    `Files changed on one side only: left ${plan.exclusiveChanges.left}, right ${plan.exclusiveChanges.right}.`,
    'This plan is an effective directive derived from CODEOWNERS and commit signatures. It is not a claim of objective truth.',
  );
  return `${lines.join('\n')}\n`;
}

/**
 * Run the CLI. Returns the process exit code.
 */
export async function runCli(
  argv: readonly string[],
  io: CliIo,
  git: GitRunner = createGitRunner(),
): Promise<number> {
  const parsed = parseCliArgs(argv, io.cwd);

  if (parsed.kind === 'help') {
    io.stdout(USAGE);
    return 0;
  }

  if (parsed.kind === 'error') {
    io.stderr(`bridge: ${parsed.message}\nRun "bridge resolve --help" for usage.\n`);
    return EXIT_CODES.ERROR;
  }

  try {
    const plan = await buildResolutionPlan(parsed.options, git);
    io.stdout(parsed.options.json ? `${JSON.stringify(plan, null, 2)}\n` : formatPlanText(plan));
    return EXIT_CODES[plan.status];
  } catch (error) {
    io.stderr(`bridge resolve: error: ${(error as Error).message}\n`);
    return EXIT_CODES.ERROR;
  }
}
