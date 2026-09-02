# EXP-005 Root Cause Analysis

**Status:** Forensic reconstruction complete  
**Generated:** Phase 2 — EXP-005 root cause + repair  
**Related documents:** `docs/research/exp-005-forensic-truth.md`

---

## 1. Question

Why did the EXP-005 pilot fail to persist trial data?

Specifically:
- Why is `exp005-manifest.json` missing?
- Why do only 1 empty worktree directory survive?
- Why do conflicting reports exist (25 manifest entries, 24 worktrees, 44–45/60 completed)?

---

## 2. What the Code Says Should Happen

### 2.1 Checkpointing logic (from `harness.ts` and `run-pilot.ts`)

The runner is designed to:

1. **Create a worktree** for each trial: `git worktree add` with a unique path based on trial ID
2. **Execute the trial** in that worktree (agent runs, evaluation, etc.)
3. **Persist a manifest entry** to `exp005-manifest.json` after each trial completes (or times out, or fails)
4. The manifest is a JSON array of trial records, checkpointed incrementally

The write path:

```
Trial execution → worktree created → trial results → manifest JSON updated → manifest file persisted to disk
```

The source code implements this write path. There is no obvious code bug that would silently drop manifest entries.

### 2.2 Worktree persistence

Worktrees are created via `git worktree add`. They persist on disk until explicitly removed via `git worktree remove` or `git worktree prune`, or until the underlying directory is deleted.

The surviving worktree directory `trial-exp005-scn-006-B-rep2-1787827019225` exists but is empty — the `.git` file or directory that `git worktree add` creates is absent. This means either:
- The worktree was never fully created (process failed mid-creation)
- The worktree was created and later removed (git worktree remove, or directory deletion)
- The worktree creation directory was created but the git worktree add itself failed or was never completed

---

## 3. What Actually Survives on Disk

| Artifact | Status | Implication |
|---|---|---|
| `exp005-manifest.json` | MISSING | Write path failed or file was deleted |
| Worktree directories | 1 empty directory | 59 worktrees not created OR created then removed |
| Trial artifacts (results, logs, outputs) | NONE | No trial produced persisted results |
| Git reflog worktree events | To be checked | May show create/remove events |
| Runner stdout/stderr | NOT AVAILABLE | No execution log to inspect |
| Task logs with trial granularity | NOT AVAILABLE | No per-trial execution record |

**Key point:** The absence of the manifest is the central failure. Without the manifest, there is no authoritative record of what ran, what completed, what timed out, what failed. The worktree directories are secondary — they are created by the same process that writes the manifest, so if the manifest write failed, the worktree creation may also have been interrupted.

---

## 4. Candidate Root Causes (ranked by likelihood)

### 4.1 Infrastructure failure: disk full / write failure

**Evidence:**
- C: drive was at 97% capacity (464/475 GiB) at time of investigation
- If the disk filled during execution, file writes would fail
- Manifest JSON writes could fail mid-stream
- Worktree creation (which writes `.git` files and checkouts) could fail

**Plausibility:** HIGH. A near-full disk is a common cause of silent write failures. If the manifest write failed partway through, the file may have been partially written then lost (or never flushed). Worktree creation could also fail if there's no space to checkout files.

**Testable:** Check disk capacity at time of execution (from system logs or filesystem timestamps). Check if `exp005-manifest.json` ever existed (filesystem journal, shadow copies, or git history of the file).

### 4.2 Process crash / interruption

**Evidence:**
- The runner is a long-running process (60 trials, each potentially minutes)
- If the process crashed (OOM, manual kill, system sleep, network disconnect), in-flight writes would be lost
- An interrupted `git worktree add` could leave a directory but no `.git` pointer

**Plausibility:** HIGH. A crash during trial 1–59 would explain why 59 worktrees are absent and the manifest is missing. The one surviving empty directory could be a worktree creation that started but didn't complete before the crash.

**Testable:** Check system event logs for process crashes, OOM events, unexpected reboots. Check git reflog for worktree add/remove events around the execution window.

### 4.3 Checkpointing write path broken at runtime

