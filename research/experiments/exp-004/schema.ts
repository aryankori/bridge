/**
 * BRIDGE - EXP-004: Blind Benchmark Schema
 *
 * Defines the data contracts for independent scenario generation,
 * blind evaluation runners, gold-standard adjudication, and multi-metric analysis.
 */

import type {
 EffectiveDirectiveStatus,
 ConflictType,
 DirectiveCategory,
 InstructionSource,
 IntendedAction,
 SourceTier,
} from '../../../src/effective-directive/types.js';

export type BenchmarkSet = 'DEV' | 'HELD_OUT';

export interface BenchmarkScenario {
 scenarioId: string;
 set: BenchmarkSet;
 domain: string;
 title: string;
 description: string;
 action: IntendedAction;
 rawSources: InstructionSource[];
 metadata?: {
 tags?: string[];
 adversarial?: boolean;
 authorNote?: string;
 };
}

export interface BlindScenarioInput {
 scenarioId: string;
 action: IntendedAction;
 rawSources: InstructionSource[];
}

export interface GoldStandardAdjudication {
 scenarioId: string;
 adjudicator: string;
 hasConflict: boolean;
 goldConflictTypes: ConflictType[];
 goldResolution: EffectiveDirectiveStatus;
 governingTier: SourceTier | 'NONE';
 goldRationale: string;
 requiredCitations: string[];
 prohibitedCitations?: string[];
 isInherentlyAmbiguous?: boolean;
}

export interface ScenarioEvaluationScore {
 scenarioId: string;
 set: BenchmarkSet;
 domain: string;
 actualStatus: EffectiveDirectiveStatus;
 goldStatus: EffectiveDirectiveStatus;
 resolutionMatch: boolean;
 actualConflictDetected: boolean;
 goldHasConflict: boolean;
 conflictDetectionMatch: boolean;
 citationPrecision: number;
 citationRecall: number;
 isFalseAllow: boolean;
 isFalseBlock: boolean;
 latencyMs: number;
 explanation: string;
}

export interface AggregateSetMetrics {
 totalScenarios: number;
 conflictDetection: {
 truePositives: number;
 falsePositives: number;
 falseNegatives: number;
 trueNegatives: number;
 precision: number;
 recall: number;
 f1Score: number;
 accuracy: number;
 };
 resolution: {
 exactMatches: number;
 exactAccuracy: number;
 ambiguityCalibration: number;
 };
 safety: {
 falseAllowCount: number;
 falseAllowRate: number;
 falseBlockCount: number;
 falseBlockRate: number;
 };
 explanation: {
 meanCitationPrecision: number;
 meanCitationRecall: number;
 };
 performance: {
 meanLatencyMs: number;
 minLatencyMs: number;
 maxLatencyMs: number;
 p95LatencyMs: number;
 };
}

export interface BenchmarkReport {
 generatedAt: string;
 disclaimer: string;
 policyName: string;
 summary: {
 totalScenarios: number;
 devCount: number;
 heldOutCount: number;
 };
 overall: AggregateSetMetrics;
 devMetrics: AggregateSetMetrics;
 heldOutMetrics: AggregateSetMetrics;
 detailedBreakdown: ScenarioEvaluationScore[];
}
