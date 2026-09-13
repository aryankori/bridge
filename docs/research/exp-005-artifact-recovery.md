# EXP-005 Final Artifact Recovery & Completion Check

**Generated:** 2026-08-27 
**Audit Purpose:** Read-only verification of EXP-005 live agent behavior experiment execution state and artifact integrity following operational resumption.

---

## Executive Status

- **FINAL STATUS:** `PARTIAL` (Live Execution Active & In-Progress)
- **TRIALS:** 41 / 60 attempted (20 succeeded with exit code 0 recorded in progressive manifest, 21 timeouts recorded, 19 pending)
- **MANIFEST:** `present` (`research/experiments/exp-005/exp005-manifest.json`)
- **ARTIFACT INTEGRITY:** `PASS`
- **MISSING DATA:** None lost; progressive checkpointing actively records each completed trial to disk.
- **SAFE NEXT ACTION:** Allow the active runner (`task-3634`) to finish trials 42-60 without interruption, then compile `docs/research/exp-005-pilot-report.md`.

---

## 15-Point Inspection Audit

| # | Inspection Item | Verification Result | Details |
|---|---|---|---|
| 1 | **Runner Process Active** | **YES** | Process `pnpm tsx research/experiments/exp-005/run-pilot.ts --replications 2 --seed 42` is actively running under background task `task-3634`. |
| 2 | **60-Trial Run Finished** | **NO** | Currently executing Trial 42/60 (`exp005-scn-001` [Condition A, Rep 1]). |
| 3 | **Manifest File Exists** | **YES** | `exp005-manifest.json` exists on disk. |
| 4 | **Manifest Location** | **VERIFIED** | `C:\Users\aryan\Documents\AI and ML\bridge\research\experiments\exp-005\exp005-manifest.json` |
| 5 | **Worktree Artifact Dirs** | **22 directories** | Located under `research/experiments/exp-005/worktrees/`. |
| 6 | **Completed Trials Count** | **41 attempted** | 20 completed with exit code 0; 21 timed out (>180s). |
| 7 | **Failed/Invalid Trials** | **21 timeouts** | 21 trials hit the 180s execution limit (valid agent performance data); 0 corrupted or invalid records. |
| 8 | **Incomplete Trials** | **19 remaining** | Trials 42 to 60 are in queue and actively being processed in deterministic randomized order. |
| 9 | **Duplicate Trial IDs** | **0 (None)** | Every trial ID is uniquely generated using timestamped scenario-condition-replication triples. |
| 10 | **Missing Combinations** | **0 missing from plan** | Full set of 10 scenarios × 3 conditions × 2 replications = 60 trials pre-planned and sequenced. |
| 11 | **Randomization Seed** | **42 (VERIFIED)** | Mulberry32 PRNG seed 42 used for deterministic trial ordering. |
| 12 | **Resolver & Model Pinned** | **VERIFIED** | Resolver Commit: `fc322c6`<br>Pinned Model: `nvidia/nvidia/nemotron-3-super-120b-a12b` (Provider: `nvidia`). |
| 13 | **Manifest Completeness** | **PARTIAL** | Manifest is continuously updated via progressive checkpointing after each trial; final manifest will seal at trial 60. |
| 14 | **Artifact Loss from Interruption** | **NONE** | All executed trials and worktree patches are preserved. |
| 15 | **Git Working Tree Status** | **CLEAN / SYNCED** | On branch `main`, synced with `origin/main`. Untracked files limited to research documents and manifest. |

---

## Telemetry Summary to Date

```json
{
 "experimentId": "EXP-005",
 "title": "Live AI Agent Behavioral Evaluation Across Conflicting Instruction Sources",
 "model": "nvidia/nvidia/nemotron-3-super-120b-a12b",
 "provider": "nvidia",
 "resolverCommit": "fc322c6",
 "randomizationSeed": 42,
 "replicationsCount": 2,
 "totalPlannedTrials": 60,
 "currentProgress": "Trial 42/60 in progress",
 "progressiveCheckpointing": "Active"
}
```

---

## Safe Next Action

Do not cancel, restart, or modify the running process. Allow the background task to complete trials 42 through 60. Once the manifest is finalized at trial 60, produce the post-pilot research report `docs/research/exp-005-pilot-report.md`.
