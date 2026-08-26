/**
 * Bridge — Phase 1D: Work-Transfer Controlled Experiment Harness
 *
 * Full research harness for EXP-001:
 * - Condition A: Native Baseline (Task prompt + clean fixture)
 * - Condition B: Fair Transcript Transfer (Task prompt + unedited Claude stdout capped at 8 KB)
 * - Condition C: Structured Work Transfer (Task prompt + ExperimentalWorkTransfer extracted from Claude)
 *
 * Zero answer key leakage: All diagnostics and transfer objects are derived
 * strictly from Agent A's live execution output.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import type {
  ExperimentalWorkTransfer,
  InformationMetrics,
  CostMetrics,
  TrialRecord,
  ExperimentManifest,
} from './types.js';
import {
  scrubSecrets,
  validatePathConfinement,
  truncatePayload,
  wrapUntrustedData,
} from './security.js';
import {
  runClaudeAnalysis,
  extractStructuredTransfer,
  runOpenCodeTask,
  runOpenCodeFidelityCheck,
  AGENT_A_COMMAND,
  AGENT_B_COMMAND,
} from './agent-runners.js';

// ---------------------------------------------------------------------------
// Constants & Directory Configuration
// ---------------------------------------------------------------------------

const ROOT_DIR = process.cwd();
const EXPERIMENT_DIR = path.resolve(ROOT_DIR, 'research/experiments/exp-001');
const FIXTURE_DIR = path.join(EXPERIMENT_DIR, 'fixture');
const WORKTREES_DIR = path.join(EXPERIMENT_DIR, 'worktrees');
const ARTIFACTS_DIR = path.join(EXPERIMENT_DIR, 'artifacts');

const TASK_PROMPT =
  'Resolve all concurrency, rate-limiting, and queue starvation defects in src/scheduler.ts so that all unit tests in tests/scheduler.test.ts pass.';

// ---------------------------------------------------------------------------
// Seeded PRNG for Trial Randomization
// ---------------------------------------------------------------------------

/**
 * Simple Mulberry32 seeded pseudo-random number generator for reproducible trial shuffling.
 */
export function createMulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateTrialOrder(
  seed: number,
  mode: 'pilot' | 'replicate',
): Array<{ trialIndex: number; condition: 'A' | 'B' | 'C' }> {
  if (mode === 'pilot') {
    return [
      { trialIndex: 1, condition: 'A' },
      { trialIndex: 2, condition: 'B' },
      { trialIndex: 3, condition: 'C' },
    ];
  }

  // Replication: n=3 per condition (9 runs total), shuffled
  const trials: Array<'A' | 'B' | 'C'> = ['A', 'A', 'A', 'B', 'B', 'B', 'C', 'C', 'C'];
  const rng = createMulberry32(seed);

  // Fisher-Yates shuffle
  for (let i = trials.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [trials[i], trials[j]] = [trials[j], trials[i]];
  }

  return trials.map((condition, index) => ({
    trialIndex: index + 1,
    condition,
  }));
}

// ---------------------------------------------------------------------------
// Worktree Setup & Hermetic Verification
// ---------------------------------------------------------------------------

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

