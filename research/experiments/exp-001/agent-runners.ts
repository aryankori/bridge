/**
 * Bridge — Phase 1D: Real Agent Execution & Extraction Engine
 *
 * Implements:
 * 1. Claude Code execution (Agent A) in non-interactive stream-json mode
 * 2. Structured transfer extraction from actual Claude output (NO ANSWER KEY)
 * 3. OpenCode execution (Agent B) via ACP stdio JSON-RPC 2.0 / CLI
 * 4. Post-task transfer fidelity / understanding check
 */

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import type { ExperimentalWorkTransfer, TransferFidelityCheck } from './types.js';
import { scrubSecrets, validatePathConfinement } from './security.js';

// ---------------------------------------------------------------------------
// Executable Path Resolution
// ---------------------------------------------------------------------------

export const AGENT_A_COMMAND = process.platform === 'win32' ? 'claude.cmd' : 'claude';
export const AGENT_B_COMMAND = process.platform === 'win32' ? 'opencode.exe' : 'opencode';

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
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
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
    '--no-session-persistence',
  ];

  return new Promise((resolve, reject) => {
    let timer: NodeJS.Timeout;
    let stdoutAccumulator = '';
    let stderrAccumulator = '';

    const child = spawn(AGENT_A_COMMAND, args, {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
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
  // Extract text from stream-json lines or raw JSON
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

  // Strip markdown code fences if present
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

  // Search for mentioned bugs or code locations in transcript
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
 * Uses ACP protocol over stdio with fallback to CLI json mode.
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

  return new Promise((resolve, reject) => {
    let timer: NodeJS.Timeout;

    // Launch OpenCode via verified ACP server over stdio
    const child = spawn(AGENT_B_COMMAND, ['acp', '--print-logs', '--log-level', 'INFO'], {
      cwd: worktreePath,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });

    const rl = createInterface({ input: child.stdout });
    let sessionId: string | null = null;
    let step = 'init';

    timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`OpenCode execution timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    rl.on('line', (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      stdoutAccumulator += line + '\n';

      try {
        const msg = JSON.parse(trimmed);
        rawEvents.push(msg);

        // Step 1: Handle initialize response
        if (msg.id === 1 && step === 'init') {
          step = 'session_new';
          child.stdin.write(
            JSON.stringify({
              jsonrpc: '2.0',
              id: 2,
              method: 'session/new',
              params: {
                cwd: worktreePath.replace(/\\/g, '/'),
                mcpServers: [],
              },
            }) + '\n',
          );
        }

        // Step 2: Handle session/new response
        if (msg.id === 2 && step === 'session_new' && msg.result?.sessionId) {
          step = 'prompting';
          sessionId = msg.result.sessionId;
          child.stdin.write(
            JSON.stringify({
              jsonrpc: '2.0',
              id: 3,
              method: 'session/prompt',
              params: {
                sessionId,
                prompt: [{ type: 'text', text: promptText }],
              },
            }) + '\n',
          );
        }

        // Step 3: Track usage updates during prompt turn
        if (msg.method === 'session/update' && msg.params?.update?.sessionUpdate === 'usage_update') {
          const usage = msg.params.update;
          if (usage.used) inputTokens = usage.used;
        }

        // Step 4: Handle session/prompt completion
        if (msg.id === 3 && step === 'prompting') {
          if (msg.result?.usage) {
            inputTokens = msg.result.usage.inputTokens ?? inputTokens;
            outputTokens = msg.result.usage.outputTokens ?? outputTokens;
            totalTokens = msg.result.usage.totalTokens ?? totalTokens;
          }
          child.kill('SIGTERM');
        }
      } catch {
        // Non-JSON stdout line
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

    // Send ACP initialize request
    child.stdin.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: 1,
          clientCapabilities: {
            fs: { readTextFile: true, writeTextFile: true },
            terminal: true,
          },
          clientInfo: { name: 'bridge-harness', version: '0.1.0' },
        },
      }) + '\n',
    );
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
    const text = extractAssistantText(result.rawEvents);

    return {
      bugsIdentified: extractSection(text, '1', 'bugs'),
      rootCausesExplained: extractSection(text, '2', 'causes'),
      changesSummarized: extractSection(text, '3', 'changes'),
      verificationDescribed: extractSection(text, '4', 'verify'),
      rawResponse: text || result.stdout,
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
    if (e.method === 'session/update' && e.params?.update?.sessionUpdate === 'agent_message_chunk') {
      text += e.params.update.content?.text ?? '';
    }
  }
  return text.trim();
}

function extractSection(fullText: string, numberPrefix: string, fallbackKeyword: string): string {
  const regex = new RegExp(`(?:${numberPrefix}[.)]|${fallbackKeyword})[:\\s]*([\\s\\S]*?)(?=(?:[0-9][.)]|$))`, 'i');
  const match = fullText.match(regex);
  return match ? match[1].trim() : fullText.substring(0, 150);
}
