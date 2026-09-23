# Bridge Research Paper

LaTeX source for **"Effective Standing: Arbitrating Conflicting Directives Among Heterogeneous Coding Agents (A Resolver, a Benchmark, and a Negative-Result Pilot)."**

Format: ACM `acmart` (`sigconf`, review, anonymous). Body: 10 pages. References: 2 pages.

## Structure

- `main.tex`: preamble, title, abstract, and section includes.
- `sections/`: one file per section (01 Introduction to 12 Conclusion).
- `references.bib`: 73 entries. Every entry is cited in the text. Metadata comes from the arXiv API and Crossref (DOI). Venues for conference papers without a DOI come from Semantic Scholar. Online specifications carry an access date.

## Compilation

```bash
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

The build has zero errors, zero undefined references, and zero overfull boxes. Two class warnings remain and are expected for an anonymous review copy: the ACM reference block is off, and `acmart` balances the last page itself.

## Where each number comes from

Run these commands from the repository root. Each one is deterministic.

| Paper content | Command |
| :--- | :--- |
| Table 1 (EXP-004 metrics) | `pnpm tsx research/experiments/exp-004/run-benchmark.ts` |
| Table 2 (EXP-004 confusion matrix) | `pnpm tsx research/experiments/exp-004/confusion-matrix.ts` |
| Tables 3 to 5 (EXP-005 pre-verification, recorded cells, scorer output) | `pnpm tsx research/experiments/exp-005/paper-tables.ts` |
| Section 6.3 execution accounting (49 of 60 started, checkpoint timing) | `pnpm tsx research/experiments/exp-005/trial-accounting.ts` |
| Tables 6 and 7 (trace audit, scorer versus audit) | `pnpm tsx research/experiments/exp-005/trace-audit.ts` (writes `trace-audit.json`) |
| Section 5.5 (`bridge resolve` verification) | `pnpm test:coverage` |

The EXP-005 tables read the committed manifest `research/experiments/exp-005/exp005-manifest.json`. The live agent runs cannot be reproduced exactly, because the hosted model cannot be pinned to a checkpoint or seed.

## Strict empirical rule

**No fabricated data.** Every number in the paper traces to a script or to the recorded manifest.

- EXP-001 (work transfer) was not executed against live agents. An early harness produced values from simulated latencies and harness-written patches. Those values are withdrawn and do not appear in the paper.
- EXP-002 has no data and does not appear in the paper.
- The EXP-005 trace audit is post hoc and exploratory. The paper reports it next to the pre-registered scorer output, not in place of it.

## Audits and guidelines

- `venue-research.md`: analysis of target venues.
- `novelty-audit.md`: novelty argument against existing work.
- `reproducibility.md`: environment controls for the experiments.
- `submission-checklist.md`: checks before submission to double-blind venues.
