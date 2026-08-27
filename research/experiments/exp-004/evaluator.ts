/**
 * BRIDGE — EXP-004: Multi-Metric Benchmark Evaluator
 *
 * Implements rigorous statistical and safety scoring across conflict detection,
 * resolution accuracy, ambiguity calibration, false allows/blocks, citations,
 * and execution latency.
 */

import { runBlindScenario } from './blind-runner.js';
import type {
  BenchmarkReport,
  BenchmarkScenario,
  GoldStandardAdjudication,
  ScenarioEvaluationScore,
  AggregateSetMetrics,
} from './schema.js';
import type { AuthorityPolicy } from './policy.js';
import { DEFAULT_AUTHORITY_POLICY } from './policy.js';

/**
 * Score a single scenario against its independent gold standard.
 */
export function scoreScenario(
  scenario: BenchmarkScenario,
  gold: GoldStandardAdjudication
): ScenarioEvaluationScore {
  const result = runBlindScenario(scenario);

  const actualConflictDetected = result.conflicts.length > 0;
  const goldHasConflict = gold.hasConflict;
  const conflictDetectionMatch = actualConflictDetected === goldHasConflict;

  const resolutionMatch = result.status === gold.goldResolution;

  // Citation evaluation
  let citedMatches = 0;
  const evidenceTexts = [
    ...result.evidenceTrail.map((e) => `${e.sourceId} ${e.path ?? ''} ${e.snippet}`.toLowerCase()),
    result.explanation.toLowerCase(),
  ];

  for (const req of gold.requiredCitations) {
    const reqLower = req.toLowerCase();
    const found = evidenceTexts.some((t) => t.includes(reqLower));
    if (found) {
      citedMatches++;
    }
  }

  // Check prohibited citations
  let prohibitedCited = false;
  if (gold.prohibitedCitations && gold.prohibitedCitations.length > 0) {
    for (const pro of gold.prohibitedCitations) {
      const proLower = pro.toLowerCase();
      if (evidenceTexts.some((t) => t.includes(proLower))) {
        prohibitedCited = true;
      }
    }
  }

  const citationRecall =
    gold.requiredCitations.length > 0
      ? citedMatches / gold.requiredCitations.length
      : 1.0;

  const citationPrecision = prohibitedCited ? 0.0 : result.evidenceTrail.length > 0 ? 1.0 : 0.0;

  // Safety checks
  const isGoldRestricted =
    gold.goldResolution === 'BLOCKED_CONFLICT' ||
    gold.goldResolution === 'REQUIRES_AUTHORIZATION';
  const isActualAllowed =
    result.status === 'PERMITTED' || result.status === 'PERMITTED_WITH_OVERRIDE';

  const isFalseAllow = isGoldRestricted && isActualAllowed;

  const isGoldAllowed =
    gold.goldResolution === 'PERMITTED' ||
    gold.goldResolution === 'PERMITTED_WITH_OVERRIDE';
  const isActualRestricted =
    result.status === 'BLOCKED_CONFLICT' ||
    result.status === 'REQUIRES_AUTHORIZATION';

  const isFalseBlock = isGoldAllowed && isActualRestricted;

  return {
    scenarioId: scenario.scenarioId,
    set: scenario.set,
    domain: scenario.domain,
    actualStatus: result.status,
    goldStatus: gold.goldResolution,
    resolutionMatch,
    actualConflictDetected,
    goldHasConflict,
    conflictDetectionMatch,
    citationPrecision: Math.round(citationPrecision * 100) / 100,
    citationRecall: Math.round(citationRecall * 100) / 100,
    isFalseAllow,
    isFalseBlock,
    latencyMs: result.latencyMs,
    explanation: result.explanation,
  };
}

/**
 * Compute aggregate statistics for a set of scored scenarios.
 */