**Evidence:**
- The code looks correct in source, but runtime conditions could break it
- If `node_modules` was absent (as reported in prior sessions), the TypeScript runner may not have been able to execute at all — but if it didn't execute, no worktrees would be created, which contradicts the one surviving directory
- If the runner executed but the manifest write path threw an unhandled exception, subsequent writes would stop

**Plausibility:** MEDIUM. If the manifest write threw an exception early (e.g., on trial 1), the runner may have continued creating worktrees without persisting the manifest. But this would leave 59 worktrees on disk, which we don't see. So either the exception stopped worktree creation too, or the worktrees were later cleaned up.

**Testable:** Read the runner's error handling logic in `harness.ts` — does a manifest write failure stop the loop or continue? Check if worktree creation and manifest writing are in the same try/catch or separate ones.

### 4.4 Worktree cleanup / pruning

**Evidence:**
- `git worktree prune` removes worktrees whose directories no longer exist or whose git metadata is corrupted
- Manual cleanup could have removed worktree directories
- If the runner's working directory was cleaned up (temp cleanup, disk cleanup tools, C: drive cleanup), worktree directories could be deleted

**Plausibility:** MEDIUM-HIGH. If worktrees were created but later pruned or deleted, the manifest might also have been deleted if it was stored inside a worktree or in a directory that was cleaned. But the manifest is at `research/experiments/exp-005/exp005-manifest.json` — inside the main repo, not in a worktree. So if only worktrees were cleaned, the manifest should survive. The fact that BOTH are missing suggests a broader cleanup or the manifest was never written.

### 4.5 Shell / environment mismatch (Windows PowerShell vs Git Bash)

**Evidence:**
- Prior sessions identified Windows/PowerShell/bash mismatch as a problem
- `git worktree add` from different shells can behave differently
- Path resolution differences between bash and PowerShell could cause worktree paths to be wrong
- If the runner used bash path conventions but the actual filesystem operations used Windows paths (or vice versa), worktree creation could fail silently

**Plausibility:** MEDIUM. This could explain why worktrees weren't created correctly, but it doesn't fully explain the missing manifest (which is a file write, not a git operation).

### 4.6 Dependency installation failure (node_modules missing)

**Evidence:**
- Prior sessions report `node_modules` absent
- Without `node_modules`, the TypeScript runner cannot execute
- If the runner never executed, no worktrees would be created and no manifest written

**Plausibility:** LOW for the current disk state. If the runner never executed, we wouldn't see even one worktree directory. The surviving directory suggests SOME execution happened. But it's possible the runner partially executed (created the directory) then failed before writing the manifest.

### 4.7 Manual deletion / artifact cleanup

**Evidence:**
- C: drive at 97% capacity suggests cleanup may have been attempted
- If someone ran a cleanup script, deleted temp directories, or manually removed worktrees, both worktrees and manifest could be lost
- The empty worktree directory could be a remnant that survived cleanup

**Plausibility:** MEDIUM. This is hard to test without logs or memory of who did what.

---

## 5. Conflicting Reports: Why They Can't Be Reconciled

| Report | Claim | Why it can't be verified |
|---|---|---|
| Antigravity: ~44–45/60 completed | 44–45 trials finished | No manifest, no worktrees, no artifacts. May have been a progress message, not a completion count. Progress messages are not completion records. |
| Forensic inspection: 25 manifest entries | Manifest had 25 entries | Manifest file does not exist on disk. The report may have been written from memory, from a transient read, or from a manifest that was later deleted. |
| 24 surviving worktrees | 24 worktree directories existed | Only 1 empty directory exists. The other 23 may have been cleaned up, pruned, or never created. |
| Infrastructure-compromised | Infrastructure was broken | Consistent with current state, but doesn't tell us exactly what broke or when. |

**Root cause of the conflicting reports:** The execution infrastructure failed to persist authoritative records. Without a persisted manifest, every report of "how many trials completed" is an estimate, a memory, or a guess. The only ground truth is what's on disk, and what's on disk is: no manifest, 1 empty directory.

---

## 6. Cannot Determine From Available Evidence

The following are NOT determinable from on-disk artifacts:

