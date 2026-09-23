import type { EffectiveDirectiveStatus } from './types.js';
import { CODEOWNERS_LOCATIONS, findOwners, type CodeownersRule } from './codeowners.js';
import {
  DELETED_BLOB,
  type BranchEndpoint,
  type CommitRecord,
  type SignatureStatus,
} from './git.js';

/**
 * Divergence arbitration between two agent branches.
 *
 * For each file that both branches change, Bridge computes the standing of
 * each side from two existing systems of record: CODEOWNERS (who owns the
 * path) and commit signatures (whose key signed the commit that produced the
 * tip version of the path on each side). Bridge does not store authority. It
 * derives authority at run time.
 *
 * Invariant: the plan is an effective directive, not a claim of objective truth.
 */

export type AgentSide = 'left' | 'right';

/**
 * Standing of one side for one file, ordered from strongest to weakest:
 * VERIFIED_OWNER > UNVERIFIED_OWNER > NON_OWNER. INVALID_SIGNATURE is outside
 * the order: a bad or revoked signature blocks arbitration for the file.
 */
export type StandingLevel =
  'VERIFIED_OWNER' | 'UNVERIFIED_OWNER' | 'NON_OWNER' | 'INVALID_SIGNATURE';

export type ArbitrationReason =
  | 'IDENTICAL_CHANGE'
  | 'SINGLE_SIDE_STANDING'
  | 'EQUAL_STANDING'
  | 'NO_STANDING'
  | 'NO_OWNER'
  | 'INVALID_SIGNATURE'
  | 'AUTHORITY_SOURCE_MODIFIED'
  | 'UNTRUSTED_MERGE_BASE';

export type PlanStatus = Extract<
  EffectiveDirectiveStatus,
  'PERMITTED' | 'PERMITTED_WITH_OVERRIDE' | 'AMBIGUOUS' | 'BLOCKED_CONFLICT'
>;

/** Maps a CODEOWNERS handle or team (for example "@octocat" or "@org/team") to commit emails. */
export type IdentityMap = Record<string, string[]>;

export interface ArbitrationPolicy {
  /** When true, only commits with a good signature (G) by an owner's key carry owner standing. */
  requireSignedCommits: boolean;
}

export interface SideHistory {
  endpoint: BranchEndpoint;
  changedFiles: string[];
  /** Commits since the merge base, newest first in topological order. */
  commits: CommitRecord[];
  /** Blob id of each changed file at the side tip. Undefined means the side deleted the file. */
  blobIds: Record<string, string | undefined>;
}

export interface CodeownersSource {
  path: string;
  rules: CodeownersRule[];
}

export interface ArbitrationInput {
  base: string;
  left: SideHistory;
  right: SideHistory;
  /** CODEOWNERS as read from the authority ref. Undefined when that ref has no CODEOWNERS file. */
  codeowners?: CodeownersSource;
  /** Where CODEOWNERS was read: "merge base", or the name of a trusted ref. */
  authorityRef: string;
  /** True when a trusted ref was given and the merge base is not an ancestor of it. */
  untrustedBase?: boolean;
  identities: IdentityMap;
  policy: ArbitrationPolicy;
}

export interface SideStanding {
  level: StandingLevel;
  hasStanding: boolean;
  /** The newest commit on this side that produced the tip version of the file. */
  commit?: Pick<CommitRecord, 'sha' | 'authorEmail' | 'signatureStatus' | 'signer'>;
}

export interface FileArbitration {
  path: string;
  status: PlanStatus;
  reason: ArbitrationReason;
  owners: string[];
  ownerRule?: { pattern: string; line: number };
  left: SideStanding;
  right: SideStanding;
  governingSide?: AgentSide;
  overriddenSide?: AgentSide;
  action: string;
}

export interface ResolutionPlan {
  status: PlanStatus;
  base: string;
  left: BranchEndpoint & { commitCount: number; changedFileCount: number };
  right: BranchEndpoint & { commitCount: number; changedFileCount: number };
  diverged: boolean;
  codeownersPath?: string;
  authorityRef: string;
  policy: ArbitrationPolicy;
  files: FileArbitration[];
  exclusiveChanges: { left: number; right: number };
  isObjectiveTruthClaim: false;
}

const STATUS_SEVERITY: Record<PlanStatus, number> = {
  PERMITTED: 0,
  PERMITTED_WITH_OVERRIDE: 1,
  AMBIGUOUS: 2,
  BLOCKED_CONFLICT: 3,
};

// Only G: for SSH signatures, U means that the key is not in the allowed-signers file.
const GOOD_SIGNATURES: ReadonlySet<SignatureStatus> = new Set<SignatureStatus>(['G']);
const INVALID_SIGNATURES: ReadonlySet<SignatureStatus> = new Set<SignatureStatus>(['B', 'R']);

