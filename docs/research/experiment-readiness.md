# Bridge — Phase 1A & 1D: Experiment Readiness Assessment (Post-Red-Team)

**Document ID:** `EXP-001-READINESS`  
**Date:** 2026-08-26  
**Status:** Red-Team & Empirical Integration Corrections Applied  
**Standard:** ASD-STE100 Simplified Technical English  

---

## 1. Readiness Summary

This document confirms the operational readiness for `EXP-001-WORK-TRANSFER` following the incorporation of all six Hermes independent red-team corrections and the Phase 1D empirical integration corrections.

---

## 2. Five Critical Readiness Inquiries

### Question 1: Is Claude → OpenCode `ox alpha` reliable enough for this experiment?

**Verdict: YES, WITH CONFIRMED RED-TEAM & EMPIRICAL INTEGRATION SAFEGUARDS.**

- **OpenCode `ox alpha` (v1.18.23):** Verified operational over native executable invocation (`opencode.exe run --auto --pure --format json --dir <worktree>`). Runs with direct process spawn (`shell: false`), bypassing shell command-line string mangling and eliminating workspace plugin noise.
- **Claude Code (v2.1.233):** Operates reliably in non-interactive CLI mode (`claude.exe -p --output-format stream-json --verbose --no-session-persistence`) with `stdio: ['ignore', 'pipe', 'pipe']`. Agent A analysis output is captured live from the fixture codebase without answer keys.
- **Process Isolation:** Independent child processes spawned in isolated worktree subdirectories ensure no host memory or file lock collisions.

---

### Question 2: What exact interfaces are being used?

| Agent Role | Target Executable | Invocation Syntax | Protocol / Transport | Delivered Format |
| :--- | :--- | :--- | :--- | :--- |
| **Agent A (Analyzer)** | `claude.exe` | `claude.exe -p <prompt> --output-format stream-json --verbose --no-session-persistence` | `stdio` (NDJSON stream, `shell: false`, `stdin: ignore`) | Single-turn exploratory analysis prompt |
| **Agent B (Condition A)** | `opencode.exe` | `opencode.exe run <prompt> --auto --pure --format json --dir <worktree>` | `stdio` (NDJSON events, `shell: false`, `stdin: ignore`) | Raw task prompt + clean fixture |
| **Agent B (Condition B)** | `opencode.exe` | `opencode.exe run <prompt> --auto --pure --format json --dir <worktree>` | `stdio` (NDJSON events, `shell: false`, `stdin: ignore`) | Raw task prompt + unedited Claude stdout transcript (max 8 KB) |
| **Agent B (Condition C)** | `opencode.exe` | `opencode.exe run <prompt> --auto --pure --format json --dir <worktree>` | `stdio` (NDJSON events, `shell: false`, `stdin: ignore`) | Raw task prompt + `ExperimentalWorkTransfer` v0.2.0 dossier |

---

### Question 3: What assumptions remain?

1. **API Latency & Cloud Endpoint Availability:** Assumes external provider endpoints (Anthropic and NVIDIA APIs) remain responsive during trial execution.
2. **Provider Token Usage Telemetry:** Captured directly from NDJSON `step_finish` events and stream-json usage blocks; recorded as `UNKNOWN` if not reported by the upstream model.
3. **Model Non-Determinism:** Acknowledges default stochasticity in LLM completion; mitigated through an $n=3$ randomized replication battery.

---

### Question 4: What could invalidate the experiment?

| Invalidation Threat | Severity | Implemented Mitigation |
| :--- | :--- | :--- |
| **Cross-Condition Leakage** | High | Complete wipe and recreation of worktrees (`worktrees/condition-{a,b,c}`) prior to every run. |
| **Biased Transcript Truncation** | High | Unedited chronological stdout transcript used for Condition B with strict 8 KB cap and explicit truncation logging. |
| **Information Asymmetry Misattribution** | High | Explicit logging of payload bytes, token counts, diagnostics count, and constraints to isolate structure from volume. |
| **Secret Exfiltration** | Critical | Regular-expression secret scrubber in harness filters all credentials before payload delivery. |
| **Asymmetric Agent Environment** | Critical | All three conditions (A, B, C) execute with the exact same OpenCode binary, flags (`--pure`, `--auto`, `--format json`), and subprocess options. |

