import { describe, it, expect } from 'vitest';
import { DEV_SCENARIOS } from '../../research/experiments/exp-004/fixtures-dev.js';
import { HELD_OUT_SCENARIOS } from '../../research/experiments/exp-004/fixtures-heldout.js';
import { GOLD_STANDARDS } from '../../research/experiments/exp-004/gold-standard.js';
import { sanitizeBlindInput } from '../../research/experiments/exp-004/blind-runner.js';
import {
 scoreScenario,
 executeBenchmark,
} from '../../research/experiments/exp-004/evaluator.js';
import { generateMarkdownReport } from '../../research/experiments/exp-004/run-benchmark.js';
import { DEFAULT_AUTHORITY_POLICY } from '../../research/experiments/exp-004/policy.js';

describe('EXP-004 Blind Benchmark Infrastructure', () => {
 it('has valid train / held-out split with independent gold standards', () => {
 expect(DEV_SCENARIOS.length).toBe(15);
 expect(HELD_OUT_SCENARIOS.length).toBe(25);
 expect(DEV_SCENARIOS.length + HELD_OUT_SCENARIOS.length).toBe(40);

 // Verify all scenarios have corresponding independent gold standards
 const allScenarios = [...DEV_SCENARIOS, ...HELD_OUT_SCENARIOS];
 for (const s of allScenarios) {
 expect(GOLD_STANDARDS[s.scenarioId]).toBeDefined();
 expect(GOLD_STANDARDS[s.scenarioId]?.adjudicator).toBeDefined();
 expect(GOLD_STANDARDS[s.scenarioId]?.goldResolution).toBeDefined();
 }
 });

 it('strictly isolates blind scenario input from evaluation metadata', () => {
 const scenario = HELD_OUT_SCENARIOS[0];
 if (!scenario) throw new Error('Missing scenario');

 const blind = sanitizeBlindInput(scenario);
 expect(blind.scenarioId).toBe(scenario.scenarioId);
 expect((blind as unknown as Record<string, unknown>).set).toBeUndefined();
 expect((blind as unknown as Record<string, unknown>).domain).toBeUndefined();
 expect((blind as unknown as Record<string, unknown>).goldResolution).toBeUndefined();
 expect((blind as unknown as Record<string, unknown>).goldRationale).toBeUndefined();
 });

 it('runs blind execution and scores a scenario accurately', () => {
 const scenario = DEV_SCENARIOS[0];
 if (!scenario) throw new Error('Missing dev scenario');

 const gold = GOLD_STANDARDS[scenario.scenarioId];
 if (!gold) throw new Error('Missing gold standard');

 const score = scoreScenario(scenario, gold);
 expect(score.scenarioId).toBe(scenario.scenarioId);
 expect(score.resolutionMatch).toBe(true);
 expect(score.conflictDetectionMatch).toBe(true);
 expect(score.isFalseAllow).toBe(false);
 expect(score.isFalseBlock).toBe(false);
 });

 it('executes full benchmark and produces honest aggregate metrics', () => {
 const allScenarios = [...DEV_SCENARIOS, ...HELD_OUT_SCENARIOS];
 const report = executeBenchmark(allScenarios, GOLD_STANDARDS, DEFAULT_AUTHORITY_POLICY);

 expect(report.summary.totalScenarios).toBe(40);
 expect(report.summary.devCount).toBe(15);
 expect(report.summary.heldOutCount).toBe(25);

 // Performance & latency
 expect(report.overall.performance.meanLatencyMs).toBeLessThan(10);
 expect(report.overall.performance.p95LatencyMs).toBeLessThan(50);

 // Conflict detection (Honest baseline benchmark metrics)
 expect(report.overall.conflictDetection.precision).toBeGreaterThanOrEqual(0.8);
 expect(report.overall.conflictDetection.recall).toBeGreaterThanOrEqual(0.7);
 expect(report.overall.conflictDetection.f1Score).toBeGreaterThanOrEqual(0.75);

 // Resolution accuracy
 expect(report.overall.resolution.exactAccuracy).toBeGreaterThanOrEqual(0.7);
 expect(report.heldOutMetrics.resolution.exactAccuracy).toBeGreaterThanOrEqual(0.7);

 // Safety
 expect(report.overall.safety.falseAllowRate).toBe(0); // Zero unsafe false allows
 });

 it('generates markdown report containing mandatory disclaimer', () => {
 const allScenarios = [...DEV_SCENARIOS, ...HELD_OUT_SCENARIOS];
 const report = executeBenchmark(allScenarios, GOLD_STANDARDS, DEFAULT_AUTHORITY_POLICY);
 const md = generateMarkdownReport(report);

 expect(md).toContain('# BRIDGE - EXP-004 BLIND BENCHMARK REPORT');
 expect(md).toContain(
 'This benchmark evaluates agreement with an independently defined gold standard. It does not establish real-world authority correctness.'
 );
 expect(md).toContain('Executive Summary & Aggregate Metrics');
 });
});
