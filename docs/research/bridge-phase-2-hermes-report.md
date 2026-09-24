# Bridge Phase 2 - Hermes Report

**Status:** COMPLETE 
**Generated:** Phase 13 - final synthesis of all prior phases 
**Author:** aryankori
**Date:** Phase 2 reconstruction 
**Related documents:**

- `docs/research/hermes-current-state.md` - Phase 0: repository and state reconstruction
- `docs/research/exp-005-forensic-truth.md` - Phase 1: trial-by-trial forensic reconstruction
- `docs/research/exp-005-root-cause-analysis.md` - Phase 2: root cause identification and repair plan
- `docs/research/exp-005-evaluation-science.md` - Phase 3: evaluation science application
- `docs/research/bridge-current-interoperability-map.md` - Phase 5: original product assessment and competitive map

**Tavily research:** `docs/research/bridge-tavily-competitive-research.md` - full source list from competitive landscape research

---

## 1. What is actually true about EXP-005?

### 1.1 The experiment design is sound

EXP-005 was designed as a 10 scenario × 3 condition × 2 replication factorial experiment (60 trials total), randomized with seed 42 using Mulberry32 + Fisher-Yates. The three conditions were:

- **Condition A (SPADE):** Agent resolves directives using the SPADE resolver
- **Condition B (HUMAN):** Agent resolves directives using human-provided resolutions
- **Condition C (AMBIGUITY):** Agent resolves directives with no resolution aid, facing ambiguity directly

The methodology passed correction gates in prior sessions: directive phrasing parity, resolver frozen at `fc322c6`, pre-validation 10/10 scenarios, replication support, randomized order, explanation metric reworked, stratified outcomes, A/B/C treatment isolation, artifact traceability, EXP-004 untouched. The resolver was validated at 10/10 exact matches (100%) in a dry-run.

### 1.2 The experiment did not produce persisted results

This is the central fact. On-disk evidence shows:

- **`exp005-manifest.json` does not exist** - no trial records, no completion counts, no evaluation scores
- **Only 1 worktree directory survives** (`trial-exp005-scn-006-B-rep2-1787827019225`), and it is empty (no `.git` pointer, no trial artifacts)
- **No runner stdout/stderr logs** are available
- **No telemetry or task logs** with trial granularity are available

The trial-by-trial reconstruction (see `exp-005-forensic-truth.md`) classifies all 60 planned trials as **UNKNOWN**. One worktree directory name follows the expected naming convention, which is a weak signal that worktree creation logic may have executed at least partially, but the directory is empty and provides no trial data.

### 1.3 Prior reports of partial completion are unverifiable

Three conflicting reports exist in the record:

| Report | Claim | Verdict |
|---|---|---|
| Antigravity progress | ~44-45/60 completed | Unverifiable. No manifest, no worktrees, no artifacts. May have been a progress message, not a completion count. |
| Forensic inspection | 25 manifest entries | Unverifiable. Manifest file does not exist on disk. May have been written from a transient read or memory. |
| Forensic inspection | 24 surviving worktrees | Unverifiable. Only 1 empty directory exists. The other 23 may have been cleaned up, pruned, or never created. |

These reports cannot be reconciled because the authoritative record (the manifest) is missing. The honest conclusion is that the data is gone.

### 1.4 The methodology is not at fault

The experimental design, correction gates, evaluator logic, and resolver validation are all intact in source code and prior session logs. The failure is entirely in the execution/infrastructure layer. This is a critical distinction: the experiment was designed correctly; it was not executed correctly.

---

## 2. What data survives?

### 2.1 Surviving data

1. **Experiment design:** Fully documented in `research/experiments/exp-005/methodology.md`, `schema.ts`, `scenarios.ts`, `payload-builder.ts`, `security.ts`, `smoke-tests.ts`, `validate.ts`
2. **Runner source code:** `run-pilot.ts`, `harness.ts`, `agent-runners.ts`, `evaluator.ts` - all intact
3. **Resolver code:** Frozen at `fc322c6`, validated 10/10 in dry-run
4. **Correction gate records:** 10 checkpoints verified in prior sessions
5. **Tavily competitive research:** `docs/research/bridge-tavily-competitive-research.md` (43KB, 200+ sources)
6. **Bridge research corpus:** 25+ research documents including long-term strategy, economic moat, wedge-vs-moat, MVP, category research, falsification analysis, decision tree, paper strategy, etc.
7. **EXP-004 results:** Resolver validated at 76% accuracy / 0% false-allow (from prior sessions, intact in research corpus)