---

### Question 5: What must Hermes review before execution?

Hermes has reviewed the design and authorized progression subject to the corrections documented in [`docs/research/experiment-red-team-resolution.md`](file:///C:/Users/aryan/Documents/AI%20and%20ML/bridge/docs/research/experiment-red-team-resolution.md) and the empirical integration corrections below.

---

## 3. Empirical Integration Corrections (Phase 1D)

### 3.1 Original Failure
During the initial trial execution of EXP-001, the pilot halted due to integration timeouts and immediate subprocess termination.

### 3.2 Root Cause Analysis & Empirical Evidence

1. **Windows Path Whitespace Truncation (`AI and ML`):**
   - *Evidence:* Subprocess tracing captured `OPENCODE ERR: Error: Failed to change directory to C:/Users/aryan/Documents/AI`.
   - *Mechanism:* Spawning processes with `shell: true` on Windows caused `cmd.exe` to interpret `--dir C:/Users/aryan/Documents/AI and ML/...` as separate unquoted tokens, splitting the path at the whitespace after `AI`.
2. **Claude Interactive Stdio Blocking:**
   - *Evidence:* Claude CLI logged `Warning: no stdin data received in 3s, proceeding without it` and required `--verbose` when paired with `--output-format stream-json`.
   - *Mechanism:* Default inherited/piped stdin caused Claude to block waiting for interactive TTY data before timing out.
3. **OpenCode Workspace Context Bloat & Permission Deadlocks:**
   - *Evidence:* ACP handshake streamed 140+ workspace skills into context (`available_commands_update`), adding latency and blocking on interactive tool permissions.

### 3.3 Implemented Fixes

1. **Direct Process Spawning (`shell: false`):**
   - Replaced all shell-dependent subprocess spawning with direct binary execution (`AGENT_A_COMMAND = 'claude.exe'`, `AGENT_B_COMMAND = 'opencode.exe'`).
   - Arguments are passed as discrete `string[]` arrays without string concatenation or shell escaping.
   - Native `cwd` is assigned directly to the child process configuration.
2. **Non-Interactive Stdio Configuration:**
   - Explicitly configured `stdio: ['ignore', 'pipe', 'pipe']` for both Agent A and Agent B to prevent stdin blocking.
   - Added `--verbose` flag to Claude Code stream-json invocation.
3. **Controlled OpenCode Research Execution Mode:**
   - Configured OpenCode with `--pure` (strips external workspace skills/plugins to ensure clean baseline context).
   - Configured OpenCode with `--auto` (grants autonomous permissions inside the confined worktree).
   - Configured OpenCode with `--format json` (streams NDJSON execution telemetry including token usage).
   - Configured OpenCode with `--dir <worktree>` (anchors execution directly to the isolated worktree).

### 3.4 Experimental Control Symmetry

| Flag | Purpose | Condition A | Condition B | Condition C |
| :--- | :--- | :---: | :---: | :---: |
| `--pure` | Removes external plugins & ambient skills for controlled test environment | ✅ | ✅ | ✅ |
| `--auto` | Enables autonomous file editing and test execution without prompt blocking | ✅ | ✅ | ✅ |
| `--format json` | Streams structured NDJSON telemetry and token accounting | ✅ | ✅ | ✅ |
| `--dir` | Confines execution to the condition worktree | ✅ | ✅ | ✅ |

*Crucial Invariant:* OpenCode execution parameters are 100% symmetric across all three conditions. No condition receives special flags or privileges.

---

## 4. Current State: READY FOR HERMES GATE

- **Validation:** `pnpm experiment:validate` passed 5/5 checks cleanly.
- **Unit Tests:** `pnpm vitest run tests/research/harness.test.ts` passed 18/18 tests cleanly.
- **Subprocess Smoke Tests:** Verified direct spawn of `opencode.exe` and `claude.exe` on paths with spaces without shell intervention.
- **Pilot Status:** The live pilot has **NOT** been executed. Awaiting formal Hermes authorization.
