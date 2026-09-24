import { describe, it, expect } from 'vitest';
import {
  arbitrateDivergence,
  computeStanding,
  isOwner,
  type ArbitrationInput,
  type SideHistory,
} from '../../src/effective-directive/arbitration.js';
import { parseCodeowners } from '../../src/effective-directive/codeowners.js';
import {
  userIdEmail,
  type CommitRecord,
  type SignatureStatus,
} from '../../src/effective-directive/git.js';

const BASE = 'b'.repeat(40);
const ZERO = '0'.repeat(40);

/**
 * A commit that sets each path to the given post-image blob id. By default a good
 * signature's signer is also its verified identity, as for an SSH principal;
 * pass verifiedSigners to model an OpenPGP keyring answer.
 */
function commit(
  sha: string,
  authorEmail: string,
  blobs: Record<string, string>,
  signatureStatus: SignatureStatus = 'N',
  signer = '',
  verifiedSigners: string[] = signatureStatus === 'G' && signer ? [userIdEmail(signer)] : [],
): CommitRecord {
  return {
    sha: sha.padEnd(40, '0'),
    authorName: authorEmail,
    authorEmail,
    signatureStatus,
    signer,
    signingKey: '',
    primaryKey: '',
    verifiedSigners,
    files: Object.keys(blobs),
    blobs,
  };
}

function side(
  label: string,
  commits: CommitRecord[],
  blobIds: Record<string, string | undefined>,
  changedFiles: string[] = Object.keys(blobIds),
): SideHistory {
  return { endpoint: { label, sha: `${label}`.padEnd(40, 'f') }, changedFiles, commits, blobIds };
}

const CODEOWNERS = {
  path: '.github/CODEOWNERS',
  rules: parseCodeowners(
    ['/src/auth/ alice@example.com', '/src/ui/ @bob', '/src/team/ @org/core'].join('\n'),
  ),
};

function input(
  left: SideHistory,
  right: SideHistory,
  overrides: Partial<ArbitrationInput> = {},
): ArbitrationInput {
  return {
    base: BASE,
    left,
    right,
    codeowners: CODEOWNERS,
    authorityRef: 'merge base',
    identities: {},
    policy: { requireSignedCommits: true },
    ...overrides,
  };
}

const TOKEN = 'src/auth/token.ts';
const ALICE = 'alice@example.com';

describe('isOwner', () => {
  it('matches email owners case-insensitively', () => {
    expect(isOwner('Alice@Example.com', [ALICE], {})).toBe(true);
    expect(isOwner('eve@example.com', [ALICE], {})).toBe(false);
  });

  it('matches handles through GitHub noreply addresses', () => {
    expect(isOwner('12345+Bob@users.noreply.github.com', ['@bob'], {})).toBe(true);
    expect(isOwner('bob@users.noreply.github.com', ['@bob'], {})).toBe(true);
    expect(isOwner('bob@users.noreply.github.com', ['@alice'], {})).toBe(false);
  });

  it('matches handles and teams through the identity map', () => {
    const identities = { '@Org/Core': ['carol@example.com'], '@bob': ['bob@corp.example'] };
    expect(isOwner('carol@example.com', ['@org/core'], identities)).toBe(true);
    expect(isOwner('BOB@corp.example', ['@bob'], identities)).toBe(true);
    expect(isOwner('dave@example.com', ['@org/core'], identities)).toBe(false);
    expect(isOwner('dave@example.com', ['@unmapped'], identities)).toBe(false);
  });
});