### 2.2 Lost data

1. **All EXP-005 trial records** - manifest, worktrees, logs, outputs
2. **Any evaluation scores** from EXP-005
3. **Any evidence about agent behavior under different conditions** from EXP-005
4. **The ability to answer:** Does the SPADE resolver improve agent directive resolution accuracy compared to human resolution or no resolution?

### 2.3 Partially surviving signals

1. **One empty worktree directory** - suggestive of partial execution, but provides no trial data
2. **Git reflog** - shows normal branch activity, no detached HEAD, single worktree
3. **Filesystem state** - C: drive at 97% capacity, no manifest, no worktrees

---

## 3. What is the next valid experiment?

### 3.1 EXP-005 must be rerun

The experiment design is valid. The infrastructure failed. The only way to get valid data is to repair the infrastructure and rerun the experiment.

**Why not recover the old data:** The data is gone. There is no manifest to recover, no worktrees to inspect, no logs to read. Recovery is not possible because the data was never persisted in a durable, recoverable form.

**Why not substitute a different experiment:** The question EXP-005 was designed to answer (does the resolver improve agent behavior?) is the right question. A different experiment would answer a different question. We need the answer to the original question.

**Why not skip to EXP-006/EXP-007:** EXP-006 and EXP-007 were designed as follow-ups to EXP-005. Without EXP-005 results, we don't know what uncertainty remains, so we can't design a targeted follow-up. Running EXP-006/EXP-007 without EXP-005 would be running experiments in the dark.

### 3.2 Prerequisites for rerun

From `exp-005-root-cause-analysis.md`:

1. **Free disk space** - C: drive at 97% is a hard blocker
2. **Install dependencies** - ensure `node_modules` present, TypeScript compilable, all CLI tools available
3. **Fix shell consistency** - ensure runner uses a single, consistent shell (Git Bash recommended)
4. **Verify git worktree capability** - test `git worktree add` / `git worktree remove`
5. **Strengthen checkpointing:**
 - Write manifest after every trial (not just at end)
 - Write to multiple locations (local + backup)
 - Log stdout/stderr to files per trial
 - Record filesystem timestamps
 - Add manifest integrity check (valid JSON verification after each write)
 - Add heartbeat (record runner alive at intervals)

### 3.3 Rerun scope

**Option A: Full rerun** - 60 trials (10 scenarios × 3 conditions × 2 replications, seed 42), identical to original plan. Preferred if infrastructure is fully repaired.

**Option B: Validation run** - 9 trials (3 scenarios × 3 conditions, single replication) to validate the infrastructure fix before committing to the full 60. Preferred if there is uncertainty about whether the infrastructure is fully fixed.

**Recommendation:** Start with Option B (9-trial validation run). If it completes with full data persistence, proceed to Option A (60-trial full run). If it fails, diagnose and fix before retrying.

### 3.4 What EXP-005 would tell us (if it succeeds)

If the rerun produces valid data, EXP-005 would answer:

1. **Does the SPADE resolver improve agent directive resolution accuracy?** (Condition A vs C)
2. **Is the resolver as good as human resolution?** (Condition A vs B)
3. **Does the resolver help more on some scenarios than others?** (scenario × condition interaction)
4. **Is the effect consistent across replications?** (within-condition variance)

These are the questions the Bridge project needs answered before it can claim that the resolver improves agent behavior in a product context.

---

## 4. What does the original Bridge product currently need?

### 4.1 The core gap: automatic work transfer between heterogeneous agents

The original product idea is:

> ONE PLACE -> MULTIPLE AI AGENTS -> SHARED PROJECT -> AUTOMATIC WORK TRANSFER -> NO MANUAL COPY/PASTE

The interoperability map (`bridge-current-interoperability-map.md`) assesses each component:

