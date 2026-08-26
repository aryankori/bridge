/**
 * Bridge — Phase 1A: Work-Transfer Controlled Experiment Harness (Corrected)
 *
 * Implements:
 * - Condition A: Native Baseline (clean fixture + raw prompt)
 * - Condition B: Fair Transcript Transfer (unedited Claude stdout capped at 8 KB)
 * - Condition C: Simplified Structured Transfer (ExperimentalWorkTransfer v0.2.0)
 *
 * Includes:
 * - Path confinement validation
 * - Secret scrubbing
 * - Untrusted data delimiters
 * - Cost and token tracking (with UNKNOWN fallbacks)
 * - Post-task transfer fidelity / understanding check
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import type { ExperimentalWorkTransfer } from './types.js';

// ---------------------------------------------------------------------------
// Telemetry & Result Data Structures
// ---------------------------------------------------------------------------

export interface TransferFidelityCheck {
  bugsIdentified: string;
  rootCausesExplained: string;
  changesSummarized: string;
  verificationDescribed: string;
  rawResponse: string;
}

export interface InformationMetrics {
  payloadSizeBytes: number;
  estimatedTokens: number;
  filesReferencedCount: number;
  diagnosticsConveyedCount: number;
  constraintsConveyedCount: number;
  verificationInfoConveyed: boolean;
  transcriptOriginalBytes?: number;
  transcriptDeliveredBytes?: number;
  transcriptWasTruncated?: boolean;
}

export interface CostMetrics {
  agentAInputTokens: number | 'UNKNOWN';
  agentAOutputTokens: number | 'UNKNOWN';
  agentATotalTokens: number | 'UNKNOWN';
  agentBInputTokens: number | 'UNKNOWN';
  agentBOutputTokens: number | 'UNKNOWN';
  agentBTotalTokens: number | 'UNKNOWN';
  estimatedCostUsd: number | 'UNKNOWN';
}

export interface ConditionResult {
  condition: 'A' | 'B' | 'C';
  name: string;
  trialIndex: number;
  success: boolean;
  testsPassed: number;
  testsTotal: number;
  correctnessScore: number;
  wallClockDurationSeconds: number;
  reworkCycles: number;
  humanInterventions: number;
  filesChanged: string[];
  linesAdded: number;
  linesDeleted: number;
  gitDiffSnippet: string;
  informationMetrics: InformationMetrics;
  costMetrics: CostMetrics;
  fidelityCheck?: TransferFidelityCheck;
  notes: string;
}

// ---------------------------------------------------------------------------
// Security & Sanitization Utilities
// ---------------------------------------------------------------------------

const SECRET_PATTERNS = [
  /nvapi-[A-Za-z0-9_-]{30,}/g,
  /sk-ant-[A-Za-z0-9_-]{30,}/g,
  /sk-[A-Za-z0-9_-]{30,}/g,
  /ghp_[A-Za-z0-9]{30,}/g,
  /Bearer\s+[A-Za-z0-9._-]{20,}/gi,
];

export function scrubSecrets(input: string): string {
  let sanitized = input;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]');
  }
  return sanitized;
}

export function validatePathConfinement(targetPath: string, allowedRoot: string): void {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedRoot = path.resolve(allowedRoot);
  if (!resolvedTarget.startsWith(resolvedRoot)) {
    throw new Error(`Security Violation: Path '${resolvedTarget}' escapes allowed root '${resolvedRoot}'`);
  }
}

// ---------------------------------------------------------------------------
// Environment & Worktree Management
// ---------------------------------------------------------------------------

const EXPERIMENT_DIR = path.resolve('research/experiments/exp-001');
const FIXTURE_DIR = path.join(EXPERIMENT_DIR, 'fixture');
const WORKTREES_DIR = path.join(EXPERIMENT_DIR, 'worktrees');

export function prepareWorktree(condition: 'a' | 'b' | 'c'): string {
  const targetDir = path.join(WORKTREES_DIR, `condition-${condition}`);
  validatePathConfinement(targetDir, EXPERIMENT_DIR);

  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });

  copyRecursive(FIXTURE_DIR, targetDir);
  return targetDir;
}

function copyRecursive(src: string, dest: string) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ---------------------------------------------------------------------------
// Automated Test Runner (Vitest Evaluator)
// ---------------------------------------------------------------------------

export function runTests(worktreeDir: string): { passed: number; total: number; success: boolean; output: string } {
  try {
    const testPath = path.join(worktreeDir, 'tests/scheduler.test.ts').replace(/\\/g, '/');
    const configPath = path.join(FIXTURE_DIR, 'vitest.config.ts').replace(/\\/g, '/');
    const output = execSync(
      `pnpx vitest run --config "${configPath}" "${testPath}"`,
      { cwd: process.cwd(), encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const passedMatch = output.match(/Tests\s+(\d+)\s+passed/);
    const passed = passedMatch ? parseInt(passedMatch[1], 10) : 10;
    return { passed, total: 10, success: passed === 10, output };
  } catch (err: unknown) {
    const errOutput = (err as { stdout?: string; stderr?: string }).stdout || String(err);
    const passedMatch = errOutput.match(/Tests\s+.*?(\d+)\s+passed/);
    const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    return { passed, total: 10, success: false, output: errOutput };
  }
}

// ---------------------------------------------------------------------------
// Canonical Simplified Experimental Schema Instance (v0.2.0)
// ---------------------------------------------------------------------------

export const CANONICAL_SIMPLIFIED_TRANSFER: ExperimentalWorkTransfer = {
  schemaVersion: '0.2.0-simplified',
  objective: 'Resolve all defects in src/scheduler.ts so that tests in tests/scheduler.test.ts pass.',
  diagnostics: [
    {
      id: 'DIAG-001',
      title: 'Unclamped token refill allows burst overflow',
      rootCause: 'refillTokens() adds calculated tokens without clamping to this.capacity, allowing token counts to grow unbounded during idle intervals.',
      locations: [
        {
          filePath: 'src/scheduler.ts',
          startLine: 42,
          endLine: 47,
          symbol: 'refillTokens',
        },
      ],
    },
    {
      id: 'DIAG-002',
      title: 'Active concurrency counter double decrement on abort',
      rootCause: 'executeTask decrements this.activeCount once in the abort signal listener and again in the finally block, causing activeCount to drop below zero.',
      locations: [
        {
          filePath: 'src/scheduler.ts',
          startLine: 88,
          endLine: 96,
          symbol: 'executeTask',
        },
      ],
    },
    {
      id: 'DIAG-003',
      title: 'Queue starvation on token depletion',
      rootCause: 'pump() terminates synchronously when available tokens are insufficient for the next task without arming a delayed refill timer.',
      locations: [
        {
          filePath: 'src/scheduler.ts',
          startLine: 65,
          endLine: 75,
          symbol: 'pump',
        },
      ],
    },
  ],
  constraints: [
    'Do not modify public method signatures in TaskScheduler.',
    'Preserve FIFO sequence ordering for tasks of identical priority.',
  ],
  verificationCommands: [
    {
      command: 'pnpm test',
      description: 'Executes Vitest suite in tests/scheduler.test.ts (10/10 assertions must pass).',
    },
  ],
};
