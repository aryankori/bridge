# BRIDGE — Wedge vs. Moat: 5 Candidate Products

**Status:** Research analysis
**Date:** 2026-08-27
**Scope:** For every viable product idea, identify wedge, moat, and expansion. Cover at least 5 candidates.

---

## PRODUCT 1: Developer Instruction Resolver (Current Wedge)

**What it is:** A deterministic resolver that reads a project's instruction sources (AGENTS.md, CLAUDE.md, docs, manifests, prompts, policies), evaluates conflicts against a configurable authority framework, and produces a citation-backed effective directive for a proposed action.

**WEDGE:**
- Solves an immediate, frequent pain: conflicting instructions across multiple sources
- Developer-facing: "run this before your agent acts, see what it should do"
- Minimal setup: point it at a repo, it reads the files it finds
- No enterprise procurement, no new protocol, no huge configuration
- Works locally, offline, deterministically

**MOAT:**
- Weak. The resolver algorithm is replicable. The citation format could be standardized. Platform vendors could add similar functionality.
- Moderately stronger if standing records accumulate and create switching cost.
- The authority framework configuration is project-specific, creating some switching cost.

**EXPANSION:**
- From single-action resolution → standing computation across all actions
- From resolver output → standing records as audit trail and precedent
- From developer tool → enterprise governance and compliance
- From local tool → cross-agent, cross-platform standing layer

**ASSESSMENT:** Good wedge, weak moat, plausible expansion. The wedge demonstrates value; the moat comes from accumulation and expansion, not from the wedge itself.

---

## PRODUCT 2: Standing Records & Audit Trail

**What it is:** A persistent, queryable, tamper-evident record of every standing determination — what was decided, by what authority, with what rationale and citations, at what time, for which action. Exportable in a compliance-friendly format (EU AI Act Article 12, SOC 2, ISO 27001).

**WEDGE:**
- Compliance-driven: EU AI Act (August 2026) requires tamper-evident logs for high-risk AI systems
- Audit-driven: "show me what the agent was told to do and why" — a question auditors and engineers ask
- Natural extension of the resolver: the resolver already produces the data; persistent storage is the incremental step
- Appears as a feature of the resolver initially, then emerges as a standalone product for compliance buyers

**MOAT:**
- Moderate to strong for the compliance niche. Compliance demands specific formats, determinism, and auditability. Competitors must match the format to replace Bridge.
- Standing records accumulate over time, creating data moat (precedent, history).
- Switching cost: replacing Bridge means losing standing history and reconfiguring compliance export format.

**EXPANSION:**
- From standing records → full institutional state query (precedent, authority graph, claim history)
- From compliance export → real-time standing query for agents and tools
- From audit trail → governance platform (govern what agents do based on standing)

**ASSESSMENT:** Stronger moat than the resolver alone. The compliance angle creates a real buyer with budget. The accumulation of standing records creates a data moat. But the wedge is narrower (compliance-driven buyers, not all developers).

---

## PRODUCT 3: Cross-Agent Standing Consistency

**What it is:** A neutral standing layer that multiple agents (Claude Code, OpenCode, Codex, Gemini CLI, etc.) consult before acting. Each agent reads the same standing determination, ensuring consistent behavior across agents and platforms.

**WEDGE:**
- Multi-agent pain: developers using multiple agents on the same project experience inconsistent behavior (one agent follows AGENTS.md, another follows the prompt, another follows the manifest)
- Natural extension: standing records are already computed; serving them to multiple agents is the incremental step
- Protocol-agnostic: agents consult standing via any transport (file, API, protocol)

**MOAT:**
- Moderate. The standing layer becomes the shared source of truth for multi-agent projects. Replacing it means losing cross-agent consistency.
- Network effects possible: the more agents use the standing layer, the more valuable it is (consistency across more agents).
- But: if each agent has its own built-in resolver, the standing layer must be better than the built-in to be consulted.

**EXPANSION:**
- From standing consistency → full institutional state shared across agents
- From standing layer → cross-agent work transfer anchored in standing
- From multi-agent → multi-project, multi-team, multi-organization standing

