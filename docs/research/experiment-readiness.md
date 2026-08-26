# Bridge — Phase 1A: Experiment Readiness Assessment

**Document ID:** `EXP-001-READINESS`  
**Date:** 2026-08-26  
**Auditor / Engineer:** Experimental Systems Engineer (Antigravity)  
**Standard:** ASD-STE100 Simplified Technical English  

---

## 1. Readiness Summary

This document provides a transparent readiness evaluation for executing the `EXP-001-WORK-TRANSFER` experiment using the locally installed agent pair: **Claude Code** (Agent A) and **OpenCode `ox alpha`** (Agent B).

---

## 2. Five Critical Readiness Inquiries

### Question 1: Is Claude → OpenCode `ox alpha` reliable enough for this experiment?

**Verdict: YES, WITH SPECIFIED TIMING BUFFERS.**

- **OpenCode `ox alpha` (v1.18.23):** Confirmed fully operational over ACP v1 (`opencode.exe acp`) with JSON-RPC 2.0 stdio transport. Tested initialization, session creation, streaming thought/message notifications, and prompt completion with the configured NVIDIA provider.
- **Claude Code (v2.1.233):** Confirmed operational via CLI non-interactive mode (`claude -p --output-format stream-json --verbose`). Note: Periodic Anthropic API rate limits or auth delays can trigger internal retries; the harness must provide a minimum 60-second timeout for Agent A analysis.
- **IPC Stability:** Both agents run locally as child processes on Windows 11 with distinct working directories and stdio pipe isolation.

---

### Question 2: What exact interfaces are being used?

| Agent Role | Executable / Path | Invocation Command | Transport / Protocol | Payload Format |
| :--- | :--- | :--- | :--- | :--- |
| **Agent A (Analyzer)** | `claude.exe` (`~\.local\bin\`) | `claude -p --output-format stream-json --verbose` | `stdio` (NDJSON stream) | Single-turn analysis prompt with code references |
| **Agent B (Implementer)** | `opencode.exe` (`C:\Users\aryan\scoop\apps\opencode\current\`) | `opencode acp --print-logs --log-level INFO` | `stdio` (JSON-RPC 2.0) | ACP v1 `session/prompt` with condition-specific dossier |
| **Fallback for Agent B** | `opencode.exe` | `opencode run "<prompt>" --format json --dir <worktree> --auto` | `stdio` (NDJSON CLI) | Direct CLI prompt execution |

---

### Question 3: What assumptions remain?

1. **Model Parameter Determinism:** While temperature is kept at default levels, underlying LLM providers (Anthropic API for Claude, NVIDIA API for OpenCode) retain inherent stochasticity. This is mitigated by our $n=3$ replicated trial design.
2. **ACP Tool Permissions:** Assumes OpenCode running in `mode: build` has auto-approved filesystem edit tools within its designated worktree directory.
3. **Network Availability:** Assumes uninterrupted connectivity to Anthropic and NVIDIA cloud endpoints during the benchmark run.

---

### Question 4: What could invalidate the experiment?

| Threat / Invalidation Risk | Impact | Prevention / Mitigation Mechanism |
| :--- | :--- | :--- |
| **Cross-Condition Contamination** | High | Using dedicated, freshly wiped subdirectories for each condition (`worktrees/condition-{a,b,c}`). |
| **Claude API Outage / Throttling** | High | Capture and cache the initial Agent A analysis output so all Condition B and Condition C trials receive an identical base analysis artifact. |
| **Silent ACP Handshake Hang** | Medium | Strict 15-second timeout on `session/new` with automatic process recycling. |
| **Trivial Fixture Complexity** | Medium | Injected 3 non-trivial defects involving asynchronous timer loops, race conditions, and queue starvation. |
| **Host Resource Starvation** | Medium | Development machine is at 97% disk load and 90% RAM load; harness must run trials sequentially rather than in parallel. |

---

### Question 5: What must Hermes review before execution?

Before authorizing execution of `EXP-001`, the independent Hermes reviewer must evaluate:

1. **Experimental Rigor & Objectivity:** Does the condition matrix (A: Baseline, B: Transcript, C: Structured) fairly test the core hypothesis without bias?
2. **Schema Parsimony:** Does `ExperimentalWorkTransfer` (v0.1.0-exp) include only essential fields without unneeded complexity?
3. **Metric Objectivity:** Are the 10 measurement criteria (tests passed, wall-clock time, diff lines, rework cycles) sufficiently automated and non-subjective?
4. **Safety & Confinement:** Is the isolation protocol sufficient to prevent accidental file writes outside `research/experiments/exp-001/worktrees/`?
5. **Replication Protocol:** Is the $n=1$ harness pilot followed by $n=3$ randomized trials appropriate to establish statistical confidence?

---

## 3. Current State: STOP CONDITION ACTIVE

- **Harness Scaffolding:** Configured in `research/experiments/exp-001/harness.ts`.
- **Target Fixture:** Verified in `research/experiments/exp-001/fixture/`.
- **Status:** **EXECUTION HALTED.** Awaiting independent Hermes peer review.
