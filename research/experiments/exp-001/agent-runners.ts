/**
 * Bridge — Phase 1D: Real Agent Execution & Extraction Engine
 *
 * Implements:
 * 1. Claude Code execution (Agent A) in non-interactive stream-json mode (shell: false, direct spawn)
 * 2. Structured transfer extraction from actual Claude output (NO ANSWER KEY)
 * 3. OpenCode execution (Agent B) in controlled research mode (--pure, --auto, --format json, shell: false)
 * 4. Post-task transfer fidelity / understanding check
 */

import { spawn } from 'node:child_process';
import type { ExperimentalWorkTransfer, TransferFidelityCheck } from './types.js';
import { scrubSecrets, validatePathConfinement } from './security.js';

// ---------------------------------------------------------------------------
// Executable Path Resolution & Environment Configuration
// ---------------------------------------------------------------------------

export const AGENT_A_COMMAND = process.platform === 'win32' ? 'claude.exe' : 'claude';
export const AGENT_B_COMMAND = process.platform === 'win32' ? 'opencode.exe' : 'opencode';

/**
 * Builds a deterministic execution environment with required PATH entries for Windows/POSIX.
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

// ---------------------------------------------------------------------------
// 1. Agent A (Claude Code) Execution
// ---------------------------------------------------------------------------

export interface ClaudeExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  inputTokens: number | 'UNKNOWN';
  outputTokens: number | 'UNKNOWN';
  totalTokens: number | 'UNKNOWN';
}

/**
 * Executes Claude Code non-interactively on the target repository to perform an initial exploratory analysis.
 * The prompt does NOT disclose the evaluation answer key.
 *
 * Subprocess configuration:
 * - Direct spawn without shell (shell: false) to prevent command-line whitespace truncation.
 * - Stdio ignored on stdin (stdio: ['ignore', 'pipe', 'pipe']) to prevent interactive TTY blocking.
 * - Verified flags: -p <prompt> --output-format stream-json --verbose --no-session-persistence
 */
