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
 /AKIA[0-9A-Z]{16}/g,
 /-----BEGIN.*PRIVATE KEY-----/g,
 /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
 /sk-ant-[a-zA-Z0-9-_]{20,}/g,
 /(postgres|mongodb|mysql):\/\/[^:\s]+:[^@\s]+@[^\s]+/gi,
 /(API_KEY|SECRET)\s*[:=]\s*['"]?[^\s'"]+['"]?/gi,
];

export function scrubTransferSecrets(text: string): string {
 let result = text;
 for (const pattern of SECRET_PATTERNS) {
 result = result.replace(pattern, '[REDACTED_SECRET]');
 }
 return result;
}

export function scrubRecursive(obj: any): any {
  if (typeof obj === 'string') {
    return scrubTransferSecrets(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(scrubRecursive);
  }
  if (obj && typeof obj === 'object') {
    const scrubbed: any = {};
    for (const key of Object.keys(obj)) {
      scrubbed[key] = scrubRecursive(obj[key]);
    }
    return scrubbed;
  }
  return obj;
}

export function assertPathConfinement(targetPath: string, rootDir: string): void {
 if (targetPath.indexOf('\0') !== -1) {
   throw new Error('Path traversal violation: null bytes detected');
 }
 const normalizedPath = path.normalize(targetPath);
 if (normalizedPath.split(path.sep).includes('..')) {
   throw new Error('Path traversal violation: ".." segments detected');
 }
 const resolvedTarget = path.resolve(rootDir, normalizedPath);
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
 relevantFiles: (options.relevantFiles ?? []).map((f) => ({
   path: f.path,
   reason: f.reason ? scrubTransferSecrets(f.reason) : undefined,
   content: f.content ? scrubTransferSecrets(f.content) : undefined,
 })),
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
 metadata: options.metadata ? scrubRecursive(options.metadata) : undefined,
 };
}

export function serializeWorkTransfer(pkg: WorkTransferPackage): string {
 return JSON.stringify(pkg, null, 2);
}

