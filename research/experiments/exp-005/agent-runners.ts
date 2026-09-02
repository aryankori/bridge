/**
 * BRIDGE — EXP-005: OpenCode Agent Execution Runner
 *
 * Runs controlled live invocations of OpenCode using the pinned model:
 * nvidia/nvidia/nemotron-3-super-120b-a12b
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { spawn, execSync } from 'node:child_process';
import { scrubSecrets, validatePathConfinement } from './security.js';
import type { AgentExecutionMetrics } from './schema.js';

export const PINNED_OPENCODE_MODEL = 'nvidia/nvidia/nemotron-3-super-120b-a12b';
export const PINNED_PROVIDER = 'nvidia';

export interface ResolvedExecutable {
  command: string;
  resolvedPath: string;
  source: 'configured' | 'path' | 'fallback';
}

/**
 * Builds deterministic execution environment.
 */
export function getExecutionEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  if (process.platform === 'win32') {
    const userProfile = process.env.USERPROFILE || 'C:\\Users\\aryan';
    const extraPaths = [
      `${userProfile}\\.local\\bin`,
      `${userProfile}\\scoop\\shims`,
      `${userProfile}\\scoop\\apps\\nodejs\\current`,
      `${userProfile}\\AppData\\Roaming\\npm`,
    ];
    env.PATH = `${extraPaths.join(';')};${env.PATH || ''}`;
  }
  return env;
}

/**
 * Resolves opencode or claude executable path.
 */
export function resolveExecutable(name: 'opencode' | 'claude'): ResolvedExecutable {
  const isWindows = process.platform === 'win32';
  const userProfile = process.env.USERPROFILE || (isWindows ? 'C:\\Users\\aryan' : '');

  const candidatePaths: string[] = [];
  if (isWindows) {
    if (name === 'opencode') {
      candidatePaths.push(
        path.join(userProfile, 'scoop', 'shims', 'opencode.exe'),
        path.join(userProfile, 'scoop', 'shims', 'opencode.cmd'),
        path.join(userProfile, 'AppData', 'Roaming', 'npm', 'opencode.cmd')
      );
    } else {
      candidatePaths.push(
        path.join(userProfile, '.local', 'bin', 'claude.exe'),
        path.join(userProfile, '.local', 'bin', 'claude.cmd'),
        path.join(userProfile, 'AppData', 'Roaming', 'npm', 'claude.cmd')
      );
    }
  } else {
    const home = process.env.HOME || '';
    if (name === 'opencode') {
      candidatePaths.push(
        path.join(home, '.local', 'bin', 'opencode'),
        '/usr/local/bin/opencode',
        '/usr/bin/opencode'
      );
    } else {
      candidatePaths.push(
        path.join(home, '.local', 'bin', 'claude'),
        '/usr/local/bin/claude',
        '/usr/bin/claude'
      );
    }
  }

  for (const candidate of candidatePaths) {
    if (candidate && fs.existsSync(candidate)) {
      return {
        command: candidate,
        resolvedPath: path.resolve(candidate),
        source: 'configured',
      };
    }
  }

  const queryCmd = isWindows
    ? `where.exe ${name}.exe 2>nul || where.exe ${name}.cmd 2>nul || where.exe ${name} 2>nul`
    : `which ${name} 2>/dev/null`;

  try {
    const stdout = execSync(queryCmd, {
      env: getExecutionEnv(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const firstLine = stdout
      .split('\r\n')
      .join('\n')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)[0];
    if (firstLine && fs.existsSync(firstLine)) {
      return {
        command: firstLine,
        resolvedPath: path.resolve(firstLine),
        source: 'path',
      };
    }
  } catch {
    // Lookup failed
  }

  return {
    command: name,
    resolvedPath: name,
    source: 'fallback',
  };
}

/**
 * Safely terminates a process and its child subprocess tree.
 */
export function killProcessTree(pid: number | undefined): void {
  if (!pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-pid, 'SIGKILL');
    }
  } catch {
    // Process may have already exited
  }
}

/**
 * Execute OpenCode against a designated worktree.
 */
export async function executeOpenCodeTrial(
  worktreePath: string,
  promptText: string,
  timeoutMs: number = 180_000
): Promise<AgentExecutionMetrics> {
  validatePathConfinement(worktreePath, process.cwd());

  const resolved = resolveExecutable('opencode');
  const startTime = performance.now();

  let stdoutAcc = '';
  let stderrAcc = '';
  let inputTokens: number | 'UNKNOWN' = 'UNKNOWN';
  let outputTokens: number | 'UNKNOWN' = 'UNKNOWN';
  let totalTokens: number | 'UNKNOWN' = 'UNKNOWN';
  let toolCallCount = 0;

  const args = [
    'run',
    promptText,
    '--auto',
    '--pure',
    '--format',
    'json',
    '--model',
    PINNED_OPENCODE_MODEL,
    '--dir',
    worktreePath,
  ];

  return new Promise((resolve) => {
    let timer: NodeJS.Timeout;
    let settled = false;

    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(resolved.command, args, {
        cwd: worktreePath,
        env: getExecutionEnv(),
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
      });
    } catch (spawnErr) {
      return resolve({
        durationMs: Math.round(performance.now() - startTime),
        exitCode: 1,
        error: `Spawn failed: ${String(spawnErr)}`,
        inputTokens: 'UNKNOWN',
        outputTokens: 'UNKNOWN',
        totalTokens: 'UNKNOWN',
        toolCallCount: 0,
        stdout: '',
        stderr: String(spawnErr),
      });
    }

    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      killProcessTree(child.pid);
      const durationMs = Math.round(performance.now() - startTime);
      resolve({
        durationMs,
        exitCode: null,
        timedOut: true,
        error: `OpenCode execution timed out after ${timeoutMs}ms`,
        inputTokens,
        outputTokens,
        totalTokens,
        toolCallCount,
        stdout: scrubSecrets(stdoutAcc),
        stderr: scrubSecrets(stderrAcc),
      });
    }, timeoutMs);

    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8');
      stdoutAcc += text;

      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const event = JSON.parse(trimmed);
          if (event.type === 'tool_use' || event.type === 'tool_call') {
            toolCallCount++;
          }
          if (event.type === 'step_finish' && event.part?.tokens) {
            const tok = event.part.tokens;
            if (tok.input !== undefined)
              inputTokens = (inputTokens === 'UNKNOWN' ? 0 : inputTokens) + tok.input;
            if (tok.output !== undefined)
              outputTokens = (outputTokens === 'UNKNOWN' ? 0 : outputTokens) + tok.output;
            if (tok.total !== undefined)
              totalTokens = (totalTokens === 'UNKNOWN' ? 0 : totalTokens) + tok.total;
          }
        } catch {
          // Plain text line
        }
      }
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      stderrAcc += chunk.toString('utf-8');
    });

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const durationMs = Math.round(performance.now() - startTime);
      resolve({
        durationMs,
        exitCode: 1,
        error: `Process error: ${String(err)}`,
        inputTokens,
        outputTokens,
        totalTokens,
        toolCallCount,
        stdout: scrubSecrets(stdoutAcc),
        stderr: scrubSecrets(stderrAcc),
      });
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const durationMs = Math.round(performance.now() - startTime);
      resolve({
        durationMs,
        exitCode: code ?? 0,
        inputTokens,
        outputTokens,
        totalTokens,
        toolCallCount,
        stdout: scrubSecrets(stdoutAcc),
        stderr: scrubSecrets(stderrAcc),
      });
    });
  });
}
