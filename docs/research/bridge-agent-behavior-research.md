# BRIDGE - Agent Behavior & Instruction Hierarchy Research

**Status:** Research analysis
**Date:** 2026-08-27
**Scope:** Study recent evidence from coding-agent systems. Determine whether instruction conflict is likely to grow or shrink as agents become more capable. Assess whether better reasoning makes external resolution LESS necessary.

---

## 1. INSTRUCTION HIERARCHY LANDSCAPE

### OpenAI's Instruction Hierarchy (March 2026)

OpenAI published "Improving instruction hierarchy in frontier LLMs" with concrete results:

| Conflict Type | Before | After | Improvement |
|---|---|---|---|
| System <> User Conflict | 0.84 | 0.95 | +0.11 |
| Developer <> User Conflict | 0.83 | 0.95 | +0.12 |

OpenAI's Model Spec hardcodes five authority levels: root, system, developer, user, guideline - encoded through special role tokens within chat templates.

**Key insight:** Instruction hierarchy is a MODEL TRAINING problem, not an external resolution problem. OpenAI is baking authority into the model's behavior through training and prompt engineering.

### Many-Tier Instruction Hierarchy (arXiv 2604.09443, 2026)

Academic work introducing "Many-Tier Instruction Hierarchy in LLM Agents":

- Ordinal variant: higher privilege instructions have lower orders
- Scalar variant: larger privilege value wins
- Key contribution: decouples privilege semantics from message role labels hard-coded in chat templates, enabling models to reason over arbitrarily many privilege levels at inference time

**Key insight:** The academic community is actively working on making models better at instruction hierarchy internally. If this work succeeds, external resolution becomes less necessary.

### ICML 2026: Reward-Free Alignment for Conflicting Objectives

ICML oral presentation on "Reward-free Alignment framework for Conflicted" - RACO adjusts training direction to reduce conflict while respecting user's desired trade-offs.

---

## 2. CODING AGENT INSTRUCTION SOURCES

### Current Agent Instruction Stack

| Source | Type | Scope | Authority (implicit) | Persistence |
|---|---|---|---|---|
| System prompt / model spec | Built-in | All interactions | Highest (model-level) | Fixed per model version |
| Claude Code system instructions | Configurable | Project/session | High | Project-level |
| AGENTS.md / CLAUDE.md | File-based | Project/repository | High (documented convention) | Version-controlled |
| .cursorrules | File-based | Project/repository | Medium | Version-controlled |
| Codex AGENTS.md | File-based | Project/repository | Medium-high | Version-controlled |
| Copilot instructions | Configurable | Workspace/user | Medium | Configured |
| Human prompt / task spec | Prompt-based | Task/session | Variable (explicit human = highest in Bridge framework) | Session-only |
| Issue tracker | External | Task/scope | Medium (specific scope) | External system |
| Documentation (ADRs, README, guides) | File-based | Project/long-term | Low-medium (stale risk) | Version-controlled |
| Environment manifests (package.json, tsconfig) | File-based | Active environment | Medium (current state) | Version-controlled |
| Policy files (SECURITY.md, CONTRIBUTING.md) | File-based | Project-wide | Medium-high | Version-controlled |

### The Conflict Surface

Conflicts arise at the intersections:
- AGENTS.md (root rule) vs AGENTS.md (nested subpackage rule)
- Stale documentation vs active manifest
- Human prompt override vs repository rule
- Issue request vs security policy
- Equal-tier specifications (v1 vs v2 docs)
- Self-contradictory human prompts

**The number of instruction sources is GROWING, not shrinking:**
- New agent tools introduce new instruction conventions (Codex AGENTS.md, Copilot instructions, Cursor rules)
- Projects accumulate more documentation over time
- More agents operating on the same project = more instruction sources to reconcile

---

## 3. WILL BETTER REASONING MAKE EXTERNAL RESOLUTION LESS NECESSARY?

### The Optimistic Case (Yes, Less Necessary)

1. **Models are improving at instruction hierarchy.** OpenAI's March 2026 results show +0.11-0.12 improvement on conflict resolution through training. Many-Tier IH paper shows scalar privilege models can handle arbitrary tiers.

2. **Models are improving at context engineering.** Anthropic's context engineering guidance, Mem0's 91% reduction in response time, PROJECTMEM's event-sourced memory - all point to models getting better at using structured context.

3. **Agent platforms are building instruction hierarchy in.** Claude Managed Agents with memory (April 2026), Codex AGENTS.md hierarchy, Copilot workspace instructions - platforms are absorbing the resolution problem into the agent runtime.

4. **If models can resolve conflicts internally, external resolution is redundant.** Why run a separate resolver when the model already knows that AGENTS.md overrides stale docs?

### The Pessimistic Case (No, Still Necessary)

