import {
  SourceTier,
  type ExtractedDirective,
} from './types.js';

export { SourceTier };

/**
 * Deterministic Precedence Hierarchy Weights
 * Higher number indicates higher authority standing.
 */
export const TIER_PRECEDENCE: Record<SourceTier, number> = {
  [SourceTier.EXPLICIT_HUMAN]: 100,
  [SourceTier.TASK_SPEC]: 80,
  [SourceTier.AGENT_RULES]: 60,
  [SourceTier.PROJECT_DOCS]: 40,
  [SourceTier.GIT_STATE]: 30,
  [SourceTier.DEFAULT_CONVENTION]: 10,
};

export interface DirectiveComparisonResult {
  winner?: ExtractedDirective;
  loser?: ExtractedDirective;
  isAmbiguous: boolean;
  tieBreakerApplied?: string;
  reason: string;
}

export type TieBreakerStrategy = 'MOST_RECENT' | 'SPECIFICITY' | 'NONE';

/**
 * Compare two conflicting directives according to deterministic precedence standing.
 */
export function compareDirectives(
  a: ExtractedDirective,
  b: ExtractedDirective,
  strategy: TieBreakerStrategy = 'NONE'
): DirectiveComparisonResult {
  const precedenceA = a.precedence ?? TIER_PRECEDENCE[a.sourceTier] ?? 0;
  const precedenceB = b.precedence ?? TIER_PRECEDENCE[b.sourceTier] ?? 0;

  if (precedenceA > precedenceB) {
    return {
      winner: a,
      loser: b,
      isAmbiguous: false,
      reason: `Authority tier [${a.sourceTier}] (precedence ${precedenceA}) overrides [${b.sourceTier}] (precedence ${precedenceB})`,
    };
  }

  if (precedenceB > precedenceA) {
    return {
      winner: b,
      loser: a,
      isAmbiguous: false,
      reason: `Authority tier [${b.sourceTier}] (precedence ${precedenceB}) overrides [${a.sourceTier}] (precedence ${precedenceA})`,
    };
  }

  // Equal precedence tier
  if (strategy === 'MOST_RECENT' || (a.timestamp && b.timestamp)) {
    return resolveTieBreaker(a, b, 'MOST_RECENT');
  }

  return {
    isAmbiguous: true,
    reason: `Directives from equal tier [${a.sourceTier}] conflict with no deterministic tie-breaker`,
  };
}

/**
 * Apply tie-breaking heuristics when two sources share the same authority tier.
 */
export function resolveTieBreaker(
  a: ExtractedDirective,
  b: ExtractedDirective,
  strategy: TieBreakerStrategy
): DirectiveComparisonResult {
  if (strategy === 'MOST_RECENT') {
    const timeA = a.timestamp ?? 0;
    const timeB = b.timestamp ?? 0;

    if (timeA > timeB) {
      return {
        winner: a,
        loser: b,
        isAmbiguous: false,
        tieBreakerApplied: 'MOST_RECENT',
        reason: `Tie-breaker: Directive from [${a.sourceLocation}] has newer timestamp (${timeA} > ${timeB})`,
      };
    }

    if (timeB > timeA) {
      return {
        winner: b,
        loser: a,
        isAmbiguous: false,
        tieBreakerApplied: 'MOST_RECENT',
        reason: `Tie-breaker: Directive from [${b.sourceLocation}] has newer timestamp (${timeB} > ${timeA})`,
      };
    }
  }

  return {
    isAmbiguous: true,
    reason: `Tie-breaker failed: equal tier [${a.sourceTier}] and identical or missing tie-breaker metrics`,
  };
}
