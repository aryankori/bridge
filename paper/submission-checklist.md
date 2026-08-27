# Submission Checklist

Before submitting the paper to any venue (e.g., ASE, ICSE), ensure the following criteria are met.

## 1. Ethical & Academic Integrity
- [ ] No empirical data was fabricated, inferred, or generated without a corresponding execution log.
- [ ] All claims of agent capability are backed by the deterministic experimental harness.
- [ ] The difference between Theoretical capabilities (what Bridge *could* do) and Empirical findings (what EXP-001 *proved*) is strictly maintained.

## 2. Manuscript Completeness
- [ ] Title is finalized and accurately reflects the scope.
- [ ] Abstract summarizes the problem, the methodology, and the concrete empirical results.
- [ ] Introduction explicitly states the problem with current "agent memory."
- [ ] Research Questions (RQs) are testable.
- [ ] Methodology section details the harness, the model pins, and the A/B/C conditions.
- [ ] Results section contains formatted tables with hard metrics (Token count, Correctness, Rework iterations).
- [ ] Analysis directly answers RQ1, RQ2, and RQ3 based *only* on the results.
- [ ] Threats to Validity accurately assesses the limits of LLM non-determinism.
- [ ] Related Work differentiates Bridge from RAG, Vector DBs, and A2A.

## 3. Formatting & Artifacts
- [ ] ACM `acmart` LaTeX class compiles without warnings.
- [ ] All citations in `references.bib` are accurate, properly formatted, and accessible.
- [ ] Figures (TikZ or PDF) are high-resolution and legible in grayscale.
- [ ] The replication package (Harness code, raw telemetry JSONs) is uploaded to an anonymous repository or Zenodo.
- [ ] Double-blind requirements are met (no author names, affiliations, or identifying GitHub links in the text).
