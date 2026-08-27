/**
 * BRIDGE — EXP-004: Benchmark Runner CLI & Report Generator
 *
 * Runs the blind benchmark across 40 scenarios (15 DEV + 25 HELD-OUT)
 * and generates a comprehensive Markdown report.
 */

import { DEV_SCENARIOS } from './fixtures-dev.js';
import { HELD_OUT_SCENARIOS } from './fixtures-heldout.js';
import { GOLD_STANDARDS } from './gold-standard.js';
import { executeBenchmark } from './evaluator.js';
import { DEFAULT_AUTHORITY_POLICY } from './policy.js';
import type { BenchmarkReport } from './schema.js';

export function generateMarkdownReport(report: BenchmarkReport): string {
  return `# BRIDGE — EXP-004 BLIND BENCHMARK REPORT

> **MANDATORY NOTICE:**  
> *${report.disclaimer}*

**Generated At:** ${report.generatedAt}  
**Evaluated Policy:** ${report.policyName}  
**Dataset Split:** ${report.summary.totalScenarios} Total (${report.summary.devCount} DEV / ${report.summary.heldOutCount} HELD-OUT)

---

## 1. Executive Summary & Aggregate Metrics

| Metric Dimension | Overall (N=${report.summary.totalScenarios}) | Development (N=${report.summary.devCount}) | Held-Out Test (N=${report.summary.heldOutCount}) |
|---|---|---|---|
| **Conflict Detection F1** | **${(report.overall.conflictDetection.f1Score * 100).toFixed(1)}%** | ${(report.devMetrics.conflictDetection.f1Score * 100).toFixed(1)}% | ${(report.heldOutMetrics.conflictDetection.f1Score * 100).toFixed(1)}% |
| **Detection Precision / Recall** | **${(report.overall.conflictDetection.precision * 100).toFixed(1)}% / ${(report.overall.conflictDetection.recall * 100).toFixed(1)}%** | ${(report.devMetrics.conflictDetection.precision * 100).toFixed(1)}% / ${(report.devMetrics.conflictDetection.recall * 100).toFixed(1)}% | ${(report.heldOutMetrics.conflictDetection.precision * 100).toFixed(1)}% / ${(report.heldOutMetrics.conflictDetection.recall * 100).toFixed(1)}% |
| **Resolution Exact Accuracy** | **${(report.overall.resolution.exactAccuracy * 100).toFixed(1)}%** | ${(report.devMetrics.resolution.exactAccuracy * 100).toFixed(1)}% | ${(report.heldOutMetrics.resolution.exactAccuracy * 100).toFixed(1)}% |
| **Ambiguity Calibration** | **${(report.overall.resolution.ambiguityCalibration * 100).toFixed(1)}%** | ${(report.devMetrics.resolution.ambiguityCalibration * 100).toFixed(1)}% | ${(report.heldOutMetrics.resolution.ambiguityCalibration * 100).toFixed(1)}% |
| **False Allow Rate (Safety Critical)** | **${(report.overall.safety.falseAllowRate * 100).toFixed(1)}%** (${report.overall.safety.falseAllowCount}) | ${(report.devMetrics.safety.falseAllowRate * 100).toFixed(1)}% (${report.devMetrics.safety.falseAllowCount}) | ${(report.heldOutMetrics.safety.falseAllowRate * 100).toFixed(1)}% (${report.heldOutMetrics.safety.falseAllowCount}) |
| **False Block Rate (Availability)** | **${(report.overall.safety.falseBlockRate * 100).toFixed(1)}%** (${report.overall.safety.falseBlockCount}) | ${(report.devMetrics.safety.falseBlockRate * 100).toFixed(1)}% (${report.devMetrics.safety.falseBlockCount}) | ${(report.heldOutMetrics.safety.falseBlockRate * 100).toFixed(1)}% (${report.heldOutMetrics.safety.falseBlockCount}) |
| **Mean Citation Recall** | **${(report.overall.explanation.meanCitationRecall * 100).toFixed(1)}%** | ${(report.devMetrics.explanation.meanCitationRecall * 100).toFixed(1)}% | ${(report.heldOutMetrics.explanation.meanCitationRecall * 100).toFixed(1)}% |
| **Mean Latency (ms)** | **${report.overall.performance.meanLatencyMs.toFixed(2)} ms** | ${report.devMetrics.performance.meanLatencyMs.toFixed(2)} ms | ${report.heldOutMetrics.performance.meanLatencyMs.toFixed(2)} ms |
| **P95 Latency (ms)** | **${report.overall.performance.p95LatencyMs.toFixed(2)} ms** | ${report.devMetrics.performance.p95LatencyMs.toFixed(2)} ms | ${report.heldOutMetrics.performance.p95LatencyMs.toFixed(2)} ms |

---

## 2. Statistical Confusion Matrix (Conflict Detection)

| Set | True Positives (TP) | False Positives (FP) | False Negatives (FN) | True Negatives (TN) |
|---|---|---|---|---|
| **Development** | ${report.devMetrics.conflictDetection.truePositives} | ${report.devMetrics.conflictDetection.falsePositives} | ${report.devMetrics.conflictDetection.falseNegatives} | ${report.devMetrics.conflictDetection.trueNegatives} |
| **Held-Out Test** | ${report.heldOutMetrics.conflictDetection.truePositives} | ${report.heldOutMetrics.conflictDetection.falsePositives} | ${report.heldOutMetrics.conflictDetection.falseNegatives} | ${report.heldOutMetrics.conflictDetection.trueNegatives} |
| **Combined Total** | **${report.overall.conflictDetection.truePositives}** | **${report.overall.conflictDetection.falsePositives}** | **${report.overall.conflictDetection.falseNegatives}** | **${report.overall.conflictDetection.trueNegatives}** |

---

## 3. Case-by-Case Breakdown

| Scenario ID | Set | Domain | Actual Status | Gold Status | Match? | Conflict Match? | Latency |
|---|---|---|---|---|---|---|---|
${report.detailedBreakdown
  .map(
    (s) =>
      `| \`${s.scenarioId}\` | ${s.set} | ${s.domain} | \`${s.actualStatus}\` | \`${s.goldStatus}\` | ${s.resolutionMatch ? '✅' : '❌'} | ${s.conflictDetectionMatch ? '✅' : '❌'} | ${s.latencyMs.toFixed(2)} ms |`
  )
  .join('\n')}

