/**
 * BRIDGE - EXP-004: Blind Scenario Execution Runner
 *
 * Enforces strict information isolation: strips all gold metadata, domain labels,
 * expected outcomes, and solution hints before passing input to the resolver.
 */

import { resolveEffectiveDirective } from '../../../src/effective-directive/resolver.js';
import type { EffectiveDirectiveResult } from '../../../src/effective-directive/types.js';
import type { BenchmarkScenario, BlindScenarioInput } from './schema.js';

/**
 * Strips all evaluation metadata, returning pure blind input.
 */
export function sanitizeBlindInput(scenario: BenchmarkScenario): BlindScenarioInput {
 return {
 scenarioId: scenario.scenarioId,
 action: {
 id: scenario.action.id,
 description: scenario.action.description,
 category: scenario.action.category,
 command: scenario.action.command,
 targetPath: scenario.action.targetPath,
 gitOperation: scenario.action.gitOperation
 ? {
 branch: scenario.action.gitOperation.branch,
 force: scenario.action.gitOperation.force,
 isDestructive: scenario.action.gitOperation.isDestructive,
 }
 : undefined,
 },
 rawSources: scenario.rawSources.map((src) => ({
 id: src.id,
 tier: src.tier,
 path: src.path,
 title: src.title,
 content: src.content,
 lastModified: src.lastModified,
 })),
 };
}

/**
 * Execute a blind resolution of a scenario.
 */
export function runBlindScenario(scenario: BenchmarkScenario): EffectiveDirectiveResult {
 const blindInput = sanitizeBlindInput(scenario);
 return resolveEffectiveDirective({
 action: blindInput.action,
 sources: blindInput.rawSources,
 });
}