| Component | Status | Gap |
|---|---|---|
| One place (shared project) | **Partially solved** - Git repo works, but no unified coordination layer | Coordination, not storage |
| Multiple AI agents | **Solved** - Claude Code, Codex, Gemini, OpenCode, Cursor, Copilot all exist | Heterogeneous coordination is unsolved |
| Shared project | **Solved** - Git repo is shared; all agents can read/write | Conflict resolution is unsolved |
| Automatic work transfer | **NOT SOLVED** - no tool transfers structured work between different agent types automatically | This is Bridge's core product |
| No manual copy/paste | **NOT SOLVED** - human is the middleware today | This is the user experience Bridge promises |

### 4.2 What Bridge must build (MVP)

From the interoperability map, §6.3:

1. **WorkTransfer object** - standardized, machine-readable handoff format with fields: objective, task, changedFiles, relevantFiles, artifacts, commands, tests, results, failures, decisions, unresolvedQuestions, gitState, provenance
2. **Work transfer pipeline** - Agent A -> Bridge -> WorkTransfer -> Agent B, automatic, no manual copy/paste
3. **Cross-agent coordination** - dependency-aware sequencing, conflict detection, agent status tracking
4. **Heterogeneous agent support** - Claude <-> Codex <-> Gemini <-> OpenCode <-> any MCP-compatible agent
5. **Decision log / provenance tracking** - what was decided, by whom, why, with what evidence

### 4.3 What Bridge should build next (post-MVP)

From the interoperability map, §6.2:

1. **Automatic context selection** - beyond CLAUDE.md + git + agent search
2. **Effective Directive integration** - if validated by experiment, provides structured context selection and conflict elimination
3. **Precedent tracking** - if validated, provides way to track and reuse prior resolutions
4. **Reconciliation** - if validated, provides cross-agent conflict resolution

### 4.4 What Bridge should NOT build (yet)

From the interoperability map, §6.4:

1. Enterprise governance platform (not justified by evidence)
2. Cloud control plane (local-first preferred)
3. Billing/subscription infrastructure (not relevant to v1)
4. Custom protocol from scratch (use MCP/ACP/Git as base)
5. Vector database (not needed for v1)
6. Giant ontology (not needed; git + CLAUDE.md + selective context is enough)
7. Full knowledge graph (over-engineered)

---

## 5. What should be built immediately?

### 5.1 Priority 1: WorkTransfer object and pipeline (product)

**What:** Define the WorkTransfer schema, implement a simple pipeline that captures agent A's work state and delivers it to agent B.

**Why now:** This is the core product. It is buildable with existing infrastructure (Git, file system, MCP, CLAUDE.md). It does not depend on experiment results. It directly addresses the original product gap.

**Scope:** MVP - a WorkTransfer object (JSON schema), a producer (captures relevant state from agent A's work directory), a consumer (reads WorkTransfer and sets up agent B's context), and a simple orchestrator that connects them. CLI-first. No UI required.

**Estimated effort:** Small. The schema is defined in the interoperability map. The producer and consumer are straightforward file operations plus context setup.

### 5.2 Priority 2: Repair EXP-005 infrastructure and run validation (research)

**What:** Free disk space, install dependencies, fix shell, verify git worktree, strengthen checkpointing, run 9-trial validation.

**Why now:** The research program depends on valid experimental data. EXP-005 was the gate experiment for the agent-behavior claims. Without it, the research direction (Effective Directive, Authority, Precedent) cannot be productized with confidence.

**Scope:** Infrastructure repair + 9-trial validation run with full data persistence.

**Estimated effort:** Medium. Infrastructure repair is straightforward but requires Antigravity (local execution, dependency installation, disk management). The 9-trial run is a subset of the original 60-trial plan.

### 5.3 Priority 3: Complete the competitive falsification research (strategy)

**What:** Complete the Tavily research on multi-agent workspaces, agent handoff systems, agent gateways, context brokers, agent memory, AI IDEs, policy engines, instruction hierarchy, agent governance, authority systems.

**Why now:** The competitive landscape is evolving rapidly. Claude Code is adding features (hooks, plugins, teleport, session transfer). A2A standards are emerging. If Bridge's core gap is going to be closed by competitors, we need to know now.