describe('computeStanding', () => {
  const owners = [ALICE];
  const strict = { requireSignedCommits: true };
  const lenient = { requireSignedCommits: false };
  const grade = (status: SignatureStatus, signer: string, author = ALICE, policy = strict) =>
    computeStanding(
      [commit('c1', author, { f: 'x' }, status, signer)],
      'f',
      'x',
      owners,
      {},
      policy,
    );

  it('gives verified standing only to a good signature whose signer is an owner', () => {
    expect(grade('G', ALICE)).toMatchObject({ level: 'VERIFIED_OWNER', hasStanding: true });
    expect(grade('G', 'Alice <alice@example.com>', 'agent@bots.example')).toMatchObject({
      level: 'VERIFIED_OWNER',
      hasStanding: true,
    });
  });

  it('ignores the %GS user ID when no verified identity is an owner', () => {
    // OpenPGP: the key holder chose the user ID, and the keyring does not validate it.
    const spoof = computeStanding(
      [
        commit('c1', 'bob@example.com', { f: 'x' }, 'G', 'Impersonated <alice@example.com>', [
          'bob@example.com',
        ]),
      ],
      'f',
      'x',
      owners,
      {},
      strict,
    );
    expect(spoof).toMatchObject({ level: 'NON_OWNER', hasStanding: false });

    // A keyring-valid secondary user ID of the owner counts, whatever %GS shows.
    const secondary = computeStanding(
      [
        commit('c2', 'bob@example.com', { f: 'x' }, 'G', 'Bob <bob@example.com>', [
          'bob@example.com',
          ALICE,
        ]),
      ],
      'f',
      'x',
      owners,
      {},
      strict,
    );
    expect(secondary).toMatchObject({ level: 'VERIFIED_OWNER', hasStanding: true });

    // A record without the verified list (never annotated) fails closed.
    const bare = { ...commit('c3', ALICE, { f: 'x' }, 'G', ALICE), verifiedSigners: undefined };
    expect(computeStanding([bare], 'f', 'x', owners, {}, strict).level).toBe('UNVERIFIED_OWNER');
  });

  it('does not trust an owner author email that another key signed', () => {
    expect(grade('G', 'agent@bots.example')).toMatchObject({
      level: 'UNVERIFIED_OWNER',
      hasStanding: false,
    });
    expect(grade('G', '')).toMatchObject({ level: 'UNVERIFIED_OWNER', hasStanding: false });
  });

  it('treats U (untrusted key) and the other non-good statuses as unverified', () => {
    for (const status of ['U', 'N', 'E', 'X', 'Y'] as const) {
      expect(grade(status, ALICE)).toMatchObject({ level: 'UNVERIFIED_OWNER', hasStanding: false });
      expect(grade(status, ALICE, ALICE, lenient)).toMatchObject({
        level: 'UNVERIFIED_OWNER',
        hasStanding: true,
      });
    }
  });

  it('marks bad signatures and revoked keys as invalid, and non-owners as non-owners', () => {
    expect(grade('B', ALICE)).toMatchObject({ level: 'INVALID_SIGNATURE', hasStanding: false });
    expect(grade('R', ALICE, ALICE, lenient)).toMatchObject({ level: 'INVALID_SIGNATURE' });
    expect(grade('G', 'bot@bots.example', 'bot@bots.example')).toMatchObject({
      level: 'NON_OWNER',
      hasStanding: false,
    });
  });

  it('uses the newest commit that produced the tip version, not the newest that touched the file', () => {
    const commits = [
      // A merged-in owner commit whose change the side discarded (for example, git merge -s ours).
      commit('owner', ALICE, { f: 'owner-blob' }, 'G', ALICE),
      commit('agent', 'agent@bots.example', { f: 'agent-blob' }),
    ];
    const standing = computeStanding(commits, 'f', 'agent-blob', owners, {}, strict);
    expect(standing).toMatchObject({
      level: 'NON_OWNER',
      commit: { sha: 'agent'.padEnd(40, '0') },
    });
  });

  it('matches a deletion at the tip to the commit that deleted the file', () => {
    const commits = [
      commit('del', ALICE, { f: ZERO }, 'G', ALICE),
      commit('c0', 'x@y.z', { f: 'x' }),
    ];
    expect(computeStanding(commits, 'f', undefined, owners, {}, strict).level).toBe(
      'VERIFIED_OWNER',
    );
  });

  it('reports no standing when no commit produced the tip version', () => {
    const standing = computeStanding([commit('m1', ALICE, {})], 'f', 'x', owners, {}, strict);
    expect(standing).toEqual({ level: 'NON_OWNER', hasStanding: false });
  });
});

