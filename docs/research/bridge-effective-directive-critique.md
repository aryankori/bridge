# BRIDGE — Effective Directive Critique: Symptom or Disease?

**Status:** Research analysis
**Date:** 2026-08-27
**Scope:** Attack the current developer wedge. Determine whether "conflicting instruction files" is the real problem, a symptom of a deeper problem, or the wrong abstraction entirely.

---

## THE CURRENT WEDGE

> Given conflicting instructions, policies, project rules, human requests, stale documentation, CI constraints, and other sources, compute the effective directive that should govern a specific agent action.

This is the developer-facing value proposition. It is specific, testable, and currently being validated by EXP-005.

**The question:** Is this the real category, a useful wedge into a larger category, merely a feature, or the wrong abstraction?

---

## DEEPER CAUSE HYPOTHESES

### Hypothesis 1: Project State Fragmentation

**Claim:** The real problem is not conflicting instructions, but fragmented project state. The project's knowledge about itself (what tools to use, what rules apply, what decisions were made) is scattered across files, repos, chats, and people's heads. The instructions conflict because the state is fragmented.

**Evidence:**
- PROJECTMEM paper (arXiv 2606.12329): "AI coding agents lose project knowledge every time a session ends" — the amnesia problem is broader than instruction conflict
- agentmemory project (311 PRs): persistent memory for coding agents — addresses the fragmentation problem directly
- Anthropic's "Effective context engineering for AI agents" (Sep 2025): context retrieval, compaction, note-taking — all solving the "what does the project know?" problem

**If true, effective directive is a symptom treatment.** The deeper cure is institutional state: a unified, queryable record of what the project knows, has decided, and how it operates. Effective directive resolution is one query on that state ("what directive governs this action?"), not the whole system.

**Bridge as institutional state infrastructure:**
- Claims (instruction sources, decisions, precedents) are records in institutional state
- Standing is a query on institutional state
- Effective directive is the result of the query
- Memory, transfer, reconciliation are all operations on institutional state

**Verdict:** Plausible and consistent with the primitive hunt (claims → institutional state). The risk: institutional state is a much larger and harder problem than instruction resolution. If Bridge attempts to own institutional state, it may never deliver the narrow wedge.

---

### Hypothesis 2: Staleness and Provenance

**Claim:** The real problem is not conflict but staleness. Instructions conflict because some are outdated and the system doesn't know which is current. The fix is not authority evaluation but provenance tracking: every instruction source has a timestamp, a source, and a decay function. The effective instruction is the most recent, most authoritative, non-stale claim.

**Evidence:**
- EXP-004 staleness detector: "Compares timestamps and references between static documentation and active runtime manifests"
- EXP-005 scenarios include staleness cases (scn-002: stale 2021 Jest guide vs active 2026 Vitest package.json)
- Git's commit ordering is a form of staleness resolution (newer commits supersede older)

**If true, the authority hierarchy is secondary to temporal reasoning.** The core function is "what is the current, non-stale instruction for this action?" Authority matters, but time matters more.

**Verdict:** Staleness is a real component, but not the whole problem. Scenario scn-004 (human override of strict typing rule) is not about staleness — both the rule and the override are current. The human's claim is effective not because it's newer, but because it has higher authority. Temporal reasoning is necessary but not sufficient.

---

### Hypothesis 3: Lack of Provenance and Authority

**Claim:** The real problem is that instruction sources have no provenance. The agent doesn't know where an instruction came from, who wrote it, when, for what scope, or with what authority. Without provenance, the agent treats all instructions as equally credible. The fix is to attach provenance to every instruction source and let the agent reason about provenance.

**Evidence:**
- EXP-004 authority tiers: AGENT_RULES > PROJECT_DOCS > TASK_SPEC > DEFAULT — provenance is encoded in the tier
- EXP-005 scenarios include source metadata: tier, title, path, lastModified
- "Many-Tier Instruction Hierarchy in LLM Agents" (arXiv 2604.09443): models are "brittle at fine-grained instruction conflict resolution" — they don't reason about provenance well

