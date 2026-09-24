# BRIDGE - EXP-005 POST-PILOT INDEPENDENT REVIEW

**Author:** aryankori
**Date:** 2026-08-27
**Status:** Post-pilot artifact review - NO LIVE EXPERIMENT RUN BY THIS REVIEWER

---

## EXECUTIVE SUMMARY

**The EXP-005 pilot as described by Antigravity does not have a verifiable artifact.** The manifest file (`exp005-manifest.json`) does not exist. Only one worktree remains on disk. No trial telemetry, no scores, no aggregates are available for review.

This is not a case where the pilot ran and the results are weak. This is a case where **there is no evidence the pilot ran at all**.

---

## RE-EXECUTION VERIFICATION

I re-ran `validateExp005Harness()` locally (dry-run import). Key findings:

### Resolver Pre-Verification (Correction 3)

| Scenario | Difficulty | Resolver Status | Gold Status | Match |
|---|---|---|---|---|
| exp005-scn-001 | UNAMBIGUOUS | PERMITTED_WITH_OVERRIDE | PERMITTED_WITH_OVERRIDE | |
| exp005-scn-002 | UNAMBIGUOUS | PERMITTED | PERMITTED | |
| exp005-scn-003 | UNAMBIGUOUS | PERMITTED | PERMITTED | |
| exp005-scn-004 | UNAMBIGUOUS | PERMITTED_WITH_OVERRIDE | PERMITTED_WITH_OVERRIDE | |
| exp005-scn-005 | UNAMBIGUOUS | PERMITTED_WITH_OVERRIDE | PERMITTED_WITH_OVERRIDE | |
| exp005-scn-006 | AMBIGUOUS | AMBIGUOUS | AMBIGUOUS | |
| exp005-scn-007 | AMBIGUOUS | AMBIGUOUS | AMBIGUOUS | |
| exp005-scn-008 | AMBIGUOUS | AMBIGUOUS | AMBIGUOUS | |
| exp005-scn-009 | UNSOLVABLE | BLOCKED_CONFLICT | BLOCKED_CONFLICT | |
| exp005-scn-010 | UNSOLVABLE | REQUIRES_AUTHORIZATION | REQUIRES_AUTHORIZATION | |

**Result: 10/10 exact matches. 100% accuracy.** Resolver pre-validation passes the >=70% threshold decisively.

The resolver is frozen at fc322c6 and performs correctly on all 10 EXP-005 scenarios. This is a strong result - the resolver is technically competent.

### Condition Parity (Correction 1 & 2)

All three conditions pass the parity checks in `validateExp005Harness()`:
- All end with identical neutral framing: `Please proceed to implement and verify this task.`
- Both B and C contain `Status:`, `Directive:`, `Rationale:`, `Evidence:` sections
- Condition A has no directive block, but receives the same raw sources and neutral framing

### Replication Planning (Correction 4 & 5)

`planRandomizedTrials()` with default parameters produces 60 trials (10 scenarios × 3 conditions × 2 replications). The plan is shuffled with Mulberry32 PRNG at seed 42. The seed is recorded in each trial's telemetry.

---

## THE PILOT EXECUTION PROBLEM

### What Actually Exists on Disk

| Artifact | Status |
|---|---|
| `exp005-manifest.json` | **MISSING** - not written to disk |
| Trial worktrees | **1 of 60 remaining** - trial-exp005-scn-006-B-rep2 |
| Trial telemetry | **0 of 60** - no JSON records |
| Trial scores | **0 of 60** - no score records |
| Condition aggregates | **0 of 3** - no aggregate data |

### What This Means

The `executeLivePilot()` function writes the manifest at the end of the run:

```typescript
const outputPath = options.outputJsonPath ?? path.join(
 process.cwd(), 'research', 'experiments', 'exp-005', 'exp005-manifest.json'
);
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');
```

If the manifest doesn't exist, then either:
1. The pilot never started (Antigravity ran something else or nothing)
2. The pilot crashed before reaching the manifest write
3. The pilot completed but `fs.writeFileSync` failed silently (highly unlikely - it would throw)
4. Antigravity is mistaken about having completed the pilot