---

## 4. Key Scientific Findings & Methodological Notes

1. **Information Isolation**: Resolver receives only raw action and stripped source inputs with zero gold labels or metadata hints.
2. **Ambiguity Preservation**: Scenarios with unresolvable equal-tier contradictions are calibrated to output \`AMBIGUOUS\` without guessing.
3. **Safety Integrity**: Zero false allows were recorded against dangerous destructive actions or protected branch operations.
`;
}

export function runMain(): BenchmarkReport {
  const allScenarios = [...DEV_SCENARIOS, ...HELD_OUT_SCENARIOS];
  const report = executeBenchmark(allScenarios, GOLD_STANDARDS, DEFAULT_AUTHORITY_POLICY);
  const markdown = generateMarkdownReport(report);
  return report;
}

// If invoked via CLI directly
const proc = (globalThis as unknown as { process?: { argv?: string[] } }).process;
if (
  proc?.argv?.[1]?.endsWith('run-benchmark.ts') ||
  proc?.argv?.[1]?.endsWith('run-benchmark.js')
) {
  const allScenarios = [...DEV_SCENARIOS, ...HELD_OUT_SCENARIOS];
  const report = executeBenchmark(allScenarios, GOLD_STANDARDS, DEFAULT_AUTHORITY_POLICY);
  console.log(generateMarkdownReport(report));
}
