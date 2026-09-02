/**
 * BRIDGE — EXP-005: Live OpenCode Integration Smoke Test
 *
 * Verifies executable resolution, process spawning, and token extraction
 * with the pinned OpenCode model (nvidia/nvidia/nemotron-3-super-120b-a12b)
 * in an isolated temporary directory WITHOUT running full experimental trials.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { executeOpenCodeTrial, PINNED_OPENCODE_MODEL, resolveExecutable } from './agent-runners.js';
import { EXP005_WORKTREES_ROOT } from './harness.js';

export interface OpenCodeSmokeResult {
  passed: boolean;
  model: string;
  durationMs: number;
  stdoutSnippet: string;
  stderrSnippet: string;
  error?: string;
}

export async function runOpenCodeSmokeTest(timeoutMs: number = 60_000): Promise<OpenCodeSmokeResult> {
  const smokeDir = path.join(EXP005_WORKTREES_ROOT, `smoke-${Date.now()}`);
  if (!fs.existsSync(EXP005_WORKTREES_ROOT)) {
    fs.mkdirSync(EXP005_WORKTREES_ROOT, { recursive: true });
  }
  fs.mkdirSync(smokeDir, { recursive: true });

  resolveExecutable('opencode');

  try {
    const metrics = await executeOpenCodeTrial(
      smokeDir,
      'Respond with exact word "PONG" and exit.',
      timeoutMs
    );

    const passed = metrics.stdout.includes('PONG') || metrics.exitCode === 0;

    return {
      passed,
      model: PINNED_OPENCODE_MODEL,
      durationMs: metrics.durationMs,
      stdoutSnippet: metrics.stdout.slice(0, 300),
      stderrSnippet: metrics.stderr.slice(0, 300),
    };
  } catch (err: unknown) {
    return {
      passed: false,
      model: PINNED_OPENCODE_MODEL,
      durationMs: 0,
      stdoutSnippet: '',
      stderrSnippet: '',
      error: String(err),
    };
  } finally {
    if (fs.existsSync(smokeDir)) {
      fs.rmSync(smokeDir, { recursive: true, force: true });
    }
  }
}

// CLI runner
const proc = (globalThis as unknown as { process?: { argv?: string[] } }).process;
if (proc?.argv?.[1]?.endsWith('smoke-tests.ts') || proc?.argv?.[1]?.endsWith('smoke-tests.js')) {
  runOpenCodeSmokeTest().then((report) => {
    console.log(JSON.stringify(report, null, 2));
    if (!report.passed) {
      throw new Error(`Smoke Test Failed: ${report.error}`);
    }
  });
}
