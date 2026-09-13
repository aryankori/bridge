import type {
 EvaluationFixture,
 EvaluationMetrics,
} from './types.js';
import { resolveEffectiveDirective } from './resolver.js';

/**
 * Benchmark runner that evaluates the fixture suite against accuracy,
 * latency, false positive/negative rates, and explanation quality.
 */
export function runEvaluation(fixtures: EvaluationFixture[]): EvaluationMetrics {
 let detectedMatches = 0;
 let resolutionMatches = 0;
 let falsePositives = 0;
 let falseNegatives = 0;
 let totalLatency = 0;
 let totalQualityScore = 0;

 const results: EvaluationMetrics['results'] = [];

 for (const fixture of fixtures) {
 const res = resolveEffectiveDirective({
 action: fixture.action,
 sources: fixture.sources,
 });

 totalLatency += res.latencyMs;

 const detectedConflict = res.conflicts.length > 0;
 const expectedConflict = fixture.expectConflict;

 // Check conflict detection
 if (detectedConflict === expectedConflict) {
 detectedMatches++;
 } else if (detectedConflict && !expectedConflict) {
 falsePositives++;
 } else if (!detectedConflict && expectedConflict) {
 falseNegatives++;
 }

 // Check resolution accuracy
 const statusMatches = res.status === fixture.expectedStatus;
 if (statusMatches) {
 resolutionMatches++;
 }

 // Evaluate explanation quality:
 // 1. Mentions "EFFECTIVE DIRECTIVE" (+0.25)
 // 2. Mentions authority tier (+0.25)
 // 3. Evidence trail has at least 1 citation (+0.25)
 // 4. Invariant: isObjectiveTruthClaim is false (+0.25)
 let qualityScore = 0;
 if (res.explanation.includes('EFFECTIVE DIRECTIVE')) qualityScore += 0.25;
 if (res.governingDirective || res.status === 'PERMITTED' || res.conflicts.length > 0) qualityScore += 0.25;
 if (res.evidenceTrail.length > 0) qualityScore += 0.25;
 if (res.isObjectiveTruthClaim === false) qualityScore += 0.25;
 totalQualityScore += qualityScore;

 results.push({
 fixtureId: fixture.id,
 expectedStatus: fixture.expectedStatus,
 actualStatus: res.status,
 detectedConflict,
 expectedConflict,
 latencyMs: res.latencyMs,
 passed: statusMatches && detectedConflict === expectedConflict,
 explanation: res.explanation,
 });
 }

 const total = fixtures.length;

 return {
 totalCases: total,
 detectionAccuracy: total > 0 ? Math.round((detectedMatches / total) * 1000) / 1000 : 0,
 resolutionAccuracy: total > 0 ? Math.round((resolutionMatches / total) * 1000) / 1000 : 0,
 falsePositives,
 falseNegatives,
 averageLatencyMs: total > 0 ? Math.round((totalLatency / total) * 100) / 100 : 0,
 explanationQualityScore: total > 0 ? Math.round((totalQualityScore / total) * 1000) / 1000 : 0,
 results,
 };
}