1. **The conflict surface is expanding faster than model improvement.** New instruction sources (new agent conventions, more documentation, more agents) are added faster than models get better at resolving them. The net conflict load increases.

2. **Instruction hierarchy in models is limited to the model's training data.** A model trained on GitHub conventions may not know a specific project's authority structure. Project-specific standing requires project-specific knowledge that no general model can have.

3. **The authority framework is project-specific and dynamic.** What overrides what in one project may not in another. A developer override may be authoritative in one team's workflow but not in another's. Models can't learn every project's authority structure.

4. **Determinism matters for audit and compliance.** EU AI Act (August 2026) requires tamper-evident logs and traceable decisions. A model's internal resolution is probabilistic and unverifiable. A deterministic resolver produces an auditable standing record. For regulated environments, external deterministic resolution is not optional.

5. **The resolver provides citation and rationale.** Even if the model makes the "right" decision, it may not explain why. The resolver's citation-backed output is valuable for accountability, precedent, and memory - independent of whether the model would have made the same decision.

6. **Prompt injection and adversarial instructions.** Models are vulnerable to injected instructions. A deterministic resolver that evaluates instruction sources against authority tiers provides a defense layer that model-internal reasoning cannot guarantee.

### The Balanced Assessment

**Better reasoning makes external resolution LESS necessary for the AVERAGE case, but MORE valuable for the CRITICAL case.**

- Average case: clear hierarchy, no conflict, model follows the most prominent instruction - resolver adds little value
- Critical case: conflicting instructions, unclear authority, security-relevant action, auditable decision needed - resolver adds significant value

**As models improve, the resolver's value shifts from "preventing obvious errors" to "handling the hard cases that models still get wrong."**

This is a narrowing but not eliminating niche. The question is whether the niche is large enough to sustain a product.

**Key indicator:** EXP-005 results will show whether the current model (nvidia/nemotron-3-super-120b-a120b via OpenCode) benefits from external resolution. If the agent under RAW conditions already resolves most conflicts correctly, the resolver's marginal value is small. If the agent under RAW conditions makes systematic errors that the resolver prevents, the marginal value is large.

---

## 4. AGENT BEHAVIOR TRENDS

### Observed Trends (from research corpus and external search)

1. **Multi-agent systems are proliferating.** Gartner: 40% of enterprise applications will include task-specific AI agents by end of 2026, up from <5% in 2025. Deloitte: "AI agent sprawl is likely to increase across different programming languages, frameworks, infrastructure, and communication protocols."

2. **Agent memory is becoming standard.** Anthropic shipped Claude Managed Agents with memory (April 2026). agentmemory project supports 7+ agent platforms. Zep, Mem0, Letta, Cognee all targeting agent memory.

3. **Governance and audit trails are emerging as a distinct category.** EU AI Act enforcement (August 2026) is driving audit trail adoption. MakerChecker (AGPL-3.0, 2026), auditable (Apache-2.0, 2026), Agent-Sentry, Decision Provenance papers - all targeting agent accountability.

4. **Runtime policy enforcement is a growing category.** AWS AgentCore Policy (Cedar, July 2026), Databricks Unity AI Gateway, NeuralTrust TrustGate, ElixirData Context OS - all targeting "govern agent actions at runtime."

5. **Instruction hierarchy is a recognized problem.** OpenAI, academic community, and agent platform vendors all investing in instruction hierarchy. It is not a Bridge-specific insight - it is an industry-wide recognition.

### The Implication for Bridge

If instruction conflict is a recognized industry problem, and multiple vendors are working on it, Bridge's differentiation must be:
- **Deterministic resolution** (not model-internal, not probabilistic)
- **Citation-backed rationale** (not just a decision, but a why)
- **Project-specific authority** (not generic hierarchy, but project-configured standing)
- **Auditable standing records** (not just the decision, but the record for compliance and precedent)

These are defensible differentiators IF they matter to buyers. The question is whether developers or enterprises care about deterministic, citation-backed, project-specific, auditable resolution - or whether they're satisfied with "the model mostly gets it right."

---

## 5. THE KEY OPEN QUESTION

**Does the resolver improve agent behavior in live execution?**

EXP-005 is designed to answer this. The methodology document defines the falsification criteria:
1. Bridge outcome <= RAW outcome + 0.05 -> falsified
2. HUMAN outcome − BRIDGE outcome > 0.40 -> falsified
3. False blocks > useful prevented violations -> falsified

Until EXP-005 completes, the answer is unknown. The research corpus strongly suggests the resolver helps (EXP-004: 76% accuracy, 0% false allow), but the live agent experiment is the only way to know if the agent actually acts on the directive or ignores it.

**If the agent ignores the directive, the entire Bridge thesis collapses regardless of how good the resolver is.**

---

*End of agent behavior research.*
