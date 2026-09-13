# EXP-005: Live Agent Behavior Experiment

**Status:** Experiment Harness Ready & Frozen (Awaiting Live Run Authorization) 
**Target Pinned Model:** `nvidia/nvidia/nemotron-3-super-120b-a12b` (via OpenCode) 
**Frozen Resolver Commit:** `fc322c6` 

---

## 1. Overview

EXP-005 evaluates whether automated **Effective Directive Resolution** (Condition C) improves the behavioral outcomes of a real AI coding agent over **Raw Instruction Exposure** (Condition A) and how close it comes to **Human Gold Adjudication** (Condition B).

---

## 2. Pre-Flight Validation

Validate the 10 experimental scenarios, independent gold standards, payload generation, and worktree confinement:

```bash
pnpm tsx research/experiments/exp-005/validate.ts
```

Run the unit tests:

```bash
pnpm test tests/research/exp-005.test.ts
```

---

## 3. Directory Layout

- `schema.ts`: Data contracts for scenarios, trial telemetry, resolution scores, and manifests.
- `scenarios.ts`: 10 real executable software engineering task scenarios (5 unambiguous, 3 ambiguous, 2 unsolvable).
- `gold-standard.ts`: Independent human adjudications.
- `payload-builder.ts`: Prompt payload generators for Condition A (RAW), Condition B (HUMAN), and Condition C (BRIDGE).
- `agent-runners.ts`: OpenCode execution runner with pinned model and telemetry parser.
- `harness.ts`: Worktree lifecycle manager and test verifier.
- `evaluator.ts`: Multi-metric scoring engine separating Resolution Quality from Agent Outcome Quality.
- `validate.ts`: Pre-flight harness and fixture integrity validator.
- `smoke-tests.ts`: Minimal live OpenCode smoke test.
- `run-pilot.ts`: Controlled live trial executor and manifest builder.
- `methodology.md`: Complete experimental methodology and falsification criteria.