**Scope:** Finish the Tavily research threads that were started (10+ searches initiated, results saved to `bridge-tavily-competitive-research.md`). Synthesize findings into the interoperability map (already done) and the final report (this document).

**Estimated effort:** Small. Most research is done. Remaining work is synthesis and gap-filling.

---

## 6. What should wait for evidence?

### 6.1 Effective Directive as a product feature

The Effective Directive Resolver has evidence from EXP-004 (76% accuracy, 0% false-allow). But the agent-behavior claims (does the resolver improve agent continuation quality?) require EXP-005 data, which is lost. **Wait for EXP-005 rerun results before building Effective Directive into the product.**

What can be built now: the resolver itself is validated and can be used as a tool. What should wait: claiming that the resolver improves agent behavior in a product context.

### 6.2 Authority / Precedent / Reconciliation as product features

These are research hypotheses. They have no experimental validation yet. **Wait for experimental evidence before building them into the product.**

What can be done now: design experiments that would validate or falsify these concepts. What should wait: building them as product features.

### 6.3 Full project intelligence / knowledge graph

Over-engineered for the current problem. Git history + CLAUDE.md + selective context extraction is sufficient for v1. **Wait until there is evidence that a knowledge graph is needed.**

### 6.4 EXP-006 / EXP-007

These were designed as follow-ups to EXP-005. Without EXP-005 results, we don't know what uncertainty remains. **Wait for EXP-005 rerun results before designing EXP-006/EXP-007.** If EXP-005 succeeds, the specific causal uncertainty (information volume vs structure, resolver quality vs agent following, human vs machine resolution, ambiguity handling, generalization) will guide the design of the next experiment.

If EXP-005 fails again, the research question may need to be reframed, and EXP-006/EXP-007 may need to be redesigned.

---

## 7. What should be abandoned?

### 7.1 The current EXP-005 data

The data from the failed run is gone. **Abandon any attempt to reconstruct it from conflicting reports.** The reports (44-45/60, 25 manifest entries, 24 worktrees) are unverifiable and should not be treated as evidence.

### 7.2 The idea that EXP-005 proved anything

EXP-005 proved nothing about agent behavior, because it produced no valid data. **Abandon any claims about agent behavior under different resolution conditions that were based on the failed run.**

### 7.3 Scope creep toward enterprise governance

The research corpus produced many concepts, but the original product idea is focused: automatic work transfer between heterogeneous agents. **Abandon the idea that Bridge needs to be an enterprise governance platform, a cloud control plane, a billing system, a custom protocol, a vector database, or a giant ontology.** These are not justified by evidence and are not needed for the MVP.

### 7.4 The expectation that EXP-005 might have partial valid data

The forensic truth is clear: 0/60 valid completions. **Abandon any hope that some subset of the data is valid.** There is no basis for selecting a "good" subset from conflicting, unverifiable reports.

---

## 8. What can the paper honestly claim?

### 8.1 What is PROVEN

1. **The resolver works on the resolution task itself:** EXP-004 validated the SPADE resolver at 76% accuracy / 0% false-allow on 10 pre-validated scenarios. This is a result about the resolver's ability to produce correct resolutions, not about agent behavior.
2. **The resolver was pre-validated for EXP-005:** The resolver was tested at 10/10 exact matches (100%) in a dry-run against the EXP-005 scenario set. This validates that the resolver can produce the expected outputs for the EXP-005 scenarios.
3. **The experimental design is valid:** 10 scenarios × 3 conditions × 2 replications, randomized, with defined evaluator logic, passed correction gates.
4. **The methodology is sound:** Correction gates verified 10 checkpoints (phrasing parity, resolver frozen, pre-validation, replication, randomization, metric rework, stratified outcomes, treatment isolation, artifact traceability, EXP-004 untouched).
5. **Bridge's core product gap is real:** The interoperability map (based on 200+ sources from Tavily research) confirms that no existing tool provides automatic, structured work transfer between heterogeneous AI agents.

### 8.2 What is SUPPORTED (but not proven)

