/**
 * Types and Interfaces for the Read-Only Effective Directive Resolver Prototype.
 *
 * NOTE: The resolver determines EFFECTIVE DIRECTIVES based on precedence,
 * authority standing, and explicit evidence. It NEVER claims objective truth.
 */

export enum SourceTier {
 EXPLICIT_HUMAN = 'EXPLICIT_HUMAN',
 TASK_SPEC = 'TASK_SPEC',
 AGENT_RULES = 'AGENT_RULES',
 PROJECT_DOCS = 'PROJECT_DOCS',
 GIT_STATE = 'GIT_STATE',
 DEFAULT_CONVENTION = 'DEFAULT_CONVENTION',
}

export type DirectiveCategory =
 | 'PACKAGE_MANAGER'
 | 'TEST_COMMAND'
 | 'BRANCH_POLICY'
 | 'CODE_STYLE'
 | 'FILE_DELETION'
 | 'GIT_COMMIT'
 | 'ARCHITECTURE'
 | 'GENERAL_CONSTRAINT';

export type DirectivePolarity = 'ALLOW' | 'DENY' | 'REQUIRE' | 'PREFER';

export interface InstructionSource {
 id: string;
 tier: SourceTier;
 path?: string;
 title: string;
 content: string;
 lastModified?: string | Date;
 author?: string;
 metadata?: Record<string, unknown>;
}

export interface ExtractedDirective {
 id: string;
 sourceId: string;
 sourceTier: SourceTier;
 sourceLocation: string; // e.g. "AGENTS.md:L12" or "prompt:1"
 category: DirectiveCategory;
 polarity: DirectivePolarity;
 statement: string;
 subject: string;
 rawText: string;
 precedence: number;
 timestamp?: number;
 tags?: string[];
}

export interface IntendedAction {
 id: string;
 description: string;
 category: DirectiveCategory;
 command?: string;
 targetPath?: string;
 gitOperation?: {
 branch?: string;
 isDestructive?: boolean;
 force?: boolean;
 };
 metadata?: Record<string, unknown>;
}

export type ConflictType =
 | 'CONTRADICTION'
 | 'STALE_INSTRUCTION'
 | 'MISSING_AUTHORIZATION'
 | 'PRECEDENCE_AMBIGUITY'
 | 'CONSTRAINT_VIOLATION';

export interface EvidenceReference {
 sourceId: string;
 sourceTier: SourceTier;
 path?: string;
 line?: number;
 snippet: string;
 relevance: string;
}

export interface ConflictRecord {
 id: string;
 type: ConflictType;
 category: DirectiveCategory;
 severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKING';
 description: string;
 conflictingDirectives: ExtractedDirective[];
 evidence: EvidenceReference[];
 winningDirective?: ExtractedDirective;
 resolutionReason?: string;
}

export type EffectiveDirectiveStatus =
 | 'PERMITTED'
 | 'BLOCKED_CONFLICT'
 | 'REQUIRES_AUTHORIZATION'
 | 'AMBIGUOUS'
 | 'PERMITTED_WITH_OVERRIDE';

export interface EffectiveDirectiveResult {
 status: EffectiveDirectiveStatus;
 intendedAction: IntendedAction;
 effectiveDecision: string;
 governingDirective?: ExtractedDirective;
 overriddenDirectives: ExtractedDirective[];
 conflicts: ConflictRecord[];
 evidenceTrail: EvidenceReference[];
 explanation: string;
 isObjectiveTruthClaim: false; // Mandatory invariant: MUST NEVER claim objective truth
 generatedAt: string;
 latencyMs: number;
}

export interface EvaluationFixture {
 id: string;
 name: string;
 description: string;
 action: IntendedAction;
 sources: InstructionSource[];
 expectedStatus: EffectiveDirectiveStatus;
 expectConflict: boolean;
 expectedConflictTypes?: ConflictType[];
 rationale: string;
}

export interface EvaluationMetrics {
 totalCases: number;
 detectionAccuracy: number;
 resolutionAccuracy: number;
 falsePositives: number;
 falseNegatives: number;
 averageLatencyMs: number;
 explanationQualityScore: number;
 results: Array<{
 fixtureId: string;
 expectedStatus: EffectiveDirectiveStatus;
 actualStatus: EffectiveDirectiveStatus;
 detectedConflict: boolean;
 expectedConflict: boolean;
 latencyMs: number;
 passed: boolean;
 explanation: string;
 }>;
}