export function deserializeWorkTransfer(jsonText: string): WorkTransferPackage {
  // Check payload size to prevent huge payload parsing
  if (jsonText.length > 1024 * 1024) {
    throw new Error('Malformed WorkTransferPackage: payload exceeds 1MB limit');
  }

  const parsed = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Malformed WorkTransferPackage: must be a JSON object');
  }

  // Guard against prototype pollution
  const pollutionKeys = ['__proto__', 'constructor', 'prototype'];
  const hasPollution = (obj: any): boolean => {
    if (!obj || typeof obj !== 'object') return false;
    for (const key of Object.keys(obj)) {
      if (pollutionKeys.includes(key)) return true;
      if (typeof obj[key] === 'object' && hasPollution(obj[key])) return true;
    }
    return false;
  };

  if (hasPollution(parsed)) {
    throw new Error('Malformed WorkTransferPackage: prototype pollution detected');
  }

  const enforceStringLength = (val: string, maxLen: number, fieldName: string) => {
    if (val.length > maxLen) {
      throw new Error(`Malformed WorkTransferPackage: field "${fieldName}" exceeds maximum length of ${maxLen}`);
    }
  };

  // Mandatory top-level string fields
  const requiredStringFields = ['id', 'task', 'objective', 'sourceAgentId', 'title'];
  for (const field of requiredStringFields) {
    if (!(field in parsed)) {
      throw new Error(`Malformed WorkTransferPackage: missing required field "${field}"`);
    }
    if (typeof parsed[field] !== 'string') {
      throw new Error(`Malformed WorkTransferPackage: field "${field}" must be a string`);
    }
    enforceStringLength(parsed[field], 100000, field);
  }

  // Provenance validation
  if (!parsed.provenance || typeof parsed.provenance !== 'object') {
    throw new Error('Malformed WorkTransferPackage: missing required field "provenance"');
  }

  if (typeof parsed.provenance.timestamp !== 'string') {
    throw new Error('Malformed WorkTransferPackage: field "provenance.timestamp" must be a string');
  }
  if (typeof parsed.provenance.bridgeVersion !== 'string') {
    throw new Error('Malformed WorkTransferPackage: field "provenance.bridgeVersion" must be a string');
  }
  if (typeof parsed.provenance.sourceAgentId !== 'string') {
    throw new Error('Malformed WorkTransferPackage: field "provenance.sourceAgentId" must be a string');
  }

  // Array validation
  const validateArray = (val: any, field: string) => {
    if (val !== undefined && !Array.isArray(val)) {
      throw new Error(`Malformed WorkTransferPackage: field "${field}" must be an array`);
    }
  };

  validateArray(parsed.changedFiles, 'changedFiles');
  if (parsed.changedFiles) {
    for (const file of parsed.changedFiles) {
      if (!file || typeof file !== 'object') {
        throw new Error('Malformed WorkTransferPackage: changedFiles elements must be objects');
      }
      if (typeof file.path !== 'string') {
        throw new Error('Malformed WorkTransferPackage: changedFiles[].path must be a string');
      }
      enforceStringLength(file.path, 10000, 'changedFiles[].path');
      if (file.status !== 'added' && file.status !== 'modified' && file.status !== 'deleted') {
        throw new Error('Malformed WorkTransferPackage: changedFiles[].status must be added, modified, or deleted');
      }
      if (file.diff !== undefined) {
        if (typeof file.diff !== 'string') throw new Error('Malformed WorkTransferPackage: changedFiles[].diff must be a string');
        enforceStringLength(file.diff, 1000000, 'changedFiles[].diff');
      }
      if (file.content !== undefined) {
        if (typeof file.content !== 'string') throw new Error('Malformed WorkTransferPackage: changedFiles[].content must be a string');
        enforceStringLength(file.content, 1000000, 'changedFiles[].content');
      }
    }
  }

  validateArray(parsed.relevantFiles, 'relevantFiles');
  if (parsed.relevantFiles) {
    for (const f of parsed.relevantFiles) {
      if (!f || typeof f !== 'object') throw new Error('Malformed WorkTransferPackage: relevantFiles elements must be objects');
      if (typeof f.path !== 'string') throw new Error('Malformed WorkTransferPackage: relevantFiles[].path must be a string');
      enforceStringLength(f.path, 10000, 'relevantFiles[].path');
      if (f.reason !== undefined) {
        if (typeof f.reason !== 'string') throw new Error('Malformed WorkTransferPackage: relevantFiles[].reason must be a string');
        enforceStringLength(f.reason, 10000, 'relevantFiles[].reason');
      }
      if (f.content !== undefined) {
        if (typeof f.content !== 'string') throw new Error('Malformed WorkTransferPackage: relevantFiles[].content must be a string');
        enforceStringLength(f.content, 1000000, 'relevantFiles[].content');
      }
    }
  }

  validateArray(parsed.artifacts, 'artifacts');
  if (parsed.artifacts) {
    for (const f of parsed.artifacts) {
      if (!f || typeof f !== 'object') throw new Error('Malformed WorkTransferPackage: artifacts elements must be objects');
      if (typeof f.id !== 'string') throw new Error('Malformed WorkTransferPackage: artifacts[].id must be a string');
      enforceStringLength(f.id, 10000, 'artifacts[].id');
      if (typeof f.name !== 'string') throw new Error('Malformed WorkTransferPackage: artifacts[].name must be a string');
      enforceStringLength(f.name, 10000, 'artifacts[].name');
      if (typeof f.type !== 'string') throw new Error('Malformed WorkTransferPackage: artifacts[].type must be a string');
      enforceStringLength(f.type, 10000, 'artifacts[].type');
      if (f.path !== undefined) {
        if (typeof f.path !== 'string') throw new Error('Malformed WorkTransferPackage: artifacts[].path must be a string');
        enforceStringLength(f.path, 10000, 'artifacts[].path');
      }
      if (f.content !== undefined) {
        if (typeof f.content !== 'string') throw new Error('Malformed WorkTransferPackage: artifacts[].content must be a string');
        enforceStringLength(f.content, 1000000, 'artifacts[].content');
      }
    }
  }

  validateArray(parsed.commands, 'commands');
  if (parsed.commands) {
    for (const f of parsed.commands) {
      if (!f || typeof f !== 'object') throw new Error('Malformed WorkTransferPackage: commands elements must be objects');
      if (typeof f.command !== 'string') throw new Error('Malformed WorkTransferPackage: commands[].command must be a string');
      enforceStringLength(f.command, 100000, 'commands[].command');
      if (typeof f.exitCode !== 'number') throw new Error('Malformed WorkTransferPackage: commands[].exitCode must be a number');
      if (f.durationMs !== undefined && typeof f.durationMs !== 'number') throw new Error('Malformed WorkTransferPackage: commands[].durationMs must be a number');
      if (f.stdout !== undefined) {
        if (typeof f.stdout !== 'string') throw new Error('Malformed WorkTransferPackage: commands[].stdout must be a string');
        enforceStringLength(f.stdout, 1000000, 'commands[].stdout');
      }
      if (f.stderr !== undefined) {
        if (typeof f.stderr !== 'string') throw new Error('Malformed WorkTransferPackage: commands[].stderr must be a string');
        enforceStringLength(f.stderr, 1000000, 'commands[].stderr');
      }
    }
  }

  validateArray(parsed.tests, 'tests');
  if (parsed.tests) {
    for (const f of parsed.tests) {
      if (!f || typeof f !== 'object') throw new Error('Malformed WorkTransferPackage: tests elements must be objects');
      if (typeof f.command !== 'string') throw new Error('Malformed WorkTransferPackage: tests[].command must be a string');
      enforceStringLength(f.command, 100000, 'tests[].command');
      if (typeof f.passed !== 'boolean') throw new Error('Malformed WorkTransferPackage: tests[].passed must be a boolean');
      if (f.summary !== undefined) {
        if (typeof f.summary !== 'string') throw new Error('Malformed WorkTransferPackage: tests[].summary must be a string');
        enforceStringLength(f.summary, 1000000, 'tests[].summary');
      }
      if (f.stdout !== undefined) {
        if (typeof f.stdout !== 'string') throw new Error('Malformed WorkTransferPackage: tests[].stdout must be a string');
        enforceStringLength(f.stdout, 1000000, 'tests[].stdout');
      }
      if (f.stderr !== undefined) {
        if (typeof f.stderr !== 'string') throw new Error('Malformed WorkTransferPackage: tests[].stderr must be a string');
        enforceStringLength(f.stderr, 1000000, 'tests[].stderr');
      }
      if (f.durationMs !== undefined && typeof f.durationMs !== 'number') throw new Error('Malformed WorkTransferPackage: tests[].durationMs must be a number');
    }
  }

  validateArray(parsed.decisions, 'decisions');
  if (parsed.decisions) {
    for (const f of parsed.decisions) {
      if (!f || typeof f !== 'object') throw new Error('Malformed WorkTransferPackage: decisions elements must be objects');
      if (typeof f.decision !== 'string') throw new Error('Malformed WorkTransferPackage: decisions[].decision must be a string');
      enforceStringLength(f.decision, 100000, 'decisions[].decision');
      if (typeof f.rationale !== 'string') throw new Error('Malformed WorkTransferPackage: decisions[].rationale must be a string');
      enforceStringLength(f.rationale, 1000000, 'decisions[].rationale');
      validateArray(f.alternativesConsidered, 'decisions[].alternativesConsidered');
      if (f.alternativesConsidered) {
        for (const alt of f.alternativesConsidered) {
          if (typeof alt !== 'string') throw new Error('Malformed WorkTransferPackage: decisions[].alternativesConsidered elements must be strings');
          enforceStringLength(alt, 100000, 'decisions[].alternativesConsidered element');
        }
      }
    }
  }

  validateArray(parsed.unresolvedQuestions, 'unresolvedQuestions');
  if (parsed.unresolvedQuestions) {
    for (const q of parsed.unresolvedQuestions) {
      if (typeof q !== 'string') throw new Error('Malformed WorkTransferPackage: unresolvedQuestions elements must be strings');
      enforceStringLength(q, 100000, 'unresolvedQuestions element');
    }
  }

  validateArray(parsed.outcomes, 'outcomes');
  if (parsed.outcomes) {
    for (const q of parsed.outcomes) {
      if (typeof q !== 'string') throw new Error('Malformed WorkTransferPackage: outcomes elements must be strings');
      enforceStringLength(q, 100000, 'outcomes element');
    }
  }

  validateArray(parsed.failures, 'failures');
  if (parsed.failures) {
    for (const q of parsed.failures) {
      if (typeof q !== 'string') throw new Error('Malformed WorkTransferPackage: failures elements must be strings');
      enforceStringLength(q, 100000, 'failures element');
    }
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
 if (typeof file.content !== 'string') {
   throw new Error('File content must be a string');
 }
 fs.mkdirSync(path.dirname(fullPath), { recursive: true });
 // TOCTOU check after mkdirSync
 const finalResolved = path.resolve(fullPath);
 const resolvedRoot = path.resolve(targetWorkspaceRoot);
 if (!finalResolved.startsWith(resolvedRoot)) {
   throw new Error(`Path traversal violation after directory creation: "${fullPath}" escapes root "${targetWorkspaceRoot}"`);
 }
 fs.writeFileSync(finalResolved, file.content, 'utf-8');
 result.appliedFiles.push(file.path);
 }
 } catch (err: unknown) {
 result.errors.push(`Failed to apply ${file.path}: ${String(err)}`);
 }
 }

 return result;
}
