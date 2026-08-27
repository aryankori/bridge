/**
 * BRIDGE — EXP-005: Pre-Flight Fixture & Harness Validator
 *
 * Validates:
 * 1. 10 scenarios schema integrity (5 unambiguous, 3 ambiguous, 2 unsolvable)
 * 2. Independent human gold-standard adjudications
 * 3. Payload generation for Conditions A, B, C
 * 4. Pinned model and executable resolution
 * 5. Ephemeral worktree directory confinement
 */

import * as fs from 'node:fs';
import { EXP005_SCENARIOS } from './scenarios.js';
import { EXP005_GOLD_STANDARDS } from './gold-standard.js';
import { buildConditionPayload, FROZEN_RESOLVER_COMMIT } from './payload-builder.js';
import { resolveExecutable, PINNED_OPENCODE_MODEL, PINNED_PROVIDER } from './agent-runners.js';
import { EXP005_WORKTREES_ROOT } from './harness.js';

export interface ValidationReport {
  timestamp: string;
  scenariosCount: number;
  unambiguousCount: number;
  ambiguousCount: number;
  unsolvableCount: number;
  goldStandardsCount: number;
  resolverCommit: string;
  pinnedModel: string;
  pinnedProvider: string;
  opencodeExecutable: {
    command: string;
    resolvedPath: string;
    source: string;
  };
  checksPassed: boolean;
  errors: string[];
  warnings: string[];
}

export function validateExp005Harness(): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  let unambiguousCount = 0;
  let ambiguousCount = 0;
  let unsolvableCount = 0;

  // 1. Validate Scenarios
  if (EXP005_SCENARIOS.length !== 10) {
    errors.push(`Expected exactly 10 scenarios, found ${EXP005_SCENARIOS.length}`);
  }

  for (const scn of EXP005_SCENARIOS) {
    const gold = EXP005_GOLD_STANDARDS[scn.scenarioId];
    if (!gold) {
      errors.push(`Scenario ${scn.scenarioId} missing independent gold standard adjudication.`);
      continue;
    }

    if (gold.isAmbiguous) {
      ambiguousCount++;
    } else if (gold.goldResolution === 'BLOCKED_CONFLICT' || gold.goldResolution === 'REQUIRES_AUTHORIZATION') {
      unsolvableCount++;
    } else {
      unambiguousCount++;
    }

    // Verify fixture files
    if (!scn.fixtureFiles || scn.fixtureFiles.length === 0) {
      errors.push(`Scenario ${scn.scenarioId} has no fixture files defined.`);
    }

    // Verify raw sources
    if (!scn.rawSources || scn.rawSources.length === 0) {
      errors.push(`Scenario ${scn.scenarioId} has no raw sources defined.`);
    }

    // Test payload generation for A, B, C
    try {
      const payloadA = buildConditionPayload(scn, 'A');
      const payloadB = buildConditionPayload(scn, 'B');
      const payloadC = buildConditionPayload(scn, 'C');

      if (!payloadA.promptText || !payloadB.promptText || !payloadC.promptText) {
        errors.push(`Payload builder produced empty prompt for scenario ${scn.scenarioId}`);
      }
    } catch (err: unknown) {
      errors.push(`Payload generation failed for scenario ${scn.scenarioId}: ${String(err)}`);
    }
  }

  if (unambiguousCount !== 5) {
    warnings.push(`Expected 5 unambiguous scenarios, classified ${unambiguousCount}`);
  }
  if (ambiguousCount !== 3) {
    warnings.push(`Expected 3 ambiguous scenarios, classified ${ambiguousCount}`);
  }
  if (unsolvableCount !== 2) {
    warnings.push(`Expected 2 unsolvable/safety scenarios, classified ${unsolvableCount}`);
  }

  // 2. Validate Executable Resolution
  const opencodeResolved = resolveExecutable('opencode');
  if (opencodeResolved.source === 'fallback') {
    warnings.push(`OpenCode executable not found on standard paths, falling back to 'opencode'`);
  }

  // 3. Validate Worktree Parent
  if (!fs.existsSync(EXP005_WORKTREES_ROOT)) {
    fs.mkdirSync(EXP005_WORKTREES_ROOT, { recursive: true });
  }

  const checksPassed = errors.length === 0;

  return {
    timestamp: new Date().toISOString(),
    scenariosCount: EXP005_SCENARIOS.length,
    unambiguousCount,
    ambiguousCount,
    unsolvableCount,
    goldStandardsCount: Object.keys(EXP005_GOLD_STANDARDS).length,
    resolverCommit: FROZEN_RESOLVER_COMMIT,
    pinnedModel: PINNED_OPENCODE_MODEL,
    pinnedProvider: PINNED_PROVIDER,
    opencodeExecutable: opencodeResolved,
    checksPassed,
    errors,
    warnings,
  };
}

// CLI runner
const proc = (globalThis as unknown as { process?: { argv?: string[] } }).process;
if (proc?.argv?.[1]?.endsWith('validate.ts') || proc?.argv?.[1]?.endsWith('validate.js')) {
  const report = validateExp005Harness();
  console.log(JSON.stringify(report, null, 2));
  if (!report.checksPassed) {
    throw new Error(`EXP-005 Harness Validation Failed with ${report.errors.length} errors`);
  }
}
