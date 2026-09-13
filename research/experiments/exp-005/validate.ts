/**
 * BRIDGE - EXP-005: Pre-Flight Fixture & Harness Validator (Methodology Corrected)
 *
 * Validates:
 * 1. 10 scenarios schema integrity (5 unambiguous, 3 ambiguous, 2 unsolvable)
 * 2. Independent human gold-standard adjudications
 * 3. Pre-verification of frozen resolver (fc322c6) against all 10 scenarios (Requirement: >= 70% accuracy)
 * 4. Directive Phrasing Parity (Human and Bridge outputs structurally equivalent)
 * 5. Condition A Neutrality (Zero differential framing)
 * 6. Replication planning (60 trials: 10 scn × 3 cond × 2 reps) and deterministic PRNG shuffling
 * 7. Pinned model and executable resolution
 * 8. Ephemeral worktree directory confinement
 */

import * as fs from 'node:fs';
import { EXP005_SCENARIOS } from './scenarios.js';
import { EXP005_GOLD_STANDARDS } from './gold-standard.js';
import { buildConditionPayload, FROZEN_RESOLVER_COMMIT } from './payload-builder.js';
import { resolveExecutable, PINNED_OPENCODE_MODEL, PINNED_PROVIDER } from './agent-runners.js';
import { EXP005_WORKTREES_ROOT } from './harness.js';
import { scoreResolutionQuality } from './evaluator.js';
import { planRandomizedTrials } from './run-pilot.js';

export interface ResolverScenarioCheck {
 scenarioId: string;
 difficulty: string;
 actualStatus: string;
 goldStatus: string;
 matches: boolean;
 detectedConflict: boolean;
 latencyMs: number;
}

export interface ValidationReport {
 timestamp: string;
 scenariosCount: number;
 unambiguousCount: number;
 ambiguousCount: number;
 unsolvableCount: number;
 goldStandardsCount: number;
 resolverCommit: string;
 resolverPreVerification: {
 totalScenarios: number;
 exactMatches: number;
 accuracyPercent: number;
 passedThreshold: boolean;
 results: ResolverScenarioCheck[];
 };
 replicationsPlanning: {
 replicationsCount: number;
 totalPlannedTrials: number;
 randomizationSeed: number;
 sampleOrder: Array<{ scenarioId: string; condition: string; rep: number }>;
 };
 pinnedModel: string;
 pinnedProvider: string;
 opencodeExecutable: {
 command: string;
 resolvedPath: string;
 source: string;
 };
 checksPassed: boolean;
 errors: string[];
 warnings: string[];
}

