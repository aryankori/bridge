/**
 * BRIDGE — EXP-005: Live Pilot & Trial Execution CLI Runner
 *
 * Runs controlled live trials across Conditions A (RAW), B (HUMAN), and C (BRIDGE)
 * for the 10 benchmark scenarios and emits machine-readable JSON manifest.
 *
 * NOTE: Requires explicit authorization before execution.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { EXP005_SCENARIOS } from './scenarios.js';
import { runTrial } from './harness.js';
import { buildExperimentManifest } from './evaluator.js';
import type { ExperimentCondition, TrialTelemetry, ExperimentManifest } from './schema.js';

export async function executeLivePilot(options: {
  scenarioIds?: string[];
  conditions?: ExperimentCondition[];
  outputJsonPath?: string;
  timeoutMs?: number;
} = {}): Promise<ExperimentManifest> {
  const targetScenarios = options.scenarioIds
    ? EXP005_SCENARIOS.filter((s) => options.scenarioIds?.includes(s.scenarioId))
    : EXP005_SCENARIOS;

  const targetConditions: ExperimentCondition[] = options.conditions ?? ['A', 'B', 'C'];
  const trials: TrialTelemetry[] = [];

  for (const scenario of targetScenarios) {
    for (const condition of targetConditions) {
      console.log(`[EXP-005] Executing Scenario: ${scenario.scenarioId} | Condition: ${condition}...`);
      try {
        const telemetry = await runTrial(scenario, condition, { timeoutMs: options.timeoutMs });
        trials.push(telemetry);
      } catch (err: unknown) {
        console.error(`[EXP-005 ERROR] Trial failed for ${scenario.scenarioId} [${condition}]:`, err);
      }
    }
  }

  const manifest = buildExperimentManifest(trials, targetScenarios);

  const outputPath =
    options.outputJsonPath ??
    path.join(process.cwd(), 'research', 'experiments', 'exp-005', 'exp005-manifest.json');
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`[EXP-005] Completed ${trials.length} trials. Manifest written to ${outputPath}`);
  return manifest;
}