**ASSESSMENT:** Strong positioning if multi-agent development is common. The standing layer becomes infrastructure that all agents depend on. The moat is in the shared standing records and the network effects of multi-agent consistency. But the wedge requires multi-agent development to be a real, frequent pain point — which is plausible but not yet proven at scale.

---

## PRODUCT 4: Project Authority Configuration & Visualization

**What it is:** A tool for configuring, visualizing, and managing a project's authority framework — which instruction sources have which standing tiers, how delegation works, what override rules apply, what veto rules apply. Visual graph of the authority structure with explanations.

**WEDGE:**
- Configuration pain: projects need to define their authority framework; doing it in code or config files is opaque and hard to reason about
- Visualization: showing the authority graph helps developers understand why certain directives are effective
- Natural extension: the resolver needs the authority configuration; making it visible and editable is the incremental step

**MOAT:**
- Weak to moderate. Authority configuration is project-specific, creating switching cost. But the configuration is not deeply technical — a competitor could offer a similar configuration UI.
- Visualization is a feature, not a moat. The moat is in the configuration data (the project's authority framework), which accumulates and becomes harder to replace.

**EXPANSION:**
- From configuration → authority framework as code (version-controlled, reviewable, testable)
- From visualization → authority framework evolution tracking (how standing changes over time)
- From project-specific → organization-wide authority frameworks (teams, departments, enterprises)

**ASSESSMENT:** Useful feature but weak as a standalone product. The authority configuration is necessary for the resolver to work, but it's not a compelling standalone purchase. It's a configuration tool that adds value as part of the broader platform.

---

## PRODUCT 5: Institutional State Platform (Full Vision)

**What it is:** A comprehensive platform that computes, stores, queries, and serves institutional state for any project, team, or organization — claims, authority, decisions, standing, precedent, and accepted state — in a form that any agent, tool, or human can use.

**WEDGE:**
- The wedge is the developer instruction resolver (Product 1). It demonstrates the value of standing computation for a frequent, painful problem.
- From resolver → standing records (Product 2) → cross-agent standing (Product 3) → authority configuration (Product 4) → full institutional state platform.

**MOAT:**
- Strong, IF the category materializes. Institutional state is a large, complex, project-specific problem with no existing comprehensive solution.
- Data moat: accumulated claims, standing records, precedent, authority configurations across projects
- Switching cost: replacing the institutional state platform means losing all accumulated state and reconfiguring all project authority frameworks
- Network effects: if the platform becomes the standard way to compute and query institutional state, the more projects use it, the more valuable it is (shared formats, shared precedent patterns, shared authority frameworks)

**EXPANSION:**
- From developer projects → enterprise teams → departments → organizations → multi-organization (supply chain, consortiums)
- From coding agents → any agent (research, operations, customer service, finance)
- From standing computation → full decision infrastructure (who decides what, with what authority, with what record)

**ASSESSMENT:** This is the platform vision. It is the strongest moat if achieved, but it is the most speculative. The wedge (Product 1) must succeed before the platform can emerge. The platform requires the category to be recognized by the market. If institutional state proves to be a real category, this is the product to build. If it doesn't, the platform is solving a problem that doesn't exist.

---

## COMPARISON TABLE

| Product | Wedge Strength | Moat Strength | Expansion Potential | Near-Term Feasibility |
|---|---|---|---|---|
| 1. Developer Resolver | Strong | Weak | Plausible | Proven (EXP-004, EXP-005) |
| 2. Standing Records & Audit | Moderate | Moderate-Strong | Strong | Incremental from resolver |
| 3. Cross-Agent Consistency | Moderate | Moderate | Strong | Depends on multi-agent adoption |
| 4. Authority Configuration | Weak | Weak-Moderate | Moderate | Feature, not product |
| 5. Institutional State Platform | Strong (via resolver) | Strong (if category exists) | Very Strong | Long-term, speculative |

**Ranking by near-term feasibility + moat potential:**
1. Developer Resolver (ship now, prove value, build accumulation)
2. Standing Records & Audit (add to resolver, capture compliance angle)
3. Cross-Agent Consistency (extend standing records to multiple agents)
4. Authority Configuration (feature within the platform)
5. Institutional State Platform (long-term vision, contingent on category materializing)

---

*End of wedge vs. moat analysis.*
