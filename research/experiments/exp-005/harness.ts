/**
 * BRIDGE - EXP-005: Live Trial Execution Harness
 *
 * Orchestrates worktree lifecycle, seeds scenario fixtures, executes agent trials,
 * captures git patches, runs verification commands, and emits complete telemetry.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import process from 'node:process';
import { execSync } from 'node:child_process';
import type {
 LiveAgentScenario,
 ExperimentCondition,
 TrialTelemetry,
 VerificationResult,
} from './schema.js';
import { buildConditionPayload, FROZEN_RESOLVER_COMMIT } from './payload-builder.js';
import {
 executeOpenCodeTrial,
 PINNED_OPENCODE_MODEL,
 PINNED_PROVIDER,
 getExecutionEnv,
} from './agent-runners.js';
import { scrubSecrets, validatePathConfinement } from './security.js';

export const EXP005_WORKTREES_ROOT = path.resolve(
 process.cwd(),
 'research',
 'experiments',
 'exp-005',
 'worktrees'
);

/**
 * Computes SHA-256 hash of payload text for traceability.
 */
export function hashPayload(payloadText: string): string {
 return crypto.createHash('sha256').update(payloadText, 'utf-8').digest('hex');
}

/**
 * Ensures clean setup of an ephemeral worktree directory for a trial.
 */
export function setupTrialWorktree(trialId: string, scenario: LiveAgentScenario): string {
 const trialDir = path.join(EXP005_WORKTREES_ROOT, trialId);
 validatePathConfinement(trialDir, EXP005_WORKTREES_ROOT);

 if (fs.existsSync(trialDir)) {
 cleanupTrialWorktree(trialDir);
 }
 fs.mkdirSync(trialDir, { recursive: true });

 // Write all scenario fixture files
 for (const file of scenario.fixtureFiles) {
 const filePath = path.join(trialDir, file.relativePath);
 fs.mkdirSync(path.dirname(filePath), { recursive: true });
 fs.writeFileSync(filePath, file.content, 'utf-8');
 }

 // Ensure self-contained vitest config so tests in packages/** or root are properly discovered
 const worktreeVitestConfig = path.join(trialDir, 'vitest.config.ts');
 if (!fs.existsSync(worktreeVitestConfig)) {
 const vitestConfContent = `import { defineConfig } from 'vitest/config';
export default defineConfig({
 test: {
 include: ['**/*.test.ts', '**/*.spec.ts'],
 exclude: ['**/node_modules/**', '**/.git/**'],
 globals: false,
 environment: 'node',
 },
});\n`;
 fs.writeFileSync(worktreeVitestConfig, vitestConfContent, 'utf-8');
 }

 // Link node_modules from project root to ensure vitest and test runners execute reliably
 const rootNodeModules = path.resolve(process.cwd(), 'node_modules');
 const worktreeNodeModules = path.join(trialDir, 'node_modules');
 if (fs.existsSync(rootNodeModules) && !fs.existsSync(worktreeNodeModules)) {
 try {
 if (process.platform === 'win32') {
 fs.symlinkSync(rootNodeModules, worktreeNodeModules, 'junction');
 } else {
 fs.symlinkSync(rootNodeModules, worktreeNodeModules, 'dir');
 }
 } catch {
 // If symlinking fails, continue with fallback
 }
 }

 // Write .gitignore so node_modules junction is not tracked by git
 const gitignorePath = path.join(trialDir, '.gitignore');
 if (!fs.existsSync(gitignorePath)) {
 fs.writeFileSync(gitignorePath, "node_modules/\n.vitest/\ndist/\n", 'utf-8');
 }

 // Initialize a local git repository inside the ephemeral worktree for clean diff tracking
 try {
 const env = getExecutionEnv();
 execSync('git init', { cwd: trialDir, env, stdio: 'ignore' });
 execSync('git config user.email "test@bridge.local"', { cwd: trialDir, env, stdio: 'ignore' });
 execSync('git config user.name "BridgeTest"', { cwd: trialDir, env, stdio: 'ignore' });
 execSync('git add -A', { cwd: trialDir, env, stdio: 'ignore' });
 execSync('git commit -m "initial fixture state" --allow-empty', { cwd: trialDir, env, stdio: 'ignore' });
 } catch {
 // Git init fallback if needed
 }

 return trialDir;
}

/**
 * Capture git diff from the worktree including new files.
 */
export function captureWorktreePatch(worktreePath: string): string {
 try {
 const env = getExecutionEnv();
 try {
 execSync('git add -A', { cwd: worktreePath, env, stdio: 'ignore' });
 } catch {
 // Ignore fallback
 }

 const diff = execSync('git diff HEAD', {
 cwd: worktreePath,
 env,
 encoding: 'utf-8',
 stdio: ['pipe', 'pipe', 'pipe'],
 });
 return scrubSecrets(diff);
 } catch {
 return '';
 }
}

/**
 * Run verification tests inside the worktree.
 */
