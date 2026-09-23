/**
 * BRIDGE - EXP-004: Resolution Status Confusion Matrix
 *
 * Runs the blind benchmark and prints a gold-by-predicted status matrix for
 * the combined, DEV, and HELD-OUT sets. The paper tables use this output.
 *
 * Usage: pnpm tsx research/experiments/exp-004/confusion-matrix.ts [--json]
 */

import { DEV_SCENARIOS } from './fixtures-dev.js';
import { HELD_OUT_SCENARIOS } from './fixtures-heldout.js';
import { GOLD_STANDARDS } from './gold-standard.js';
import { executeBenchmark } from './evaluator.js';
import { DEFAULT_AUTHORITY_POLICY } from './policy.js';

const STATUSES = [
  'PERMITTED',
  'PERMITTED_WITH_OVERRIDE',
  'AMBIGUOUS',
  'REQUIRES_AUTHORIZATION',
  'BLOCKED_CONFLICT',
] as const;

type Matrix = Record<string, Record<string, number>>;

function emptyMatrix(): Matrix {
  const m: Matrix = {};
  for (const gold of STATUSES) {
    m[gold] = {};
    for (const actual of STATUSES) m[gold]![actual] = 0;
  }
  return m;
}

const report = executeBenchmark([...DEV_SCENARIOS, ...HELD_OUT_SCENARIOS], GOLD_STANDARDS, DEFAULT_AUTHORITY_POLICY);

const matrices: Record<string, Matrix> = { ALL: emptyMatrix(), DEV: emptyMatrix(), HELD_OUT: emptyMatrix() };
for (const s of report.detailedBreakdown) {
  for (const key of ['ALL', s.set]) {
    matrices[key]![s.goldStatus]![s.actualStatus]! += 1;
  }
}

const mismatches = report.detailedBreakdown
  .filter((s) => !s.resolutionMatch)
  .map((s) => ({ scenarioId: s.scenarioId, set: s.set, domain: s.domain, gold: s.goldStatus, actual: s.actualStatus }));

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ statuses: STATUSES, matrices, mismatches }, null, 2));
} else {
  for (const [name, m] of Object.entries(matrices)) {
    console.log(`\n${name} (rows = gold, columns = resolver)`);
    console.log(['gold \ actual', ...STATUSES].join('\t'));
    for (const gold of STATUSES) {
      console.log([gold, ...STATUSES.map((a) => m[gold]![a])].join('\t'));
    }
  }
  console.log('\nMismatches:');
  for (const x of mismatches) console.log(`${x.scenarioId}\t${x.set}\t${x.domain}\tgold=${x.gold}\tactual=${x.actual}`);
}
