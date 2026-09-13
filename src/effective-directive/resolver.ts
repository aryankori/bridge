import {
 SourceTier,
 type EffectiveDirectiveResult,
 type EffectiveDirectiveStatus,
 type EvidenceReference,
 type ExtractedDirective,
 type InstructionSource,
 type IntendedAction,
 type ConflictRecord,
} from './types.js';
import { extractAllDirectives } from './sources.js';
import { detectConflicts, detectStaleness, detectMissingAuthorization } from './detector.js';

export interface ResolveOptions {
 action: IntendedAction;
 sources: InstructionSource[];
 gitState?: {
 currentBranch?: string;
 isDirty?: boolean;
 recentCommits?: string[];
 };
 taskText?: string;
 humanInstruction?: string;
}

/**
 * Main Resolver: Evaluates an intended agent action against instruction sources
 * to produce an EFFECTIVE DIRECTIVE with full evidence references.
 *
 * Invariant: This function NEVER claims objective truth. Output is strictly an
 * Effective Directive derived from authority standing and evidence.
 */
export function resolveEffectiveDirective(options: ResolveOptions): EffectiveDirectiveResult {
 const startTime = performance.now();
 const { action, sources } = options;

 // Augment sources if explicit taskText or humanInstruction are passed directly
 const allSources: InstructionSource[] = [...sources];

 if (options.humanInstruction && !allSources.some((s) => s.tier === SourceTier.EXPLICIT_HUMAN)) {
 allSources.push({
 id: 'src-explicit-human',
 tier: SourceTier.EXPLICIT_HUMAN,
 title: 'Explicit Human Instruction',
 content: options.humanInstruction,
 });
 }

 if (options.taskText && !allSources.some((s) => s.tier === SourceTier.TASK_SPEC)) {
 allSources.push({
 id: 'src-task-spec',
 tier: SourceTier.TASK_SPEC,
 title: 'Task / Issue Specification',
 content: options.taskText,
 });
 }

 // Extract all directives
 const directives = extractAllDirectives(allSources);

 // 1. Detect missing authorization for dangerous / protected actions
 const authCheck = detectMissingAuthorization(action, directives);
 const conflicts: ConflictRecord[] = [];

 if (!authCheck.isAuthorized && authCheck.conflict) {
 conflicts.push(authCheck.conflict);
 }

 // 2. Detect conflicts across directives
 const generalConflicts = detectConflicts(directives);
 conflicts.push(...generalConflicts);

 // 3. Detect stale documentation
 const staleRecords = detectStaleness(allSources);
 conflicts.push(...staleRecords);

 // Filter directives relevant to the action's category
 const relevantDirectives = directives.filter(
 (d) => d.category === action.category || d.category === 'GENERAL_CONSTRAINT'
 );

 // Sort relevant directives by precedence descending
 relevantDirectives.sort((a, b) => (b.precedence ?? 0) - (a.precedence ?? 0));

 // Determine governing directive and overridden directives
 let status: EffectiveDirectiveStatus = 'PERMITTED';
 let governingDirective: ExtractedDirective | undefined;
 const overriddenDirectives: ExtractedDirective[] = [];

 const hasAmbiguity = conflicts.some((c) => c.type === 'PRECEDENCE_AMBIGUITY');
 const hasMissingAuth = conflicts.some((c) => c.type === 'MISSING_AUTHORIZATION');

 if (hasMissingAuth) {
 status = 'REQUIRES_AUTHORIZATION';
 if (relevantDirectives.length > 0 && relevantDirectives[0]) {
 governingDirective = relevantDirectives[0];
 }
 } else if (hasAmbiguity) {
 status = 'AMBIGUOUS';
 if (relevantDirectives.length > 0 && relevantDirectives[0]) {
 governingDirective = relevantDirectives[0];
 }
 } else if (relevantDirectives.length > 0 && relevantDirectives[0]) {
 const highest = relevantDirectives[0];
 governingDirective = highest;

 if (highest.polarity === 'DENY') {
 status = 'BLOCKED_CONFLICT';
 } else {
 // Directives are overridden if they conflict or if higher authority (e.g. EXPLICIT_HUMAN) supersedes lower tier instructions
 for (let i = 1; i < relevantDirectives.length; i++) {
 const other = relevantDirectives[i];
 if (!other) continue;

 const isTrueConflict =
 (highest.sourceTier === SourceTier.EXPLICIT_HUMAN && other.sourceTier !== SourceTier.EXPLICIT_HUMAN) ||
 other.polarity === 'DENY' ||
 (other.subject !== highest.subject &&
 other.subject !== 'general' &&
 highest.subject !== 'general') ||
 conflicts.some(
 (c) =>
 c.winningDirective?.id === highest.id &&
 c.conflictingDirectives.some((cd) => cd.id === other.id)
 );

 if (isTrueConflict) {
 overriddenDirectives.push(other);
 }
 }

 status = overriddenDirectives.length > 0 ? 'PERMITTED_WITH_OVERRIDE' : 'PERMITTED';
 }
 } else {
 status = 'PERMITTED';
 }

 // Build evidence trail
 const evidenceTrail: EvidenceReference[] = [];
 for (const d of relevantDirectives) {
 if (!d) continue;
 evidenceTrail.push({
 sourceId: d.sourceId,
 sourceTier: d.sourceTier,
 path: d.sourceLocation.split(':')[0],
 snippet: d.rawText,
 relevance: d === governingDirective ? 'Governing directive' : 'Considered directive',
 });
 }

 // If evidence trail is empty, cite sources evaluated
 if (evidenceTrail.length === 0) {
 for (const src of allSources) {
 evidenceTrail.push({
 sourceId: src.id,
 sourceTier: src.tier,
 path: src.path,
 snippet: src.content.slice(0, 80),
 relevance: 'Evaluated source context',
 });
 }
 }

 // Construct structured explanation
 let explanation = `EFFECTIVE DIRECTIVE: [${status}] for action: "${action.description}".\n`;
 if (governingDirective) {
 explanation += `Governed by authority tier [${governingDirective.sourceTier}] from [${governingDirective.sourceLocation}]: "${governingDirective.statement}".\n`;
 }
 if (overriddenDirectives.length > 0) {
 explanation += `Overrides lower-standing directives from: ${overriddenDirectives.map((d) => `[${d.sourceTier}] ${d.sourceLocation}`).join(', ')}.\n`;
 }
 if (conflicts.length > 0) {
 explanation += `Conflicts identified: ${conflicts.map((c) => `[${c.type}] ${c.description}`).join('; ')}.\n`;
 }

 const endTime = performance.now();
 const latencyMs = Math.round((endTime - startTime) * 100) / 100;

 return {
 status,
 intendedAction: action,
 effectiveDecision: status,
 governingDirective,
 overriddenDirectives,
 conflicts,
 evidenceTrail,
 explanation,
 isObjectiveTruthClaim: false, // Mandatory: NEVER claim objective truth
 generatedAt: new Date().toISOString(),
 latencyMs,
 };
}
