/**
 * BRIDGE - EXP-005: Reproduce the paper tables that come from the frozen
 * resolver and the recorded pilot manifest.
 *
 *   - Resolver pre-verification against the gold labels (paper Table "EXP-005 resolver pre-verification")
 *   - Recorded trials per tier and condition (paper Table "EXP-005 recorded trials")
 *   - Pre-registered scorer output, recomputed from the per-trial scores and
 *     checked against the aggregates stored in the manifest
 *
 * The trace audit tables come from trace-audit.ts.
 *
 * Usage: pnpm tsx research/experiments/exp-005/paper-tables.ts
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXP005_SCENARIOS } from './scenarios.js';
import { EXP005_GOLD_STANDARDS } from './gold-standard.js';
import { scoreResolutionQuality } from './evaluator.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

console.log('Resolver pre-verification (frozen resolver vs project-authored gold labels)');
console.log('scenario\ttier\tgold\tresolver\tmatch\tconflictDetected\tlatencyMs');
let matches = 0;
for (const scenario of EXP005_SCENARIOS) {
  const gold = EXP005_GOLD_STANDARDS[scenario.scenarioId];
  if (!gold) throw new Error(`Missing gold label for ${scenario.scenarioId}`);
  const r = scoreResolutionQuality(scenario, gold);
  if (r.matchesGoldStandard) matches += 1;
  console.log(
    [scenario.scenarioId, scenario.difficulty, gold.goldResolution, r.resolutionStatus, r.matchesGoldStandard, r.detectedConflict, r.latencyMs].join('\t'),
  );
}
console.log(`Agreement: ${matches}/${EXP005_SCENARIOS.length}\n`);

interface Score {
  condition: 'A' | 'B' | 'C';
  difficulty: string;
  agentOutcome: Record<string, number | boolean | string>;
}

const manifest = JSON.parse(readFileSync(path.join(HERE, 'exp005-manifest.json'), 'utf-8')) as {
  scores: Score[];
  overallAggregates: Record<string, Record<string, number | string>>;
};

console.log('Recorded trials per tier and condition');
const cells: Record<string, Record<string, number>> = {};
for (const s of manifest.scores) {
  const row = (cells[s.difficulty] ??= { A: 0, B: 0, C: 0 });
  row[s.condition] = (row[s.condition] ?? 0) + 1;
}
for (const [tier, row] of Object.entries(cells)) console.log(`${tier}\tA=${row['A']}\tB=${row['B']}\tC=${row['C']}`);
console.log(`Total recorded: ${manifest.scores.length}\n`);

console.log('Pre-registered scorer output (counts; means for tokens, duration, tool calls)');
const flags = ['correctActionTaken', 'instructionViolationOccurred', 'isFalseAllow', 'isFalseBlock', 'testsPassed', 'taskCompleted'];
for (const condition of ['A', 'B', 'C'] as const) {
  const rows = manifest.scores.filter((s) => s.condition === condition);
  const count = (flag: string) => rows.filter((s) => s.agentOutcome[flag] === true).length;
  const mean = (field: string) => rows.reduce((sum, s) => sum + Number(s.agentOutcome[field]), 0) / rows.length;
  const stored = manifest.overallAggregates[condition]!;
  const recomputedRate = Math.round((count('correctActionTaken') / rows.length) * 1000) / 1000;
  if (recomputedRate !== Number(stored['correctActionRate'])) {
    throw new Error(`Stored correctActionRate for ${condition} does not match recomputation`);
  }
  console.log(
    `${condition} n=${rows.length}\t` +
      flags.map((f) => `${f}=${count(f)}`).join('\t') +
      `\tmeanTokens=${Math.round(mean('totalTokens'))}\tmeanSeconds=${(mean('timeMs') / 1000).toFixed(1)}\tmeanToolCalls=${mean('toolCalls').toFixed(1)}`,
  );
}
console.log('\nStored aggregates match the recomputed correct-action rates.');