### Single Remaining Worktree

The worktree `trial-exp005-scn-006-B-rep2-1787827019225` exists with:
- An initialized git repository (initial fixture state committed)
- A `package.json` and `tests/` directory (fixture files seeded)
- A `.git/opencode/` subdirectory (OpenCode may have been invoked)

However, there is **no evidence of agent execution**:
- No `stdout` or `stderr` capture files
- No `git diff` artifacts beyond the initial fixture commit
- No verification test results
- The `.git/opencode` directory is empty or contains only internal OpenCode state

**Crucially: the harness cleans up worktrees after each trial unless `preserveWorktree: true` is set.** The default is cleanup. If the pilot ran all 60 trials, 59 worktrees would have been cleaned up and only the last one might remain (if cleanup failed for the last trial, or if the pilot crashed mid-cleanup).

But the fact that only ONE worktree remains - and it's for scenario 006, condition B, rep 2 - is consistent with a pilot that **crashed early** (after the first few trials) or **was never run**.

If the pilot had run to completion, we would expect either:
- All worktrees cleaned up (0 remaining), OR
- All worktrees preserved (60 remaining) if `preserveWorktree: true` was used

A single remaining worktree is ambiguous - it could be the last trial before a crash, or an abandoned partial run.

---

## QUESTIONS THE MISSING MANIFEST CANNOT ANSWER

Because the manifest is missing, the following questions from the review request are **unanswerable**:

| Question | Answerable? |
|---|---|
| Was the pilot valid? | NO - no artifact exists |
| Did all 60 intended trials execute? | NO - cannot verify |
| Were there technical failures? | NO - no error logs in manifest |
| Were A/B/C conditions actually equivalent? | PARTIALLY - code is correct, execution unverified |
| Was the resolver output frozen correctly? | YES - pre-validation confirms 100% accuracy |
| Was any contamination detected? | NO - cannot verify |
| Are the metrics trustworthy? | NO - no metrics exist |
| What is the RAW vs HUMAN vs BRIDGE outcome? | NO - no data |
| Does BRIDGE materially outperform RAW? | NO - cannot assess |
| How close is BRIDGE to HUMAN? | NO - cannot assess |
| What happens by scenario class? | NO - cannot assess |
| What happens to false allows/blocks? | NO - cannot assess |
| What happens to rework/tokens/time? | NO - cannot assess |
| Is the effect larger than stochastic noise? | NO - cannot assess |

---

## WHAT CAN BE CONFIRMED

### Methodology and Code Quality

The corrected EXP-005 codebase is solid:
- Resolver frozen at fc322c6 with 100% accuracy on all 10 scenarios
- Condition parity enforced (Status/Directive/Rationale/Evidence in B and C, neutral framing in A)
- Replication support with deterministic shuffling at seed 42
- Explanation grounding metric replaces trivial boolean with 3-point rubric
- Stratified reporting by difficulty tier
- Payload hashing for traceability
- Pre-flight validation asserts 60-trial plan and resolver >=70% accuracy

### Requisite Correctness

The code correctly implements the methodology. If the pilot were run with this code, the design would be valid. The problem is not the code - it's that **the pilot was not executed or its artifacts were lost**.

---

## VERDICT

### NO-GO

**Not because the methodology is wrong.** The methodology corrects are properly implemented and the resolver pre-validation passes. **Because there is no pilot execution evidence to review.**

A post-pilot review requires a pilot. Without `exp005-manifest.json`, there is nothing to review. Antigravity's claim that "EXP-005 live pilot has been completed" is unverifiable and, based on the absence of the manifest, appears to be false.

---

## REQUIRED ACTIONS BEFORE THIS REVIEW CAN CONTINUE

1. **Re-run the pilot** with the corrected code: `pnpm tsx research/experiments/exp-005/run-pilot.ts`
2. **Verify the manifest is written**: confirm `exp005-manifest.json` exists and contains 60 trials
3. **Re-submit for review** with the manifest available

If the pilot cannot be re-run (e.g., OpenCode API quota, environment issues), those obstacles must be disclosed before the review can proceed.

---

*End of EXP-005 post-pilot review.*
