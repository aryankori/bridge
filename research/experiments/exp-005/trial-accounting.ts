/**
 * BRIDGE - EXP-005: Trial Accounting
 *
 * Rebuilds the seeded 60-trial plan and classifies each planned position as
 * recorded (present in the manifest), started without a record (a preserved
 * worktree exists for it), or never started. Also compares the manifest time
 * with the newest worktree time to detect a checkpoint written mid-run.
 *
 * Usage: pnpm tsx research/experiments/exp-005/trial-accounting.ts
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXP005_SCENARIOS } from './scenarios.js';
import { planRandomizedTrials } from './run-pilot.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const manifest = JSON.parse(readFileSync(path.join(HERE, 'exp005-manifest.json'), 'utf-8')) as {
  generatedAt: string;
  trials: Array<{ trialId: string; scenarioId: string; condition: string; replicationIndex: number; trialOrderIndex: number }>;
};

const plan = planRandomizedTrials(EXP005_SCENARIOS, ['A', 'B', 'C'], 2, 42);
const key = (scenarioId: string, condition: string, rep: number) => `${scenarioId}|${condition}|${rep}`;

const recorded = new Map(manifest.trials.map((t) => [t.trialOrderIndex, t]));
for (const t of manifest.trials) {
  const planned = plan[t.trialOrderIndex - 1];
  const expected = planned && key(planned.scenario.scenarioId, planned.condition, planned.replicationIndex);
  if (expected !== key(t.scenarioId, t.condition, t.replicationIndex)) {
    throw new Error(`Manifest trial ${t.trialId} does not match plan position ${t.trialOrderIndex}`);
  }
}

// Preserved worktrees: trial-exp005-scn-NNN-C-repR-<epochMs>
const worktreeDir = path.join(HERE, 'worktrees');
const worktrees = existsSync(worktreeDir) ? readdirSync(worktreeDir) : [];
const worktreeByKey = new Map<string, number>();
for (const name of worktrees) {
  const m = /^trial-(exp005-scn-\d{3})-([ABC])-rep(\d)-(\d+)$/.exec(name);
  if (m) worktreeByKey.set(key(m[1]!, m[2]!, Number(m[3])), Number(m[4]));
}

const rows = plan.map((item, i) => {
  const index = i + 1;
  const k = key(item.scenario.scenarioId, item.condition, item.replicationIndex);
  const status = recorded.has(index) ? 'RECORDED' : worktreeByKey.has(k) ? 'STARTED_NO_RECORD' : 'NOT_STARTED';
  return { index, scenarioId: item.scenario.scenarioId, condition: item.condition, rep: item.replicationIndex, status, worktreeMs: worktreeByKey.get(k) };
});

const count = (s: string) => rows.filter((r) => r.status === s).length;
console.log(`Recorded: ${count('RECORDED')}  Started without record: ${count('STARTED_NO_RECORD')}  Not started: ${count('NOT_STARTED')}`);
const lastStarted = Math.max(...rows.filter((r) => r.status !== 'NOT_STARTED').map((r) => r.index));
console.log(`Highest started plan position: ${lastStarted}`);
console.log(`Not-started positions: ${rows.filter((r) => r.status === 'NOT_STARTED').map((r) => r.index).join(', ')}`);

const manifestMs = Date.parse(manifest.generatedAt);
const newest = rows.filter((r) => r.worktreeMs !== undefined).sort((a, b) => b.worktreeMs! - a.worktreeMs!)[0];
if (newest) {
  console.log(
    `Manifest written at ${manifestMs}; newest worktree (position ${newest.index}, ${newest.scenarioId} ${newest.condition} rep ${newest.rep}) created at ${newest.worktreeMs} (delta ${newest.worktreeMs! - manifestMs} ms)`,
  );
}
