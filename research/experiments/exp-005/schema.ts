/**
 * BRIDGE — EXP-005: Live Agent Behavior Experiment Type Definitions & Schemas
 *
 * Defines the data contracts for live agent behavioral trials comparing:
 * - Condition A: RAW (complete conflicting instruction environment)
 * - Condition B: HUMAN (independently resolved human directive)
 * - Condition C: BRIDGE (frozen Bridge effective-directive resolver)
 */

import type { SourceTier, DirectiveStatus } from '../../../src/effective-directive/types.js';

export type ExperimentCondition = 'A' | 'B' | 'C';

export interface ConditionInfo {
  code: ExperimentCondition;
  name: string;
  description: string;
}

export const CONDITIONS: Record<ExperimentCondition, ConditionInfo> = {
  A: {
    code: 'A',
    name: 'RAW',
    description: 'Direct exposure to complete conflicting instruction environment without mediation',
  },
  B: {
    code: 'B',
    name: 'HUMAN',
    description: 'Environment augmented with independently adjudicated human resolution',
  },
  C: {
    code: 'C',
    name: 'BRIDGE',
    description: 'Environment augmented with frozen Bridge effective-directive output',
  },
};

export type ConflictCategory =
  | 'ROOT_VS_NESTED_RULE'
  | 'STALE_DOC_VS_CODE'
  | 'ISSUE_VS_SECURITY_POLICY'
  | 'HUMAN_REQUEST_VS_REPO_CONSTRAINT'
  | 'POLICY_EXCEPTION_VS_DEFAULT'
  | 'CI_CONSTRAINT_VS_TASK';

export interface ScenarioSource {
  id: string;
  path?: string;
  tier: SourceTier;
  title: string;
  content: string;
  lastModified?: string;
}

export interface ScenarioFixtureFile {
  relativePath: string;
  content: string;
  isExecutable?: boolean;
}

export interface ScenarioActionSpec {
  id: string;
  description: string;
  category: string;
  command?: string;
  targetPath?: string;
}

export interface ExpectedOutcomeSpec {
  expectedActionTaken: string;
  forbiddenAction: string;
  verificationTestCommand: string;
  expectedViolations: string[];
}

export interface LiveAgentScenario {
  scenarioId: string;
  title: string;
  description: string;
  category: ConflictCategory;
  taskPrompt: string;
  actionSpec: ScenarioActionSpec;
  rawSources: ScenarioSource[];
  fixtureFiles: ScenarioFixtureFile[];
  expectedOutcome: ExpectedOutcomeSpec;
}

export interface HumanGoldAdjudication {
  scenarioId: string;
  adjudicator: string;
  isAmbiguous: boolean;
  goldResolution: DirectiveStatus;
  humanDirectiveText: string;
  goldRationale: string;
  governingTier: SourceTier | 'NONE';
  permittedActions: string[];
  prohibitedActions: string[];
}

export interface ConditionPayload {
  scenarioId: string;
  condition: ExperimentCondition;
  promptText: string;
  metadata: {
    injectedDirectives?: string;
    resolverCommit?: string;
    isHumanGold?: boolean;
  };
}

export interface AgentExecutionMetrics {
  durationMs: number;
  exitCode: number;
  inputTokens: number | 'UNKNOWN';
  outputTokens: number | 'UNKNOWN';
  totalTokens: number | 'UNKNOWN';
  toolCallCount: number;
  stdout: string;
  stderr: string;
}

export interface VerificationResult {
  testsPassed: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface TrialTelemetry {
  trialId: string;
  scenarioId: string;
  condition: ExperimentCondition;
  model: string;
  provider: string;
  bridgeCommit: string;
  resolverCommit: string;
  startingCommit: string;
  timestamp: string;
  worktreePath: string;
  payload: ConditionPayload;
  execution: AgentExecutionMetrics;
  gitPatch: string;
  verification: VerificationResult;
}

export interface ResolutionQualityScore {
  detectedConflict: boolean;
  resolutionStatus: DirectiveStatus;
  matchesGoldStandard: boolean;
  latencyMs: number;
}

export interface AgentOutcomeQualityScore {
  correctActionTaken: boolean;
  instructionViolationOccurred: boolean;
  violationDetails?: string[];
  isFalseAllow: boolean;
  isFalseBlock: boolean;
  testsPassed: boolean;
  taskCompleted: boolean;
  reworkRequired: boolean;
  timeMs: number;
  toolCalls: number;
  totalTokens: number | 'UNKNOWN';
  explanationCorrectness: boolean;
}

export interface TrialScoreRecord {
  trialId: string;
  scenarioId: string;
  condition: ExperimentCondition;
  resolutionQuality?: ResolutionQualityScore;
  agentOutcome: AgentOutcomeQualityScore;
  isValid: boolean;
  invalidReason?: string;
}

export interface ConditionAggregateMetrics {
  condition: ExperimentCondition;
  totalTrials: number;
  validTrials: number;
  correctActionRate: number;
  instructionViolationRate: number;
  falseAllowRate: number;
  falseBlockRate: number;
  testsPassRate: number;
  taskCompletionRate: number;
  meanDurationMs: number;
  meanToolCalls: number;
  meanTokens: number | 'UNKNOWN';
}

export interface ExperimentManifest {
  experimentId: 'EXP-005';
  title: string;
  generatedAt: string;
  bridgeCommit: string;
  resolverCommit: string;
  model: string;
  provider: string;
  conditions: ExperimentCondition[];
  scenariosCount: number;
  trials: TrialTelemetry[];
  scores: TrialScoreRecord[];
  conditionAggregates: Record<ExperimentCondition, ConditionAggregateMetrics>;
  falsificationAudit: {
    rawVsBridgeDifference: number;
    humanVsBridgeDifference: number;
    falseBlocksExceedUsefulPrevented: boolean;
    falsificationTriggered: boolean;
    notes: string;
  };
}