1. **The resolver concept is promising:** The resolver works on the resolution task. It is plausible that it would help agents, but this is not proven without EXP-005 data.
2. **The Effective Directive concept is well-motivated:** The resolver's accuracy on the resolution task suggests that structured resolution is possible. The gap between resolution and agent continuation quality is the unanswered question.
3. **The original product idea is viable:** The gap (automatic work transfer between heterogeneous agents) is real and unsolved. A WorkTransfer object + pipeline is buildable. The product direction is sound.

### 8.3 What is INCONCLUSIVE

1. **Whether the resolver improves agent directive resolution accuracy:** This is the EXP-005 question. No data exists. The question is unanswered.
2. **Whether the resolver is as good as human resolution:** Unanswered without EXP-005 data.
3. **Whether the resolver helps more on some scenarios than others:** Unanswered without EXP-005 data.
4. **Whether the agent-behavior claims from the research corpus are true:** Unanswered without experimental validation.

### 8.4 What is HYPOTHESIS

1. **Effective Directive improves agent continuation quality:** Plausible, but untested.
2. **Authority / Precedent / Reconciliation are useful product features:** Plausible, but untested.
3. **The resolver's benefit generalizes beyond the 10 EXP-005 scenarios:** Plausible, but untested.

### 8.5 What is REJECTED

1. **That EXP-005 produced valid results:** Rejected. The data is gone.
2. **That the conflicting reports (44-45/60, 25 entries, 24 worktrees) are reliable:** Rejected. Unverifiable.
3. **That the methodology is at fault:** Rejected. The methodology passed correction gates and is intact in source code.

### 8.6 What is NOT TESTED

1. **Whether the resolver improves agent behavior in a product context:** Not tested. EXP-005 was designed to test this, but the data is lost.
2. **Whether Bridge's WorkTransfer object improves continuation quality:** Not tested. This is a product claim that requires user studies or A/B testing.
3. **Whether the original product idea (automatic work transfer between heterogeneous agents) is valuable to users:** Not tested. This requires user research or market validation.

---

## 9. What remains the largest scientific uncertainty?

**Does the SPADE resolver improve agent directive resolution accuracy compared to human resolution or no resolution?**

This is the question EXP-005 was designed to answer. The data is lost. The question is unanswered.

This is the largest scientific uncertainty because:

1. **It is the core research claim:** The Bridge research program hypothesized that structured resolution (via the resolver) improves agent behavior. This is the claim that connects the resolver (a validated tool) to the product (agent continuation quality).
2. **It gates the research direction:** If the resolver improves agent behavior, the research direction (Effective Directive, Authority, Precedent) is validated. If it doesn't, the research direction needs to be reframed.
3. **It is testable:** The experiment design is valid. The infrastructure can be repaired. The question can be answered.

### 9.1 Sub-uncertainties

1. **Information volume vs structure:** Is the resolver's benefit due to providing more information, or due to providing structured information?
2. **Resolver quality vs agent following:** If the resolver is accurate but agents don't follow it well, the benefit is limited. This is a resolver-quality vs agent-fidelity question.
3. **Human resolution vs machine resolution:** Is the resolver as good as a human? If not, what's the gap?
4. **Ambiguity handling:** How do agents perform when they face ambiguity directly (condition C)? Is this worse than having a resolution (conditions A or B)?
5. **Generalization:** Does the resolver's benefit generalize to scenarios beyond the 10 tested?

---

## 10. What remains the largest product uncertainty?

**Will automatic work transfer between heterogeneous agents be valuable enough to users to sustain a product?**

This is the largest product uncertainty because:

1. **It is the core product claim:** Bridge's value proposition is that automatic work transfer between heterogeneous agents is valuable. This is the claim that connects the product to the market.
2. **It is untested:** No user studies, no A/B tests, no market validation have been done. The claim is based on the existence of the gap (which is real) and the plausible value of closing it (which is reasonable but not proven).
3. **It is the make-or-break question for the product:** If users don't value automatic work transfer, Bridge has no product. If they do, Bridge has a real product opportunity.

### 10.1 Sub-uncertainties

