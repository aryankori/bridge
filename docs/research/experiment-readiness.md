# Bridge — Phase 1A: Experiment Readiness Assessment (Post-Red-Team)

**Document ID:** `EXP-001-READINESS`  
**Date:** 2026-08-26  
**Status:** Red-Team Corrections Applied  
**Standard:** ASD-STE100 Simplified Technical English  

---

## 1. Readiness Summary

This document confirms the operational readiness for `EXP-001-WORK-TRANSFER` following the incorporation of all six Hermes independent red-team corrections.

---

## 2. Five Critical Readiness Inquiries

### Question 1: Is Claude → OpenCode `ox alpha` reliable enough for this experiment?

**Verdict: YES, WITH CONFIRMED RED-TEAM SAFEGUARDS.**

- **OpenCode `ox alpha` (v1.18.23):** Verified operational over ACP v1 (`opencode.exe acp`) and CLI headless mode (`opencode.exe run`). Stdio JSON-RPC 2.0 handshake, session instantiation, and token streaming operate with predictable latency (~1.5s - 2.5s bootstrap).
- **Claude Code (v2.1.233):** Operates reliably in non-interactive CLI mode (`claude -p --output-format stream-json --verbose`). To ensure consistency across Condition B and C, the initial Agent A analysis output is captured once per trial cohort and shared between Condition B (unedited transcript format) and Condition C (structured format).
- **Process Isolation:** Independent child processes spawned in isolated worktree subdirectories ensure no host memory or file lock collisions.

---

### Question 2: What exact interfaces are being used?

| Agent Role | Target Executable | Invocation Syntax | Protocol / Transport | Delivered Format |
| :--- | :--- | :--- | :--- | :--- |
| **Agent A (Analyzer)** | `claude.exe` | `claude -p --output-format stream-json --verbose` | `stdio` (NDJSON stream) | Single-turn analysis prompt |
| **Agent B (Condition A)** | `opencode.exe` | `opencode acp` / `opencode run` | `stdio` (ACP v1 / JSON) | Raw prompt + clean fixture |
| **Agent B (Condition B)** | `opencode.exe` | `opencode acp` / `opencode run` | `stdio` (ACP v1 / JSON) | Raw prompt + unedited Claude stdout transcript (max 8 KB) |
| **Agent B (Condition C)** | `opencode.exe` | `opencode acp` / `opencode run` | `stdio` (ACP v1 / JSON) | Raw prompt + `ExperimentalWorkTransfer` v0.2.0 dossier |

---

### Question 3: What assumptions remain?

1. **API Latency & Cloud Endpoint Availability:** Assumes external provider endpoints (Anthropic and NVIDIA APIs) remain responsive during trial execution.
2. **Provider Token Usage Telemetry:** Assumes token counts and costs will be recorded as `UNKNOWN` if not reported in the event stream by the provider.
3. **Model Non-Determinism:** Acknowledges default stochasticity in LLM completion; mitigated through an $n=3$ randomized replication battery.

---

### Question 4: What could invalidate the experiment?

| Invalidation Threat | Severity | Implemented Mitigation |
| :--- | :--- | :--- |
| **Cross-Condition Leakage** | High | Complete wipe and recreation of worktrees (`worktrees/condition-{a,b,c}`) prior to every run. |
| **Biased Transcript Truncation** | High | Unedited chronological stdout transcript used for Condition B with strict 8 KB cap and explicit truncation logging. |
| **Information Asymmetry Misattribution** | High | Explicit logging of payload bytes, token counts, diagnostics count, and constraints to isolate structure from volume. |
| **Secret Exfiltration** | Critical | Regular-expression secret scrubber in harness filters all credentials before payload delivery. |

---

### Question 5: What must Hermes review before execution?

Hermes has reviewed the design and authorized progression subject to the 6 corrections documented in [`docs/research/experiment-red-team-resolution.md`](file:///C:/Users/aryan/Documents/AI%20and%20ML/bridge/docs/research/experiment-red-team-resolution.md).

---

## 3. Current State: READY FOR CONTROLLED EXECUTION

- **Harness Scaffolding:** Configured with security scrubbing, unedited transcript handling, simplified schema rendering, cost logging, and post-task fidelity checks in `research/experiments/exp-001/harness.ts`.
- **Target Fixture:** Verified in `research/experiments/exp-001/fixture/`.
- **Status:** **STOP CONDITION ACTIVE.** Awaiting explicit execution signal.
