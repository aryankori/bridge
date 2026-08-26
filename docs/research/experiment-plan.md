# Bridge — Phase 1A: Controlled Work-Transfer Experiment Plan

**Document Version:** `1.1.0`  
**Experiment ID:** `EXP-001-WORK-TRANSFER`  
**Date:** 2026-08-26  
**Auditor / Engineer:** Experimental Systems Engineer (Antigravity)  
**Standard:** ASD-STE100 Simplified Technical English  

---

## 1. Executive Summary & Core Hypothesis

This document defines the formal experimental protocol to test the foundational hypothesis of Project Bridge:

> **Core Hypothesis:** Work-state produced by one AI agent (Agent A) can be extracted and transferred to another heterogeneous AI agent (Agent B) in a way that measurably improves Agent B's task completion rate, code correctness, execution time, and rework cycles compared to a zero-context baseline or an unstructured conversation transcript.

### 1.1 Non-Assumptions (Hypotheses Under Test)
We explicitly do **not** take any of the following for granted:
1. Conversation history is *not* assumed to be the correct transferable unit.
2. "Context" is *not* assumed to be an adequate abstraction.
3. Structured transfer is *not* assumed to be superior to raw transcripts without empirical proof.
4. More information is *not* assumed to produce better outcomes (risk of reasoning confusion / prompt bloat).
5. ACP is *not* assumed to be the universal Bridge protocol for all future agent interactions.

---

## 2. Target Agent Pair & Compatibility Baseline

### 2.1 Agent Specifications

| Role | Agent | Version / Build | Executable Path | Integration Interface |
| :--- | :--- | :--- | :--- | :--- |
| **Agent A (Analyzer)** | Claude Code | `2.1.233` | `~\.local\bin\claude.exe` | Non-interactive CLI with `--print --output-format stream-json --verbose` |
| **Agent B (Implementer)** | OpenCode `ox alpha` | `1.18.23` | `C:\Users\aryan\scoop\apps\opencode\current\opencode.exe` | ACP v1 (`opencode.exe acp`) over JSON-RPC 2.0 stdio (Fallback: `opencode run --format json`) |

### 2.2 Empirical Compatibility Notes
- OpenCode `1.18.23` supports ACP v1 with JSON-RPC 2.0 stdio transport.
- Session bootstrap on Windows incurs ~1.5s - 2.5s latency due to SQLite database file locks and plugin catalog scans.
- OpenCode streams reasoning tokens under `session/update` (`agent_thought_chunk`) before emitting assistant output (`agent_message_chunk`).

---

## 3. Experimental Conditions Matrix

