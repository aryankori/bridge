import { describe, it, expect } from 'vitest';
import { EXP005_SCENARIOS } from '../../research/experiments/exp-005/scenarios.js';
import { EXP005_GOLD_STANDARDS } from '../../research/experiments/exp-005/gold-standard.js';
import {
  buildConditionPayload,
  FROZEN_RESOLVER_COMMIT,
} from '../../research/experiments/exp-005/payload-builder.js';
import {
  scoreResolutionQuality,
  scoreAgentOutcome,
  aggregateConditionMetrics,
} from '../../research/experiments/exp-005/evaluator.js';
import { validateExp005Harness } from '../../research/experiments/exp-005/validate.js';
import { scrubSecrets } from '../../research/experiments/exp-005/security.js';
import type { TrialTelemetry } from '../../research/experiments/exp-005/schema.js';

describe('EXP-005 Live Agent Behavior Experiment Infrastructure', () => {
  it('contains exactly 10 stratified scenarios (5 unambiguous, 3 ambiguous, 2 unsolvable)', () => {
    expect(EXP005_SCENARIOS.length).toBe(10);

    const unambiguous = EXP005_SCENARIOS.filter(
      (s) => !EXP005_GOLD_STANDARDS[s.scenarioId]?.isAmbiguous &&
        EXP005_GOLD_STANDARDS[s.scenarioId]?.goldResolution !== 'BLOCKED_CONFLICT' &&
        EXP005_GOLD_STANDARDS[s.scenarioId]?.goldResolution !== 'REQUIRES_AUTHORIZATION'
    );
    const ambiguous = EXP005_SCENARIOS.filter(
      (s) => EXP005_GOLD_STANDARDS[s.scenarioId]?.isAmbiguous
    );
    const unsolvable = EXP005_SCENARIOS.filter(
      (s) =>
        EXP005_GOLD_STANDARDS[s.scenarioId]?.goldResolution === 'BLOCKED_CONFLICT' ||
        EXP005_GOLD_STANDARDS[s.scenarioId]?.goldResolution === 'REQUIRES_AUTHORIZATION'
    );

    expect(unambiguous.length).toBe(5);
    expect(ambiguous.length).toBe(3);
    expect(unsolvable.length).toBe(2);
  });

  it('has independent human gold-standard adjudications for all 10 scenarios', () => {
    for (const scn of EXP005_SCENARIOS) {
      const gold = EXP005_GOLD_STANDARDS[scn.scenarioId];
      expect(gold).toBeDefined();
      expect(gold?.humanDirectiveText).toBeDefined();
      expect(gold?.permittedActions.length).toBeGreaterThan(0);
      expect(gold?.prohibitedActions.length).toBeGreaterThan(0);
    }
  });

  it('builds valid Condition A (RAW), B (HUMAN), and C (BRIDGE) payloads', () => {
    const scn = EXP005_SCENARIOS[0];
    if (!scn) throw new Error('Missing scenario');

    const raw = buildConditionPayload(scn, 'A');
    expect(raw.condition).toBe('A');
    expect(raw.promptText).toContain('TASK OBJECTIVE');
    expect(raw.promptText).not.toContain('[HUMAN RESOLUTION]');
    expect(raw.promptText).not.toContain('BRIDGE EFFECTIVE DIRECTIVE');

    const human = buildConditionPayload(scn, 'B');
    expect(human.condition).toBe('B');
    expect(human.promptText).toContain('[HUMAN RESOLUTION]');

    const bridge = buildConditionPayload(scn, 'C');
    expect(bridge.condition).toBe('C');
    expect(bridge.promptText).toContain('BRIDGE EFFECTIVE DIRECTIVE');
    expect(bridge.promptText).toContain(FROZEN_RESOLVER_COMMIT);
  });

  it('evaluates resolution quality independently of agent outcome', () => {
    const scn = EXP005_SCENARIOS[0];
    if (!scn) throw new Error('Missing scenario');
    const gold = EXP005_GOLD_STANDARDS[scn.scenarioId];
    if (!gold) throw new Error('Missing gold standard');

    const resQuality = scoreResolutionQuality(scn, gold);
    expect(resQuality.detectedConflict).toBe(true);
    expect(resQuality.resolutionStatus).toBeDefined();
    expect(resQuality.latencyMs).toBeLessThan(10);
  });

  it('evaluates agent outcome quality from telemetry and detects violations', () => {
    const scn = EXP005_SCENARIOS[0];
    if (!scn) throw new Error('Missing scenario');
    const gold = EXP005_GOLD_STANDARDS[scn.scenarioId];
    if (!gold) throw new Error('Missing gold standard');

    // Case 1: Compliant agent output
    const compliantTelemetry: TrialTelemetry = {
      trialId: 'test-trial-1',
      scenarioId: scn.scenarioId,
      condition: 'C',
      model: 'nvidia/nvidia/nemotron-3-super-120b-a12b',
      provider: 'nvidia',
      bridgeCommit: 'fc322c6',
      resolverCommit: 'fc322c6',
      startingCommit: 'fc322c6',
      timestamp: new Date().toISOString(),
      worktreePath: 'test/path',
      payload: buildConditionPayload(scn, 'C'),
      execution: {
        durationMs: 5000,
        exitCode: 0,
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        toolCallCount: 2,
        stdout: 'Created format_user_name helper adhering to data package rule.',
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

    const compliantScore = scoreAgentOutcome(scn, gold, compliantTelemetry);
    expect(compliantScore.correctActionTaken).toBe(true);
    expect(compliantScore.instructionViolationOccurred).toBe(false);
    expect(compliantScore.isFalseAllow).toBe(false);

    // Case 2: Violating agent output (used camelCase formatUserName)
    const violatingTelemetry: TrialTelemetry = {
      ...compliantTelemetry,
      trialId: 'test-trial-2',
      gitPatch: 'export function formatUserName(first: string, last: string) { return `${first} ${last}`; }',
    };

    const violatingScore = scoreAgentOutcome(scn, gold, violatingTelemetry);
    expect(violatingScore.instructionViolationOccurred).toBe(true);
  });

  it('aggregates condition metrics accurately', () => {
    const dummyScores = [
      {
        trialId: 't1',
        scenarioId: 'exp005-scn-001',
        condition: 'C' as const,
        agentOutcome: {
          correctActionTaken: true,
          instructionViolationOccurred: false,
          isFalseAllow: false,
          isFalseBlock: false,
          testsPassed: true,
          taskCompleted: true,
          reworkRequired: false,
          timeMs: 1000,
          toolCalls: 2,
          totalTokens: 500,
          explanationCorrectness: true,
        },
        isValid: true,
      },
    ];

    const agg = aggregateConditionMetrics('C', dummyScores);
    expect(agg.totalTrials).toBe(1);
    expect(agg.correctActionRate).toBe(1.0);
    expect(agg.instructionViolationRate).toBe(0.0);
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
  });
});
