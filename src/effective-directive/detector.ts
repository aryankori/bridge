import {
  SourceTier,
  type ConflictRecord,
  type ExtractedDirective,
  type InstructionSource,
  type IntendedAction,
  type EvidenceReference,
} from './types.js';
import { compareDirectives } from './precedence.js';

/**
 * Detect conflicts (contradictions, equal-tier ambiguities) across directives.
 */
export function detectConflicts(directives: ExtractedDirective[]): ConflictRecord[] {
  const conflicts: ConflictRecord[] = [];
  const byCategory = new Map<string, ExtractedDirective[]>();

  for (const d of directives) {
    const list = byCategory.get(d.category) ?? [];
    list.push(d);
    byCategory.set(d.category, list);
  }

  for (const [cat, group] of byCategory.entries()) {
    if (group.length < 2) continue;

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const d1 = group[i];
        const d2 = group[j];
        if (!d1 || !d2) continue;

        // If subjects/tools differ (e.g. pnpm vs npm) or polarities contradict
        const isConflict =
          (d1.subject !== d2.subject && d1.subject !== 'general' && d2.subject !== 'general') ||
          (d1.polarity === 'DENY' && d2.polarity === 'REQUIRE') ||
          (d1.polarity === 'REQUIRE' && d2.polarity === 'DENY');

        if (isConflict) {
          const comparison = compareDirectives(d1, d2);
          const evidence: EvidenceReference[] = [
            {
              sourceId: d1.sourceId,
              sourceTier: d1.sourceTier,
              path: d1.sourceLocation.split(':')[0],
              snippet: d1.rawText,
              relevance: `Mandates [${d1.statement}]`,
            },
            {
              sourceId: d2.sourceId,
              sourceTier: d2.sourceTier,
              path: d2.sourceLocation.split(':')[0],
              snippet: d2.rawText,
              relevance: `Mandates [${d2.statement}]`,
            },
          ];

          if (comparison.isAmbiguous) {
            conflicts.push({
              id: `conflict-ambiguity-${d1.id}-${d2.id}`,
              type: 'PRECEDENCE_AMBIGUITY',
              category: d1.category,
              severity: 'HIGH',
              description: `Directives from equal-standing sources conflict on ${cat}: [${d1.statement}] vs [${d2.statement}]`,
              conflictingDirectives: [d1, d2],
              evidence,
              resolutionReason: comparison.reason,
            });
          } else {
            conflicts.push({
              id: `conflict-contradiction-${d1.id}-${d2.id}`,
              type: 'CONTRADICTION',
              category: d1.category,
              severity: 'MEDIUM',
              description: `Contradiction detected: [${d1.statement}] vs [${d2.statement}]. Overridden by ${comparison.winner?.sourceTier}`,
              conflictingDirectives: [d1, d2],
              evidence,
              winningDirective: comparison.winner,
              resolutionReason: comparison.reason,
            });
          }
        }
      }
    }
  }

  return conflicts;
}

/**
 * Detect stale instructions by comparing timestamps and modern project configs.
 */
export function detectStaleness(sources: InstructionSource[]): ConflictRecord[] {
  const staleRecords: ConflictRecord[] = [];

  for (const src of sources) {
    const content = src.content.toLowerCase();

    // Check for deprecated Node version references in documentation (e.g. Node 14/16/18 or Node version 16)
    const hasDeprecatedNode = /node.*?(?:12|14|16|18)(?:\.\d+)?/i.test(content);
    if (hasDeprecatedNode) {
      const isModernRepo = sources.some(
        (s) =>
          s.content.includes('>=20') ||
          s.content.includes('"node": ">=20') ||
          s.content.includes('v20') ||
          s.content.includes('v22') ||
          s.content.includes('v24')
      );

      if (isModernRepo) {
        staleRecords.push({
          id: `stale-node-${src.id}`,
          type: 'STALE_INSTRUCTION',
          category: 'GENERAL_CONSTRAINT',
          severity: 'LOW',
          description: `Stale instruction in [${src.title}]: references deprecated Node version while repository engines require Node >=20.0.0`,
          conflictingDirectives: [],
          evidence: [
            {
              sourceId: src.id,
              sourceTier: src.tier,
              path: src.path,
              snippet: src.content.slice(0, 100),
              relevance: 'References outdated environment requirement',
            },
          ],
          resolutionReason: 'Active package.json / modern repo rules supersede stale documentation.',
        });
      }
    }
  }

  return staleRecords;
}

export interface AuthorizationCheckResult {
  isAuthorized: boolean;
  missingAuthorizationReason?: string;
  conflict?: ConflictRecord;
}

/**
 * Detect missing authorization for destructive, security-sensitive, or branch-violating actions.
 */
export function detectMissingAuthorization(
  action: IntendedAction,
  directives: ExtractedDirective[]
): AuthorizationCheckResult {
  const isDestructive =
    action.category === 'FILE_DELETION' ||
    action.gitOperation?.isDestructive ||
    action.gitOperation?.force ||
    (action.command && (action.command.includes('rm -rf') || action.command.includes('--force')));

  const touchesProtectedBranch =
    action.gitOperation?.branch === 'main' ||
    action.gitOperation?.branch === 'master' ||
    (action.command && (action.command.includes('push origin main') || action.command.includes('push origin master')));

  // Check if there is an explicit human instruction authorizing this action
  const hasHumanAuthorization = directives.some(
    (d) =>
      d.sourceTier === SourceTier.EXPLICIT_HUMAN &&
      (d.polarity === 'ALLOW' || d.polarity === 'REQUIRE')
  );

  if ((isDestructive || touchesProtectedBranch) && !hasHumanAuthorization) {
    const reason = touchesProtectedBranch
      ? `Action targets protected branch [${action.gitOperation?.branch || 'main'}] without explicit human authorization.`
      : `Action performs destructive operation [${action.description}] without explicit human authorization.`;

    const conflict: ConflictRecord = {
      id: `auth-${action.id}`,
      type: 'MISSING_AUTHORIZATION',
      category: action.category,
      severity: 'BLOCKING',
      description: reason,
      conflictingDirectives: directives.filter((d) => d.category === action.category),
      evidence: directives
        .filter((d) => d.category === action.category || d.category === 'BRANCH_POLICY')
        .map((d) => ({
          sourceId: d.sourceId,
          sourceTier: d.sourceTier,
          path: d.sourceLocation.split(':')[0],
          snippet: d.rawText,
          relevance: 'Protected operation boundary',
        })),
      resolutionReason: 'Destructive and protected branch operations strictly require EXPLICIT_HUMAN authorization.',
    };

    return {
      isAuthorized: false,
      missingAuthorizationReason: reason,
      conflict,
    };
  }

  return { isAuthorized: true };
}
