# Reproducibility Guide

A critical component of modern software engineering research is reproducibility. Reviewers will reject papers if the experiments rely on closed, non-deterministic API behavior without strict controls.

## 1. Environment Controls

To reproduce the findings in EXP-001, the following controls must be adhered to:

### Model Pinning
- **Primary Agent:** Claude 3.5 Sonnet (claude-3-5-sonnet-20240620).
- **Execution Agent:** Nemotron 3 Super 120B (nvidia/nvidia/nemotron-3-super-120b-a12b).
*Failure to use pinned versions will introduce generation variance that invalidates the metrics.*

### Seed Control
Where applicable via the API (e.g., OpenRouter `seed` parameter), all requests must pass a constant seed value (e.g., `seed=42`) and temperature must be strictly set to `0.0` to minimize stochastic variance.

## 2. Artifact Availability

Upon publication, the following artifacts must be made publicly available via Zenodo or a GitHub release:

1. **The Experimental Harness (`research/experiments/exp-001`):** The exact TypeScript code used to orchestrate the A/B/C conditions.
2. **The Base Repository State:** The exact Git commit hash of the target repository *before* any agent action.
3. **The Raw Telemetry:** The JSON NDJSON output logs from all trials, containing precise token counts, timestamps, and LLM responses.
4. **The Analysis Scripts:** The Python/R scripts used to parse the telemetry and generate the LaTeX tables and graphs used in the paper.

## 3. Execution Replication

To replicate a single trial of EXP-001 Condition C:

```bash
# 1. Clone the harness
git clone https://github.com/a2aproject/bridge.git
cd bridge

# 2. Set strict environment variables
export OPENROUTER_API_KEY="sk-or-..."
export ANTHROPIC_API_KEY="sk-ant-..."

# 3. Run the specific condition trial
pnpm run experiment:pilot --condition=C --trial=1
```

## 4. Empirical Honesty Rule

*Under no circumstances may manual intervention be used to "fix" a failing agent run and have it recorded as a success.* If an agent fails to compile the code, it is recorded as a compilation failure. If an agent loops infinitely, it is terminated at the timeout threshold (e.g., 5 minutes) and recorded as a deadlock.
