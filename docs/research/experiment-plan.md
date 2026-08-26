# Bridge — Phase 1A: Controlled Work-Transfer Experiment Plan (Revised)

**Document Version:** `2.0.0-corrected`  
**Experiment ID:** `EXP-001-WORK-TRANSFER`  
**Date:** 2026-08-26  
**Auditor / Engineer:** Experimental Systems Engineer (Antigravity)  
**Standard:** ASD-STE100 Simplified Technical English  

---

## 1. Executive Summary & Core Hypothesis

This document defines the corrected experimental protocol for testing the core hypothesis of Project Bridge:

> **Core Hypothesis:** Work-state produced by one AI agent (Agent A) can be transferred to a heterogeneous AI agent (Agent B) in a way that measurably improves Agent B's task completion rate, code correctness, execution time, and rework cycles compared to a zero-context baseline or an unedited conversation transcript.

### 1.1 Non-Assumptions (Hypotheses Under Test)
We explicitly do **not** take any of the following for granted:
1. Conversation history is *not* assumed to be the correct transferable unit.
2. "Context" is *not* assumed to be an adequate abstraction.
3. Structured transfer is *not* assumed to be superior to raw transcripts without empirical proof.
4. More information is *not* assumed to produce better outcomes (risk of reasoning confusion / prompt bloat).
5. ACP is *not* assumed to be the universal Bridge protocol for all future agent interactions.

---

## 2. Experimental Conditions Matrix

