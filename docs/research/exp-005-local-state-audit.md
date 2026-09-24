# EXP-005 Forensic Local State Audit & Reconciliation Report

**Author:** aryankori
**Date:** 2026-09-02 
**Target Repository:** `bridge` (`C:\Users\aryan\Documents\AI and ML\bridge`) 
**Status:** FORENSIC RECONCILIATION COMPLETE 

---

## 1. Executive Summary

A comprehensive forensic audit of the `research/experiments/exp-005/` directory, process history, filesystem timestamps, git history, and runtime logs has been conducted to resolve the conflicting reports regarding the historical state of EXP-005:

- **Conflict Under Investigation:** 45/60 (or 41/60) reported progress vs. 25 manifest entries vs. 24 surviving worktrees on disk.
- **Root Cause Identified:** The runner executed trials sequentially according to a deterministic PRNG shuffle (Mulberry32 seed 42) up to **Trial Order Index 48**. Of those 48 attempted trials:
 1. **25 trials succeeded** without throwing unhandled exceptions and were progressively serialized to `exp005-manifest.json`.
 2. **23 trials encountered runtime timeouts or failures** (e.g., agent timeout >180s, vitest command resolution failure due to unlinked `node_modules` in isolated worktrees). In `run-pilot.ts`, the catch block logged errors to stderr but skipped `trials.push(telemetry)`, leaving those 23 trials omitted from the manifest file.
 3. **24 worktrees survived on disk** in `research/experiments/exp-005/worktrees/` because `preserveWorktree: true` was enabled during the pilot run and Windows process file-locks prevented automatic deletion of specific error directories.
 4. **Trials 49 through 60 were never started** because the background runner process stopped at 2026-08-27T15:41:15 UTC (21:11:15 IST).

No active runner processes remain running on the host. Historical evidence is fully preserved and uncorrupted.

---

## 2. Forensic Reconciliation Table

| Metric / Dimension | Value | Forensic Source / Evidence |
| --- | --- | --- |
| **Active Runner Process** | None (`node`, `ts-node`, `opencode` inactive) | System process table query (`Get-Process`) |
| **Last Execution Timestamp** | `2026-08-27T15:41:15.630Z` | `exp005-manifest.json` last trial timestamp |
| **Total Planned Trials** | 60 (10 scenarios × 3 conditions × 2 reps) | `scenarios.ts` + `planRandomizedTrials(N=2, seed=42)` |
| **Maximum Trial Order Reached** | Order 48 of 60 | Last trial in manifest is Order 48 (`exp005-scn-002`, Cond C, Rep 2) |
| **Manifest Trial Count** | 25 recorded trials | `exp005-manifest.json` (`m.trials.length == 25`) |
| **Manifest Condition Distribution** | Condition A: 4; Condition B: 12; Condition C: 9 | Manifest telemetry aggregation |
| **Surviving Worktree Directories** | 24 directories | `research/experiments/exp-005/worktrees/` |
| **Failed / Dropped Trial Count** | 23 trials | Orders 1, 5, 8, 10-14, 16, 18, 20-22, 31-32, 34-38, 40, 42, 44 |
| **Unstarted Trials** | 12 trials (Orders 49 to 60) | Unexecuted tail of deterministic 60-trial plan |
| **Pinned Model** | `nvidia/nvidia/nemotron-3-super-120b-a12b` | Recorded in trial telemetry |
| **Resolver Commit** | `fc322c6` (100% pre-verification match) | `validate.ts` + `gold-standard.ts` |

---

## 3. Detailed Forensic Breakdown

### 3.1 Manifest Inspection (`exp005-manifest.json`)

The manifest file is 506,644 bytes, created and last modified at 2026-08-27 21:11:15 IST. It contains 25 trial telemetry records.

The recorded trial sequence in the manifest shows non-contiguous `trialOrderIndex` values:

- Orders present: `[2, 3, 4, 6, 7, 9, 15, 17, 19, 23, 24, 25, 26, 27, 28, 29, 30, 33, 39, 41, 43, 45, 46, 47, 48]`
- First trial recorded: `trial-exp005-scn-006-B-rep2-1787838748002` (Order 2, started 13:53:26 UTC)
- Last trial recorded: `trial-exp005-scn-002-C-rep2-1787845133679` (Order 48, started 15:41:15 UTC)

