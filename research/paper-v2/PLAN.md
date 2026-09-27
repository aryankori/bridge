# Paper v2: research program

**Author:** aryankori
**Branch:** `paper/v2-publishable`
**Goal:** turn the effective-standing paper into a paper that can pass review at a top software engineering venue.

## Why a v2

The current paper (10 body pages, 73 references) has a sound core, a formal model and two implementations. It also has four weaknesses that a program committee will find:

1. Its behavioral question (does a resolved directive change what agents do?) has no answer. The live pilot recorded 25 of 60 trials and its scorer has four defects.
2. Its benchmark labels come from the project team, and three EXP-005 labels changed after the resolver was written.
3. It has no evidence from real repositories that conflicting instruction sources occur, or that CODEOWNERS and signatures are available to derive standing.
4. `bridge resolve` is verified by tests only.

## Phases

| Phase | Work | Output |
| :--- | :--- | :--- |
| 1. Research | Nine parallel agents, one per part: multi-agent SE literature, instruction-conflict literature, agent context files and tool precedence rules, ownership and provenance literature, normative theory and a formal audit, data scouting with pilots, venue and empirical standards, an internal program-committee review, live-experiment feasibility | `research/paper-v2/01..09-*.md` |
| 2. Decide | Pick the venue, the new studies, and the paper structure from the reports | this file, "Decisions" |
| 3. Execute | Run the new studies (repository mining, standing feasibility on real histories, and, if feasible, a pre-registered live-agent experiment) | scripts and data under `research/experiments/` |
| 4. Merge | Rewrite the paper around the new evidence and one argument | `paper/` |
| 5. Verify | Adversarial review: citation checks against metadata services, number tracing to scripts, simulated reviewers, and fixes until they come back clean | review logs under `research/paper-v2/` |

## Rules for every agent and every edit

- No fabricated results. Every number in the paper traces to a script or a recorded data file in the repository.
- No unverified references. Every BibTeX entry comes from `tools/ids-to-bib.mjs`, which reads Crossref or arXiv metadata for a DOI or arXiv id that an agent verified. A claim about a paper must match its abstract or text.
- Legal sources only: arXiv, Semantic Scholar, OpenAlex, Crossref, dblp, CORE, Zenodo, official documentation. No shadow libraries.
- New experiments are pre-registered: the protocol, hypotheses, scorer, and analysis plan are committed before the first trial runs.
- Negative and null results are reported as they are.
- Plain English (ASD-STE100 style), no em dashes, no hype words.
- Commits are authored by the repository owner only, with no co-author trailers.

## Decisions

To be filled in after Phase 1.
