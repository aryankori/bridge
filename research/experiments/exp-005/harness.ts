/**
 * BRIDGE — EXP-005: Live Trial Execution Harness
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
    fs.rmSync(trialDir, { recursive: true, force: true });
  }
  fs.mkdirSync(trialDir, { recursive: true });

  // Write all scenario fixture files
  for (const file of scenario.fixtureFiles) {
    const filePath = path.join(trialDir, file.relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content, 'utf-8');
  }

  // Initialize a local git repository inside the ephemeral worktree for clean diff tracking
  try {
    execSync('git init && git config user.email "test@bridge.local" && git config user.name "BridgeTest"', {
      cwd: trialDir,
      env: getExecutionEnv(),
      stdio: 'ignore',
    });
    execSync('git add . && git commit -m "initial fixture state"', {
      cwd: trialDir,
      env: getExecutionEnv(),
      stdio: 'ignore',
    });
  } catch {
    // Git init fallback if needed
  }

  return trialDir;
}

/**
 * Capture git diff from the worktree.
 */
export function captureWorktreePatch(worktreePath: string): string {
  try {
    const diff = execSync('git diff HEAD', {
      cwd: worktreePath,
      env: getExecutionEnv(),
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
  if (fs.existsSync(worktreePath)) {
    fs.rmSync(worktreePath, { recursive: true, force: true });
  }
}

/**
 * Execute a single controlled live trial.
 */
export async function runTrial(
  scenario: LiveAgentScenario,
  condition: ExperimentCondition,
  options: {
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
    };

    return telemetry;
  } finally {
    if (!options.preserveWorktree) {
      cleanupTrialWorktree(worktreePath);
    }
  }
}
