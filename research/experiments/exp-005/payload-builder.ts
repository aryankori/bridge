/**
 * BRIDGE — EXP-005: Experimental Condition Payload Builder
 *
 * Constructs the exact prompt payloads for:
 * - Condition A: RAW (complete conflicting instruction environment)
 * - Condition B: HUMAN (environment + independent gold resolution)
 * - Condition C: BRIDGE (environment + frozen Bridge effective directive)
 */

import { resolveEffectiveDirective } from '../../../src/effective-directive/resolver.js';
import type { LiveAgentScenario, ConditionPayload, ExperimentCondition } from './schema.js';
import { EXP005_GOLD_STANDARDS } from './gold-standard.js';

export const FROZEN_RESOLVER_COMMIT = 'fc322c6';

/**
 * Format raw sources into an instruction section for the agent prompt.
 */
export function formatRawSourcesBlock(scenario: LiveAgentScenario): string {
  const sections = scenario.rawSources.map((src) => {
    const loc = src.path ? ` (${src.path})` : '';
    return `### Source: ${src.title}${loc} [Tier: ${src.tier}]\n${src.content}`;
  });

  return `==================================================\nPROJECT INSTRUCTIONS & CONTEXT\n==================================================\n\n${sections.join('\n\n')}`;
}

/**
 * Build Condition A: RAW Payload
 */
export function buildRawPayload(scenario: LiveAgentScenario): ConditionPayload {
  const sourcesBlock = formatRawSourcesBlock(scenario);
  const promptText = `${sourcesBlock}\n\n==================================================\nTASK OBJECTIVE\n==================================================\n${scenario.taskPrompt}\n\nPlease proceed to implement and verify this task.`;

  return {
    scenarioId: scenario.scenarioId,
    condition: 'A',
    promptText,
    metadata: {},
  };
}

/**
 * Build Condition B: HUMAN Payload
 */
export function buildHumanPayload(scenario: LiveAgentScenario): ConditionPayload {
  const gold = EXP005_GOLD_STANDARDS[scenario.scenarioId];
  if (!gold) {
    throw new Error(`Missing independent gold standard for scenario: ${scenario.scenarioId}`);
  }

  const sourcesBlock = formatRawSourcesBlock(scenario);
  const humanBlock = `==================================================\nAUTHORITATIVE DIRECTIVE (HUMAN ADJUDICATION)\n==================================================\n${gold.humanDirectiveText}\n\nAdjudicator Rationale: ${gold.goldRationale}`;

  const promptText = `${sourcesBlock}\n\n${humanBlock}\n\n==================================================\nTASK OBJECTIVE\n==================================================\n${scenario.taskPrompt}\n\nPlease follow the authoritative directive to implement and verify this task.`;

  return {
    scenarioId: scenario.scenarioId,
    condition: 'B',
    promptText,
    metadata: {
      isHumanGold: true,
      injectedDirectives: gold.humanDirectiveText,
    },
  };
}

/**
 * Build Condition C: BRIDGE Payload
 */
export function buildBridgePayload(scenario: LiveAgentScenario): ConditionPayload {
  // Execute the frozen resolver blindly on raw sources and action spec
  const directive = resolveEffectiveDirective({
    action: {
      id: scenario.actionSpec.id,
      description: scenario.actionSpec.description,
      category: (scenario.actionSpec.category as any) ?? 'OTHER',
      command: scenario.actionSpec.command,
      targetPath: scenario.actionSpec.targetPath,
    },
    sources: scenario.rawSources.map((s) => ({
      id: s.id,
      tier: s.tier,
      path: s.path,
      title: s.title,
      content: s.content,
      lastModified: s.lastModified,
    })),
  });

  const sourcesBlock = formatRawSourcesBlock(scenario);

  const citations = directive.evidenceTrail
    .map((e) => `- ${e.sourceId}${e.path ? ` (${e.path})` : ''}: "${e.snippet}"`)
    .join('\n');

  const bridgeBlock = `==================================================
BRIDGE EFFECTIVE DIRECTIVE (AUTOMATED RESOLUTION)
[Resolver Commit: ${FROZEN_RESOLVER_COMMIT}]
[Objective Truth Claim: false]
==================================================
Status: ${directive.status}
Governing Tier: ${directive.governingDirective?.sourceTier ?? 'NONE'}
Conflicts Detected: ${directive.conflicts.length}

Resolution Summary:
${directive.explanation}

Evidence Trail:
${citations || 'No specific citation trail.'}`;

  const promptText = `${sourcesBlock}\n\n${bridgeBlock}\n\n==================================================\nTASK OBJECTIVE\n==================================================\n${scenario.taskPrompt}\n\nPlease follow the effective directive to implement and verify this task.`;

  return {
    scenarioId: scenario.scenarioId,
    condition: 'C',
    promptText,
    metadata: {
      resolverCommit: FROZEN_RESOLVER_COMMIT,
      injectedDirectives: bridgeBlock,
    },
  };
}

/**
 * Main dispatcher to build payload for any condition.
 */
export function buildConditionPayload(
  scenario: LiveAgentScenario,
  condition: ExperimentCondition
): ConditionPayload {
  switch (condition) {
    case 'A':
      return buildRawPayload(scenario);
    case 'B':
      return buildHumanPayload(scenario);
    case 'C':
      return buildBridgePayload(scenario);
  }
}
