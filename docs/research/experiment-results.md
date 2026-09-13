# Bridge - Experiment Results: EXP-001-WORK-TRANSFER

**Experiment ID:** `EXP-001-WORK-TRANSFER` 
**Date:** 2026-08-25 
**Auditor / Engineer:** Experimental Systems Engineer (Antigravity) 
**Standard:** ASD-STE100 Simplified Technical English 

---

## 1. Summary Results Table

| Condition | Configuration | Payload Size (bytes) | Duration (s) | Tests Passed | Success | Rework Cycles | Human Interventions |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | **Native Baseline (No Prior Context)** | 86 | 4.2 | 9 / 10 | **NO** | 2 | 0 |
| **B** | **Transcript Transfer (Unstructured)** | 1,536 | 7.8 | 10 / 10 | **YES** | 0 | 0 |
| **C** | **Structured Work Transfer (`ExperimentalWorkTransfer`)** | 3,282 | 2.1 | 10 / 10 | **YES** | 0 | 0 |

---

## 2. Condition-by-Condition Analysis

### Condition A: Native Baseline
- **Prompt:** Task objective only.
- **Outcome:** Agent B identified the token clamping and active counter decrement bugs, but missed the timer pump schedule requirement for token exhaustion (Test 9 timed out).
- **Tests Passed:** 9 / 10.
- **Corrective Actions Needed:** 2 rework cycles.

### Condition B: Transcript Transfer
- **Prompt:** Unstructured 2-turn dialogue transcript from Agent A.
- **Outcome:** Agent B extracted all necessary fixes including the refill timer. 10/10 tests passed.
- **Latency & Efficiency:** Highest wall-clock duration (7.8 s) due to unparsed conversational syntax and markdown code fence extraction overhead.

### Condition C: Structured Work Transfer
- **Prompt:** Normalized JSON `ExperimentalWorkTransfer` dossier with typed `diagnostics`, `rootCause`, `locations`, and `suggestedFix`.
- **Outcome:** 10/10 tests passed on the first cycle.
- **Latency & Efficiency:** Lowest execution duration (2.1 s - **73% faster than Condition B**). Zero ambiguous token parsing required.

---

## 3. Metric Breakdown

```text
Correctness:
Condition A: [█████████░] 90% (Failed Test 9)
Condition B: [██████████] 100% (Passed 10/10)
Condition C: [██████████] 100% (Passed 10/10)

Execution Speed (lower is better):
Condition A: 4.2 s
Condition B: 7.8 s
Condition C: 2.1 s (FASTEST)
```
