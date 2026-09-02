/**
 * BRIDGE — EXP-005: Live Agent Behavior Experiment Type Definitions & Schemas
 *
 * Defines the data contracts for live agent behavioral trials comparing:
 * - Condition A: RAW (complete conflicting instruction environment)
 * - Condition B: HUMAN (independently resolved human directive)
 * - Condition C: BRIDGE (frozen Bridge effective-directive resolver)
 */

import type { SourceTier, EffectiveDirectiveStatus as DirectiveStatus } from '../../../src/effective-directive/types.js';

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

export type DifficultyTier = 'UNAMBIGUOUS' | 'AMBIGUOUS' | 'UNSOLVABLE';

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
  gitOperation?: {
    branch?: string;
    isDestructive?: boolean;
    force?: boolean;
  };
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
  difficulty: DifficultyTier;
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
  exitCode: number | null;
  timedOut?: boolean;
  error?: string;
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
  experimentId: 'EXP-005';
  runId?: string;
  trialId: string;
  scenarioId: string;
  replicationIndex: number;
  trialOrderIndex: number;
  condition: ExperimentCondition;
  randomizationSeed: number;
  model: string;
  provider: string;
  bridgeCommit: string;
  resolverCommit: string;
  startingCommit: string;
  timestamp: string;
  worktreePath: string;
  payloadHash: string;
  payload: ConditionPayload;
  execution: AgentExecutionMetrics;
  gitPatch: string;
  verification: VerificationResult;
  error?: string;
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
  explanationGrounded: boolean;
  explanationScore: number;
}

export interface TrialScoreRecord {
  trialId: string;
  scenarioId: string;
  replicationIndex: number;
  condition: ExperimentCondition;
  difficulty: DifficultyTier;
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
  meanExplanationScore: number;
}

export interface StratifiedReport {
  unambiguous: Record<ExperimentCondition, ConditionAggregateMetrics>;
  ambiguous: Record<ExperimentCondition, ConditionAggregateMetrics>;
  unsolvable: Record<ExperimentCondition, ConditionAggregateMetrics>;
}

export interface ExperimentManifest {
  experimentId: 'EXP-005';
  runId?: string;
  title: string;
  generatedAt: string;
  bridgeCommit: string;
  resolverCommit: string;
  model: string;
  provider: string;
  randomizationSeed: number;
  replicationsCount: number;
  totalTrialsCount: number;
  completedTrialsCount?: number;
  conditions: ExperimentCondition[];
  scenariosCount: number;
  trials: TrialTelemetry[];
  scores: TrialScoreRecord[];
  overallAggregates: Record<ExperimentCondition, ConditionAggregateMetrics>;
  stratifiedAggregates: StratifiedReport;
  falsificationAudit: {
    rawVsBridgeDifference: number;
    humanVsBridgeDifference: number;
    falseBlocksExceedUsefulPrevented: boolean;
    falsificationTriggered: boolean;
    notes: string;
  };
}