The experiment evaluates three strictly isolated conditions:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXPERIMENTAL CONDITIONS                           │
├──────────────────────┬─────────────────────────────┬────────────────────────┤
│ Condition A          │ Condition B                 │ Condition C            │
│ Native Baseline      │ Transcript Transfer         │ Structured Transfer    │
├──────────────────────┼─────────────────────────────┼────────────────────────┤
│ Clean Fixture        │ Clean Fixture               │ Clean Fixture          │
│ + Raw Task Prompt    │ + Raw Task Prompt           │ + Raw Task Prompt      │
│ (No prior analysis)  │ + Unedited Claude Transcript│ + Simplified Dossier   │
│                      │   (Capped at 8 KB)          │   (Schema v0.2.0)      │
└──────────────────────┴─────────────────────────────┴────────────────────────┘
```

### 2.1 Condition A: Native Baseline
- **Input:** Task prompt: *"Resolve all defects in `src/scheduler.ts` so that all 10 tests in `tests/scheduler.test.ts` pass."*
- **Prior Information:** None (0 bytes from Agent A).

### 2.2 Condition B: Fair Transcript Transfer (Red-Team Corrected)
- **Input:** Task prompt + **actual unedited chronological stdout transcript** produced by Agent A during its initial analysis turn.
- **Specification:**
  - **No Selective Filtering:** The transcript is NOT cleaned of "less useful" conversation or niceties.
  - **Payload Cap:** Maximum delivered payload limit of **8,192 bytes (8 KB)**.
  - **Truncation Protocol:** If original transcript exceeds 8 KB, truncate from the end and append `\n[TRANSCRIPT TRUNCATED AT 8KB LIMIT]`.
  - **Telemetry Captured:** Original transcript size (bytes), delivered size (bytes), truncation flag, and estimated tokens.
  - **Delimiter:** Enclosed inside explicit `<<<UNTRUSTED_AGENT_TRANSCRIPT_START>>>` and `<<<UNTRUSTED_AGENT_TRANSCRIPT_END>>>` boundary tags.

### 2.3 Condition C: Simplified Structured Work Transfer (Red-Team Corrected)
- **Input:** Task prompt + **minimal structured dossier** formatted according to `ExperimentalWorkTransfer` v0.2.0-simplified (see [`docs/research/experiment-schema.md`](file:///C:/Users/aryan/Documents/AI%20and%20ML/bridge/docs/research/experiment-schema.md)).
- **Specification:**
  - **Fields Included:** `objective`, `diagnostics` (`id`, `title`, `rootCause`, `locations`), `constraints`, `verificationCommands`.
  - **Fields Removed:** Epistemic classification trees, generalized task graphs, nested provenance hierarchies.
  - **Delimiter:** Enclosed inside explicit `<<<UNTRUSTED_BRIDGE_WORK_TRANSFER_START>>>` and `<<<UNTRUSTED_BRIDGE_WORK_TRANSFER_END>>>` boundary tags.

---

## 3. Information Measurement Model

Per Red-Team Correction 3, the experiment does **not** assume or force informational equivalence between Condition B and Condition C. Instead, the harness measures and reports:
1. **Raw Payload Bytes:** Exact size of injected text.
2. **Estimated Tokens:** Token count (tiktoken / character heuristic $\approx \text{bytes}/4$).
3. **Files Referenced:** Explicit list of source files mentioned in payload.
4. **Diagnostics Conveyed:** Count of distinct defects explained in payload.
5. **Constraints Conveyed:** Count of explicit rules/invariants listed in payload.
6. **Verification Information Conveyed:** Presence of exact test execution syntax.

This measurement allows distinguishing **MORE INFORMATION** from **BETTER STRUCTURED REPRESENTATION**.

---

## 4. Evaluation Framework

### 4.1 Primary Metrics (Outcome & Correctness)
- **1. Task Completion:** Boolean (`true` if all 10 unit tests pass on first pass; `false` otherwise).
- **2. Tests Passed:** Count (0 to 10) from Vitest test runner.
- **3. Correctness Score:** $\frac{\text{Tests Passed}}{\text{Total Tests (10)}} \times 100\%$.

### 4.2 Secondary Metrics (Efficiency, Cost & Understanding)
- **4. Wall-Clock Duration:** Elapsed execution time in seconds (0.01s precision).
- **5. Rework Required:** Number of additional iterative cycles required to achieve 10/10 tests.
- **6. Human Interventions:** Number of manual adjustments required (`0` target).
- **7. Tool Invocations:** Count of file reads, file writes, and bash executions by Agent B.
- **8. Token Consumption & Cost:**
  - Agent A Input/Output tokens and cost (or `UNKNOWN` if unexposed).
  - Agent B Input/Output tokens and cost (or `UNKNOWN` if unexposed).
- **9. Files Changed & Diff Size:** Lines added/deleted via `git diff --stat`.
- **10. Post-Task Transfer Fidelity (Understanding Check):**
  After task execution, Agent B is queried in a separate turn to answer:
  1. *What bugs existed in the original code?*
  2. *Why did those bugs occur (root causes)?*
  3. *What changes were made to fix them?*
  4. *How were the changes verified?*
  The response is recorded and scored for conceptual fidelity without modifying the repository.

---

## 5. Security & Isolation Controls

1. **Path Validation:** Receiving agent workspace is strictly locked to its designated worktree directory (`research/experiments/exp-001/worktrees/condition-{a,b,c}`).
2. **Secret Scrubbing:** Regular expressions scrub all known API key formats (`nvapi-*`, `sk-ant-*`, `ghp_*`, `Bearer *`) prior to transfer generation.
3. **Delimited Untrusted Payloads:** All transferred data is wrapped in explicit untrusted data markers.
4. **No Direct Execution:** Transferred commands are informational hints; the harness does not execute transferred strings directly without validation.

---

## 6. Replication Protocol

- **Pilot Validation ($n=1$):** 1 run per condition to validate harness plumbing, logging, and test assertions.
- **Experimental Battery ($n=3$ per condition):** 9 total runs in randomized sequence (`[B1, A1, C1, C2, A2, B2, A3, C3, B3]`) to quantify variance across stochastic model runs.
- **Review Trigger:** If results demonstrate high variance ($>20\%$ coefficient of variation), additional trials will be proposed after reviewing the initial batch.

---

## 7. Analytical Dimensions

The analysis will answer five separate research questions rather than collapsing into a single subjective score:
1. **Does additional information improve performance?** (Condition B vs Condition A)
2. **Does structured representation improve performance?** (Condition C vs Condition B)
3. **Does structure justify its overhead?** (Token efficiency vs test pass rate)
4. **Does the receiving agent actually understand the work?** (Post-task fidelity check)
5. **Is the effect statistically consistent?** (Standard deviation across $n=3$ trials)

---

## 8. How ExperimentalWorkTransfer Is Generated

In Phase 1D, the experiment harness enforces strict zero-knowledge isolation:

1. **No Answer Key / Hardcoded Dossier:**
   - The harness contains zero pre-written diagnostics, root causes, or line numbers.
   - Condition C receives only what Agent A (Claude Code) discovered and emitted during its live analysis run.

2. **Live Execution & Extraction Flow:**
   - **Step 1:** Claude Code runs non-interactively (`claude -p "<prompt>" --output-format stream-json --verbose --no-session-persistence`) against the clean fixture worktree.
   - **Step 2:** The harness captures Claude's live stdout and streams assistant messages.
   - **Step 3:** The parser searches for a fenced JSON block conforming to `ExperimentalWorkTransfer` (v0.2.0-simplified).
   - **Step 4:** If valid, `validateExtractedTransfer()` validates required fields (`objective`, `diagnostics[].{id, title, rootCause, locations}`, `constraints`, `verificationCommands`).
   - **Step 5 (Fallback):** If Claude output does not contain clean JSON, `parseProgrammaticTransfer()` extracts diagnostics heuristically from Claude's text sections without injecting any experimenter knowledge.
   - **Step 6:** The resulting payload is scrubbed for secrets, bounded by path confinement, wrapped in untrusted data delimiters (`<<<UNTRUSTED_BRIDGE_WORK_TRANSFER_START>>>`), and delivered to OpenCode in Condition C.