export function runVerificationCommand(
 worktreePath: string,
 command: string
): VerificationResult {
 const startTime = performance.now();
 try {
 const stdout = execSync(command, {
 cwd: worktreePath,
 env: getExecutionEnv(),
 encoding: 'utf-8',
 stdio: ['pipe', 'pipe', 'pipe'],
 timeout: 30_000,
 });
 return {
 testsPassed: true,
 exitCode: 0,
 stdout: scrubSecrets(stdout),
 stderr: '',
 durationMs: Math.round(performance.now() - startTime),
 };
 } catch (err: unknown) {
 const error = err as { status?: number; stdout?: string; stderr?: string };
 return {
 testsPassed: false,
 exitCode: error.status ?? 1,
 stdout: scrubSecrets(error.stdout ?? ''),
 stderr: scrubSecrets(error.stderr ?? String(err)),
 durationMs: Math.round(performance.now() - startTime),
 };
 }
}

/**
 * Clean up ephemeral worktree.
 */
export function cleanupTrialWorktree(worktreePath: string): void {
 validatePathConfinement(worktreePath, EXP005_WORKTREES_ROOT);
 try {
 if (fs.existsSync(worktreePath)) {
 const nmPath = path.join(worktreePath, 'node_modules');
 if (fs.existsSync(nmPath)) {
 try {
 fs.unlinkSync(nmPath);
 } catch {
 // If not a symlink/junction, rmSync will handle it
 }
 }
 fs.rmSync(worktreePath, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
 }
 } catch {
 // Ignore transient OS file-lock on cleanup
 }
}

/**
 * Execute a single controlled live trial.
 */
export async function runTrial(
 scenario: LiveAgentScenario,
 condition: ExperimentCondition,
 options: {
 runId?: string;
 replicationIndex?: number;
 trialOrderIndex?: number;
 randomizationSeed?: number;
 timeoutMs?: number;
 preserveWorktree?: boolean;
 } = {}
): Promise<TrialTelemetry> {
 const repIndex = options.replicationIndex ?? 1;
 const orderIndex = options.trialOrderIndex ?? 1;
 const seed = options.randomizationSeed ?? 42;

 const trialId = `trial-${scenario.scenarioId}-${condition}-rep${repIndex}-${Date.now()}`;
 const worktreePath = setupTrialWorktree(trialId, scenario);

 const payload = buildConditionPayload(scenario, condition);
 const payloadHash = hashPayload(payload.promptText);

 let currentCommit = 'UNKNOWN';
 try {
 currentCommit = execSync('git rev-parse --short HEAD', {
 cwd: process.cwd(),
 encoding: 'utf-8',
 }).trim();
 } catch {
 currentCommit = FROZEN_RESOLVER_COMMIT;
 }

 try {
 const execution = await executeOpenCodeTrial(
 worktreePath,
 payload.promptText,
 options.timeoutMs ?? 180_000
 );

 const gitPatch = captureWorktreePatch(worktreePath);
 const verification = runVerificationCommand(
 worktreePath,
 scenario.expectedOutcome.verificationTestCommand
 );

 const telemetry: TrialTelemetry = {
 experimentId: 'EXP-005',
 runId: options.runId,
 trialId,
 scenarioId: scenario.scenarioId,
 replicationIndex: repIndex,
 trialOrderIndex: orderIndex,
 condition,
 randomizationSeed: seed,
 model: PINNED_OPENCODE_MODEL,
 provider: PINNED_PROVIDER,
 bridgeCommit: currentCommit,
 resolverCommit: FROZEN_RESOLVER_COMMIT,
 startingCommit: currentCommit,
 timestamp: new Date().toISOString(),
 worktreePath,
 payloadHash,
 payload,
 execution,
 gitPatch,
 verification,
 error: execution.error,
 };

 return telemetry;
 } catch (trialError: unknown) {
 // Fallback failure capture so evidence is never dropped
 const gitPatch = captureWorktreePatch(worktreePath);
 const verification = runVerificationCommand(
 worktreePath,
 scenario.expectedOutcome.verificationTestCommand
 );

 return {
 experimentId: 'EXP-005',
 runId: options.runId,
 trialId,
 scenarioId: scenario.scenarioId,
 replicationIndex: repIndex,
 trialOrderIndex: orderIndex,
 condition,
 randomizationSeed: seed,
 model: PINNED_OPENCODE_MODEL,
 provider: PINNED_PROVIDER,
 bridgeCommit: currentCommit,
 resolverCommit: FROZEN_RESOLVER_COMMIT,
 startingCommit: currentCommit,
 timestamp: new Date().toISOString(),
 worktreePath,
 payloadHash,
 payload,
 execution: {
 durationMs: 0,
 exitCode: 1,
 error: String(trialError),
 inputTokens: 'UNKNOWN',
 outputTokens: 'UNKNOWN',
 totalTokens: 'UNKNOWN',
 toolCallCount: 0,
 stdout: '',
 stderr: String(trialError),
 },
 gitPatch,
 verification,
 error: String(trialError),
 };
 } finally {
 if (!options.preserveWorktree) {
 try {
 cleanupTrialWorktree(worktreePath);
 } catch {
 // Never let cleanup failure mask valid trial results
 }
 }
 }
}
