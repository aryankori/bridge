/**
 * Bridge - Phase 1E: Research Experiment Type Definitions
 * Schema: ExperimentalWorkTransfer v0.2.0-simplified & Experiment Telemetry
 */

export interface CodeAnchor {
  filePath: string;
  startLine?: number;
  endLine?: number;
  symbol?: string;
}

export interface DiagnosticItem {
  id: string;
  title: string;
  rootCause: string;
  locations: CodeAnchor[];
}

export interface VerificationCommand {
  command: string;
  description: string;
}

export interface ExperimentalWorkTransfer {
  schemaVersion: '0.2.0-simplified';
  objective: string;
  diagnostics: DiagnosticItem[];
  constraints: string[];
  verificationCommands: VerificationCommand[];
}

// ---------------------------------------------------------------------------
// Executable Resolution & Failure Classifications
// ---------------------------------------------------------------------------

export type AgentFailureClassification =
  | 'EXECUTABLE_NOT_FOUND'
  | 'PROCESS_EXIT_NONZERO'
  | 'TIMEOUT'
  | 'EMPTY_OUTPUT'
  | 'PARSE_FAILURE'
  | 'AGENT_A_NO_TRANSCRIPT'
  | 'AGENT_A_TRANSFER_EXTRACTION_FAILURE'
  | 'UNKNOWN';

export interface ResolvedExecutable {
  command: string;
  resolvedPath: string;
  source: 'configured' | 'path' | 'fallback';
}

// ---------------------------------------------------------------------------
// Telemetry & Metrics Interfaces
// ---------------------------------------------------------------------------

export interface TransferFidelityCheck {
  bugsIdentified: string;
  rootCausesExplained: string;
  changesSummarized: string;
  verificationDescribed: string;
  rawResponse: string;
}

export interface InformationMetrics {
  payloadSizeBytes: number;
  estimatedTokens: number;
  filesReferencedCount: number;
  diagnosticsConveyedCount: number;
  constraintsConveyedCount: number;
  verificationInfoConveyed: boolean;
  transcriptOriginalBytes?: number;
  transcriptDeliveredBytes?: number;
  transcriptWasTruncated?: boolean;
}

export interface CostMetrics {
  agentAInputTokens: number | 'UNKNOWN';
  agentAOutputTokens: number | 'UNKNOWN';
  agentATotalTokens: number | 'UNKNOWN';
  extractionInputTokens?: number | 'UNKNOWN';
  extractionOutputTokens?: number | 'UNKNOWN';
  extractionTotalTokens?: number | 'UNKNOWN';
  agentBInputTokens: number | 'UNKNOWN';
  agentBOutputTokens: number | 'UNKNOWN';
  agentBTotalTokens: number | 'UNKNOWN';
  estimatedCostUsd: number | 'UNKNOWN';
}

export type TrialStatus = 'VALID' | 'INVALID';

export interface TrialRecord {
  trialIndex: number;
  condition: 'A' | 'B' | 'C';
  conditionName: string;
  status: TrialStatus;
  invalidReason?: {
    stage: string;
    classification: AgentFailureClassification;
    message: string;
  };
  startTime: string;
  endTime: string;
  wallClockDurationSeconds: number;
  success: boolean;
  testsPassed: number;
  testsTotal: number;
  correctnessScore: number;
  reworkCycles: number;
  humanInterventions: number;
  filesChanged: string[];
  linesAdded: number;
  linesDeleted: number;
  gitDiff: string;
  informationMetrics: InformationMetrics;
  costMetrics: CostMetrics;
  fidelityCheck?: TransferFidelityCheck;
  error?: {
    stage: string;
    message: string;
    classification: string;
  };
}

export interface ExperimentManifest {
  experimentId: string;
  timestamp: string;
  mode: 'pilot' | 'replicate';
  randomizationSeed: number;
  status: TrialStatus;
  invalidReason?: string;
  trialOrder: Array<{ trialIndex: number; condition: 'A' | 'B' | 'C' }>;
  agentA: {
    name: string;
    version: string;
    command: string;
    resolvedPath: string;
    source: string;
  };
  agentB: {
    name: string;
    version: string;
    command: string;
    resolvedPath: string;
    source: string;
  };
  trials: TrialRecord[];
  summary: {
    totalTrials: number;
    validTrials: number;
    passedTrials: number;
    meanDurationA?: number;
    meanDurationB?: number;
    meanDurationC?: number;
    successRateA?: number;
    successRateB?: number;
    successRateC?: number;
  };
}