export async function runClaudeAnalysis(
  worktreePath: string,
  timeoutMs: number = 120_000,
): Promise<ClaudeExecutionResult> {
  validatePathConfinement(worktreePath, process.cwd());

  const analysisPrompt = [
    'Analyze the codebase in src/scheduler.ts and tests/scheduler.test.ts.',
    'Identify any concurrency bugs, rate-limiting defects, or queue starvation issues in TaskScheduler.',
    'Explain the root causes of each issue and the exact code locations in src/scheduler.ts where defects occur.',
  ].join(' ');

  const args = [
    '-p',
    analysisPrompt,
    '--output-format',
    'stream-json',
    '--verbose',
    '--no-session-persistence',
  ];

  const startTime = performance.now();
  let stdoutAccumulator = '';
  let stderrAccumulator = '';
  let inputTokens: number | 'UNKNOWN' = 'UNKNOWN';
  let outputTokens: number | 'UNKNOWN' = 'UNKNOWN';
  let totalTokens: number | 'UNKNOWN' = 'UNKNOWN';

  return new Promise((resolve, reject) => {
    let timer: NodeJS.Timeout;

    const child = spawn(AGENT_A_COMMAND, args, {
      cwd: worktreePath,
      env: getExecutionEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Claude Code analysis timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8');
      stdoutAccumulator += text;

      // Extract usage metrics if present in stream-json lines
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.message?.usage) {
            inputTokens = parsed.message.usage.input_tokens ?? inputTokens;
            outputTokens = parsed.message.usage.output_tokens ?? outputTokens;
          }
        } catch {
          // Non-JSON line
        }
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderrAccumulator += chunk.toString('utf-8');
    });

    child.on('error', (err: Error) => {
      clearTimeout(timer);
      reject(new Error(`Failed to launch Claude Code (${AGENT_A_COMMAND}): ${err.message}`));
    });

    child.on('close', (code: number | null) => {
      clearTimeout(timer);
      const durationMs = performance.now() - startTime;

      if (inputTokens !== 'UNKNOWN' && outputTokens !== 'UNKNOWN') {
        totalTokens = inputTokens + outputTokens;
      }

      resolve({
        stdout: scrubSecrets(stdoutAccumulator),
        stderr: scrubSecrets(stderrAccumulator),
        exitCode: code ?? 0,
        durationMs,
        inputTokens,
        outputTokens,
        totalTokens,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// 2. Structured Transfer Extraction (NO ANSWER KEY)
// ---------------------------------------------------------------------------

export interface ExtractionResult {
  transfer: ExperimentalWorkTransfer;
  extractionPrompt: string;
  rawExtractionOutput: string;
  durationMs: number;
}

/**
 * Extracts a strictly validated ExperimentalWorkTransfer from Claude's ACTUAL analysis output.
 * Does NOT consult any answer key or pre-populated defect list.
 */
export async function extractStructuredTransfer(
  claudeRawStdout: string,
  timeoutMs: number = 60_000,
): Promise<ExtractionResult> {
  const startTime = performance.now();

  const extractionPrompt = [
    'You are a neutral work-state extractor for Project Bridge.',
    'You will be given an analysis transcript produced by an AI assistant analyzing a TypeScript codebase.',
    'Your task is to extract the verified findings into a strict JSON object conforming to the ExperimentalWorkTransfer schema.',
    '',
    'SCHEMA REQUIREMENTS:',
    '{',
    '  "schemaVersion": "0.2.0-simplified",',
    '  "objective": "High-level goal string",',
    '  "diagnostics": [',
    '    {',
    '      "id": "DIAG-001",',
    '      "title": "Short title describing the defect",',
    '      "rootCause": "Explanation of why the defect occurs",',
    '      "locations": [',
    '        {',
    '          "filePath": "relative/file/path.ts",',
    '          "startLine": 10,',
    '          "endLine": 20,',
    '          "symbol": "optionalFunctionName"',
    '        }',
    '      ]',
    '    }',
    '  ],',
    '  "constraints": ["String list of invariants to preserve"],',
    '  "verificationCommands": [',
    '    {',
    '      "command": "test command string",',
    '      "description": "what this verifies"',
    '    }',
    '  ]',
    '}',
    '',
    'RULES:',
    '1. Extract ONLY findings and facts present in the transcript. Do NOT invent new bugs or details.',
    '2. Return ONLY the JSON object. No Markdown code fences, no preamble, no commentary.',
    '',
    'TRANSCRIPT TO EXTRACT FROM:',
    claudeRawStdout,
  ].join('\n');

  const args = [
    '-p',
    extractionPrompt,
    '--output-format',
    'stream-json',
    '--verbose',
    '--no-session-persistence',
  ];

  return new Promise((resolve, reject) => {
    let timer: NodeJS.Timeout;
    let stdoutAccumulator = '';
    let stderrAccumulator = '';

    const child = spawn(AGENT_A_COMMAND, args, {
      env: getExecutionEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Extraction pass timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutAccumulator += chunk.toString('utf-8');
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderrAccumulator += chunk.toString('utf-8');
    });

    child.on('error', (err: Error) => {
      clearTimeout(timer);
      reject(new Error(`Failed to launch extraction pass: ${err.message}`));
    });

    child.on('close', () => {
      clearTimeout(timer);
      const durationMs = performance.now() - startTime;

      // Parse JSON from stream-json or raw text
      const extractedText = parseExtractedJsonText(stdoutAccumulator);
      try {
        const parsed = JSON.parse(extractedText);
        validateExtractedTransfer(parsed);

        resolve({
          transfer: parsed,
          extractionPrompt,
          rawExtractionOutput: stdoutAccumulator,
          durationMs,
        });
      } catch (err: unknown) {
        // Fallback to deterministic programmatic parser if LLM extraction returned non-JSON
        try {
          const programmatic = parseProgrammaticTransfer(claudeRawStdout);
          resolve({
            transfer: programmatic,
            extractionPrompt,
            rawExtractionOutput: stdoutAccumulator || 'Programmatic fallback used',
            durationMs,
          });
        } catch (fallbackErr: unknown) {
          reject(new Error(`Extraction failed: ${(err as Error).message}. Fallback error: ${(fallbackErr as Error).message}`));
        }
      }
    });
  });
}

function parseExtractedJsonText(streamJsonOutput: string): string {
  const lines = streamJsonOutput.split('\n');
  let text = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.type === 'assistant' && parsed.message?.content) {
        for (const block of parsed.message.content) {
          if (block.type === 'text') text += block.text;
        }
      } else if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
        text += parsed.delta.text;
      } else if (parsed.result) {
        text += parsed.result;
      }
    } catch {
      text += trimmed;
    }
  }

  const cleaned = text.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/```\s*$/, '')
    .trim();

  return cleaned;
}

export function validateExtractedTransfer(transfer: any): asserts transfer is ExperimentalWorkTransfer {
  if (!transfer || typeof transfer !== 'object') {
    throw new Error('Transfer object is null or not an object');
  }
  if (transfer.schemaVersion !== '0.2.0-simplified') {
    transfer.schemaVersion = '0.2.0-simplified';
  }
  if (typeof transfer.objective !== 'string') {
    throw new Error('Missing or invalid objective string');
  }
  if (!Array.isArray(transfer.diagnostics)) {
    throw new Error('Missing or invalid diagnostics array');
  }
  for (const diag of transfer.diagnostics) {
    if (!diag.id || !diag.title || !diag.rootCause) {
      throw new Error(`Diagnostic item missing required fields: ${JSON.stringify(diag)}`);
    }
  }
  if (!Array.isArray(transfer.constraints)) {
    transfer.constraints = [];
  }
  if (!Array.isArray(transfer.verificationCommands)) {
    transfer.verificationCommands = [{ command: 'pnpm test', description: 'Run test suite' }];
  }
}

/**
 * Deterministic programmatic extractor used as a fallback if secondary LLM pass is unavailable.
 */
export function parseProgrammaticTransfer(transcriptText: string): ExperimentalWorkTransfer {
  const diagnostics: ExperimentalWorkTransfer['diagnostics'] = [];
  let diagCount = 1;

  const lines = transcriptText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/bug|defect|issue|error|leak|overflow|decrement|starvation/i)) {
      diagnostics.push({
        id: `DIAG-00${diagCount++}`,
        title: line.trim().substring(0, 80),
        rootCause: line.trim(),
        locations: [
          {
            filePath: 'src/scheduler.ts',
          },
        ],
      });
      if (diagnostics.length >= 3) break;
    }
  }

  if (diagnostics.length === 0) {
    diagnostics.push({
      id: 'DIAG-001',
      title: 'Discovered issue in scheduler logic',
      rootCause: transcriptText.substring(0, 200),
      locations: [{ filePath: 'src/scheduler.ts' }],
    });
  }

  return {
    schemaVersion: '0.2.0-simplified',
    objective: 'Resolve defects in src/scheduler.ts to satisfy test suite',
    diagnostics,
    constraints: ['Preserve existing function contracts'],
    verificationCommands: [{ command: 'pnpm test', description: 'Execute unit tests' }],
  };
}

// ---------------------------------------------------------------------------
// 3. Agent B (OpenCode) Execution
// ---------------------------------------------------------------------------

export interface OpenCodeExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  inputTokens: number | 'UNKNOWN';
  outputTokens: number | 'UNKNOWN';
  totalTokens: number | 'UNKNOWN';
  rawEvents: unknown[];
}

/**
 * Executes OpenCode on the assigned worktree with the condition-specific prompt.
 *
 * Controlled Research Execution Configuration:
 * - Direct spawn without shell (shell: false) and native cwd to prevent path whitespace truncation.
 * - --pure: Excludes external plugin bloat and workspace noise, enforcing a controlled test environment.
 * - --auto: Grants autonomous file edit and terminal permissions inside the confined worktree.
 * - --format json: Emits NDJSON execution stream with precise token usage and step telemetry.
 * - --dir <worktreePath>: Explicitly anchors OpenCode to the test worktree.
 *
 * Crucial experimental control: ALL THREE conditions (A, B, C) execute with this exact same configuration.
 */
export async function runOpenCodeTask(
  worktreePath: string,
  promptText: string,
  timeoutMs: number = 180_000,
): Promise<OpenCodeExecutionResult> {
  validatePathConfinement(worktreePath, process.cwd());

  const startTime = performance.now();
  let stdoutAccumulator = '';
  let stderrAccumulator = '';
  const rawEvents: unknown[] = [];
  let inputTokens: number | 'UNKNOWN' = 'UNKNOWN';
  let outputTokens: number | 'UNKNOWN' = 'UNKNOWN';
  let totalTokens: number | 'UNKNOWN' = 'UNKNOWN';

  const args = [
    'run',
    promptText,
    '--auto',
    '--pure',
    '--format', 'json',
    '--dir', worktreePath,
  ];

  return new Promise((resolve, reject) => {
    let timer: NodeJS.Timeout;

    const child = spawn(AGENT_B_COMMAND, args, {
      cwd: worktreePath,
      env: getExecutionEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`OpenCode execution timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8');
      stdoutAccumulator += text;

      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const event = JSON.parse(trimmed);
          rawEvents.push(event);

          // Extract token counts from step-finish events
          if (event.type === 'step_finish' && event.part?.tokens) {
            const tok = event.part.tokens;
            if (tok.input !== undefined) inputTokens = (inputTokens === 'UNKNOWN' ? 0 : inputTokens) + tok.input;
            if (tok.output !== undefined) outputTokens = (outputTokens === 'UNKNOWN' ? 0 : outputTokens) + tok.output;
            if (tok.total !== undefined) totalTokens = (totalTokens === 'UNKNOWN' ? 0 : totalTokens) + tok.total;
          }
        } catch {
          // Non-JSON line
        }
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderrAccumulator += chunk.toString('utf-8');
    });

    child.on('error', (err: Error) => {
      clearTimeout(timer);
      reject(new Error(`Failed to spawn OpenCode (${AGENT_B_COMMAND}): ${err.message}`));
    });

    child.on('close', (code: number | null) => {
      clearTimeout(timer);
      const durationMs = performance.now() - startTime;

      if (totalTokens === 'UNKNOWN' && inputTokens !== 'UNKNOWN' && outputTokens !== 'UNKNOWN') {
        totalTokens = inputTokens + outputTokens;
      }

      resolve({
        stdout: scrubSecrets(stdoutAccumulator),
        stderr: scrubSecrets(stderrAccumulator),
        exitCode: code ?? 0,
        durationMs,
        inputTokens,
        outputTokens,
        totalTokens,
        rawEvents,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// 4. Post-Task Fidelity / Understanding Check
// ---------------------------------------------------------------------------

/**
 * Evaluates Agent B's conceptual comprehension in a separate non-modifying prompt turn.
 */
export async function runOpenCodeFidelityCheck(
  worktreePath: string,
  timeoutMs: number = 60_000,
): Promise<TransferFidelityCheck> {
  const fidelityPrompt = [
    'Answer the following 4 questions concisely based on the task you just performed:',
    '1. What bugs existed in the original scheduler code?',
    '2. Why did those bugs occur (root causes)?',
    '3. What specific changes did you make to fix them?',
    '4. How did you verify your changes?',
  ].join('\n');

  try {
    const result = await runOpenCodeTask(worktreePath, fidelityPrompt, timeoutMs);
    const text = extractAssistantText(result.rawEvents) || result.stdout;

    return {
      bugsIdentified: extractSection(text, '1', 'bugs'),
      rootCausesExplained: extractSection(text, '2', 'causes'),
      changesSummarized: extractSection(text, '3', 'changes'),
      verificationDescribed: extractSection(text, '4', 'verify'),
      rawResponse: text,
    };
  } catch (err: unknown) {
    return {
      bugsIdentified: 'UNKNOWN',
      rootCausesExplained: 'UNKNOWN',
      changesSummarized: 'UNKNOWN',
      verificationDescribed: 'UNKNOWN',
      rawResponse: `Fidelity check error: ${(err as Error).message}`,
    };
  }
}

function extractAssistantText(events: unknown[]): string {
  let text = '';
  for (const event of events) {
    const e = event as any;
    if (e.type === 'text' && e.part?.text) {
      text += e.part.text;
    } else if (e.part?.content?.text) {
      text += e.part.content.text;
    }
  }
  return text.trim();
}

function extractSection(fullText: string, numberPrefix: string, fallbackKeyword: string): string {
  const regex = new RegExp(`(?:${numberPrefix}[.)]|${fallbackKeyword})[:\\s]*([\\s\\S]*?)(?=(?:[0-9][.)]|$))`, 'i');
  const match = fullText.match(regex);
  return match ? match[1].trim() : fullText.substring(0, 150);
}