1. **Is the problem frequent enough?** How often do users work with multiple heterogeneous agents on the same project? If it's rare, the product may not have enough demand.
2. **Is the problem painful enough?** Is manual copy/paste between agents bad enough that users will pay for automation? If it's a mild annoyance, the product may not have enough value.
3. **Is the MVP sufficient?** Is a WorkTransfer object + pipeline enough to deliver value, or do users need more (coordination, conflict resolution, project intelligence)?
4. **Is the competitive window real?** Will competitors (Claude Code, A2A standards, AI IDEs) close the gap before Bridge can establish a position?

---

## 11. What is the strongest surviving thesis?

**Bridge's strongest surviving thesis is the product thesis, not the research thesis.**

### 11.1 The product thesis (strong)

> There is a real, unsolved gap: automatic, structured work transfer between heterogeneous AI agents in a shared project. No existing tool (Claude Code, Codex, Gemini, OpenCode, Cursor, Copilot, MCP, ACP, A2A) fills this gap. A WorkTransfer object + pipeline is buildable with existing infrastructure. This product addresses a real user need (no manual copy/paste between agents) and has a clear MVP scope.

**Evidence for the product thesis:**

1. The gap exists (confirmed by interoperability map, 200+ sources)
2. No existing tool fills it (confirmed by competitive research)
3. The MVP is buildable (WorkTransfer object + pipeline, Git + files + MCP + CLAUDE.md)
4. The original product idea is focused and coherent (ONE PLACE -> MULTIPLE AGENTS -> SHARED PROJECT -> AUTOMATIC WORK TRANSFER)

### 11.2 The research thesis (weakened but not dead)

> The SPADE resolver improves agent directive resolution accuracy, and this improvement translates into better agent continuation quality in a multi-agent product context. The resolver is a validated tool (EXP-004: 76% accuracy, 0% false-allow). The Effective Directive concept is a promising approach to context selection and conflict elimination.

**Evidence for the research thesis:**

1. The resolver works on the resolution task (EXP-004: 76% accuracy, 0% false-allow)
2. The resolver was pre-validated for EXP-005 (10/10 exact matches)
3. The experimental design is valid (passed correction gates)

**Evidence against the research thesis:**

1. EXP-005 produced no valid data (forensic truth: 0/60 valid completions)
2. The agent-behavior claims are untested
3. The resolver's benefit for agent continuation quality is unknown

### 11.3 The gap between the two theses

The product thesis does not depend on the research thesis. Bridge can build the WorkTransfer pipeline without proving that the resolver improves agent behavior. The research thesis (resolver improves agent behavior) would strengthen the product thesis (Bridge improves agent continuation quality), but it is not required for the product to exist.

**The strategic implication:** Build the product (WorkTransfer pipeline) now. Validate the research (EXP-005 rerun) in parallel. If the research validates the resolver's benefit, integrate it into the product. If not, the product still has value (automatic work transfer is valuable regardless of whether the resolver improves agent behavior).

---

## 12. KEEP / KILL / BUILD / TEST / WAIT

### KEEP

1. **The experimental design:** 10 scenarios × 3 conditions × 2 replications, seed 42. Valid and intact.
2. **The correction gates:** The 10 methodology checkpoints are sound. Keep them as the standard for future experiments.
3. **The resolver at fc322c6:** Frozen and validated. Use it as the condition A treatment in the rerun.
4. **The Bridge research corpus:** 25+ documents covering strategy, moat, MVP, category research, falsification, decision tree, paper strategy. Keep as the strategic foundation.
5. **The original product idea:** ONE PLACE -> MULTIPLE AGENTS -> SHARED PROJECT -> AUTOMATIC WORK TRANSFER. Focused and buildable. Keep as the north star.
6. **The WorkTransfer object concept:** Defined in the interoperability map. Keep as the core product artifact.
7. **The Tavily competitive research:** 200+ sources saved. Keep as the competitive baseline.

### KILL

1. **The current EXP-005 data:** Gone. Abandon any reconstruction attempts. Start fresh.
2. **Any claims about agent behavior from EXP-005:** No data, no claims.
3. **The conflicting reports as evidence:** 44-45/60, 25 entries, 24 worktrees - unverifiable, not evidence.
4. **Enterprise governance scope:** Not justified. Cut.
5. **Cloud control plane:** Local-first is preferred. Cut.
6. **Custom protocol from scratch:** Use MCP/ACP/Git. Cut.
7. **Vector database for v1:** Not needed. Cut.
8. **Giant ontology:** Not needed. Cut.
9. **Full knowledge graph for v1:** Over-engineered. Cut.