export function runTests(worktreeDir: string): {
  passed: number;
  total: number;
  success: boolean;
  output: string;
} {
  try {
    const testPath = path.join(worktreeDir, 'tests/scheduler.test.ts').replace(/\\/g, '/');
    const configPath = path.join(FIXTURE_DIR, 'vitest.config.ts').replace(/\\/g, '/');
    const output = execSync(
      `pnpx vitest run --config "${configPath}" "${testPath}"`,
      { cwd: ROOT_DIR, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    );
    const passedMatch = output.match(/Tests\s+(\d+)\s+passed/);
    const passed = passedMatch ? parseInt(passedMatch[1], 10) : 10;
    return { passed, total: 10, success: passed === 10, output: scrubSecrets(output) };
  } catch (err: unknown) {
    const errOutput = (err as { stdout?: string; stderr?: string }).stdout || String(err);
    const passedMatch = errOutput.match(/Tests\s+.*?(\d+)\s+passed/);
    const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    return { passed, total: 10, success: false, output: scrubSecrets(errOutput) };
  }
}

export function captureGitDiff(worktreeDir: string): { diff: string; filesChanged: string[]; added: number; deleted: number } {
  try {
    const diff = execSync('git diff --no-color', { cwd: worktreeDir, encoding: 'utf-8' });
    const stat = execSync('git diff --stat', { cwd: worktreeDir, encoding: 'utf-8' });
    const status = execSync('git status --porcelain', { cwd: worktreeDir, encoding: 'utf-8' });

    const filesChanged = status
      .split('\n')
      .map((line) => line.trim().split(/\s+/)[1])
      .filter(Boolean);

    let added = 0;
    let deleted = 0;
    const statMatch = stat.match(/(\d+)\s+insertions?\(\+\),\s+(\d+)\s+deletions?\(-\)/);
    if (statMatch) {
      added = parseInt(statMatch[1], 10);
      deleted = parseInt(statMatch[2], 10);
    }

    return { diff: scrubSecrets(diff), filesChanged, added, deleted };
  } catch {
    return { diff: '', filesChanged: [], added: 0, deleted: 0 };
  }
}

// ---------------------------------------------------------------------------
// Information Metrics Calculation
// ---------------------------------------------------------------------------

export function calculateInformationMetrics(
  payloadText: string,
  extra: {
    filesReferenced?: string[];
    diagnosticsCount?: number;
    constraintsCount?: number;
    verificationConveyed?: boolean;
    transcriptOriginalBytes?: number;
    transcriptDeliveredBytes?: number;
    transcriptWasTruncated?: boolean;
  } = {},
): InformationMetrics {
  const payloadSizeBytes = Buffer.byteLength(payloadText, 'utf-8');
  const estimatedTokens = Math.ceil(payloadSizeBytes / 4);

  return {
    payloadSizeBytes,
    estimatedTokens,
    filesReferencedCount: extra.filesReferenced?.length ?? (payloadText.includes('scheduler.ts') ? 1 : 0),
    diagnosticsConveyedCount: extra.diagnosticsCount ?? 0,
    constraintsConveyedCount: extra.constraintsCount ?? 0,
    verificationInfoConveyed: extra.verificationConveyed ?? payloadText.includes('test'),
    transcriptOriginalBytes: extra.transcriptOriginalBytes,
    transcriptDeliveredBytes: extra.transcriptDeliveredBytes,
    transcriptWasTruncated: extra.transcriptWasTruncated,
  };
}

// ---------------------------------------------------------------------------
// Main Experiment Orchestration Loop
// ---------------------------------------------------------------------------

export async function runExperiment(
  mode: 'pilot' | 'replicate' = 'pilot',
  customSeed: number = 42,
): Promise<ExperimentManifest> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const experimentId = `EXP-001-${mode.toUpperCase()}-${timestamp}`;
  const artifactDir = path.join(ARTIFACTS_DIR, experimentId);
  fs.mkdirSync(artifactDir, { recursive: true });

  console.log(`\n=============================================================`);
  console.log(`  STARTING BRIDGE EXP-001: WORK TRANSFER EXPERIMENT (${mode.toUpperCase()})`);
  console.log(`  Experiment ID: ${experimentId}`);
  console.log(`  Randomization Seed: ${customSeed}`);
  console.log(`=============================================================\n`);

  const trialOrder = generateTrialOrder(customSeed, mode);
  const trials: TrialRecord[] = [];

  // Step 1: Execute Agent A (Claude Code) initial analysis ONCE per experiment run
  // This provides the real, unedited evidence used for both Condition B and C.
  console.log(`[STAGE 1] Launching Agent A (${AGENT_A_COMMAND}) for live codebase analysis...`);
  const analysisWorktree = prepareWorktree('a');
  const claudeResult = await runClaudeAnalysis(analysisWorktree);

  fs.writeFileSync(path.join(artifactDir, 'agent-a-stdout.raw.txt'), claudeResult.stdout);
  fs.writeFileSync(path.join(artifactDir, 'agent-a-stderr.raw.txt'), claudeResult.stderr);
  console.log(`[STAGE 1] Agent A analysis complete (${(claudeResult.durationMs / 1000).toFixed(2)}s, ${Buffer.byteLength(claudeResult.stdout)} bytes).\n`);

  // Step 2: Prepare Condition B (Unedited 8KB Transcript)
  console.log(`[STAGE 2] Preparing Condition B unedited transcript payload...`);
  const truncatedTranscript = truncatePayload(claudeResult.stdout, 8192);
  const conditionBPayload = wrapUntrustedData(truncatedTranscript.content, 'transcript');
  const promptB = `${TASK_PROMPT}\n\n${conditionBPayload}`;
  fs.writeFileSync(path.join(artifactDir, 'condition-b-payload.txt'), promptB);

  // Step 3: Prepare Condition C (Structured Transfer Extracted from Claude's real work)
  console.log(`[STAGE 3] Extracting structured ExperimentalWorkTransfer from Agent A output (NO ANSWER KEY)...`);
  const extractionResult = await extractStructuredTransfer(claudeResult.stdout);
  const transferJson = JSON.stringify(extractionResult.transfer, null, 2);
  const conditionCPayload = wrapUntrustedData(transferJson, 'transfer');
  const promptC = `${TASK_PROMPT}\n\n${conditionCPayload}`;
  fs.writeFileSync(path.join(artifactDir, 'condition-c-transfer.json'), transferJson);
  fs.writeFileSync(path.join(artifactDir, 'condition-c-payload.txt'), promptC);
  console.log(`[STAGE 3] Structured transfer extracted (${extractionResult.transfer.diagnostics.length} diagnostics found).\n`);

  // Step 4: Execute Trials in Randomized Sequence
  for (const { trialIndex, condition } of trialOrder) {
    const trialStart = new Date().toISOString();
    const trialDirName = `trial-${trialIndex}-cond-${condition.toLowerCase()}`;
    const trialArtifactDir = path.join(artifactDir, trialDirName);
    fs.mkdirSync(trialArtifactDir, { recursive: true });

    console.log(`-------------------------------------------------------------`);
    console.log(`  Executing Trial ${trialIndex}/${trialOrder.length} [Condition ${condition}]`);
    console.log(`-------------------------------------------------------------`);

    const worktree = prepareWorktree(condition.toLowerCase() as 'a' | 'b' | 'c');
    let promptForCondition = TASK_PROMPT;
    let infoMetrics: InformationMetrics;

    if (condition === 'A') {
      promptForCondition = TASK_PROMPT;
      infoMetrics = calculateInformationMetrics(TASK_PROMPT);
    } else if (condition === 'B') {
      promptForCondition = promptB;
      infoMetrics = calculateInformationMetrics(promptB, {
        transcriptOriginalBytes: truncatedTranscript.originalBytes,
        transcriptDeliveredBytes: truncatedTranscript.deliveredBytes,
        transcriptWasTruncated: truncatedTranscript.wasTruncated,
      });
    } else {
      promptForCondition = promptC;
      infoMetrics = calculateInformationMetrics(promptC, {
        diagnosticsCount: extractionResult.transfer.diagnostics.length,
        constraintsCount: extractionResult.transfer.constraints.length,
        verificationConveyed: extractionResult.transfer.verificationCommands.length > 0,
      });
    }

    // Run Agent B (OpenCode)
    const opencodeResult = await runOpenCodeTask(worktree, promptForCondition);
    fs.writeFileSync(path.join(trialArtifactDir, 'agent-b-stdout.txt'), opencodeResult.stdout);
    fs.writeFileSync(path.join(trialArtifactDir, 'agent-b-stderr.txt'), opencodeResult.stderr);

    // Evaluate tests
    const testResult = runTests(worktree);
    const gitDiff = captureGitDiff(worktree);
    fs.writeFileSync(path.join(trialArtifactDir, 'patch.diff'), gitDiff.diff);
    fs.writeFileSync(path.join(trialArtifactDir, 'test-output.txt'), testResult.output);

    // Post-task fidelity check
    console.log(`  Running post-task transfer fidelity check...`);
    const fidelityCheck = await runOpenCodeFidelityCheck(worktree);
    fs.writeFileSync(path.join(trialArtifactDir, 'fidelity-check.json'), JSON.stringify(fidelityCheck, null, 2));

    const trialEnd = new Date().toISOString();
    const durationSec = parseFloat((opencodeResult.durationMs / 1000).toFixed(2));

    const costMetrics: CostMetrics = {
      agentAInputTokens: claudeResult.inputTokens,
      agentAOutputTokens: claudeResult.outputTokens,
      agentATotalTokens: claudeResult.totalTokens,
      agentBInputTokens: opencodeResult.inputTokens,
      agentBOutputTokens: opencodeResult.outputTokens,
      agentBTotalTokens: opencodeResult.totalTokens,
      estimatedCostUsd: 'UNKNOWN',
    };

    const trialRecord: TrialRecord = {
      trialIndex,
      condition,
      conditionName:
        condition === 'A'
          ? 'Native Baseline'
          : condition === 'B'
            ? 'Unedited Transcript Transfer (8KB)'
            : 'Structured Work Transfer (Schema v0.2.0)',
      startTime: trialStart,
      endTime: trialEnd,
      wallClockDurationSeconds: durationSec,
      success: testResult.success,
      testsPassed: testResult.passed,
      testsTotal: testResult.total,
      correctnessScore: (testResult.passed / testResult.total) * 100,
      reworkCycles: testResult.success ? 0 : 1,
      humanInterventions: 0,
      filesChanged: gitDiff.filesChanged,
      linesAdded: gitDiff.added,
      linesDeleted: gitDiff.deleted,
      gitDiff: gitDiff.diff,
      informationMetrics: infoMetrics,
      costMetrics,
      fidelityCheck,
    };

    trials.push(trialRecord);
    console.log(`  Trial ${trialIndex} Outcome: ${testResult.passed}/10 Tests Passed (${testResult.success ? 'PASS' : 'FAIL'}) in ${durationSec}s\n`);
  }

  // Step 5: Compute summary statistics
  const passedTrials = trials.filter((t) => t.success).length;
  const trialsA = trials.filter((t) => t.condition === 'A');
  const trialsB = trials.filter((t) => t.condition === 'B');
  const trialsC = trials.filter((t) => t.condition === 'C');

  const calcMean = (arr: TrialRecord[]) =>
    arr.length > 0 ? parseFloat((arr.reduce((acc, t) => acc + t.wallClockDurationSeconds, 0) / arr.length).toFixed(2)) : undefined;
  const calcSuccessRate = (arr: TrialRecord[]) =>
    arr.length > 0 ? parseFloat(((arr.filter((t) => t.success).length / arr.length) * 100).toFixed(1)) : undefined;

  const manifest: ExperimentManifest = {
    experimentId,
    timestamp,
    mode,
    randomizationSeed: customSeed,
    trialOrder,
    agentA: {
      name: 'Claude Code',
      version: '2.1.233',
      command: AGENT_A_COMMAND,
    },
    agentB: {
      name: 'OpenCode ox alpha',
      version: '1.18.23',
      command: AGENT_B_COMMAND,
    },
    trials,
    summary: {
      totalTrials: trials.length,
      passedTrials,
      meanDurationA: calcMean(trialsA),
      meanDurationB: calcMean(trialsB),
      meanDurationC: calcMean(trialsC),
      successRateA: calcSuccessRate(trialsA),
      successRateB: calcSuccessRate(trialsB),
      successRateC: calcSuccessRate(trialsC),
    },
  };

  fs.writeFileSync(path.join(artifactDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n=============================================================`);
  console.log(`  EXPERIMENT COMPLETED: ${passedTrials}/${trials.length} trials passed.`);
  console.log(`  Manifest saved to: ${path.join(artifactDir, 'manifest.json')}`);
  console.log(`=============================================================\n`);

  return manifest;
}

import { fileURLToPath } from 'node:url';

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const mode = args.includes('--mode') ? (args[args.indexOf('--mode') + 1] as 'pilot' | 'replicate') : 'pilot';
  const seedIndex = args.indexOf('--seed');
  const seed = seedIndex !== -1 ? parseInt(args[seedIndex + 1], 10) : 42;

  runExperiment(mode, seed).catch((err) => {
    console.error('Fatal harness error:', err);
    process.exit(1);
  });
}
