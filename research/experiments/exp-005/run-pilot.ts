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

export async function executeLivePilot(options: {
  scenarioIds?: string[];
  conditions?: ExperimentCondition[];
  replications?: number;
  seed?: number;
  outputJsonPath?: string;
  timeoutMs?: number;
} = {}): Promise<ExperimentManifest> {
  const targetScenarios = options.scenarioIds
    ? EXP005_SCENARIOS.filter((s) => options.scenarioIds?.includes(s.scenarioId))
    : EXP005_SCENARIOS;

  const targetConditions: ExperimentCondition[] = options.conditions ?? ['A', 'B', 'C'];
  const replicationsCount = options.replications ?? 2;
  const seed = options.seed ?? 42;

  const scheduledTrials = planRandomizedTrials(
    targetScenarios,
    targetConditions,
    replicationsCount,
    seed
  );

  console.log(
    `[EXP-005] Planned ${scheduledTrials.length} trials (${targetScenarios.length} scenarios × ${targetConditions.length} conditions × ${replicationsCount} replications, Seed: ${seed})`
  );

  const trials: TrialTelemetry[] = [];

  for (let idx = 0; idx < scheduledTrials.length; idx++) {
    const item = scheduledTrials[idx]!;
    const orderIndex = idx + 1;

    console.log(
      `[EXP-005] [${orderIndex}/${scheduledTrials.length}] Executing ${item.scenario.scenarioId} [Condition ${item.condition}, Rep ${item.replicationIndex}]...`
    );

    try {
      const telemetry = await runTrial(item.scenario, item.condition, {
        replicationIndex: item.replicationIndex,
        trialOrderIndex: orderIndex,
        randomizationSeed: seed,
        timeoutMs: options.timeoutMs,
      });
      trials.push(telemetry);
    } catch (err: unknown) {
      console.error(
        `[EXP-005 ERROR] Trial ${orderIndex} failed for ${item.scenario.scenarioId} [${item.condition}]:`,
        err
      );
    }
  }

  const manifest = buildExperimentManifest(trials, targetScenarios, {
    randomizationSeed: seed,
    replicationsCount,
  });

  const outputPath =
    options.outputJsonPath ??
    path.join(process.cwd(), 'research', 'experiments', 'exp-005', 'exp005-manifest.json');
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(
    `[EXP-005] Completed ${trials.length} trials. Manifest written to ${outputPath}`
  );
  return manifest;
}
