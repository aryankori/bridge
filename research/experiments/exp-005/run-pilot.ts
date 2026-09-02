/**
 * BRIDGE — EXP-005: Live Pilot & Trial Execution CLI Runner
 *
 * Supports:
 * - Correction 4: Configurable replications (--replications N, default N=2 -> 60 trials)
 * - Correction 5: Seeded deterministic pseudo-random shuffling across scenario-condition-replication triples
 *
 * NOTE: Requires explicit human authorization before live execution.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { EXP005_SCENARIOS } from './scenarios.js';
import { runTrial } from './harness.js';
import { buildExperimentManifest } from './evaluator.js';
import type { ExperimentCondition, TrialTelemetry, ExperimentManifest, LiveAgentScenario } from './schema.js';

/**
 * Deterministic Mulberry32 PRNG.
 */
function createPrng(seed: number): () => number {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle using deterministic PRNG.
 */
function deterministicShuffle<T>(array: T[], prng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

export interface TrialPlanItem {
  scenario: LiveAgentScenario;
  condition: ExperimentCondition;
  replicationIndex: number;
}

/**
 * Plan and randomize trials.
 */
export function planRandomizedTrials(
  scenarios: LiveAgentScenario[],
  conditions: ExperimentCondition[] = ['A', 'B', 'C'],
  replicationsCount: number = 2,
  seed: number = 42
): TrialPlanItem[] {
  const plan: TrialPlanItem[] = [];

  for (let rep = 1; rep <= replicationsCount; rep++) {
    for (const scenario of scenarios) {
      for (const condition of conditions) {
        plan.push({
          scenario,
          condition,
          replicationIndex: rep,
        });
      }
    }
  }

  const prng = createPrng(seed);
  return deterministicShuffle(plan, prng);
}

/**
 * Writes an experiment manifest atomically using a temporary file and rename.
 */
export function writeManifestAtomically(filePath: string, manifest: ExperimentManifest): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

export async function executeLivePilot(options: {
  runId?: string;
  scenarioIds?: string[];
  conditions?: ExperimentCondition[];
  replications?: number;
  seed?: number;
  outputJsonPath?: string;
  timeoutMs?: number;
  resumeFromManifest?: boolean | string;
} = {}): Promise<ExperimentManifest> {
  const targetScenarios = options.scenarioIds
    ? EXP005_SCENARIOS.filter((s) => options.scenarioIds?.includes(s.scenarioId))
    : EXP005_SCENARIOS;

  const targetConditions: ExperimentCondition[] = options.conditions ?? ['A', 'B', 'C'];
  const replicationsCount = options.replications ?? 2;
  const seed = options.seed ?? 42;
  const runId = options.runId ?? `run-exp005-${Date.now()}`;

  const outputPath =
    options.outputJsonPath ??
    path.join(process.cwd(), 'research', 'experiments', 'exp-005', 'exp005-manifest.json');

  const scheduledTrials = planRandomizedTrials(
    targetScenarios,
    targetConditions,
    replicationsCount,
    seed
  );

  console.log(
    `[EXP-005] Run ID: ${runId} | Planned ${scheduledTrials.length} trials (${targetScenarios.length} scenarios × ${targetConditions.length} conditions × ${replicationsCount} replications, Seed: ${seed})`
  );

  const trials: TrialTelemetry[] = [];
  const completedKeys = new Set<string>();

  // Safe resume logic
  if (options.resumeFromManifest) {
    const resumePath =
      typeof options.resumeFromManifest === 'string'
        ? options.resumeFromManifest
        : outputPath;
    if (fs.existsSync(resumePath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(resumePath, 'utf-8')) as ExperimentManifest;
        if (existing && Array.isArray(existing.trials)) {
          for (const t of existing.trials) {
            trials.push(t);
            completedKeys.add(`${t.scenarioId}-${t.condition}-${t.replicationIndex}`);
          }
          console.log(`[EXP-005] Resumed ${trials.length} existing trials from ${resumePath}`);
        }
      } catch (resumeErr) {
        console.warn(`[EXP-005] Could not load resume manifest from ${resumePath}:`, resumeErr);
      }
    }
  }

  for (let idx = 0; idx < scheduledTrials.length; idx++) {
    const item = scheduledTrials[idx]!;
    const orderIndex = idx + 1;
    const key = `${item.scenario.scenarioId}-${item.condition}-${item.replicationIndex}`;

    if (completedKeys.has(key)) {
      console.log(
        `[EXP-005] [${orderIndex}/${scheduledTrials.length}] Skipping already completed trial: ${key}`
      );
      continue;
    }

    console.log(
      `[EXP-005] [${orderIndex}/${scheduledTrials.length}] Executing ${item.scenario.scenarioId} [Condition ${item.condition}, Rep ${item.replicationIndex}]...`
    );

    try {
      const telemetry = await runTrial(item.scenario, item.condition, {
        runId,
        replicationIndex: item.replicationIndex,
        trialOrderIndex: orderIndex,
        randomizationSeed: seed,
        timeoutMs: options.timeoutMs,
      });
      trials.push(telemetry);
      completedKeys.add(key);

      // Save progressive manifest checkpoint atomically after each trial
      const intermediateManifest = buildExperimentManifest(trials, targetScenarios, {
        randomizationSeed: seed,
        replicationsCount,
      });
      intermediateManifest.runId = runId;
      intermediateManifest.completedTrialsCount = trials.length;
      writeManifestAtomically(outputPath, intermediateManifest);
    } catch (err: unknown) {
      console.error(
        `[EXP-005 ERROR] Trial ${orderIndex} encountered unhandled runner error for ${item.scenario.scenarioId} [${item.condition}]:`,
        err
      );
    }
  }

  const manifest = buildExperimentManifest(trials, targetScenarios, {
    randomizationSeed: seed,
    replicationsCount,
  });
  manifest.runId = runId;
  manifest.completedTrialsCount = trials.length;

  writeManifestAtomically(outputPath, manifest);

  console.log(
    `[EXP-005] Completed ${trials.length}/${scheduledTrials.length} trials. Manifest written to ${outputPath}`
  );
  return manifest;
}

// CLI runner
const proc = (globalThis as unknown as { process?: { argv?: string[] } }).process;
if (proc?.argv?.[1]?.endsWith('run-pilot.ts') || proc?.argv?.[1]?.endsWith('run-pilot.js')) {
  const args = proc.argv.slice(2);
  let replications = 2;
  let seed = 42;
  let resume = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--replications' && args[i + 1]) {
      replications = parseInt(args[i + 1]!, 10);
      i++;
    } else if (args[i] === '--seed' && args[i + 1]) {
      seed = parseInt(args[i + 1]!, 10);
      i++;
    } else if (args[i] === '--resume') {
      resume = true;
    }
  }

  executeLivePilot({ replications, seed, resumeFromManifest: resume })
    .then(() => {
      console.log('[EXP-005] Pilot Execution Succeeded.');
    })
    .catch((err) => {
      console.error('[EXP-005 FATAL] Pilot Execution Failed:', err);
      process.exit(1);
    });
}

