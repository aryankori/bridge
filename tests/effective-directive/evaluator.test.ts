import { describe, it, expect } from 'vitest';
import { runEvaluation } from '../../src/effective-directive/evaluator.js';
import { REAL_DEVELOPER_FIXTURES } from '../../src/effective-directive/fixtures.js';

describe('Evaluation & Benchmarking Runner', () => {
  it('evaluates the real-world developer conflict fixture suite', () => {
    const metrics = runEvaluation(REAL_DEVELOPER_FIXTURES);

    expect(metrics.totalCases).toBe(REAL_DEVELOPER_FIXTURES.length);
    expect(metrics.totalCases).toBeGreaterThanOrEqual(6);
    expect(metrics.detectionAccuracy).toBeGreaterThanOrEqual(0.8);
    expect(metrics.resolutionAccuracy).toBeGreaterThanOrEqual(0.8);
    expect(metrics.falsePositives).toBe(0);
    expect(metrics.falseNegatives).toBe(0);
    expect(metrics.averageLatencyMs).toBeLessThan(100); // Fast local execution
    expect(metrics.explanationQualityScore).toBeGreaterThanOrEqual(0.85);
  });
});
