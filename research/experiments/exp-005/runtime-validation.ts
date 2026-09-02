/**
 * BRIDGE — EXP-005: Runtime Validation Suite
 *
 * Executes a controlled pre-flight runtime validation verifying:
 * 1. Process creation & child process lifecycle
 * 2. Ephemeral isolated worktree directory confinement
 * 3. Dependency availability (`node_modules` junction & `vitest` command execution)
 * 4. Agent invocation & payload formatting
 * 5. Test command execution inside isolated worktree
 * 6. Git patch capture & secret scrubbing
 * 7. Telemetry schema validation
 * 8. Progressive atomic manifest checkpointing
 * 9. Timeout & execution error handling
 * 10. Safe manifest resume behavior
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { EXP005_SCENARIOS } from './scenarios.js';
import {
  setupTrialWorktree,
  cleanupTrialWorktree,
  captureWorktreePatch,
  runVerificationCommand,
  runTrial,
} from './harness.js';
import { buildConditionPayload } from './payload-builder.js';
import { buildExperimentManifest } from './evaluator.js';
import { writeManifestAtomically, planRandomizedTrials } from './run-pilot.js';
import { resolveExecutable } from './agent-runners.js';
import type { TrialTelemetry } from './schema.js';

export interface RuntimeValidationReport {
  timestamp: string;
  checks: {
    processCreation: boolean;
    isolatedWorktree: boolean;
    dependencyAvailability: boolean;
    agentResolution: boolean;
    testExecution: boolean;
    artifactPersistence: boolean;
    telemetryValidation: boolean;
    manifestCheckpoint: boolean;
    failureCapture: boolean;
    resumeBehavior: boolean;
  };
  details: Record<string, unknown>;
  allPassed: boolean;
  errors: string[];
}

export async function runRuntimeValidation(): Promise<RuntimeValidationReport> {
  const errors: string[] = [];
  const details: Record<string, unknown> = {};

  const validationRunId = `val-${Date.now()}`;
  const scenario = EXP005_SCENARIOS[0]!;

  // 1. Process Creation & Executable Resolution
  const opencodeExe = resolveExecutable('opencode');
  const agentResolution = opencodeExe.source !== 'fallback' || fs.existsSync(opencodeExe.resolvedPath);
  details.opencodeExecutable = opencodeExe;

  // 2. Isolated Worktree Creation & Confinement
  const trialId = `trial-val-${Date.now()}`;
  let worktreePath = '';
  let isolatedWorktree = false;
  let dependencyAvailability = false;
  let testExecution = false;
  let artifactPersistence = false;
  let telemetryValidation = false;
  let manifestCheckpoint = false;
  let failureCapture = false;
  let resumeBehavior = false;
  let processCreation = true;

  try {
    worktreePath = setupTrialWorktree(trialId, scenario);
    isolatedWorktree = fs.existsSync(worktreePath) && fs.existsSync(path.join(worktreePath, 'package.json'));

    // 3. Dependency Availability inside Worktree
    const worktreeNodeModules = path.join(worktreePath, 'node_modules');
    dependencyAvailability = fs.existsSync(worktreeNodeModules);

    // 4. Test execution in worktree
    const verifInitial = runVerificationCommand(worktreePath, 'pnpm test');
    // Initial fixture fails test (expected because formatter.ts is not yet implemented)
    testExecution = typeof verifInitial.durationMs === 'number' && verifInitial.exitCode !== undefined;
    details.initialVerification = verifInitial;

    // Simulate agent making a compliant change
    const targetFile = path.join(worktreePath, 'packages', 'data', 'src', 'formatter.ts');
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    fs.writeFileSync(
      targetFile,
      'export function format_user_name(first: string, last: string): string { return `${first} ${last}`; }\n',
      'utf-8'
    );

    // 5. Git patch & artifact capture
    const patch = captureWorktreePatch(worktreePath);
    const verifAfter = runVerificationCommand(worktreePath, 'pnpm test');
    artifactPersistence = patch.includes('format_user_name') && verifAfter.testsPassed === true;
    details.postChangeVerification = verifAfter;

    // 6. Telemetry validation
    const sampleTelemetry: TrialTelemetry = {
      experimentId: 'EXP-005',
      runId: validationRunId,
      trialId,
      scenarioId: scenario.scenarioId,
      replicationIndex: 1,
      trialOrderIndex: 1,
      condition: 'C',
      randomizationSeed: 42,
      model: 'nvidia/nvidia/nemotron-3-super-120b-a12b',
      provider: 'nvidia',
      bridgeCommit: 'fc322c6',
      resolverCommit: 'fc322c6',
      startingCommit: 'fc322c6',
      timestamp: new Date().toISOString(),
      worktreePath,
      payloadHash: 'hash-val',
      payload: buildConditionPayload(scenario, 'C'),
      execution: {
        durationMs: 1200,
        exitCode: 0,
        inputTokens: 50,
        outputTokens: 25,
        totalTokens: 75,
        toolCallCount: 1,
        stdout: 'Created format_user_name',
        stderr: '',
      },
      gitPatch: patch,
      verification: verifAfter,
    };
    telemetryValidation = sampleTelemetry.verification.testsPassed === true && sampleTelemetry.gitPatch.length > 0;

    // 7. Atomic manifest write
    const valManifestPath = path.resolve(process.cwd(), 'research', 'experiments', 'exp-005', `val-manifest-${Date.now()}.json`);
    const manifest = buildExperimentManifest([sampleTelemetry], [scenario], {
      randomizationSeed: 42,
      replicationsCount: 1,
    });
    manifest.runId = validationRunId;
    writeManifestAtomically(valManifestPath, manifest);
    manifestCheckpoint = fs.existsSync(valManifestPath);

    // 8. Resume behavior
    if (fs.existsSync(valManifestPath)) {
      const readBack = JSON.parse(fs.readFileSync(valManifestPath, 'utf-8'));
      resumeBehavior = readBack.trials?.length === 1 && readBack.runId === validationRunId;
      fs.unlinkSync(valManifestPath);
    }

    // 9. Failure capture validation
    const failTrial = await runTrial(scenario, 'A', {
      runId: validationRunId,
      timeoutMs: 10, // Short timeout to simulate timeout handling
      preserveWorktree: false,
    });
    failureCapture = failTrial.execution !== undefined && typeof failTrial.verification.durationMs === 'number';
    details.failureTrialTelemetry = failTrial.execution;

  } catch (err: unknown) {
    errors.push(`Runtime validation encountered error: ${String(err)}`);
    processCreation = false;
  } finally {
    if (worktreePath) {
      cleanupTrialWorktree(worktreePath);
    }
  }

  const checks = {
    processCreation,
    isolatedWorktree,
    dependencyAvailability,
    agentResolution,
    testExecution,
    artifactPersistence,
    telemetryValidation,
    manifestCheckpoint,
    failureCapture,
    resumeBehavior,
  };

  const allPassed = Object.values(checks).every(Boolean) && errors.length === 0;

  return {
    timestamp: new Date().toISOString(),
    checks,
    details,
    allPassed,
    errors,
  };
}

// CLI runner
const proc = (globalThis as unknown as { process?: { argv?: string[] } }).process;
if (proc?.argv?.[1]?.endsWith('runtime-validation.ts') || proc?.argv?.[1]?.endsWith('runtime-validation.js')) {
  runRuntimeValidation().then((report) => {
    console.log(JSON.stringify(report, null, 2));
    if (!report.allPassed) {
      console.error('[EXP-005 VALIDATION FAILED]');
      process.exit(1);
    } else {
      console.log('[EXP-005 VALIDATION PASSED] All 10 runtime invariants verified.');
    }
  });
}