**If true, effective directive is a provenance problem.** The fix is to make provenance explicit, structured, and machine-readable. The authority hierarchy is one way to encode provenance (tier = provenance rank). But provenance could also be: who wrote it, when, for what scope, with what evidence, with what explicit delegation.

**Verdict:** Provenance is essential. The standing framework is a specific form of provenance encoding. But provenance alone doesn't resolve conflicts — it enables the resolution. The resolver still needs to evaluate which provenance wins for which action.

---

### Hypothesis 4: Lack of Decision Rights

**Claim:** The real problem is not conflicting instructions but undefined decision rights. The project hasn't specified who has the right to decide what. The agent is caught between a human who says "do X" and a file that says "don't do X" because neither has clear decision rights over the other. The fix is to define decision rights (who can decide what, with what scope, with what override powers) and let the agent operate within those rights.

**Evidence:**
- Standing breakthrough: "authority graph — node for every instruction source, edge for precedence" — this is a decision-rights graph
- Corporate governance research: decision rights allocation is the core of organizational design
- "Delegation of Decision Rights: An Experimental Study" (Emerald): delegation improves decision quality and efficiency

**If true, effective directive is a decision-rights problem.** The resolver doesn't evaluate "which instruction is better" — it evaluates "who has the right to decide this, and what did they decide?" The conflict is resolved by the decision-rights structure, not by instruction quality.

**Verdict:** This is the strongest deeper-cause hypothesis. Decision rights generalize from "instruction conflict" to "who can decide what in this project?" This is institutional knowledge, not just developer tooling. If Bridge's real value is encoding and computing decision rights, the developer wedge (instruction conflict) is a narrow entry point into a larger category.

---

### Hypothesis 5: Agent Context Overload

**Claim:** The real problem is not conflicting instructions but context overload. The agent receives too many instruction sources, too much context, and can't reason about all of it. The conflict is a symptom of overload — if the agent had less context, it would follow the most prominent instruction and ignore the rest. The fix is context engineering: reduce, structure, and prioritize context so the agent can act without resolution.

**Evidence:**
- Anthropic's "Effective context engineering for AI agents" (Sep 2025): context retrieval, compaction — reducing context to what matters
- Mem0 benchmark (arXiv April 2025): 91% reduction in response time with structured memory vs full context
- OpenAI's instruction hierarchy work (March 2026): models improve when instructions are clearly layered

**If true, effective directive is a context engineering workaround.** The real fix is to give the agent better context — structured, prioritized, non-conflicting. If the context is well-engineered, the agent doesn't need a resolver.

**Verdict:** Context engineering helps, but it doesn't eliminate the need for resolution. Even with perfect context, a stale doc and an active manifest are both "in context" — the agent still needs to know which to follow. The resolver is the systematic way to make that determination; context engineering is the scaffolding.

---

### Hypothesis 6: Inability to Distinguish Facts from Recommendations

**Claim:** The real problem is that instruction files mix facts ("this project uses pnpm") with recommendations ("you should use pnpm") with rules ("you must use pnpm") with preferences ("I prefer pnpm"). The agent can't tell which is binding. The fix is to make the speech act explicit: this is a FACT (describes reality), this is a RULE (binds action), this is a RECOMMENDATION (suggests but doesn't bind), this is a PREFERENCE (personal choice).

**Evidence:**
- EXP-004 anomaly detectors include "Direct Contradiction Detector" and "Missing Authorization Gate" — these distinguish types of claims
- EXP-005 scenarios mix fact-like and rule-like content (package.json is a fact about the active manifest; AGENTS.md is a rule about naming conventions)

**If true, the effective directive is a speech-act classification problem.** The resolver's job is to classify each source as fact/rule/recommendation/preference, then determine which speech act governs the action. A fact ("package.json says test: vitest run") beats a rule ("README says run jest") because the fact describes current reality.

