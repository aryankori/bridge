# Bridge - Phase 1E: Experiment Readiness Assessment (Post-Red-Team & Integrity Restoration)

**Document ID:** `EXP-001-READINESS`  
**Date:** 2026-08-26  
**Status:** Phase 1E Experimental Integrity Restoration Applied  
**Standard:** ASD-STE100 Simplified Technical English  

---

## 1. Readiness Summary

This document confirms the operational readiness and architectural integrity for `EXP-001-WORK-TRANSFER`. All historical synthetic stubs have been eliminated, deterministic executable discovery is in place, hard stage gates prevent downstream execution on upstream failure, and failure-propagation unit tests are verified.

---

## 2. Deterministic Executable Discovery

Agent executables are resolved dynamically at runtime using a deterministic resolver (`resolveExecutable()`) that checks candidate directory paths, platform shims, and system PATH before execution.

| Agent Role | Target Name | Resolved Executable Path | Resolution Source | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **Agent A (Analyzer)** | `claude` | `C:\Users\aryan\.local\bin\claude.exe` | Configured candidate | Verified on disk (`fs.existsSync`) |
| **Agent B (Executor)** | `opencode` | `C:\Users\aryan\scoop\shims\opencode.exe` | Configured candidate | Verified on disk (`fs.existsSync`) |

---

## 3. Invocation Surface & Protocol Invariants

| Agent Role | Executable | Invocation Syntax | Protocol / Transport | Delivered Format |
| :--- | :--- | :--- | :--- | :--- |
| **Agent A (Analyzer)** | `claude.exe` | `claude.exe -p <prompt> --output-format stream-json --verbose --no-session-persistence` | `stdio` (NDJSON stream, `shell: false`, `stdin: ignore`) | Exploratory analysis prompt on `src/scheduler.ts` |
| **Agent B (Condition A)** | `opencode.exe` | `opencode.exe run <prompt> --auto --pure --format json --dir <worktree>` | `stdio` (NDJSON events, `shell: false`, `stdin: ignore`) | Raw task prompt + clean fixture |
| **Agent B (Condition B)** | `opencode.exe` | `opencode.exe run <prompt> --auto --pure --format json --dir <worktree>` | `stdio` (NDJSON events, `shell: false`, `stdin: ignore`) | Raw task prompt + unedited Claude stdout transcript (max 8 KB) |
| **Agent B (Condition C)** | `opencode.exe` | `opencode.exe run <prompt> --auto --pure --format json --dir <worktree>` | `stdio` (NDJSON events, `shell: false`, `stdin: ignore`) | Raw task prompt + `ExperimentalWorkTransfer` v0.2.0 dossier |

### Experimental Control Symmetry
- All three conditions (A, B, C) execute with the exact same OpenCode flags: `--pure` (strips external workspace skills), `--auto` (enables non-interactive execution inside the worktree), `--format json` (captures telemetry and token counts), and `--dir <worktree>`.
- `--pure` and `--auto` are essential experimental controls because they prevent ambient IDE state from polluting the trial and ensure identical tool privileges across conditions.

---

## 4. Hard Stage Gates & Failure Semantics

To prevent invalid experimental runs from generating plausible-looking artifacts:

```
Agent A Execution (runClaudeAnalysis)
    │
    ├── FAIL (Missing binary, timeout, exit != 0, empty stdout)
    │     └── ⛔ HALT EXPERIMENT → Mark Manifest & Trials as INVALID → No downstream runs
    │
    └── SUCCESS (Verified non-empty stdout)
          │
          ├── Condition B: Wrap genuine stdout (capped at 8 KB)
          │     └── If transcript empty → ⛔ FAIL: AGENT_A_NO_TRANSCRIPT
          │
          └── Condition C: Extract ExperimentalWorkTransfer
                └── If extraction fails → ⛔ FAIL: AGENT_A_TRANSFER_EXTRACTION_FAILURE
```

### Failure Classifications
- `EXECUTABLE_NOT_FOUND`: Target binary could not be resolved or launched.
- `PROCESS_EXIT_NONZERO`: Child process exited with non-zero status code.
- `TIMEOUT`: Child process exceeded stage timeout.
- `EMPTY_OUTPUT`: Child process produced no stdout or NDJSON events.
- `PARSE_FAILURE`: Stream parsing failed on output format.
- `AGENT_A_NO_TRANSCRIPT`: Condition B cannot construct payload from empty Agent A transcript.
- `AGENT_A_TRANSFER_EXTRACTION_FAILURE`: Condition C could not extract structured transfer from Agent A output.

### Distinction Between Trial Validity and Outcome
- `status: 'VALID'`: Prerequisite execution succeeded; Agent B attempted task and outcome was measured (`success: true` or `false`).
- `status: 'INVALID'`: Prerequisite failure occurred; trial is aborted and excluded from performance averages.

---

## 5. Elimination of Stubs & Synthetic Metrics

1. **Purged Historical Stubs:** The simulated `research/experiments/exp-001/results.json` and previous failed pilot artifacts have been completely removed.
2. **Zero Simulation Invariant:** The harness does not manufacture timing offsets, rework cycles, or synthetic test pass rates. Every metric in `TrialRecord` is either directly measured from the OS / test runner or recorded as `UNKNOWN`.

---

## 6. Live Smoke Test Results

Tracked smoke test script: [`research/experiments/exp-001/smoke-tests.ts`](file:///C:/Users/aryan/Documents/AI%20and%20ML/bridge/research/experiments/exp-001/smoke-tests.ts)

| Target | Command | Test Directory | Result | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **OpenCode `ox alpha`** | `opencode.exe run "Respond with OK." --auto --pure --format json --dir "<temp>"` | `tmp/smoke test workspace` (path with spaces) | ✅ **PASS** (Exit 0, 20.53s) | Created session `ses_fc1b1c31cffe3J7AdQWIvcZ6Og`, emitted NDJSON events, terminated cleanly. |
| **Claude Code** | `claude.exe -p "Respond with OK." --output-format stream-json --verbose --no-session-persistence` | Current working directory (path with spaces) | ⚠️ **LIVE BACKEND DEPENDENT** | Binary resolved and spawned; hooked `SessionStart:start`; connects to configured endpoint (`http://localhost:8080`). Fails cleanly with timeout if backend is offline. |

---

## 7. Current State

- **Typecheck:** `pnpm run typecheck` (`tsc --noEmit`) → ✅ PASSED (0 errors)
- **Linting:** `pnpm run lint` (`eslint src/ tests/`) → ✅ PASSED (0 errors, 0 warnings)
- **Unit Tests:** `pnpm run test` (`vitest run`) → ✅ PASSED (64/64 tests passing)
- **Harness Validation:** `pnpm run experiment:validate` → ✅ PASSED (5/5 checks passing)
- **Pilot Execution:** **NOT EXECUTED.** Strictly awaiting Hermes gate recheck.