describe('arbitrateDivergence', () => {
  const signedAlice = (sha: string, blob: string) =>
    commit(sha, ALICE, { [TOKEN]: blob }, 'G', ALICE);
  const agent = (sha: string, path: string, blob: string, email = 'bot@bots.example') =>
    commit(sha, email, { [path]: blob });

  it('gives PERMITTED_WITH_OVERRIDE to the only side with verified owner standing', () => {
    const plan = arbitrateDivergence(
      input(
        side('agent-a', [signedAlice('a1', 'blob-a')], { [TOKEN]: 'blob-a' }),
        side('agent-b', [agent('b1', TOKEN, 'blob-b')], { [TOKEN]: 'blob-b' }),
      ),
    );

    expect(plan.status).toBe('PERMITTED_WITH_OVERRIDE');
    expect(plan.isObjectiveTruthClaim).toBe(false);
    expect(plan.authorityRef).toBe('merge base');
    expect(plan.authorityFullRef).toBeUndefined();
    const [file] = plan.files;
    expect(file).toMatchObject({
      path: TOKEN,
      reason: 'SINGLE_SIDE_STANDING',
      governingSide: 'left',
      overriddenSide: 'right',
      owners: [ALICE],
      ownerRule: { pattern: '/src/auth/', line: 1 },
    });
    expect(file?.left.commit?.signer).toBe(ALICE);
    expect(file?.action).toContain('Keep the agent-a version');
  });

  it('lets the right side govern when only the right side has standing', () => {
    const bobKey = '9+bob@users.noreply.github.com';
    const plan = arbitrateDivergence(
      input(
        side('agent-a', [agent('a1', 'src/ui/view.ts', 'x')], { 'src/ui/view.ts': 'x' }),
        side('agent-b', [commit('b1', bobKey, { 'src/ui/view.ts': 'y' }, 'G', bobKey)], {
          'src/ui/view.ts': 'y',
        }),
      ),
    );
    expect(plan.files[0]).toMatchObject({ governingSide: 'right', overriddenSide: 'left' });
    expect(plan.files[0]?.action).toContain('Keep the agent-b version');
  });

  it('blocks an owner author email that a non-owner key signed', () => {
    const spoof = commit('a1', ALICE, { [TOKEN]: 'x' }, 'G', 'agent@bots.example');
    const plan = arbitrateDivergence(
      input(
        side('agent-a', [spoof], { [TOKEN]: 'x' }),
        side('agent-b', [agent('b1', TOKEN, 'y')], { [TOKEN]: 'y' }),
      ),
    );
    expect(plan.status).toBe('BLOCKED_CONFLICT');
    expect(plan.files[0]).toMatchObject({
      reason: 'NO_STANDING',
      left: { level: 'UNVERIFIED_OWNER' },
    });
  });

  it('returns AMBIGUOUS when both sides have equal owner standing', () => {
    const plan = arbitrateDivergence(
      input(
        side('agent-a', [signedAlice('a1', 'x')], { [TOKEN]: 'x' }),
        side('agent-b', [signedAlice('b1', 'y')], { [TOKEN]: 'y' }),
      ),
    );
    expect(plan.status).toBe('AMBIGUOUS');
    expect(plan.files[0]?.reason).toBe('EQUAL_STANDING');
  });

  it('returns BLOCKED_CONFLICT when neither side has owner standing', () => {
    const plan = arbitrateDivergence(
      input(
        side('agent-a', [commit('a1', ALICE, { [TOKEN]: 'x' })], { [TOKEN]: 'x' }),
        side('agent-b', [agent('b1', TOKEN, 'y')], { [TOKEN]: 'y' }),
      ),
    );
    expect(plan.status).toBe('BLOCKED_CONFLICT');
    expect(plan.files[0]).toMatchObject({ reason: 'NO_STANDING' });
    expect(plan.files[0]?.action).toContain(ALICE);
  });

  it('accepts unsigned owner-authored commits when the policy allows them', () => {
    const plan = arbitrateDivergence(
      input(
        side('agent-a', [commit('a1', ALICE, { [TOKEN]: 'x' })], { [TOKEN]: 'x' }),
        side('agent-b', [agent('b1', TOKEN, 'y')], { [TOKEN]: 'y' }),
        { policy: { requireSignedCommits: false } },
      ),
    );
    expect(plan.status).toBe('PERMITTED_WITH_OVERRIDE');
  });

  it('blocks arbitration when a deciding commit has a bad signature or a revoked key', () => {
    for (const [leftStatus, rightStatus] of [
      ['B', 'N'],
      ['G', 'R'],
    ] as const) {
      const plan = arbitrateDivergence(
        input(
          side('agent-a', [commit('a1', ALICE, { [TOKEN]: 'x' }, leftStatus, ALICE)], {
            [TOKEN]: 'x',
          }),
          side('agent-b', [commit('b1', 'bot@bots.example', { [TOKEN]: 'y' }, rightStatus)], {
            [TOKEN]: 'y',
          }),
        ),
      );
      expect(plan.status).toBe('BLOCKED_CONFLICT');
      expect(plan.files[0]?.reason).toBe('INVALID_SIGNATURE');
      expect(plan.files[0]?.action).toMatch(/Commit [ab]100000 has signature status [BR]/);
    }
  });

  it('ignores a missing deciding commit when it checks signatures', () => {
    const plan = arbitrateDivergence(
      input(
        side('agent-a', [], { [TOKEN]: 'x' }),
        side('agent-b', [commit('b1', 'bot@bots.example', { [TOKEN]: 'y' }, 'B')], {
          [TOKEN]: 'y',
        }),
      ),
    );
    expect(plan.files[0]).toMatchObject({ reason: 'INVALID_SIGNATURE' });
    expect(plan.files[0]?.left).toEqual({ level: 'NON_OWNER', hasStanding: false });
  });

  it('blocks a bad signature or revoked key even on an unowned path', () => {
    const bad = arbitrateDivergence(
      input(
        side('agent-a', [commit('a1', 'bot@bots.example', { 'README.md': 'x' }, 'B')], {
          'README.md': 'x',
        }),
        side('agent-b', [commit('b1', 'bot2@bots.example', { 'README.md': 'y' })], {
          'README.md': 'y',
        }),
      ),
    );
    expect(bad.files[0]).toMatchObject({ status: 'BLOCKED_CONFLICT', reason: 'INVALID_SIGNATURE' });

    const revoked = arbitrateDivergence(
      input(
        side('agent-a', [commit('a1', 'bot@bots.example', { 'app.ts': 'x' })], { 'app.ts': 'x' }),
        side('agent-b', [commit('b1', 'bot2@bots.example', { 'app.ts': 'y' }, 'R')], {
          'app.ts': 'y',
        }),
        { codeowners: undefined },
      ),
    );
    expect(revoked.files[0]).toMatchObject({
      status: 'BLOCKED_CONFLICT',
      reason: 'INVALID_SIGNATURE',
    });
  });

  it('returns AMBIGUOUS when no rule assigns an owner', () => {
    const plan = arbitrateDivergence(
      input(
        side('agent-a', [commit('a1', ALICE, { 'README.md': 'x' }, 'G', ALICE)], {
          'README.md': 'x',
        }),
        side('agent-b', [agent('b1', 'README.md', 'y')], { 'README.md': 'y' }),
      ),
    );
    expect(plan.status).toBe('AMBIGUOUS');
    expect(plan.files[0]).toMatchObject({ reason: 'NO_OWNER', owners: [], ownerRule: undefined });
  });

  it('treats every overlap as unowned when the authority ref has no CODEOWNERS file', () => {
    const plan = arbitrateDivergence(
      input(
        side('agent-a', [signedAlice('a1', 'x')], { [TOKEN]: 'x' }),
        side('agent-b', [agent('b1', TOKEN, 'y')], { [TOKEN]: 'y' }),
        { codeowners: undefined },
      ),
    );
    expect(plan.codeownersPath).toBeUndefined();
    expect(plan.files[0]?.reason).toBe('NO_OWNER');
  });

  it('returns PERMITTED for identical changes, including deletion on both sides', () => {
    const plan = arbitrateDivergence(
      input(
        side(
          'agent-a',
          [commit('a1', 'bot@bots.example', { 'src/ui/view.ts': 's', 'old.ts': ZERO })],
          {
            'src/ui/view.ts': 's',
            'old.ts': undefined,
          },
        ),
        side(
          'agent-b',
          [commit('b1', 'bot2@bots.example', { 'src/ui/view.ts': 's', 'old.ts': ZERO })],
          {
            'src/ui/view.ts': 's',
            'old.ts': undefined,
          },
        ),
      ),
    );
    expect(plan.status).toBe('PERMITTED');
    expect(plan.files.map((f) => f.reason)).toEqual(['IDENTICAL_CHANGE', 'IDENTICAL_CHANGE']);
  });

  it('keeps identical content PERMITTED even when a side has a bad signature or revoked key', () => {
    const plan = arbitrateDivergence(
      input(
        side('agent-a', [commit('a1', 'bot@bots.example', { [TOKEN]: 's' }, 'B')], {
          [TOKEN]: 's',
        }),
        side('agent-b', [commit('b1', 'bot2@bots.example', { [TOKEN]: 's' }, 'R')], {
          [TOKEN]: 's',
        }),
      ),
    );
    expect(plan.status).toBe('PERMITTED');
    expect(plan.files[0]).toMatchObject({ status: 'PERMITTED', reason: 'IDENTICAL_CHANGE' });
  });

  it('reports a CODEOWNERS path that both sides change once', () => {
    const plan = arbitrateDivergence(
      input(
        side('agent-a', [commit('a1', 'bot@bots.example', { '.github/CODEOWNERS': 'o1' })], {
          '.github/CODEOWNERS': 'o1',
        }),
        side('agent-b', [commit('b1', 'bot2@bots.example', { '.github/CODEOWNERS': 'o2' })], {
          '.github/CODEOWNERS': 'o2',
        }),
      ),
    );
    expect(plan.files.map((f) => [f.path, f.reason])).toEqual([
      ['.github/CODEOWNERS', 'AUTHORITY_SOURCE_MODIFIED'],
    ]);
    expect(plan.exclusiveChanges).toEqual({ left: 0, right: 0 });
  });

  it('blocks when an agent branch changes an authority source, and counts exclusive changes', () => {
    const plan = arbitrateDivergence(
      input(
        side(
          'agent-a',
          [commit('a1', 'bot@bots.example', { '.github/CODEOWNERS': 'o', 'a-only.ts': 'a' })],
          { '.github/CODEOWNERS': 'o' },
          ['.github/CODEOWNERS', 'a-only.ts'],
        ),
        side(
          'agent-b',
          [commit('b1', 'bot2@bots.example', { 'b-only.ts': 'b', 'docs/CODEOWNERS': 'd' })],
          { 'docs/CODEOWNERS': 'd' },
          ['b-only.ts', 'docs/CODEOWNERS'],
        ),
      ),
    );
    expect(plan.status).toBe('BLOCKED_CONFLICT');
    expect(plan.files.map((f) => [f.path, f.reason])).toEqual([
      ['.github/CODEOWNERS', 'AUTHORITY_SOURCE_MODIFIED'],
      ['docs/CODEOWNERS', 'AUTHORITY_SOURCE_MODIFIED'],
    ]);
    expect(plan.files[0]?.left.commit?.sha).toMatch(/^a1/);
    expect(plan.files[1]?.left).toEqual({ level: 'NON_OWNER', hasStanding: false });
    expect(plan.exclusiveChanges).toEqual({ left: 1, right: 1 });
  });

  it('blocks when the merge base is not on the trusted ref', () => {
    const plan = arbitrateDivergence(
      input(side('agent-a', [], {}, []), side('agent-b', [], {}, []), {
        authorityRef: 'main',
        untrustedBase: true,
      }),
    );
    expect(plan.status).toBe('BLOCKED_CONFLICT');
    expect(plan.authorityRef).toBe('main');
    expect(plan.files[0]).toMatchObject({
      path: '.github/CODEOWNERS',
      reason: 'UNTRUSTED_MERGE_BASE',
    });
    expect(plan.files[0]?.action).toContain('not on main');

    const noOwnersFile = arbitrateDivergence(
      input(side('a', [], {}, []), side('b', [], {}, []), {
        authorityRef: 'main',
        untrustedBase: true,
        codeowners: undefined,
      }),
    );
    expect(noOwnersFile.files[0]?.path).toBe('(no CODEOWNERS file)');
  });

  it('reports the worst file status as the plan status', () => {
    const plan = arbitrateDivergence(
      input(
        side(
          'agent-a',
          [
            signedAlice('a2', '1'),
            commit('a1', 'bot@bots.example', { 'README.md': '2', 'src/ui/view.ts': '3' }),
          ],
          { [TOKEN]: '1', 'README.md': '2', 'src/ui/view.ts': '3' },
        ),
        side(
          'agent-b',
          [
            commit('b1', 'bot2@bots.example', {
              [TOKEN]: '4',
              'README.md': '5',
              'src/ui/view.ts': '6',
            }),
          ],
          { [TOKEN]: '4', 'README.md': '5', 'src/ui/view.ts': '6' },
        ),
      ),
    );
    expect(plan.files.map((f) => f.status)).toEqual([
      'AMBIGUOUS',
      'PERMITTED_WITH_OVERRIDE',
      'BLOCKED_CONFLICT',
    ]);
    expect(plan.status).toBe('BLOCKED_CONFLICT');
    expect(plan.left.commitCount).toBe(2);
    expect(plan.right.changedFileCount).toBe(3);
  });

  it('marks the plan as not diverged when one side is the merge base', () => {
    const left = side('main', [], {}, []);
    left.endpoint.sha = BASE;
    const plan = arbitrateDivergence(
      input(left, side('agent-b', [commit('b1', 'x@y.z', { f: 'f' })], {}, ['f'])),
    );
    expect(plan.diverged).toBe(false);
    expect(plan.status).toBe('PERMITTED');
    expect(plan.files).toEqual([]);
  });
});
