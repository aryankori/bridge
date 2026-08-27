# Bridge Research Paper

This directory contains the LaTeX source and supporting documentation for the Bridge empirical research paper: **"From Ephemeral Context to Project Truth: Reconciling State Across Interoperable Software Engineering Agents."**

## Structure

- `main.tex`: The primary LaTeX document.
- `references.bib`: The BibTeX bibliography.
- `sections/`: Contains the individual `.tex` files for each section of the paper.
  - *Note: Sections 06, 07, 11, and 12 are explicitly blocked with placeholders pending the successful execution of EXP-001.*
- `figures/`: Will contain empirical graphs (PDF/PNG) and architectural TikZ diagrams.
- `tables/`: Will contain `.tex` fragments for data tables.
- `data/`: Will house the raw NDJSON/CSV telemetry from the experimental harness.
- `scripts/`: Will contain Python/R scripts for parsing telemetry and generating graphs.

## Compilation

To compile the paper, ensure you have a full TeX distribution (e.g., TeX Live, MiKTeX) installed.

```bash
latexmk -pdf -interaction=nonstopmode main.tex
```

## Audits and Guidelines

The root of this directory contains several markdown documents critical to the integrity of the publication:
- `venue-research.md`: Analysis of target conferences and journals.
- `novelty-audit.md`: Formal defense of the paper's novelty against existing literature.
- `reproducibility.md`: Strict environmental controls required for executing the experiments.
- `submission-checklist.md`: Final checks before submitting to double-blind venues.

## Strict Empirical Rule

**NO FABRICATED DATA.** The results, analysis, discussion, and conclusion sections must remain blocked until verified telemetry from `research/experiments/exp-001` is available.
