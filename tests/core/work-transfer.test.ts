/**
 * Unit Tests - WorkTransfer Primitive
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
 createWorkTransferPackage,
 serializeWorkTransfer,
 deserializeWorkTransfer,
 renderTransferPrompt,
 applyWorkTransferToWorkspace,
 scrubTransferSecrets,
 assertPathConfinement,
} from '../../src/core/work-transfer.js';
import { agentId } from '../../src/core/types.js';

describe('WorkTransfer Primitive', () => {
 let tempDir: string;

 beforeEach(() => {
 tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bridge-wt-test-'));
 });

 afterEach(() => {
 if (fs.existsSync(tempDir)) {
 fs.rmSync(tempDir, { recursive: true, force: true });
 }
 });

 describe('Secret Scrubbing & Path Confinement', () => {
 it('scrubs OpenAI API keys and tokens from strings', () => {
 const secret = 'sk-1234567890abcdef1234567890';
 const text = `Use this key: ${secret} to access the model.`;
 const scrubbed = scrubTransferSecrets(text);
 expect(scrubbed).not.toContain(secret);
 expect(scrubbed).toContain('[REDACTED_SECRET]');
 });

 it('scrubs GitHub PAT tokens from text', () => {
 const ghp = 'ghp_1234567890abcdef1234567890abcdef1234';
 const scrubbed = scrubTransferSecrets(`Token: ${ghp}`);
 expect(scrubbed).not.toContain(ghp);
 expect(scrubbed).toContain('[REDACTED_SECRET]');
 });

 it('asserts path confinement within root directory', () => {
 expect(() => assertPathConfinement('src/index.ts', tempDir)).not.toThrow();
 expect(() => assertPathConfinement('../outside.txt', tempDir)).toThrow(/Path traversal violation/);
 });
 });

 describe('Package Creation & Serialization', () => {
 it('creates a well-formed WorkTransferPackage', () => {
 const pkg = createWorkTransferPackage({
 title: 'Refactor Authentication Service',
 task: 'Migrate auth from JWT to session cookies',
 objective: 'Pass all security tests and clean up obsolete tokens',
 sourceAgent: agentId('claude-code'),
 targetAgent: agentId('opencode'),
 changedFiles: [
 {
 path: 'src/auth/session.ts',
 status: 'added',
 content: 'export class SessionAuth {}',
 },
 ],
 outcomes: ['Implemented cookie session handler'],
 decisions: [
 {
 decision: 'Use httpOnly cookies',
 rationale: 'Prevent XSS exfiltration',
 },
 ],
 tests: [
 {
 command: 'pnpm test',
 passed: true,
 summary: '5 passed',
 },
 ],
 });

 expect(pkg.id).toMatch(/^transfer-/);
 expect(pkg.title).toBe('Refactor Authentication Service');
 expect(pkg.sourceAgentId).toBe('claude-code');
 expect(pkg.targetAgentId).toBe('opencode');
 expect(pkg.changedFiles).toHaveLength(1);
 expect(pkg.decisions).toHaveLength(1);
 expect(pkg.provenance.bridgeVersion).toBe('0.1.0');
 });

 it('serializes and deserializes cleanly without loss', () => {
 const original = createWorkTransferPackage({
 title: 'Test Transfer',
 task: 'Task A',
 objective: 'Objective A',
 sourceAgent: 'agent-1',
 outcomes: ['Done A'],
 });

 const json = serializeWorkTransfer(original);
 const restored = deserializeWorkTransfer(json);

 expect(restored.id).toBe(original.id);
 expect(restored.task).toBe(original.task);
 expect(restored.outcomes).toEqual(original.outcomes);
 });

 it('throws when deserializing invalid JSON or missing fields', () => {
 expect(() => deserializeWorkTransfer('{ invalid json')).toThrow();
 expect(() => deserializeWorkTransfer('{"id": "123"}')).toThrow(/missing required field/);

 // Invalid type
 expect(() => deserializeWorkTransfer(JSON.stringify({
 id: 123, task: 't', objective: 'o', sourceAgentId: 's', title: 't',
 provenance: { timestamp: 't', bridgeVersion: 'v', sourceAgentId: 's' },
 changedFiles: []
 }))).toThrow(/field "id" must be a string/);
 });

 it('throws when prototype pollution is attempted', () => {
 const payload = JSON.parse('{"id": "1", "task": "2", "objective": "3", "sourceAgentId": "4", "title": "5", "provenance": {"timestamp": "t", "bridgeVersion": "v", "sourceAgentId": "s"}, "__proto__": {"polluted": "yes"}}');
 expect(() => deserializeWorkTransfer(JSON.stringify(payload))).toThrow(/prototype pollution detected/);
 });

 it('throws when changedFiles contains an invalid status', () => {
 const validPkg = createWorkTransferPackage({
 title: 'Test', task: 'T', objective: 'O', sourceAgent: 'A'
 });
 const payload = JSON.parse(serializeWorkTransfer(validPkg));
 payload.changedFiles = [{ path: 'test.ts', status: 'invalid_status' }];
 expect(() => deserializeWorkTransfer(JSON.stringify(payload))).toThrow(/changedFiles\[\].status must be added, modified, or deleted/);
 });

 it('throws when array field is of invalid type', () => {
 const validPkg = createWorkTransferPackage({
 title: 'Test', task: 'T', objective: 'O', sourceAgent: 'A'
 });
 const payload = JSON.parse(serializeWorkTransfer(validPkg));
 payload.changedFiles = "not-an-array";
 expect(() => deserializeWorkTransfer(JSON.stringify(payload))).toThrow(/field "changedFiles" must be an array/);
 });
 });

 describe('Prompt Rendering', () => {
 it('renders clean markdown prompt instructions for target agent', () => {
 const pkg = createWorkTransferPackage({
 title: 'Fix Database Deadlocks',
 task: 'Add exponential backoff to transaction retry logic',
 objective: 'Resolve intermittent SQL 40001 errors under load',
 sourceAgent: 'claude-code',
 outcomes: ['Identified lock contention in OrderService'],
 changedFiles: [
 {
 path: 'src/db/retry.ts',
 status: 'modified',
 diff: '+ export function retry() {}',
 },
 ],
 tests: [
 {
 command: 'vitest run',
 passed: true,
 summary: '10 passed',
 },
 ],
 decisions: [
 {
 decision: 'Set maxRetries to 5',
 rationale: 'Balanced between latency and reliability',
 },
 ],
 unresolvedQuestions: ['Should we log retry attempts to Sentry?'],
 });

 const prompt = renderTransferPrompt(pkg, { includeDiffs: true });

 expect(prompt).toContain('BRIDGE WORK TRANSFER: Fix Database Deadlocks');
 expect(prompt).toContain('Task: Add exponential backoff to transaction retry logic');
 expect(prompt).toContain('Identified lock contention in OrderService');
 expect(prompt).toContain('[MODIFIED] src/db/retry.ts');
 expect(prompt).toContain('+ export function retry() {}');
 expect(prompt).toContain('vitest run: PASSED (10 passed)');
 expect(prompt).toContain('Set maxRetries to 5');
 expect(prompt).toContain('Should we log retry attempts to Sentry?');
 });
 });

 describe('Workspace Materialization', () => {
 it('writes added files and deletes removed files safely', () => {
 const pkg = createWorkTransferPackage({
 title: 'Workspace Patch',
 task: 'Apply changes',
 objective: 'Update files',
 sourceAgent: 'agent-src',
 changedFiles: [
 {
 path: 'src/utils/math.ts',
 status: 'added',
 content: 'export const add = (a: number, b: number) => a + b;',
 },
 ],
 });

 const res = applyWorkTransferToWorkspace(pkg, tempDir);
 expect(res.appliedFiles).toContain('src/utils/math.ts');
 expect(res.errors).toHaveLength(0);

 const createdFile = path.join(tempDir, 'src', 'utils', 'math.ts');
 expect(fs.existsSync(createdFile)).toBe(true);
 expect(fs.readFileSync(createdFile, 'utf-8')).toContain('export const add');

 // Now test deletion
 const deletePkg = createWorkTransferPackage({
 title: 'Delete Patch',
 task: 'Remove files',
 objective: 'Delete obsolete',
 sourceAgent: 'agent-src',
 changedFiles: [
 {
 path: 'src/utils/math.ts',
 status: 'deleted',
 },
 ],
 });

 const delRes = applyWorkTransferToWorkspace(deletePkg, tempDir);
 expect(delRes.deletedFiles).toContain('src/utils/math.ts');
 expect(fs.existsSync(createdFile)).toBe(false);
 });

 it('captures path traversal attempts as errors rather than crashing', () => {
 const maliciousPkg = createWorkTransferPackage({
 title: 'Traversal Attempt',
 task: 'Test',
 objective: 'Test',
 sourceAgent: 'agent-src',
 changedFiles: [
 {
 path: '../escaped.txt',
 status: 'added',
 content: 'malicious payload',
 },
 ],
 });

 const res = applyWorkTransferToWorkspace(maliciousPkg, tempDir);
 expect(res.errors).toHaveLength(1);
 expect(res.errors[0]).toContain('Path traversal violation');
 });
 });
});
