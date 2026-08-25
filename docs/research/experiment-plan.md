# Bridge — Phase 1: Work-Transfer Controlled Experiment Plan

**Experiment ID:** `EXP-001-WORK-TRANSFER`  
**Date:** 2026-08-25  
**Auditor / Engineer:** Experimental Systems Engineer (Antigravity)  
**Standard:** ASD-STE100 Simplified Technical English  

---

## 1. Objective & Hypothesis

### 1.1 Core Hypothesis
A neutral orchestration layer can extract structured work-state from Agent A and transfer that state to a heterogeneous Agent B in a way that materially improves Agent B's task completion rate, correctness, and execution time compared to a native baseline (no context) or an unstructured transcript.

### 1.2 Research Questions
1. Does Agent B complete tasks faster and with fewer errors when it receives prior work from Agent A?
2. Does structured work transfer outperform a raw conversation transcript?
3. Which elements of Agent A's output are signal, and which elements are noise?
4. Does transferring uncompressed transcripts cause prompt bloat or reasoning confusion?
5. Is the primary value in task decomposition, diagnostic findings, or exact artifact locations?

---

## 2. Experimental Design

### 2.1 Conditions Matrix

| Condition | Description | Input to Agent B |
| :--- | :--- | :--- |
| **Condition A (Native Baseline)** | Agent B works independently from scratch. | Raw task description + clean repository fixture. |
| **Condition B (Transcript Transfer)** | Agent A analyzes the repository; the full raw transcript is forwarded. | Raw transcript from Agent A + task description + repository fixture. |
| **Condition C (Structured Work Transfer)** | Agent A analyzes the repository; Bridge extracts structured `ExperimentalWorkTransfer`. | Normalized `ExperimentalWorkTransfer` package + task description + repository fixture. |

### 2.2 Controlled Variables
- **Task:** Exact identical task requirements across all conditions.
- **Initial Repository State:** Clean git checkout of the fixture project for each run.
- **Verification Harness:** Identical Vitest test suite with 10 strict unit and integration assertions.
- **Evaluation Environment:** Isolated working directory per condition (`research/experiments/exp-001/worktrees/condition-{a,b,c}`).

---

## 3. Selected Task: Priority Token-Bucket Task Scheduler

### 3.1 Problem Description
The target fixture (`src/scheduler.ts`) contains an asynchronous priority task scheduler with concurrency control, burst rate limiting, and cancellation tokens.

The fixture contains three subtle defects:
1. **Race Condition in Concurrency Counter:** Active worker count drops below zero on task cancellation.
2. **Burst Overflow in Token Bucket:** Token bucket allows bursts exceeding capacity when refills occur during idle bursts.
3. **Queue Inversion on Priority Tie:** FIFO order is violated for tasks with equal priority.

### 3.2 Verification Criteria
10 automated unit tests in `tests/scheduler.test.ts`. Success requires 100% test pass rate with 0 lint regressions.

---

## 4. Measurement & Instrumentation

For each condition, the harness measures:
1. **Wall-Clock Duration (s):** Elapsed time from prompt injection to patch generation.
2. **Context Payload Size (bytes / tokens):** Total size of prompt injected into Agent B.
3. **Test Suite Result:** Passed / Failed count out of 10 tests.
4. **Patch Quality (LOC added / deleted / files touched):** Precision of modifications.
5. **Rework Cycles:** Number of corrective attempts needed to reach 10/10 tests.
6. **Task Correctness Score (%):** Overall automated verification.