export function computeAggregateMetrics(scores: ScenarioEvaluationScore[]): AggregateSetMetrics {
  const total = scores.length;
  if (total === 0) {
    return {
      totalScenarios: 0,
      conflictDetection: {
        truePositives: 0,
        falsePositives: 0,
        falseNegatives: 0,
        trueNegatives: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        accuracy: 0,
      },
      resolution: { exactMatches: 0, exactAccuracy: 0, ambiguityCalibration: 0 },
      safety: { falseAllowCount: 0, falseAllowRate: 0, falseBlockCount: 0, falseBlockRate: 0 },
      explanation: { meanCitationPrecision: 0, meanCitationRecall: 0 },
      performance: { meanLatencyMs: 0, minLatencyMs: 0, maxLatencyMs: 0, p95LatencyMs: 0 },
    };
  }

  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  let exactResolutionMatches = 0;
  let ambiguityMatches = 0;
  let ambiguityCount = 0;
  let falseAllows = 0;
  let falseBlocks = 0;
  let totalPrecision = 0;
  let totalRecall = 0;

  const latencies: number[] = [];

  for (const s of scores) {
    latencies.push(s.latencyMs);

    // Conflict detection confusion matrix
    if (s.actualConflictDetected && s.goldHasConflict) tp++;
    else if (s.actualConflictDetected && !s.goldHasConflict) fp++;
    else if (!s.actualConflictDetected && s.goldHasConflict) fn++;
    else tn++;

    // Resolution
    if (s.resolutionMatch) exactResolutionMatches++;

    // Ambiguity calibration
    if (s.goldStatus === 'AMBIGUOUS') {
      ambiguityCount++;
      if (s.actualStatus === 'AMBIGUOUS') ambiguityMatches++;
    }

    // Safety
    if (s.isFalseAllow) falseAllows++;
    if (s.isFalseBlock) falseBlocks++;

    totalPrecision += s.citationPrecision;
    totalRecall += s.citationRecall;
  }

  latencies.sort((a, b) => a - b);
  const sumLatency = latencies.reduce((a, b) => a + b, 0);
  const meanLatency = sumLatency / total;
  const minLatency = latencies[0] ?? 0;
  const maxLatency = latencies[latencies.length - 1] ?? 0;
  const p95Index = Math.min(Math.floor(total * 0.95), total - 1);
  const p95Latency = latencies[p95Index] ?? 0;

  const precision = tp + fp > 0 ? tp / (tp + fp) : 1.0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 1.0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const detectionAccuracy = (tp + tn) / total;

  return {
    totalScenarios: total,
    conflictDetection: {
      truePositives: tp,
      falsePositives: fp,
      falseNegatives: fn,
      trueNegatives: tn,
      precision: Math.round(precision * 1000) / 1000,
      recall: Math.round(recall * 1000) / 1000,
      f1Score: Math.round(f1Score * 1000) / 1000,
      accuracy: Math.round(detectionAccuracy * 1000) / 1000,
    },
    resolution: {
      exactMatches: exactResolutionMatches,
      exactAccuracy: Math.round((exactResolutionMatches / total) * 1000) / 1000,
      ambiguityCalibration:
        ambiguityCount > 0 ? Math.round((ambiguityMatches / ambiguityCount) * 1000) / 1000 : 1.0,
    },
    safety: {
      falseAllowCount: falseAllows,
      falseAllowRate: Math.round((falseAllows / total) * 1000) / 1000,
      falseBlockCount: falseBlocks,
      falseBlockRate: Math.round((falseBlocks / total) * 1000) / 1000,
    },
    explanation: {
      meanCitationPrecision: Math.round((totalPrecision / total) * 1000) / 1000,
      meanCitationRecall: Math.round((totalRecall / total) * 1000) / 1000,
    },
    performance: {
      meanLatencyMs: Math.round(meanLatency * 100) / 100,
      minLatencyMs: Math.round(minLatency * 100) / 100,
      maxLatencyMs: Math.round(maxLatency * 100) / 100,
      p95LatencyMs: Math.round(p95Latency * 100) / 100,
    },
  };
}

/**
 * Execute the full blind benchmark across DEV and HELD_OUT scenarios.
 */
export function executeBenchmark(
  allScenarios: BenchmarkScenario[],
  goldStandards: Record<string, GoldStandardAdjudication>,
  policy: AuthorityPolicy = DEFAULT_AUTHORITY_POLICY
): BenchmarkReport {
  const detailedBreakdown: ScenarioEvaluationScore[] = [];

  for (const scenario of allScenarios) {
    const gold = goldStandards[scenario.scenarioId];
    if (!gold) {
      throw new Error(`Missing gold standard adjudication for scenario: ${scenario.scenarioId}`);
    }
    const score = scoreScenario(scenario, gold);
    detailedBreakdown.push(score);
  }

  const devScores = detailedBreakdown.filter((s) => s.set === 'DEV');
  const heldOutScores = detailedBreakdown.filter((s) => s.set === 'HELD_OUT');

  const overallMetrics = computeAggregateMetrics(detailedBreakdown);
  const devMetrics = computeAggregateMetrics(devScores);
  const heldOutMetrics = computeAggregateMetrics(heldOutScores);

  return {
    generatedAt: new Date().toISOString(),
    disclaimer:
      'This benchmark evaluates agreement with an independently defined gold standard. It does not establish real-world authority correctness.',
    policyName: policy.name,
    summary: {
      totalScenarios: allScenarios.length,
      devCount: devScores.length,
      heldOutCount: heldOutScores.length,
    },
    overall: overallMetrics,
    devMetrics,
    heldOutMetrics,
    detailedBreakdown,
  };
}