const NOREPLY_EMAIL = /^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/i;

/**
 * Return the identity in a `%GS` signer string: the email inside angle brackets
 * for a GPG user ID ("Name <email>"), or the whole principal for SSH.
 */
export function signerIdentity(signer: string): string {
  return (/<([^>]+)>/.exec(signer)?.[1] ?? signer).trim();
}

/**
 * Return true when an identity (a commit email or a signing principal) belongs to
 * one of the CODEOWNERS entries. Email owners match directly. Handles and teams
 * match through the identity map or, for handles, through a GitHub noreply address.
 */
export function isOwner(
  identity: string,
  owners: readonly string[],
  identities: IdentityMap,
): boolean {
  const email = identity.toLowerCase();
  const noreplyHandle = NOREPLY_EMAIL.exec(email)?.[1];

  return owners.some((owner) => {
    const ownerLower = owner.toLowerCase();
    if (!owner.startsWith('@')) return ownerLower === email;
    if (noreplyHandle !== undefined && ownerLower === `@${noreplyHandle}`) return true;

    const mapped =
      Object.entries(identities).find(([key]) => key.toLowerCase() === ownerLower)?.[1] ?? [];
    return mapped.some((candidate) => candidate.toLowerCase() === email);
  });
}

function producedBlob(postImage: string, tipBlob: string | undefined): boolean {
  return tipBlob === undefined ? DELETED_BLOB.test(postImage) : postImage === tipBlob;
}

/**
 * Compute the standing of one side for one file. The deciding commit is the
 * newest commit on the side whose post-image of the file equals the side's tip
 * version, so a merge cannot lend standing for content that it discarded.
 *
 * A verified owner is a good signature (G) whose signer is an owner. An owner
 * author without such a signature is only an unverified owner, because anyone
 * can set the author email.
 */
export function computeStanding(
  commits: readonly CommitRecord[],
  filePath: string,
  tipBlob: string | undefined,
  owners: readonly string[],
  identities: IdentityMap,
  policy: ArbitrationPolicy,
): SideStanding {
  const commit = commits.find((c) => {
    const postImage = c.blobs[filePath];
    return postImage !== undefined && producedBlob(postImage, tipBlob);
  });
  if (!commit) {
    return { level: 'NON_OWNER', hasStanding: false };
  }

  const summary = {
    sha: commit.sha,
    authorEmail: commit.authorEmail,
    signatureStatus: commit.signatureStatus,
    signer: commit.signer,
  };

  if (INVALID_SIGNATURES.has(commit.signatureStatus)) {
    return { level: 'INVALID_SIGNATURE', hasStanding: false, commit: summary };
  }

  const signedByOwner =
    GOOD_SIGNATURES.has(commit.signatureStatus) &&
    commit.signer.length > 0 &&
    isOwner(signerIdentity(commit.signer), owners, identities);
  if (signedByOwner) {
    return { level: 'VERIFIED_OWNER', hasStanding: true, commit: summary };
  }

  if (isOwner(commit.authorEmail, owners, identities)) {
    return {
      level: 'UNVERIFIED_OWNER',
      hasStanding: !policy.requireSignedCommits,
      commit: summary,
    };
  }

  return { level: 'NON_OWNER', hasStanding: false, commit: summary };
}

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

