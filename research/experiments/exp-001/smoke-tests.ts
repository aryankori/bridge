/**
 * Bridge - Phase 1E: Live Executable Integration Smoke Tests
 *
 * Runs actual minimal live invocations of both Claude Code and OpenCode
 * to verify executable path resolution, subprocess spawning, space-path handling,
 * non-interactive I/O, and clean termination WITHOUT touching the EXP-001 fixture.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveExecutable, getExecutionEnv, PINNED_OPENCODE_MODEL } from './agent-runners.js';
import { scrubSecrets } from './security.js';

export interface SmokeTestResult {
  agent: string;
  command: string;
  resolvedPath: string;
  passed: boolean;
  exitCode: number;
  stdoutSnippet: string;
  stderrSnippet: string;
  durationMs: number;
  error?: string;
}

/**
 * 1. Claude Code Smoke Test
 * Tests executable invocation in a path containing spaces with stream-json output.
 */
export async function runClaudeSmokeTest(timeoutMs: number = 90_000): Promise<SmokeTestResult> {
  const startTime = performance.now();
  const resolved = resolveExecutable('claude');
  const cwd = process.cwd(); // Contains spaces: C:\Users\aryan\Documents\AI and ML\bridge

  const args = [
    '-p',
    'Respond with OK.',
    '--output-format',
    'stream-json',
    '--verbose',
    '--no-session-persistence',
  ];

  return new Promise((resolve) => {
    let timer: NodeJS.Timeout;
    let stdout = '';
    let stderr = '';

    const child = spawn(resolved.command, args, {
      cwd,
      env: getExecutionEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({
        agent: 'Claude Code',
        command: resolved.command,
        resolvedPath: resolved.resolvedPath,
        passed: false,
        exitCode: -1,
        stdoutSnippet: stdout.substring(0, 300),
        stderrSnippet: stderr.substring(0, 300),
        durationMs: performance.now() - startTime,
        error: `Timed out after ${timeoutMs}ms`,
      });
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf-8');
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8');
    });

    child.on('error', (err: Error) => {
      clearTimeout(timer);
      resolve({
        agent: 'Claude Code',
        command: resolved.command,
        resolvedPath: resolved.resolvedPath,
        passed: false,
        exitCode: -1,
        stdoutSnippet: stdout.substring(0, 300),
        stderrSnippet: stderr.substring(0, 300),
        durationMs: performance.now() - startTime,
        error: err.message,
      });
    });

    child.on('close', (code: number | null) => {
      clearTimeout(timer);
      const durationMs = performance.now() - startTime;
      const cleanStdout = scrubSecrets(stdout);
      const cleanStderr = scrubSecrets(stderr);
      const passed = code === 0 && cleanStdout.trim().length > 0;

      resolve({
        agent: 'Claude Code',
        command: resolved.command,
        resolvedPath: resolved.resolvedPath,
        passed,
        exitCode: code ?? 0,
        stdoutSnippet: cleanStdout.substring(0, 300),
        stderrSnippet: cleanStderr.substring(0, 300),
        durationMs,
        error: passed ? undefined : `Exit code: ${code}, stdout empty: ${cleanStdout.trim().length === 0}`,
      });
    });
  });
}

/**
 * 2. OpenCode Smoke Test
 * Tests executable invocation in a temporary directory with spaces using controlled research flags (--pure --auto --format json).
 */