### BUILD

1. **WorkTransfer object and pipeline (MVP):** The core product. Schema + producer + consumer + simple orchestrator. CLI-first. Build now.
2. **EXP-005 infrastructure repair:** Free disk, install deps, fix shell, verify git worktree, strengthen checkpointing. Required for the rerun.
3. **EXP-005 validation run (9 trials):** Prove the infrastructure fix works before committing to the full 60-trial run.
4. **Competitive falsification synthesis:** Complete the Tavily research synthesis (most done, some gap-filling remaining). Integrate into the interoperability map and final report.
5. **Experiment documentation standards:** Formalize the manifest + worktree + log + heartbeat requirements as a standard for all future experiments. Learn from the EXP-005 failure.

### TEST

1. **EXP-005 validation run (9 trials):** Test whether the repaired infrastructure produces valid, persisted data. This is the gate for the full 60-trial rerun.
2. **WorkTransfer MVP with real agents:** Test whether a WorkTransfer object actually improves agent B's continuation quality compared to manual context transfer. This is the product validity test.
3. **Resolver on new scenarios:** Test whether the resolver generalizes beyond the 10 EXP-005 scenarios. This is the generalization test.

### WAIT

1. **EXP-005 full rerun (60 trials):** Wait for the 9-trial validation run to succeed. If it does, proceed to the full rerun.
2. **Effective Directive as a product feature:** Wait for EXP-005 rerun results. If the resolver improves agent behavior, integrate it. If not, reconsider.
3. **Authority / Precedent / Reconciliation as product features:** Wait for experimental validation. Design experiments that would validate or falsify these concepts.
4. **EXP-006 / EXP-007:** Wait for EXP-005 rerun results. The specific causal uncertainty from EXP-005 will guide the design of the next experiment.
5. **User research / market validation:** Wait until the MVP is built and testable. Then validate whether users value automatic work transfer.
6. **Paper Results section:** Wait until valid experimental data exists. Do not write a Results section based on the failed run.

---

## 13. Summary

### 13.1 EXP-005

The experiment was designed correctly and the methodology is sound. The execution failed due to infrastructure issues (disk capacity, shell mismatch, possibly process crash). No data survives. The experiment must be repaired and rerun. A 9-trial validation run should precede the full 60-trial rerun.

### 13.2 Research direction

The research direction (Effective Directive, Authority, Precedent, Reconciliation) is promising but unvalidated for agent behavior. The resolver itself is validated (EXP-004). The agent-behavior claims require EXP-005 data, which is lost. The research direction should be validated by experiment before being productized.

### 13.3 Product direction

The original product idea (automatic work transfer between heterogeneous agents) is the strongest thesis. The gap is real and unsolved. The MVP (WorkTransfer object + pipeline) is buildable now. The research concepts (Effective Directive, etc.) are potential differentiators, not core requirements. Build the product now. Validate the research in parallel.

### 13.4 The honest paper

The paper can honestly claim:
- The resolver works on the resolution task (EXP-004)
- The experimental design is valid (methodology + correction gates)
- The gap (automatic work transfer) is real and unsolved (competitive research)
- EXP-005 was designed to test agent behavior but failed due to infrastructure (forensic truth)

The paper cannot honestly claim:
- That the resolver improves agent behavior (no EXP-005 data)
- That any trials completed (no manifest, no worktrees)
- That the product has been validated (no user studies)

### 13.5 The next step

**Build the WorkTransfer MVP. Repair EXP-005 infrastructure. Run the 9-trial validation. In parallel, complete the competitive research synthesis.**

This is precise enough for Antigravity to execute. The WorkTransfer MVP is a well-defined, scoped build. The EXP-005 repair is a well-defined infrastructure fix. The 9-trial validation is a well-defined experiment. The competitive research synthesis is a well-defined writing task.

No further planning is needed. The work is defined. Execute.

---

*End of Bridge Phase 2 - Hermes Report.*
