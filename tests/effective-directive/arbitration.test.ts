import { describe, it, expect } from 'vitest';
import {
  arbitrateDivergence,
  computeStanding,
  isOwner,
  type ArbitrationInput,
  type SideHistory,
} from '../../src/effective-directive/arbitration.js';
import { parseCodeowners } from '../../src/effective-directive/codeowners.js';
import type { CommitRecord, SignatureStatus } from '../../src/effective-directive/git.js';

const BASE = 'b'.repeat(40);

function commit(
  sha: string,
  authorEmail: string,
  files: string[],
  signatureStatus: SignatureStatus = 'N',
): CommitRecord {
  return {
    sha: sha.padEnd(40, '0'),
    authorName: authorEmail,
    authorEmail,
    signatureStatus,
    signer: '',
    files,
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
    identities: {},
    policy: { requireSignedCommits: true },
    ...overrides,
  };
}

describe('isOwner', () => {
  it('matches email owners case-insensitively', () => {
    expect(isOwner('Alice@Example.com', ['alice@example.com'], {})).toBe(true);
    expect(isOwner('eve@example.com', ['alice@example.com'], {})).toBe(false);
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
  const owners = ['alice@example.com'];
  const strict = { requireSignedCommits: true };
  const lenient = { requireSignedCommits: false };

  it('uses the newest commit that touched the file', () => {
    const commits = [
      commit('c2', 'agent@bots.example', ['src/auth/token.ts']),
      commit('c1', 'alice@example.com', ['src/auth/token.ts'], 'G'),
    ];
    expect(computeStanding(commits, 'src/auth/token.ts', owners, {}, strict).level).toBe(
      'NON_OWNER',
    );
  });

  it('grades owner commits by signature status', () => {
    const grade = (status: SignatureStatus, policy = strict) =>
      computeStanding([commit('c1', 'alice@example.com', ['f'], status)], 'f', owners, {}, policy);

    expect(grade('G')).toMatchObject({ level: 'VERIFIED_OWNER', hasStanding: true });
    expect(grade('U')).toMatchObject({ level: 'VERIFIED_OWNER', hasStanding: true });
    for (const status of ['N', 'E', 'X', 'Y'] as const) {
      expect(grade(status)).toMatchObject({ level: 'UNVERIFIED_OWNER', hasStanding: false });
      expect(grade(status, lenient)).toMatchObject({
        level: 'UNVERIFIED_OWNER',
        hasStanding: true,
      });
    }
    expect(grade('B')).toMatchObject({ level: 'INVALID_SIGNATURE', hasStanding: false });
    expect(grade('R', lenient)).toMatchObject({ level: 'INVALID_SIGNATURE', hasStanding: false });
  });

  it('reports no standing when no commit on the side touched the file', () => {
    const standing = computeStanding(
      [commit('m1', 'alice@example.com', [])],
      'f',
      owners,
      {},
      strict,
    );
    expect(standing).toEqual({ level: 'NON_OWNER', hasStanding: false });
  });
});

describe('arbitrateDivergence', () => {
  it('gives PERMITTED_WITH_OVERRIDE to the only side with verified owner standing', () => {
    const plan = arbitrateDivergence(
      input(
        side('agent-a', [commit('a1', 'alice@example.com', ['src/auth/token.ts'], 'G')], {
          'src/auth/token.ts': 'blob-a',
        }),
        side('agent-b', [commit('b1', 'bot@bots.example', ['src/auth/token.ts'], 'G')], {
          'src/auth/token.ts': 'blob-b',
        }),
      ),
    );

    expect(plan.status).toBe('PERMITTED_WITH_OVERRIDE');
    expect(plan.isObjectiveTruthClaim).toBe(false);
    const [file] = plan.files;
    expect(file).toMatchObject({
      path: 'src/auth/token.ts',
      reason: 'SINGLE_SIDE_STANDING',
      governingSide: 'left',
      overriddenSide: 'right',
      owners: ['alice@example.com'],
      ownerRule: { pattern: '/src/auth/', line: 1 },
    });
    expect(file?.action).toContain('Keep the agent-a version');
  });

  it('lets the right side govern when only the right side has standing', () => {
    const plan = arbitrateDivergence(
      input(
        side('agent-a', [commit('a1', 'bot@bots.example', ['src/ui/view.ts'], 'G')], {
          'src/ui/view.ts': 'x',
        }),
        side('agent-b', [commit('b1', '9+bob@users.noreply.github.com', ['src/ui/view.ts'], 'U')], {
          'src/ui/view.ts': 'y',
        }),
      ),
    );
    expect(plan.files[0]).toMatchObject({ governingSide: 'right', overriddenSide: 'left' });
    expect(plan.files[0]?.action).toContain('Keep the agent-b version');
  });

  it('returns AMBIGUOUS when both sides have equal owner standing', () => {
    const plan = arbitrateDivergence(
      input(
        side('agent-a', [commit('a1', 'alice@example.com', ['src/auth/token.ts'], 'G')], {
          'src/auth/token.ts': 'x',
        }),
        side('agent-b', [commit('b1', 'alice@example.com', ['src/auth/token.ts'], 'G')], {
          'src/auth/token.ts': 'y',
        }),
      ),
    );
    expect(plan.status).toBe('AMBIGUOUS');
    expect(plan.files[0]?.reason).toBe('EQUAL_STANDING');
  });

  it('returns BLOCKED_CONFLICT when neither side has owner standing', () => {
    const plan = arbitrateDivergence(
      input(
        side('agent-a', [commit('a1', 'alice@example.com', ['src/auth/token.ts'], 'N')], {
          'src/auth/token.ts': 'x',
        }),
        side('agent-b', [commit('b1', 'bot@bots.example', ['src/auth/token.ts'], 'G')], {
          'src/auth/token.ts': 'y',
        }),
      ),
    );
    expect(plan.status).toBe('BLOCKED_CONFLICT');
    expect(plan.files[0]).toMatchObject({ reason: 'NO_STANDING' });
    expect(plan.files[0]?.action).toContain('alice@example.com');
  });

  it('accepts unsigned owner commits when the policy allows them', () => {
    const plan = arbitrateDivergence(
      input(
        side('agent-a', [commit('a1', 'alice@example.com', ['src/auth/token.ts'], 'N')], {
          'src/auth/token.ts': 'x',
        }),
        side('agent-b', [commit('b1', 'bot@bots.example', ['src/auth/token.ts'], 'N')], {
          'src/auth/token.ts': 'y',
        }),
        { policy: { requireSignedCommits: false } },
      ),
    );
    expect(plan.status).toBe('PERMITTED_WITH_OVERRIDE');
  });

  it('blocks arbitration when a commit has a bad or revoked signature', () => {
    for (const [leftStatus, rightStatus] of [
      ['B', 'N'],
      ['G', 'R'],
    ] as const) {
      const plan = arbitrateDivergence(
        input(
          side('agent-a', [commit('a1', 'alice@example.com', ['src/auth/token.ts'], leftStatus)], {
            'src/auth/token.ts': 'x',
          }),
          side('agent-b', [commit('b1', 'bot@bots.example', ['src/auth/token.ts'], rightStatus)], {
            'src/auth/token.ts': 'y',
          }),
        ),
      );
      expect(plan.status).toBe('BLOCKED_CONFLICT');
      expect(plan.files[0]?.reason).toBe('INVALID_SIGNATURE');
      expect(plan.files[0]?.action).toMatch(/Commit [ab]100000 has a bad or revoked signature/);
    }
  });

  it('ignores a missing commit record when it checks signatures', () => {
    const plan = arbitrateDivergence(
      input(
        side('agent-a', [], { 'src/auth/token.ts': 'x' }),
        side('agent-b', [commit('b1', 'bot@bots.example', ['src/auth/token.ts'], 'B')], {
          'src/auth/token.ts': 'y',
        }),
      ),
    );
    expect(plan.files[0]).toMatchObject({ reason: 'INVALID_SIGNATURE' });
    expect(plan.files[0]?.left).toEqual({ level: 'NON_OWNER', hasStanding: false });
  });

  it('returns AMBIGUOUS when no rule assigns an owner', () => {
    const plan = arbitrateDivergence(
      input(
        side('agent-a', [commit('a1', 'alice@example.com', ['README.md'], 'G')], {
          'README.md': 'x',
        }),
        side('agent-b', [commit('b1', 'bot@bots.example', ['README.md'])], { 'README.md': 'y' }),
      ),
    );
    expect(plan.status).toBe('AMBIGUOUS');
    expect(plan.files[0]).toMatchObject({ reason: 'NO_OWNER', owners: [], ownerRule: undefined });
  });

  it('treats every overlap as unowned when the merge base has no CODEOWNERS file', () => {
    const plan = arbitrateDivergence(
      input(
        side('agent-a', [commit('a1', 'alice@example.com', ['src/auth/token.ts'], 'G')], {
          'src/auth/token.ts': 'x',
        }),
        side('agent-b', [commit('b1', 'bot@bots.example', ['src/auth/token.ts'])], {
          'src/auth/token.ts': 'y',
        }),
        { codeowners: undefined },
      ),
    );
    expect(plan.codeownersPath).toBeUndefined();
    expect(plan.files[0]?.reason).toBe('NO_OWNER');
  });

  it('returns PERMITTED for identical changes, including deletion on both sides', () => {
    const plan = arbitrateDivergence(
      input(
        side('agent-a', [commit('a1', 'bot@bots.example', ['src/ui/view.ts', 'old.ts'])], {
          'src/ui/view.ts': 'same',
          'old.ts': undefined,
        }),
        side('agent-b', [commit('b1', 'bot2@bots.example', ['src/ui/view.ts', 'old.ts'])], {
          'src/ui/view.ts': 'same',
          'old.ts': undefined,
        }),
      ),
    );
    expect(plan.status).toBe('PERMITTED');
    expect(plan.files.map((f) => f.reason)).toEqual(['IDENTICAL_CHANGE', 'IDENTICAL_CHANGE']);
  });

  it('blocks when an agent branch changes an authority source, and counts exclusive changes', () => {
    const plan = arbitrateDivergence(
      input(
        side(
          'agent-a',
          [commit('a1', 'bot@bots.example', ['.github/CODEOWNERS', 'a-only.ts'])],
          {},
          ['.github/CODEOWNERS', 'a-only.ts'],
        ),
        side('agent-b', [commit('b1', 'bot2@bots.example', ['b-only.ts', 'docs/CODEOWNERS'])], {}, [
          'b-only.ts',
          'docs/CODEOWNERS',
        ]),
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

  it('reports the worst file status as the plan status', () => {
    const plan = arbitrateDivergence(
      input(
        side(
          'agent-a',
          [
            commit('a2', 'alice@example.com', ['src/auth/token.ts'], 'G'),
            commit('a1', 'bot@bots.example', ['README.md', 'src/ui/view.ts']),
          ],
          { 'src/auth/token.ts': '1', 'README.md': '2', 'src/ui/view.ts': '3' },
        ),
        side(
          'agent-b',
          [commit('b1', 'bot2@bots.example', ['src/auth/token.ts', 'README.md', 'src/ui/view.ts'])],
          {
            'src/auth/token.ts': '4',
            'README.md': '5',
            'src/ui/view.ts': '6',
          },
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
      input(left, side('agent-b', [commit('b1', 'x@y.z', ['f'])], {}, ['f'])),
    );
    expect(plan.diverged).toBe(false);
    expect(plan.status).toBe('PERMITTED');
    expect(plan.files).toEqual([]);
  });
});