The experiment evaluates three strictly controlled conditions:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXPERIMENTAL CONDITIONS                           │
├──────────────────────┬─────────────────────────────┬────────────────────────┤
│ Condition A          │ Condition B                 │ Condition C            │
│ Native Baseline      │ Transcript Transfer         │ Structured Transfer    │
├──────────────────────┼─────────────────────────────┼────────────────────────┤
│ Clean Fixture        │ Clean Fixture               │ Clean Fixture          │
│ + Raw Task Prompt    │ + Raw Task Prompt           │ + Raw Task Prompt      │
│ (No prior analysis)  │ + Filtered Claude Transcript│ + Structured Dossier   │
│                      │   (Max 4KB conversation)    │   (Schema v0.1.0-exp)  │
└──────────────────────┴─────────────────────────────┴────────────────────────┘
```

### 3.1 Condition A: Native Baseline
- **Description:** Agent B receives the raw task prompt and a clean checkout of the repository.
- **Input:** Task prompt: *"Resolve all defects in `src/scheduler.ts` so that all 10 tests in `tests/scheduler.test.ts` pass."*
- **Prior Information:** None (0 bytes from Agent A).

### 3.2 Condition B: Transcript Transfer
- **Description:** Agent A performs an exploratory analysis of the repository. Agent A's useful conversational transcript is filtered and provided as context to Agent B.
- **Exact Transcript Specification:**
  - **Generator:** Automated harness extractor capturing Agent A's stdout stream.
  - **Inclusions:** Agent A's final response text, analytical observations, code snippet excerpts, and high-level reasoning.
  - **Exclusions:** API retry envelopes, JSON-RPC transport frames, internal token usage statistics, and conversational niceties ("Sure, I can help with that...").
  - **Tool Outputs:** High-level summary of tool outcomes (e.g. test failure counts) included; raw 500-line stack traces truncated.
  - **File Contents:** Only referenced code snippets included; whole files excluded.
  - **Size Ceiling:** Hard cap of **4,096 tokens (~16 KB UTF-8)** to prevent context window saturation.
  - **Format:** Chronological Markdown transcript block prefixed with `[TRANSCRIPT FROM PRIOR ANALYSIS SESSION]`.

### 3.3 Condition C: Structured Work Transfer
- **Description:** Agent A performs the exploratory analysis. The harness compiles the findings into a strictly validated `ExperimentalWorkTransfer` object (see [`docs/research/experiment-schema.md`](file:///C:/Users/aryan/Documents/AI%20and%20ML/bridge/docs/research/experiment-schema.md)).
- **Exact Schema Specification:**
  - **Objective:** Explicit global target description.
  - **Diagnostics:** Typed defect findings (`DIAG-001`, `DIAG-002`, `DIAG-003`) with root-cause analysis and exact file/line ranges.
  - **Tasks:** Atomic work items with acceptance criteria.
  - **Constraints:** Immutability rules (e.g. "Do not alter method signatures").
  - **Provenance & Confidence:** Evidence level (`test_execution` vs `llm_deduction`) and confidence score (0.0 - 1.0).
  - **Size Ceiling:** Under **2,048 tokens (~8 KB UTF-8)** of structured, reference-anchored data.

---

## 4. Task Design & Selection Rationale

### 4.1 Target Task: Priority Token-Bucket Task Scheduler
- **Location:** `research/experiments/exp-001/fixture/`
- **Component Under Test:** `src/scheduler.ts` (Asynchronous task scheduler)
- **Defects Injected:**
  1. *Unclamped Burst Refill:* `refillTokens()` adds tokens without clamping to `capacity`, allowing illegal burst rates.
  2. *Active Worker Counter Underflow:* Abort handler and completion handler both decrement `activeCount`, leading to negative worker counts.
  3. *Queue Starvation on Token Exhaustion:* `pump()` exits silently when tokens are depleted without arming a delayed wake-up timer.

### 4.2 Why This Task Is Ideal for Knowledge Transfer Testing
1. **Non-Trivial Algorithmic Coupling:** The defects cannot be resolved by simple syntax inspection. They require understanding timer lifecycles, event loops, and asynchronous state synchronization.
2. **Analysis Payoff:** A receiving agent that knows *why* the queue starves (Defect 3) saves extensive trial-and-error debugging cycles.
3. **Objective Automated Verification:** 10 deterministic Vitest unit tests in `tests/scheduler.test.ts` test concurrency limits, abort signals, FIFO order, and rate limiting with zero ambiguity.
4. **Bounded Scope:** The codebase is small (~120 LOC), ensuring the experiment measures reasoning efficiency and transfer fidelity rather than disk I/O throughput.

---

## 5. Experimental Isolation & Worktree Protocol

To eliminate cross-condition contamination:
1. **Isolated Worktree Paths:**
   - Condition A: `research/experiments/exp-001/worktrees/condition-a/`
   - Condition B: `research/experiments/exp-001/worktrees/condition-b/`
   - Condition C: `research/experiments/exp-001/worktrees/condition-c/`
2. **Fresh Directory Reset:** The harness completely wipes and re-copies the clean fixture directory before each run.
3. **Clean Process Sessions:** Every run invokes a fresh Agent B process instance without reusing previous session IDs or local SQLite caches (`--pure` execution mode where applicable).
4. **Hermetic Test Runner:** Vitest executes within the isolated worktree directory using local configuration (`vitest.config.ts`).

---

## 6. Measurement Metrics & Instrumentation

The harness collects 10 deterministic metrics per condition run:

| Metric | Measurement Unit | Acquisition Method | Pass / Success Criterion |
| :--- | :--- | :--- | :--- |
| **1. Task Completion** | Boolean (`true`/`false`) | Final test suite exit code | `true` (Exit code 0) |
| **2. Correctness Score** | Percentage (0 - 100%) | Passed tests / Total tests (10) | `100.0%` (10/10 tests) |
| **3. Tests Passed** | Integer (0 - 10) | Vitest reporter JSON output | `10` |
| **4. Wall-Clock Time** | Seconds (0.01s precision) | High-resolution timer (`performance.now()`) | Minimum elapsed seconds |
| **5. Rework Cycles** | Count (0, 1, 2, ...) | Number of test-fix iteration loops | `0` (First-pass pass) |
| **6. Human Interventions** | Count | Harness interruption / manual fix events | `0` (Fully autonomous) |
| **7. Tool Invocations** | Count | ACP notifications / process tool calls | Recorded for efficiency |
| **8. Injected Context Size** | Bytes & Token estimate | Byte length of transferred payload | Lower payload with higher accuracy |
| **9. Files Modified** | List of file paths | `git status --porcelain` in worktree | Only `src/scheduler.ts` |
| **10. Patch Precision** | Added / Deleted LOC | `git diff --stat` | Minimal clean diff |

---

## 7. Replication & Statistical Confidence Strategy

- **Phase 1 (Pilot / Harness Validation):** Single trial run ($n=1$ per condition) to verify process spawning, IPC pipe communication, timeout handling, and test reporting.
- **Phase 2 (Replicated Battery):** $n=3$ randomized trials per condition (9 runs total) to compute:
  - Mean duration $\mu$ and standard deviation $\sigma$.
  - Success consistency rate across stochastic LLM outputs.
- **Randomization Order:** Trial execution order is shuffled (`[B1, A1, C1, C2, A2, B2, A3, C3, B3]`) to prevent systemic host throttling or thermal bias.

---

## 8. Security & Untrusted Data Boundary

Transferred work state is treated as **untrusted user input**:
1. **Prompt Injection Defense:** Transferred text from Agent A cannot contain command injection delimiters (e.g. `system:`, `override:`) that alter Agent B's baseline tool permissions.
2. **Schema Sanitization:** `ExperimentalWorkTransfer` parser rejects arbitrary executable code or invalid field schemas.
3. **Secret Scrubbing:** Harness regex-filters API keys (`nvapi-*`, `sk-ant-*`, `ghp_*`) from all transcripts and dossiers before injection.
4. **Filesystem Confinement:** Agent B's tool execution is strictly confined to its assigned worktree directory.
