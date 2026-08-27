import { describe, it, expect } from 'vitest';
import { EXP005_SCENARIOS } from '../../research/experiments/exp-005/scenarios.js';
import { EXP005_GOLD_STANDARDS } from '../../research/experiments/exp-005/gold-standard.js';
import {
  buildConditionPayload,
} from '../../research/experiments/exp-005/payload-builder.js';
import {
  scoreResolutionQuality,
  buildExperimentManifest,
  evaluateExplanationGrounding,
} from '../../research/experiments/exp-005/evaluator.js';
import { validateExp005Harness } from '../../research/experiments/exp-005/validate.js';
import { scrubSecrets } from '../../research/experiments/exp-005/security.js';
import { planRandomizedTrials } from '../../research/experiments/exp-005/run-pilot.js';
import type { TrialTelemetry } from '../../research/experiments/exp-005/schema.js';

describe('EXP-005 Live Agent Behavior Experiment Infrastructure (Methodology Corrected)', () => {
  it('contains exactly 10 stratified scenarios (5 unambiguous, 3 ambiguous, 2 unsolvable)', () => {
    expect(EXP005_SCENARIOS.length).toBe(10);

    const unambiguous = EXP005_SCENARIOS.filter((s) => s.difficulty === 'UNAMBIGUOUS');
    const ambiguous = EXP005_SCENARIOS.filter((s) => s.difficulty === 'AMBIGUOUS');
    const unsolvable = EXP005_SCENARIOS.filter((s) => s.difficulty === 'UNSOLVABLE');

    expect(unambiguous.length).toBe(5);
    expect(ambiguous.length).toBe(3);
    expect(unsolvable.length).toBe(2);
  });

  it('enforces Directive Phrasing Parity and Condition A Neutrality across payloads', () => {
    for (const scn of EXP005_SCENARIOS) {
      const payloadA = buildConditionPayload(scn, 'A');
      const payloadB = buildConditionPayload(scn, 'B');
      const payloadC = buildConditionPayload(scn, 'C');

      // Neutrality: Identical prompt ending
      const expectedEnding = 'Please proceed to implement and verify this task.';
      expect(payloadA.promptText.endsWith(expectedEnding)).toBe(true);
      expect(payloadB.promptText.endsWith(expectedEnding)).toBe(true);
      expect(payloadC.promptText.endsWith(expectedEnding)).toBe(true);

      // Parity: Human and Bridge payloads contain Status, Directive, Rationale, Evidence
      for (const header of ['Status:', 'Directive:', 'Rationale:', 'Evidence:']) {
        expect(payloadB.promptText).toContain(header);
        expect(payloadC.promptText).toContain(header);
      }

      // Condition A must NOT receive directive injection
      expect(payloadA.promptText).not.toContain('AUTHORITATIVE DIRECTIVE');
      expect(payloadA.promptText).not.toContain('BRIDGE EFFECTIVE DIRECTIVE');
    }
  });

  it('pre-verifies frozen resolver (fc322c6) achieves >= 70% accuracy against gold standards', () => {
    let exactMatches = 0;

    for (const scn of EXP005_SCENARIOS) {
      const gold = EXP005_GOLD_STANDARDS[scn.scenarioId];
      if (!gold) throw new Error(`Missing gold standard for ${scn.scenarioId}`);

      const resQuality = scoreResolutionQuality(scn, gold);
      if (resQuality.matchesGoldStandard) {
        exactMatches++;
      }
    }

    const accuracyPercent = (exactMatches / EXP005_SCENARIOS.length) * 100;
    expect(accuracyPercent).toBeGreaterThanOrEqual(70);
  });

  it('supports configurable replications and deterministic PRNG shuffling (60 trials for N=2)', () => {
    const trialsN2 = planRandomizedTrials(EXP005_SCENARIOS, ['A', 'B', 'C'], 2, 42);
    expect(trialsN2.length).toBe(60); // 10 scn × 3 cond × 2 reps

    const trialsN1 = planRandomizedTrials(EXP005_SCENARIOS, ['A', 'B', 'C'], 1, 42);
    expect(trialsN1.length).toBe(30);

    // Verify determinism with same seed
    const trialsN2Repeat = planRandomizedTrials(EXP005_SCENARIOS, ['A', 'B', 'C'], 2, 42);
    expect(trialsN2[0]?.scenario.scenarioId).toBe(trialsN2Repeat[0]?.scenario.scenarioId);
    expect(trialsN2[0]?.condition).toBe(trialsN2Repeat[0]?.condition);

    // Verify different seed produces different ordering
    const trialsN2Seed99 = planRandomizedTrials(EXP005_SCENARIOS, ['A', 'B', 'C'], 2, 99);
    const isDifferent = trialsN2.some((t, i) => t.scenario.scenarioId !== trialsN2Seed99[i]?.scenario.scenarioId);
    expect(isDifferent).toBe(true);
  });

  it('evaluates deterministic concept-grounded explanation scoring', () => {
    const scn = EXP005_SCENARIOS[0];
    if (!scn) throw new Error('Missing scenario');
    const gold = EXP005_GOLD_STANDARDS[scn.scenarioId];
    if (!gold) throw new Error('Missing gold standard');

    // Good explanation citing rule and function
    const goodExp = 'Created helper in packages/data/src/formatter.ts adhering to format_user_name data rule.';
    const goodEval = evaluateExplanationGrounding(scn, gold, goodExp);
    expect(goodEval.grounded).toBe(true);
    expect(goodEval.score).toBeGreaterThanOrEqual(0.66);

    // Empty explanation
    const emptyEval = evaluateExplanationGrounding(scn, gold, '');
    expect(emptyEval.grounded).toBe(false);
    expect(emptyEval.score).toBe(0);
  });

  it('builds manifest with stratified and overall reporting', () => {
    const scn = EXP005_SCENARIOS[0];
    if (!scn) throw new Error('Missing scenario');

    const sampleTelemetry: TrialTelemetry = {
      experimentId: 'EXP-005',
      trialId: 'test-trial-1',
      scenarioId: scn.scenarioId,
      replicationIndex: 1,
      trialOrderIndex: 1,
      condition: 'C',
      randomizationSeed: 42,
      model: 'nvidia/nvidia/nemotron-3-super-120b-a12b',
      provider: 'nvidia',
      bridgeCommit: 'fc322c6',
      resolverCommit: 'fc322c6',
      startingCommit: 'fc322c6',
      timestamp: new Date().toISOString(),
      worktreePath: 'test/path',
      payloadHash: 'abc123hash',
      payload: buildConditionPayload(scn, 'C'),
      execution: {
        durationMs: 5000,
        exitCode: 0,
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        toolCallCount: 2,
        stdout: 'Created format_user_name helper adhering to data package rule in packages/data/src/formatter.ts.',
        stderr: '',
      },
      gitPatch: 'export function format_user_name(first: string, last: string) { return `${first} ${last}`; }',
      verification: {
        testsPassed: true,
        exitCode: 0,
        stdout: 'All tests passed',
        stderr: '',
        durationMs: 1000,
      },
    };

    const manifest = buildExperimentManifest([sampleTelemetry], EXP005_SCENARIOS, {
      randomizationSeed: 42,
      replicationsCount: 2,
    });

    expect(manifest.experimentId).toBe('EXP-005');
    expect(manifest.overallAggregates.C).toBeDefined();
    expect(manifest.stratifiedAggregates.unambiguous.C).toBeDefined();
    expect(manifest.stratifiedAggregates.ambiguous.C).toBeDefined();
    expect(manifest.stratifiedAggregates.unsolvable.C).toBeDefined();
    expect(manifest.randomizationSeed).toBe(42);
    expect(manifest.replicationsCount).toBe(2);
  });

  it('scrubs secrets from telemetry safely', () => {
    const raw = 'ApiKey is sk-1234567890abcdef123456 and token DEV_TOKEN_SECRET_9999';
    const scrubbed = scrubSecrets(raw);
    expect(scrubbed).not.toContain('sk-1234567890abcdef123456');
    expect(scrubbed).not.toContain('DEV_TOKEN_SECRET_9999');
    expect(scrubbed).toContain('[REDACTED_SECRET]');
  });

  it('passes harness pre-flight validation with 0 errors', () => {
    const report = validateExp005Harness();
    expect(report.checksPassed).toBe(true);
    expect(report.errors.length).toBe(0);
    expect(report.scenariosCount).toBe(10);
    expect(report.resolverPreVerification.passedThreshold).toBe(true);
    expect(report.replicationsPlanning.totalPlannedTrials).toBe(60);
  });
});