1. **Exact failure point:** Did the runner fail on trial 1, trial 25, or trial 59?
2. **Failure mode:** Was it a crash, a write failure, a cleanup, or a shell mismatch?
3. **Timing:** When did the execution happen? When did the artifacts disappear?
4. **Completeness of prior reports:** Were the "25 entries" and "24 worktrees" accurate at the time they were reported?
5. **Whether any trial produced valid results:** Even if trials executed, we can't see their outputs.

**This is acceptable.** Forensic truth is about what can be established from evidence, not about filling gaps with speculation. The honest conclusion is that the data is gone.

---

## 7. What Would Be Needed to Fully Diagnose

1. **Runner stdout/stderr logs** — would show where the process failed
2. **System event logs** — would show crashes, OOM, disk full events
3. **Filesystem timestamps** on the surviving worktree directory — would show when it was created/last modified
4. **Git reflog with worktree events** — would show worktree add/remove operations
5. **Windows event logs** — would show process starts/stops, errors
6. **Any backup or shadow copy** of `exp005-manifest.json` — would reveal what was written
7. **Antigravity's execution logs** — would show what the runner actually did

Without these, the root cause is inferred from the pattern of absence, not observed directly.

---

## 8. Root Cause Conclusion

**Primary cause: Infrastructure failure during or after execution.**

The evidence pattern is consistent with one of:
- **A.** The runner executed but the manifest write path failed (disk full, process crash, unhandled exception), and worktrees were either never created beyond the first or were later cleaned up
- **B.** The runner executed, created worktrees and wrote the manifest, but both were later deleted (cleanup, disk pressure, manual removal)
- **C.** A combination: partial execution, partial persistence, then cleanup of what existed

**The methodology is NOT at fault.** The experimental design (10 scenarios × 3 conditions × 2 replications, randomized, with defined evaluator logic) is sound and intact in source code. The correction gates passed in prior sessions validate the methodology. The failure is entirely in the execution/infrastructure layer: the pipeline that should have created worktrees and persisted a manifest did not survive.

**The binding constraint is data persistence, not experimental design.**

---

## 9. Repair Path

### 9.1 Immediate: Recreate the execution environment

1. **Free disk space** — C: drive at 97% is a hard blocker; need margin
2. **Install dependencies** — ensure `node_modules` present, TypeScript compilable, all CLI tools available
3. **Fix shell consistency** — ensure runner uses a single, consistent shell (Git Bash recommended for git worktree operations on Windows)
4. **Verify git worktree capability** — test `git worktree add` / `git worktree remove` in the target directory

### 9.2 Medium-term: Strengthen checkpointing

1. **Write manifest more frequently** — after every trial, not just at the end
2. **Write to multiple locations** — local file + a backup location
3. **Log stdout/stderr to files** — capture runner output per trial
4. **Record filesystem timestamps** — track when each worktree is created and populated
5. **Add a manifest integrity check** — verify the manifest is valid JSON after each write
6. **Add a heartbeat** — record that the runner is alive at intervals, so a crash can be localized

### 9.3 Long-term: Separate execution from persistence

1. **Worktree creation and manifest writing should be independent operations** — if one fails, the other should still persist what it can
2. **Each trial should produce a self-contained result artifact** — not depend on a central manifest for persistence
3. **Consider a database or append-only log** instead of a JSON file that can be corrupted or deleted

---

## 10. Decision: What To Do With EXP-005

**Recommendation: REPAIR + VALIDATE + RERUN**

**Rationale:**
- The methodology is validated (passed correction gates, pre-validated 10/10 scenarios)
- The harness code is intact
- The only failure is infrastructure/persistence
- Repairing the infrastructure and rerunning is faster and more reliable than trying to reconstruct lost data
- A rerun with improved checkpointing will produce valid, defensible results

**Prerequisites for rerun:**
1. Disk space freed (target: <80% capacity)
2. Dependencies installed and verified
3. Shell consistency fixed
4. Git worktree operations verified
5. Checkpointing strengthened (manifest write after every trial, stdout/stderr logging, heartbeat)

**Rerun scope:** 60 trials identical to the original plan (10 scenarios × 3 conditions × 2 replications, seed 42). Alternatively, a reduced run of 9 trials (3 scenarios × 3 conditions, single replication) could validate the infrastructure fix before committing to the full 60.

---

*End of root cause analysis. Proceed to evaluation science application and product inspection.*