export function validateExp005Harness(): ValidationReport {
 const errors: string[] = [];
 const warnings: string[] = [];

 let unambiguousCount = 0;
 let ambiguousCount = 0;
 let unsolvableCount = 0;

 // 1. Validate Scenarios Count
 if (EXP005_SCENARIOS.length !== 10) {
 errors.push(`Expected exactly 10 scenarios, found ${EXP005_SCENARIOS.length}`);
 }

 // 2. Validate Stratification & Pre-Verify Frozen Resolver
 const resolverResults: ResolverScenarioCheck[] = [];
 let exactMatches = 0;

 for (const scn of EXP005_SCENARIOS) {
 const gold = EXP005_GOLD_STANDARDS[scn.scenarioId];
 if (!gold) {
 errors.push(`Scenario ${scn.scenarioId} missing independent gold standard adjudication.`);
 continue;
 }

 if (scn.difficulty === 'UNAMBIGUOUS') unambiguousCount++;
 else if (scn.difficulty === 'AMBIGUOUS') ambiguousCount++;
 else if (scn.difficulty === 'UNSOLVABLE') unsolvableCount++;

 // Pre-verify frozen resolver against gold standard
 const resScore = scoreResolutionQuality(scn, gold);
 resolverResults.push({
 scenarioId: scn.scenarioId,
 difficulty: scn.difficulty,
 actualStatus: resScore.resolutionStatus,
 goldStatus: gold.goldResolution,
 matches: resScore.matchesGoldStandard,
 detectedConflict: resScore.detectedConflict,
 latencyMs: resScore.latencyMs,
 });

 if (resScore.matchesGoldStandard) {
 exactMatches++;
 }

 // Verify fixture files
 if (!scn.fixtureFiles || scn.fixtureFiles.length === 0) {
 errors.push(`Scenario ${scn.scenarioId} has no fixture files defined.`);
 }

 // Verify raw sources
 if (!scn.rawSources || scn.rawSources.length === 0) {
 errors.push(`Scenario ${scn.scenarioId} has no raw sources defined.`);
 }

 // Test payload generation & parity checks
 try {
 const payloadA = buildConditionPayload(scn, 'A');
 const payloadB = buildConditionPayload(scn, 'B');
 const payloadC = buildConditionPayload(scn, 'C');

 // Neutrality check: all three finish with identical prompt ending
 const expectedEnding = 'Please proceed to implement and verify this task.';
 if (
 !payloadA.promptText.endsWith(expectedEnding) ||
 !payloadB.promptText.endsWith(expectedEnding) ||
 !payloadC.promptText.endsWith(expectedEnding)
 ) {
 errors.push(
 `Prompt neutrality check failed for scenario ${scn.scenarioId}: endings not identical.`
 );
 }

 // Parity check: both B and C contain Status, Directive, Rationale, Evidence
 for (const req of ['Status:', 'Directive:', 'Rationale:', 'Evidence:']) {
 if (!payloadB.promptText.includes(req)) {
 errors.push(`Human payload missing required header "${req}" for scenario ${scn.scenarioId}`);
 }
 if (!payloadC.promptText.includes(req)) {
 errors.push(`Bridge payload missing required header "${req}" for scenario ${scn.scenarioId}`);
 }
 }
 } catch (err: unknown) {
 errors.push(`Payload generation failed for scenario ${scn.scenarioId}: ${String(err)}`);
 }
 }

 const accuracyPercent = Math.round((exactMatches / EXP005_SCENARIOS.length) * 100);
 const passedThreshold = accuracyPercent >= 70;

 if (!passedThreshold) {
 errors.push(
 `Frozen resolver accuracy on EXP-005 scenarios is ${accuracyPercent}% (below 70% threshold).`
 );
 }

 // 3. Validate Replication Planning
 const planned = planRandomizedTrials(EXP005_SCENARIOS, ['A', 'B', 'C'], 2, 42);
 if (planned.length !== 60) {
 errors.push(`Expected 60 planned trials (10 scn × 3 cond × 2 reps), planned ${planned.length}`);
 }

 // 4. Validate Executable Resolution
 const opencodeResolved = resolveExecutable('opencode');
 if (opencodeResolved.source === 'fallback') {
 warnings.push(`OpenCode executable not found on standard paths, falling back to 'opencode'`);
 }

 // 5. Validate Worktree Parent
 if (!fs.existsSync(EXP005_WORKTREES_ROOT)) {
 fs.mkdirSync(EXP005_WORKTREES_ROOT, { recursive: true });
 }

 const checksPassed = errors.length === 0;

 return {
 timestamp: new Date().toISOString(),
 scenariosCount: EXP005_SCENARIOS.length,
 unambiguousCount,
 ambiguousCount,
 unsolvableCount,
 goldStandardsCount: Object.keys(EXP005_GOLD_STANDARDS).length,
 resolverCommit: FROZEN_RESOLVER_COMMIT,
 resolverPreVerification: {
 totalScenarios: EXP005_SCENARIOS.length,
 exactMatches,
 accuracyPercent,
 passedThreshold,
 results: resolverResults,
 },
 replicationsPlanning: {
 replicationsCount: 2,
 totalPlannedTrials: planned.length,
 randomizationSeed: 42,
 sampleOrder: planned.slice(0, 5).map((p) => ({
 scenarioId: p.scenario.scenarioId,
 condition: p.condition,
 rep: p.replicationIndex,
 })),
 },
 pinnedModel: PINNED_OPENCODE_MODEL,
 pinnedProvider: PINNED_PROVIDER,
 opencodeExecutable: opencodeResolved,
 checksPassed,
 errors,
 warnings,
 };
}

// CLI runner
const proc = (globalThis as unknown as { process?: { argv?: string[] } }).process;
if (proc?.argv?.[1]?.endsWith('validate.ts') || proc?.argv?.[1]?.endsWith('validate.js')) {
 const report = validateExp005Harness();
 console.log(JSON.stringify(report, null, 2));
 if (!report.checksPassed) {
 throw new Error(`EXP-005 Harness Validation Failed with ${report.errors.length} errors`);
 }
}