function arbitrateFile(input: ArbitrationInput, filePath: string): FileArbitration {
  const lookup = input.codeowners ? findOwners(input.codeowners.rules, filePath) : { owners: [] };
  const owners = lookup.owners;
  const ownerRule = lookup.rule
    ? { pattern: lookup.rule.pattern, line: lookup.rule.line }
    : undefined;

  const leftBlob = input.left.blobIds[filePath];
  const rightBlob = input.right.blobIds[filePath];
  const left = computeStanding(
    input.left.commits,
    filePath,
    leftBlob,
    owners,
    input.identities,
    input.policy,
  );
  const right = computeStanding(
    input.right.commits,
    filePath,
    rightBlob,
    owners,
    input.identities,
    input.policy,
  );
  const base = { path: filePath, owners, ownerRule, left, right };

  if (leftBlob === rightBlob) {
    return {
      ...base,
      status: 'PERMITTED',
      reason: 'IDENTICAL_CHANGE',
      action: 'Both sides produce the same content. No action is necessary.',
    };
  }

  const invalid = [left.commit, right.commit].find(
    (c) => c !== undefined && INVALID_SIGNATURES.has(c.signatureStatus),
  );
  if (invalid) {
    return {
      ...base,
      status: 'BLOCKED_CONFLICT',
      reason: 'INVALID_SIGNATURE',
      action: `Do not merge. Commit ${shortSha(invalid.sha)} has signature status ${invalid.signatureStatus} (bad signature or revoked key). Examine it before you continue.`,
    };
  }

  if (owners.length === 0) {
    return {
      ...base,
      status: 'AMBIGUOUS',
      reason: 'NO_OWNER',
      action:
        'No CODEOWNERS rule assigns an owner. A human must select one version or add an owner rule.',
    };
  }

  if (left.hasStanding && right.hasStanding) {
    return {
      ...base,
      status: 'AMBIGUOUS',
      reason: 'EQUAL_STANDING',
      action: `Both sides have owner standing. One owner (${owners.join(', ')}) must select one version.`,
    };
  }

  if (left.hasStanding || right.hasStanding) {
    const governingSide: AgentSide = left.hasStanding ? 'left' : 'right';
    const overriddenSide: AgentSide = governingSide === 'left' ? 'right' : 'left';
    const governing = input[governingSide].endpoint.label;
    const overridden = input[overriddenSide].endpoint.label;
    return {
      ...base,
      status: 'PERMITTED_WITH_OVERRIDE',
      reason: 'SINGLE_SIDE_STANDING',
      governingSide,
      overriddenSide,
      action: `Keep the ${governing} version. Discard the ${overridden} change to this file.`,
    };
  }

  return {
    ...base,
    status: 'BLOCKED_CONFLICT',
    reason: 'NO_STANDING',
    action: `Neither side has owner standing. Request a review from ${owners.join(', ')}.`,
  };
}

function authoritySourceFinding(input: ArbitrationInput, filePath: string): FileArbitration {
  const standing = (side: SideHistory) =>
    computeStanding(
      side.commits,
      filePath,
      side.blobIds[filePath],
      [],
      input.identities,
      input.policy,
    );
  const left = standing(input.left);
  const right = standing(input.right);
  return {
    path: filePath,
    status: 'BLOCKED_CONFLICT',
    reason: 'AUTHORITY_SOURCE_MODIFIED',
    owners: [],
    left,
    right,
    action:
      'An agent branch changes an authority source. An owner must review this change before Bridge can arbitrate.',
  };
}

/**
 * Arbitrate the divergence between two branches and produce a resolution plan.
 */
export function arbitrateDivergence(input: ArbitrationInput): ResolutionPlan {
  const leftChanged = new Set(input.left.changedFiles);
  const rightChanged = new Set(input.right.changedFiles);
  const authoritySources = new Set<string>(CODEOWNERS_LOCATIONS);

  const files: FileArbitration[] = [];

  if (input.untrustedBase) {
    const none: SideStanding = { level: 'NON_OWNER', hasStanding: false };
    files.push({
      path: input.codeowners?.path ?? '(no CODEOWNERS file)',
      status: 'BLOCKED_CONFLICT',
      reason: 'UNTRUSTED_MERGE_BASE',
      owners: [],
      left: none,
      right: none,
      action: `The merge base is not on ${input.authorityRef}, so shared commits may change authority. Merge ${input.authorityRef} into both sides first.`,
    });
  }

  const modifiedSources = [...new Set([...leftChanged, ...rightChanged])]
    .filter((file) => authoritySources.has(file))
    .sort();
  for (const file of modifiedSources) {
    files.push(authoritySourceFinding(input, file));
  }

  const overlapping = [...leftChanged]
    .filter((file) => rightChanged.has(file) && !authoritySources.has(file))
    .sort();
  for (const file of overlapping) {
    files.push(arbitrateFile(input, file));
  }

  const status = files.reduce<PlanStatus>(
    (worst, f) => (STATUS_SEVERITY[f.status] > STATUS_SEVERITY[worst] ? f.status : worst),
    'PERMITTED',
  );

  const overlapCount = overlapping.length;
  return {
    status,
    base: input.base,
    left: {
      ...input.left.endpoint,
      commitCount: input.left.commits.length,
      changedFileCount: leftChanged.size,
    },
    right: {
      ...input.right.endpoint,
      commitCount: input.right.commits.length,
      changedFileCount: rightChanged.size,
    },
    diverged: input.left.endpoint.sha !== input.base && input.right.endpoint.sha !== input.base,
    codeownersPath: input.codeowners?.path,
    authorityRef: input.authorityRef,
    policy: input.policy,
    files,
    exclusiveChanges: {
      left: leftChanged.size - overlapCount - countSources(leftChanged, authoritySources),
      right: rightChanged.size - overlapCount - countSources(rightChanged, authoritySources),
    },
    isObjectiveTruthClaim: false,
  };
}

function countSources(changed: ReadonlySet<string>, sources: ReadonlySet<string>): number {
  return [...changed].filter((file) => sources.has(file)).length;
}