### 3.2 Surviving Worktrees Analysis

Under `research/experiments/exp-005/worktrees/`, exactly 24 directories exist:

1. `trial-exp005-scn-001-A-rep1-1787844434875`
2. `trial-exp005-scn-001-A-rep2-1787844644687`
3. `trial-exp005-scn-001-C-rep1-1787843421166`
4. `trial-exp005-scn-001-C-rep2-1787839233692`
5. `trial-exp005-scn-002-A-rep1-1787840970692`
6. `trial-exp005-scn-002-B-rep1-1787841213598`
7. `trial-exp005-scn-002-B-rep2-1787840097083`
8. `trial-exp005-scn-003-A-rep1-1787843240592`
9. `trial-exp005-scn-003-B-rep1-1787840278162`
10. `trial-exp005-scn-004-A-rep2-1787838567449`
11. `trial-exp005-scn-004-C-rep2-1787842717526`
12. `trial-exp005-scn-005-A-rep2-1787841394528`
13. `trial-exp005-scn-005-B-rep2-1787845275662`
14. `trial-exp005-scn-005-C-rep2-1787843962772`
15. `trial-exp005-scn-006-A-rep1-1787839735722`
16. `trial-exp005-scn-006-B-rep1-1787842898142`
17. `trial-exp005-scn-006-C-rep1-1787839916253`
18. `trial-exp005-scn-006-C-rep2-1787838962469`
19. `trial-exp005-scn-008-A-rep2-1787843601656`
20. `trial-exp005-scn-008-B-rep2-1787844232066`
21. `trial-exp005-scn-008-C-rep1-1787839555244`
22. `trial-exp005-scn-009-A-rep2-1787840628880`
23. `trial-exp005-scn-009-C-rep2-1787843782204`
24. `trial-exp005-scn-010-A-rep2-1787841575130`

### 3.3 Test Infrastructure & Execution Failures

Forensic inspection of verification outputs across trials revealed two primary execution defects:

1. **Missing `node_modules` in Ephemeral Worktrees:**
 When `runVerificationCommand()` ran `pnpm test` (or `vitest run`) inside the isolated worktree directory, it returned:

 ```text
 'vitest' is not recognized as an internal or external command, operable program or batch file.
 WARN Local package.json exists, but node_modules missing, did you mean to install?
 ```

 The ephemeral setup wrote `package.json` and test files, but did not link `node_modules` from the root repo, preventing the test runner from executing.
2. **Timeout Rejection Handling in Runner:**
 In `agent-runners.ts`, `executeOpenCodeTrial()` rejected the promise on timeout (`timeoutMs: 180000`). This caused `runTrial()` to throw, triggering the `catch` block in `run-pilot.ts`, which skipped manifest recording.

---

## 4. Architectural Corrective Actions

To ensure the harness satisfies all rigorous experimental engineering standards:

1. **Failure & Timeout Capture:**
 Update `executeOpenCodeTrial` and `runTrial` to treat timeouts and errors as first-class telemetry objects rather than unhandled promise rejections. Record duration, partial stdout/stderr, git diff, and set `timedOut: true` or `error: string`.
2. **Atomic Manifest Writes:**
 Write intermediate checkpoint manifests to a temporary file (`.tmp`) and atomically rename to `exp005-manifest.json` to prevent partial write corruption.
3. **Worktree Dependency Linking:**
 In `setupTrialWorktree`, create a directory junction to `node_modules` from the project root (`fs.symlinkSync(rootNodeModules, worktreeNodeModules, 'junction')`) so `vitest` and dependencies are instantly available in all ephemeral environments without network requests or disk bloat.
4. **Safe Run Resumption & Immutability:**
 Tag every run with an immutable `runId` and allow clean resumption from the last recorded order index.

---

## 5. Decision & Next Steps

1. The historical 2026-08-27 run data is **preserved intact as `exp005-manifest-pilot-20260827.json`** to ensure zero destruction of evidence.
2. The harness and checkpointing fixes will be implemented and validated with unit tests.
3. A lightweight runtime validation suite will verify process execution, dependency linkage, and telemetry capture before any full experimental rerun.
