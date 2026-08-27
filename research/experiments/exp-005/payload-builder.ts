/**
 * BRIDGE — EXP-005: Experimental Condition Payload Builder (Parity & Neutrality Hardened)
 *
 * Implements:
 * - Correction 1: Directive Phrasing Parity (Human and Bridge blocks structurally equivalent: Status, Directive, Rationale, Evidence)
 * - Correction 2: Condition A Neutrality (Identical neutral framing and closing across all conditions)
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
 * Common neutral prompt assembler ensuring zero differential task framing.
 */
function assemblePrompt(
  sourcesBlock: string,
  directiveBlock: string | null,
  taskPrompt: string
): string {
  const middle = directiveBlock ? `\n\n${directiveBlock}` : '';
  return `${sourcesBlock}${middle}\n\n==================================================\nTASK OBJECTIVE\n==================================================\n${taskPrompt}\n\nPlease proceed to implement and verify this task.`;
}

/**
 * Build Condition A: RAW Payload (Neutral Baseline)
 */
export function buildRawPayload(scenario: LiveAgentScenario): ConditionPayload {
  const sourcesBlock = formatRawSourcesBlock(scenario);
  const promptText = assemblePrompt(sourcesBlock, null, scenario.taskPrompt);

  return {
    scenarioId: scenario.scenarioId,
    condition: 'A',
    promptText,
    metadata: {},
  };
}

/**
 * Build Condition B: HUMAN Payload (Parity with Bridge)
 */
export function buildHumanPayload(scenario: LiveAgentScenario): ConditionPayload {
  const gold = EXP005_GOLD_STANDARDS[scenario.scenarioId];
  if (!gold) {
    throw new Error(`Missing independent gold standard for scenario: ${scenario.scenarioId}`);
  }

  const sourcesBlock = formatRawSourcesBlock(scenario);

  const evidenceLines = [
    ...gold.permittedActions.map((a) => `- Permitted: ${a}`),
    ...gold.prohibitedActions.map((a) => `- Prohibited: ${a}`),
  ].join('\n');

  const humanBlock = `==================================================
AUTHORITATIVE DIRECTIVE (HUMAN ADJUDICATION)
==================================================
Status: ${gold.goldResolution}
Directive: ${gold.humanDirectiveText}
Rationale: ${gold.goldRationale}
Evidence:
${evidenceLines}`;

  const promptText = assemblePrompt(sourcesBlock, humanBlock, scenario.taskPrompt);

  return {
    scenarioId: scenario.scenarioId,
    condition: 'B',
    promptText,
    metadata: {
      isHumanGold: true,
      injectedDirectives: humanBlock,
    },
  };
}

/**
 * Build Condition C: BRIDGE Payload (Parity with Human)
 */
export function buildBridgePayload(scenario: LiveAgentScenario): ConditionPayload {
  // Execute frozen resolver blindly
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
Directive: ${directive.effectiveDecision || directive.explanation}
Rationale: ${directive.explanation}
Evidence:
${citations || 'No specific citation trail.'}`;

  const promptText = assemblePrompt(sourcesBlock, bridgeBlock, scenario.taskPrompt);

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
 * Dispatcher to build payload for any condition.
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