**Verdict:** Speech-act classification is a useful refinement, but it's embedded in the standing framework. The authority tiers already encode a form of speech-act distinction: AGENT_RULES (rules) have higher standing than PROJECT_DOCS (recommendations/facts). The resolver's contribution is making this explicit and computable.

---

## SYNTHESIS: WHAT IS THE REAL PROBLEM?

The deeper-cause hypotheses are not mutually exclusive. They form a hierarchy:

```
Layer 1 (shallowest): Conflicting instruction files
  ← The visible symptom

Layer 2: Stale and unprovenanced instructions
  ← Why they conflict (time + source ambiguity)

Layer 3: Fragmented project state
  ← Why instructions are scattered and inconsistent

Layer 4: Undefined decision rights
  ← Why no one has clearly decided what governs

Layer 5 (deepest): No institutional state infrastructure
  ← Why the project has no systematic way to record,
    compute, and query what is effective
```

**Effective directive resolution (Layer 1) is a symptom treatment that addresses Layers 1-3 but not Layers 4-5.**

The resolver can detect staleness (Layer 2), cite sources (Layer 2), and evaluate authority tiers (Layer 3). But it cannot fix fragmented project state or undefined decision rights — it can only work within the state and rights that exist.

**If the deeper causes are real, the long-term product is institutional state infrastructure (Layer 5), and effective directive is the wedge (Layer 1) that demonstrates the value of institutional state.**

**If the deeper causes are wrong, effective directive is the product, and institutional state is chasing a category that doesn't exist.**

---

## THE CRUCIAL TEST: IS EFFECTIVE DIRECTIVE THE REAL CATEGORY?

**Arguments that it IS the real category:**
1. It's concrete and testable (EXP-004, EXP-005)
2. It solves an immediate pain (developers dealing with conflicting instructions)
3. It's measurable (correct action rate, instruction violation rate)
4. It's narrow enough to ship (a resolver, not an institution)
5. It generalizes naturally to standing (per-action → per-project → per-enterprise)

**Arguments that it's a feature, not a category:**
1. It's one query on institutional state ("what directive governs this action?")
2. It doesn't address the deeper causes (decision rights, fragmentation)
3. It could be subsumed by platform features (Anthropic's memory, OpenAI's instruction hierarchy)
4. It's a point solution (one action at a time) that needs to become a system (all actions, all agents, all time)

**Arguments that it's the wrong abstraction:**
1. "Directive" implies the system tells the agent what to do — but the system should tell the agent what stands, not what to do
2. "Effective directive" sounds like a compliance/governance feature, not a developer productivity tool
3. The developer-facing framing ("your conflicting instructions are a problem we solve") may not resonate — developers may see conflicting instructions as a project hygiene problem, not a tool problem

---

## MY ASSESSMENT

**Effective directive is a USEFUL WEDGE into a larger category, not the final category.**

The larger category is **institutional state inference**: the ability to compute, for any action in a project, what is effective given all the project's claims, decisions, authority relations, and temporal context.

The wedge (effective directive) demonstrates the value of the category by solving a concrete, frequent, painful problem (instruction conflict) with a deterministic, citation-backed, auditable output.

The category (institutional state) is the long-term platform: a queryable, computable record of what the project knows, has decided, and how it governs — enabling any agent, any tool, any human to act with full awareness of what is effective.

**The risk:** The wedge may be successful enough to satisfy developers without ever expanding to the category. If developers adopt the resolver for instruction conflict and stop there, Bridge is a feature (instruction conflict resolution), not a platform (institutional state).

**The counter-risk:** The category may be too broad to ever ship. Institutional state is a large, ambitious, poorly-defined problem. If Bridge attempts to own it, it may never deliver anything concrete.

**The design challenge:** Find the smallest increment beyond effective directive that demonstrates institutional state value without requiring the full platform. Candidates:
- Standing records as persistent, queryable, citable records (not just one-time resolver output)
- Precedent: past standing records influence future standing evaluations
- Decision rights visualization: show the project's authority graph
- Transfer: standing records move with work across agents

---

*End of effective directive critique.*
