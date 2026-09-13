/**
 * Bridge Core - Work Transfer Primitive
 *
 * Implements the core product primitive for seamless work transfer between
 * heterogeneous AI agents (e.g. Claude Code -> Bridge -> OpenCode / Gemini CLI):
 *
 * ONE PLACE -> MULTIPLE AI AGENTS -> SHARED PROJECT -> AUTOMATIC WORK TRANSFER -> NO MANUAL COPY/PASTE.
 *
 * Responsibilities:
 * - Capture structured work state (task, objective, changed files, relevant files,
 * artifacts, command outputs, test outcomes, failures, decisions, unresolved questions, provenance)
 * - Secret scrubbing & path confinement enforcement
 * - Optional Effective Directive attachment
 * - Target-tailored prompt rendering (synthesizing relevant context without raw transcript spam)
 * - Safe workspace application / materialization
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { AgentDescriptor, AgentId } from './types.js';
import type { EffectiveDirectiveResult } from '../effective-directive/types.js';

// ---------------------------------------------------------------------------
// Work Transfer Contracts
// ---------------------------------------------------------------------------

export type FileChangeStatus = 'added' | 'modified' | 'deleted';

export interface ChangedFile {
 path: string;
 status: FileChangeStatus;
 diff?: string;
 content?: string;
}

export interface RelevantFile {
 path: string;
 reason?: string;
 content?: string;
}

export interface WorkArtifact {
 id: string;
 name: string;
 type: string;
 path?: string;
 content?: string;
 metadata?: Record<string, unknown>;
}

export interface CommandExecutionRecord {
 command: string;
 exitCode: number;
 durationMs?: number;
 stdout?: string;
 stderr?: string;
}

export interface TestExecutionRecord {
 command: string;
 passed: boolean;
 summary?: string;
 stdout?: string;
 stderr?: string;
 durationMs?: number;
}

export interface DecisionRecord {
 decision: string;
 rationale: string;
 alternativesConsidered?: string[];
}

export interface WorkTransferProvenance {
 timestamp: string;
 sourceAgentId: string;
 sourceAgentName?: string;
 commitSha?: string;
 branch?: string;
 bridgeVersion: string;
}

export interface WorkTransferPackage {
 id: string;
 title: string;
 task: string;
 objective: string;
 projectId?: string;
 workspacePath?: string;
 sourceAgentId: string;
 targetAgentId?: string;
 changedFiles: ChangedFile[];
 relevantFiles: RelevantFile[];
 artifacts: WorkArtifact[];
 commands: CommandExecutionRecord[];
 tests: TestExecutionRecord[];
 outcomes: string[];
 failures: string[];
 decisions: DecisionRecord[];
 unresolvedQuestions: string[];
 effectiveDirective?: EffectiveDirectiveResult;
 provenance: WorkTransferProvenance;
 metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Security & Scrubbing Helpers
// ---------------------------------------------------------------------------

const SECRET_PATTERNS = [
 /sk-[a-zA-Z0-9_-]{20,}/g,
 /ghp_[a-zA-Z0-9]{36}/g,
 /github_pat_[a-zA-Z0-9_]{40,}/g,
 /xox[baprs]-[a-zA-Z0-9-]{10,}/g,
 /AIza[0-9A-Za-z-_]{35}/g,
 /DEV_TOKEN_[A-Z0-9_]+/g,
 /Bearer\s+[a-zA-Z0-9._-]{20,}/gi,
 /password\s*[:=]\s*['"][^'"]+['"]/gi,
];

export function scrubTransferSecrets(text: string): string {
 let result = text;
 for (const pattern of SECRET_PATTERNS) {
 result = result.replace(pattern, '[REDACTED_SECRET]');
 }
 return result;
}

export function assertPathConfinement(targetPath: string, rootDir: string): void {
 const resolvedTarget = path.resolve(rootDir, targetPath);
 const resolvedRoot = path.resolve(rootDir);

 if (!resolvedTarget.startsWith(resolvedRoot)) {
 throw new Error(`Path traversal violation: "${targetPath}" escapes root "${rootDir}"`);
 }
}

// ---------------------------------------------------------------------------
// Work Transfer Builders & Serialization
// ---------------------------------------------------------------------------

export interface CreateWorkTransferOptions {
 id?: string;
 title: string;
 task: string;
 objective: string;
 projectId?: string;
 workspacePath?: string;
 sourceAgent: AgentDescriptor | AgentId | string;
 targetAgent?: AgentDescriptor | AgentId | string;
 changedFiles?: ChangedFile[];
 relevantFiles?: RelevantFile[];
 artifacts?: WorkArtifact[];
 commands?: CommandExecutionRecord[];
 tests?: TestExecutionRecord[];
 outcomes?: string[];
 failures?: string[];
 decisions?: DecisionRecord[];
 unresolvedQuestions?: string[];
 effectiveDirective?: EffectiveDirectiveResult;
 commitSha?: string;
 branch?: string;
 metadata?: Record<string, unknown>;
}

export function createWorkTransferPackage(options: CreateWorkTransferOptions): WorkTransferPackage {
 const sourceId = typeof options.sourceAgent === 'string' ? options.sourceAgent : options.sourceAgent.id;
 const sourceName = typeof options.sourceAgent === 'object' ? options.sourceAgent.name : undefined;
 const targetId = options.targetAgent
 ? typeof options.targetAgent === 'string'
 ? options.targetAgent
 : options.targetAgent.id
 : undefined;

 const pkgId = options.id ?? `transfer-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

 // Sanitize all text fields against secret leakage
 const sanitizedChangedFiles: ChangedFile[] = (options.changedFiles ?? []).map((f) => ({
 path: f.path,
 status: f.status,
 diff: f.diff ? scrubTransferSecrets(f.diff) : undefined,
 content: f.content ? scrubTransferSecrets(f.content) : undefined,
 }));

 const sanitizedArtifacts: WorkArtifact[] = (options.artifacts ?? []).map((a) => ({
 id: a.id,
 name: a.name,
 type: a.type,
 path: a.path,
 content: a.content ? scrubTransferSecrets(a.content) : undefined,
 metadata: a.metadata,
 }));

 return {
 id: pkgId,
 title: scrubTransferSecrets(options.title),
 task: scrubTransferSecrets(options.task),
 objective: scrubTransferSecrets(options.objective),
 projectId: options.projectId,
 workspacePath: options.workspacePath,
 sourceAgentId: sourceId,
 targetAgentId: targetId,
 changedFiles: sanitizedChangedFiles,
 relevantFiles: options.relevantFiles ?? [],
 artifacts: sanitizedArtifacts,
 commands: (options.commands ?? []).map((c) => ({
 ...c,
 stdout: c.stdout ? scrubTransferSecrets(c.stdout) : undefined,
 stderr: c.stderr ? scrubTransferSecrets(c.stderr) : undefined,
 })),
 tests: (options.tests ?? []).map((t) => ({
 ...t,
 stdout: t.stdout ? scrubTransferSecrets(t.stdout) : undefined,
 stderr: t.stderr ? scrubTransferSecrets(t.stderr) : undefined,
 })),
 outcomes: (options.outcomes ?? []).map(scrubTransferSecrets),
 failures: (options.failures ?? []).map(scrubTransferSecrets),
 decisions: (options.decisions ?? []).map((d) => ({
 decision: scrubTransferSecrets(d.decision),
 rationale: scrubTransferSecrets(d.rationale),
 alternativesConsidered: d.alternativesConsidered?.map(scrubTransferSecrets),
 })),
 unresolvedQuestions: (options.unresolvedQuestions ?? []).map(scrubTransferSecrets),
 effectiveDirective: options.effectiveDirective,
 provenance: {
 timestamp: new Date().toISOString(),
 sourceAgentId: sourceId,
 sourceAgentName: sourceName,
 commitSha: options.commitSha,
 branch: options.branch,
 bridgeVersion: '0.1.0',
 },
 metadata: options.metadata,
 };
}

export function serializeWorkTransfer(pkg: WorkTransferPackage): string {
 return JSON.stringify(pkg, null, 2);
}

export function deserializeWorkTransfer(jsonText: string): WorkTransferPackage {
 const parsed = JSON.parse(jsonText);
 if (!parsed || typeof parsed !== 'object') {
 throw new Error('Malformed WorkTransferPackage: must be a JSON object');
 }
 if (!parsed.id || !parsed.task || !parsed.objective || !parsed.sourceAgentId) {
 throw new Error('Malformed WorkTransferPackage: missing required fields (id, task, objective, sourceAgentId)');
 }
 return parsed as WorkTransferPackage;
}

// ---------------------------------------------------------------------------
// Transfer Rendering (Target-Tailored Prompt Synthesis)
// ---------------------------------------------------------------------------

export function renderTransferPrompt(
 pkg: WorkTransferPackage,
 options: {
 includeDiffs?: boolean;
 includeDirective?: boolean;
 additionalInstructions?: string;
 } = {}
): string {
 const sections: string[] = [];

 sections.push(`==================================================\nBRIDGE WORK TRANSFER: ${pkg.title}\n[Transfer ID: ${pkg.id} | From: ${pkg.sourceAgentId}]\n==================================================`);

 sections.push(`### TASK & OBJECTIVE\nTask: ${pkg.task}\nObjective: ${pkg.objective}`);

 if (pkg.outcomes.length > 0) {
 sections.push(`### ACCOMPLISHED WORK\n${pkg.outcomes.map((o) => `- ${o}`).join('\n')}`);
 }

 if (pkg.changedFiles.length > 0) {
 const fileList = pkg.changedFiles
 .map((f) => `- [${f.status.toUpperCase()}] ${f.path}${options.includeDiffs && f.diff ? `\n\`\`\`diff\n${f.diff}\n\`\`\`` : ''}`)
 .join('\n');
 sections.push(`### CHANGED FILES\n${fileList}`);
 }

 if (pkg.tests.length > 0) {
 const testList = pkg.tests
 .map((t) => `- ${t.command}: ${t.passed ? 'PASSED' : 'FAILED'}${t.summary ? ` (${t.summary})` : ''}`)
 .join('\n');
 sections.push(`### TEST VERIFICATION\n${testList}`);
 }

 if (pkg.failures.length > 0) {
 sections.push(`### REMAINING BLOCKERS / FAILURES\n${pkg.failures.map((f) => `- ${f}`).join('\n')}`);
 }

 if (pkg.decisions.length > 0) {
 const decList = pkg.decisions
 .map((d) => `- ${d.decision}: ${d.rationale}`)
 .join('\n');
 sections.push(`### ARCHITECTURAL DECISIONS MADE\n${decList}`);
 }

 if (pkg.unresolvedQuestions.length > 0) {
 sections.push(`### UNRESOLVED QUESTIONS / HUMAN CLARIFICATIONS NEEDED\n${pkg.unresolvedQuestions.map((q) => `- ${q}`).join('\n')}`);
 }

 if (options.includeDirective !== false && pkg.effectiveDirective) {
 const ed = pkg.effectiveDirective;
 sections.push(`### EFFECTIVE DIRECTIVE RESOLUTION\nStatus: ${ed.status}\nDecision: ${ed.effectiveDecision || ed.explanation}\nRationale: ${ed.explanation}`);
 }

 if (options.additionalInstructions) {
 sections.push(`### NEXT STEP INSTRUCTIONS\n${options.additionalInstructions}`);
 } else {
 sections.push(`### NEXT STEP INSTRUCTIONS\nPlease review the transferred context above and proceed to continue this task.`);
 }

 return sections.join('\n\n');
}

// ---------------------------------------------------------------------------
// Safe Workspace Materialization
// ---------------------------------------------------------------------------

export interface ApplyTransferResult {
 appliedFiles: string[];
 deletedFiles: string[];
 errors: string[];
}

export function applyWorkTransferToWorkspace(
 pkg: WorkTransferPackage,
 targetWorkspaceRoot: string
): ApplyTransferResult {
 const result: ApplyTransferResult = {
 appliedFiles: [],
 deletedFiles: [],
 errors: [],
 };

 for (const file of pkg.changedFiles) {
 try {
 assertPathConfinement(file.path, targetWorkspaceRoot);
 const fullPath = path.resolve(targetWorkspaceRoot, file.path);

 if (file.status === 'deleted') {
 if (fs.existsSync(fullPath)) {
 fs.unlinkSync(fullPath);
 result.deletedFiles.push(file.path);
 }
 } else if (file.content !== undefined) {
 fs.mkdirSync(path.dirname(fullPath), { recursive: true });
 fs.writeFileSync(fullPath, file.content, 'utf-8');
 result.appliedFiles.push(file.path);
 }
 } catch (err: unknown) {
 result.errors.push(`Failed to apply ${file.path}: ${String(err)}`);
 }
 }

 return result;
}
