# EXP-004: Blind Benchmark for Effective Directive Resolution

> **MANDATORY NOTICE:** 
> *This benchmark evaluates agreement with an independently defined gold standard. It does not establish real-world authority correctness.*

EXP-004 provides a scientifically defensible, reproducible benchmark for evaluating directive conflict detection, standing precedence resolution, safety gates, and explanation quality.

---

## 1. Quick Start

Run the blind benchmark CLI to execute all 40 scenarios (15 DEV + 25 HELD-OUT):

```bash
pnpm tsx research/experiments/exp-004/run-benchmark.ts
```

Run the unit test suite:

```bash
pnpm test tests/research/exp-004.test.ts
```

---

## 2. Directory Structure

- `schema.ts`: Core data contracts for benchmark scenarios, blind inputs, gold adjudications, and evaluation scores.
- `policy.ts`: Decoupled `AuthorityPolicy` specification distinguishing policy definitions from the resolution algorithm.
- `fixtures-dev.ts`: 15 development scenarios used for baseline tuning.
- `fixtures-heldout.ts`: 25 held-out scenarios for independent out-of-sample evaluation.
- `gold-standard.ts`: 40 ground-truth adjudications created independently of resolver heuristics.
- `blind-runner.ts`: Execution engine ensuring strict information isolation and zero data leakage.
- `evaluator.ts`: Multi-metric statistical and safety evaluation engine.
- `run-benchmark.ts`: CLI entrypoint and Markdown report generator.
- `methodology.md`: Full methodology, threat model, and statistical formulations.