export async function runOpenCodeSmokeTest(timeoutMs: number = 90_000): Promise<SmokeTestResult> {
  const startTime = performance.now();
  const resolved = resolveExecutable('opencode');

  // Create isolated temp workspace with spaces in name (completely outside fixture)
  const tempBase = path.join(process.cwd(), 'tmp', 'smoke test workspace');
  fs.mkdirSync(tempBase, { recursive: true });
  fs.writeFileSync(path.join(tempBase, 'smoke.txt'), 'smoke test content');

  const args = [
    'run',
    'Respond with OK.',
    '--auto',
    '--pure',
    '--format',
    'json',
    '--model',
    PINNED_OPENCODE_MODEL,
    '--dir',
    tempBase,
  ];

  return new Promise((resolve) => {
    let timer: NodeJS.Timeout;
    let stdout = '';
    let stderr = '';

    const child = spawn(resolved.command, args, {
      cwd: tempBase,
      env: getExecutionEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    timer = setTimeout(() => {
      child.kill('SIGKILL');
      try {
        fs.rmSync(tempBase, { recursive: true, force: true });
      } catch {}
      resolve({
        agent: 'OpenCode ox alpha',
        command: resolved.command,
        resolvedPath: resolved.resolvedPath,
        passed: false,
        exitCode: -1,
        stdoutSnippet: stdout.substring(0, 300),
        stderrSnippet: stderr.substring(0, 300),
        durationMs: performance.now() - startTime,
        error: `Timed out after ${timeoutMs}ms`,
      });
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf-8');
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8');
    });

    child.on('error', (err: Error) => {
      clearTimeout(timer);
      try {
        fs.rmSync(tempBase, { recursive: true, force: true });
      } catch {}
      resolve({
        agent: 'OpenCode ox alpha',
        command: resolved.command,
        resolvedPath: resolved.resolvedPath,
        passed: false,
        exitCode: -1,
        stdoutSnippet: stdout.substring(0, 300),
        stderrSnippet: stderr.substring(0, 300),
        durationMs: performance.now() - startTime,
        error: err.message,
      });
    });

    child.on('close', (code: number | null) => {
      clearTimeout(timer);
      const durationMs = performance.now() - startTime;
      try {
        fs.rmSync(tempBase, { recursive: true, force: true });
      } catch {}

      const cleanStdout = scrubSecrets(stdout);
      const cleanStderr = scrubSecrets(stderr);
      const passed = code === 0 && (cleanStdout.trim().length > 0 || cleanStderr.trim().length === 0);

      resolve({
        agent: 'OpenCode ox alpha',
        command: resolved.command,
        resolvedPath: resolved.resolvedPath,
        passed,
        exitCode: code ?? 0,
        stdoutSnippet: cleanStdout.substring(0, 300),
        stderrSnippet: cleanStderr.substring(0, 300),
        durationMs,
        error: passed ? undefined : `Exit code: ${code}, stdout empty: ${cleanStdout.trim().length === 0}`,
      });
    });
  });
}

/**
 * Runner function for CLI execution.
 */
export async function runAllSmokeTests(): Promise<{ allPassed: boolean; results: SmokeTestResult[] }> {
  console.log(`\n=============================================================`);
  console.log(`  BRIDGE EXP-001: LIVE EXECUTABLE INTEGRATION SMOKE TESTS`);
  console.log(`=============================================================\n`);

  console.log(`[1/2] Testing Claude Code Live Executable Integration...`);
  const claudeResult = await runClaudeSmokeTest();
  console.log(`      Resolved: ${claudeResult.resolvedPath}`);
  console.log(`      Status:   ${claudeResult.passed ? '✅ PASS' : '❌ FAIL'} (Exit: ${claudeResult.exitCode}, ${(claudeResult.durationMs / 1000).toFixed(2)}s)`);
  if (claudeResult.error) console.log(`      Error:    ${claudeResult.error}`);
  if (claudeResult.stdoutSnippet) console.log(`      Stdout:   ${claudeResult.stdoutSnippet.substring(0, 120)}...`);
  console.log('');

  console.log(`[2/2] Testing OpenCode Live Executable Integration...`);
  const opencodeResult = await runOpenCodeSmokeTest();
  console.log(`      Resolved: ${opencodeResult.resolvedPath}`);
  console.log(`      Status:   ${opencodeResult.passed ? '✅ PASS' : '❌ FAIL'} (Exit: ${opencodeResult.exitCode}, ${(opencodeResult.durationMs / 1000).toFixed(2)}s)`);
  if (opencodeResult.error) console.log(`      Error:    ${opencodeResult.error}`);
  if (opencodeResult.stdoutSnippet) console.log(`      Stdout:   ${opencodeResult.stdoutSnippet.substring(0, 120)}...`);
  console.log('');

  const allPassed = claudeResult.passed && opencodeResult.passed;

  console.log(`=============================================================`);
  console.log(`  SMOKE TEST SUMMARY: ${allPassed ? 'ALL PASSED ✅' : 'ONE OR MORE FAILED ❌'}`);
  console.log(`=============================================================\n`);

  return { allPassed, results: [claudeResult, opencodeResult] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  runAllSmokeTests()
    .then(({ allPassed }) => {
      process.exit(allPassed ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal smoke test error:', err);
      process.exit(1);
    });
}
