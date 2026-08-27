# BRIDGE — Category Research: What Should Bridge Become?

**Status:** Research analysis
**Date:** 2026-08-27
**Scope:** Determine what category Bridge should occupy, based on first-principles analysis of the problem, the primitives, the market, the competition, and the defensibility. Not marketing. Not product specification. Category discovery.

---

## 1. THE FUNDAMENTAL PROBLEM (REFORMULATED)

Multiple legitimate actors (humans, agents, systems, documents) make claims about what state an action should produce. The system must determine, for each action, which claim is effective — accounting for authority, staleness, scope, conflict, and evidence — and produce an auditable record of the determination.

This is not:
- Consensus (all actors agree)
- Simple policy evaluation (a fixed rule set)
- Access control (is this action allowed?)
- Agent memory (what happened before?)

This IS:
- **Computational common-law authority resolution:** determining which claim governs, with what authority, under what conditions, with a record.

---

## 2. CANDIDATE CATEGORIES — EVALUATION

### Category A: Agent Coordination

**What it sounds like:** Bridge coordinates multiple agents so they work together coherently.

**What it actually is:** Bridge doesn't coordinate agents. It provides standing information that agents may or may not use. Coordination is a different function (who does what, when, in what order).

**Verdict:** WRONG CATEGORY. Bridge is not about coordinating agent behavior (scheduling, delegation, handoff). It's about computing what is effective for any proposed action.

---

### Category B: Context Infrastructure

**What it sounds like:** Bridge manages the context that agents see — what files, what instructions, what memory.

**What it actually is:** Bridge doesn't manage context. It reads instruction sources (which are one type of context) and computes standing. Context management is broader (conversation history, tool outputs, memory). Bridge is narrower (standing computation from instruction sources).

**Verdict:** WRONG CATEGORY. Too broad. Memory systems (Mem0, Zep, agentmemory) are context infrastructure. Bridge is standing computation, not context management.

---

### Category C: Project Intelligence

**What it sounds like:** Bridge makes projects smarter — it understands the project and guides agents accordingly.

**What it actually is:** Bridge doesn't make the project smarter. It computes standing from the project's own instruction sources. "Intelligence" implies understanding, reasoning, learning — Bridge is deterministic computation, not intelligence.

**Verdict:** WRONG CATEGORY. Too vague and anthropomorphic. "Project intelligence" sounds like AI understanding the project. Bridge is authority evaluation, not intelligence.

---

### Category D: Decision Infrastructure

**What it sounds like:** Bridge is infrastructure for making and recording decisions — who decided what, why, with what authority.

**What it actually is:** This is closer. Standing computation produces decisions (effective directives) and records them. But "decision infrastructure" is broad (any decision-making system). Bridge is specifically about standing from instruction sources, not general decision infrastructure.

**Verdict:** PARTIALLY RIGHT, but too broad. Decision infrastructure includes meeting tools, voting systems, approval workflows. Bridge is standing computation, which is a specific type of decision infrastructure.

---

### Category E: Authority Infrastructure

**What it sounds like:** Bridge is infrastructure for authority — who has authority, how it's exercised, how it's recorded.

**What it actually is:** Closer. Standing is a property of authority (which authority governs this action?). But "authority infrastructure" is also broad (RBAC, IAM, policy engines all deal with authority). Bridge's specific contribution is action-specific, temporally-aware, claim-based standing — not generic authority.

**Verdict:** CLOSER, but still too broad. Authority infrastructure already exists (OPA, Cedar, IAM). Bridge's differentiation is standing (dynamic, action-specific, claim-based), not authority itself.

---

### Category F: Policy Resolution

**What it sounds like:** Bridge resolves policy conflicts — which policy applies, how conflicts are resolved.

**What it actually is:** Bridge doesn't resolve policy conflicts. It resolves instruction conflicts. Policy engines (OPA, Cedar) evaluate policies. Bridge evaluates claims from instruction sources against an authority framework. The "policy" in "policy resolution" suggests a fixed rule set, not competing claims with authority tiers.

**Verdict:** CLOSE BUT MISALIGNED. Policy resolution is about rules. Bridge is about claims with authority. The distinction matters: a policy says "PRs require approval." A claim says "this specific PR should be merged without approval because the developer override says so." Policy resolution evaluates the rule. Bridge evaluates the claim.

---

### Category G: Agent Governance

**What it sounds like:** Bridge governs agent behavior — what agents can do, what they should do, with what constraints.

**What it actually is:** Bridge doesn't govern agents (it doesn't enforce, block, or control). It produces directives that agents may follow or ignore. Governance platforms (AWS AgentCore, Databricks Unity Gateway) enforce. Bridge recommends with authority.

**Verdict:** WRONG CATEGORY for enforcement. Right category for standing computation as a component of governance. But Bridge is not a governance platform — it's a standing computation layer that governance platforms could use.

---

### Category H: Institutional Intelligence

**What it sounds like:** Bridge understands how institutions (projects, teams, companies) make decisions and makes that understanding available to agents and actors.

**What it actually is:** This is the strongest category candidate. "Institutional intelligence" captures:
- The institution's claims (instruction sources, decisions, authority relations)
- The institution's authority framework (tiers, delegation, override, veto)
- The institution's standing computation (which claim is effective for which action)
- The institution's standing records (what was determined, with what authority, when)
- The institution's precedent (how past standing influences future standing)

**What it implies:** Bridge is not a developer tool, not an agent platform, not a policy engine. It's institutional intelligence infrastructure — the computational layer that makes an institution's decision model queryable, computable, and usable by any actor.

**Verdict:** STRONGEST CATEGORY CANDIDATE. It captures the scope (beyond single directives, beyond developer tools), the function (computation of institutional decision state), and the differentiation (no existing system does this). But it's abstract and may not resonate as a market category.

---

### Category I: Effective Authority

**What it sounds like:** Bridge computes effective authority — which authority is effective for which action, under what conditions.

**What it actually is:** This is the most precise category name. "Effective authority" captures:
- Authority (the framework of who has standing)
- Effective (action-specific, temporal, scoped)
- Computation (deterministic, citation-backed)

**What it implies:** Bridge is not about static authority (RBAC) or dynamic policy (OPA) or agent memory. It's about which authority is effective right now, for this action, given all the claims and the authority framework.

**Verdict:** MOST PRECISE CATEGORY NAME. It's specific, technically accurate, and differentiated from existing categories. But "effective authority" may not resonate with buyers — it sounds like a compliance term, not a developer tool.

---

### Category J: Standing Computation

**What it sounds like:** Bridge computes standing — which claim is effective, with what authority, under what conditions.

**What it actually is:** This is what Bridge actually does. Standing is the property. Computation is the function.

**What it implies:** Bridge is a standing computation engine. The output is standing (effective directive + standing record). The input is claims + authority framework + context. The value is knowing what is effective.

**Verdict:** MOST ACCURATE DESCRIPTION, but "standing" is an unfamiliar term to most buyers. It's the right category, but the name may need to be translated into something buyers understand.

---

## 3. CATEGORY SELECTION — THE HONEST ANSWER

**The most precise category is standing computation.**

Bridge computes standing: for any proposed action, under the current institutional context, which claim is effective, with what authority, with what record.

This is not a marketing category. It's a technical category. It's precise. It's differentiable. It's defensible. But it may not be a market category — buyers may not recognize "standing computation" as a problem they have.

**The most resonant category is institutional intelligence.**

"Institutional intelligence" captures the broader vision: Bridge makes the institution's decision model — its claims, authority, standing, precedent, and accepted state — computable and queryable. This is a broader, more aspirational category that encompasses standing computation as its core function.

**The most useful category for the developer wedge is effective directive resolution.**

Developers don't care about "standing" or "institutional intelligence." They care about: "my agent is about to do something; what should it do, given all the conflicting instructions?" The answer is an effective directive. The wedge is "we compute the effective directive so your agent doesn't follow the wrong instruction."

**The most useful category for the enterprise expansion is governance and compliance infrastructure.**

Enterprises care about: "our agents operate across multiple systems with multiple authorities; we need to know what is effective, with a record for audit and compliance." The answer is standing computation + standing records + compliance export. The expansion is "we provide the standing layer that your governance and compliance infrastructure needs."

---

## 4. THE BRIDGE CATEGORY — FINAL ANSWER

**Bridge's category is standing computation — delivered as effective directives for developers and institutional intelligence for enterprises.**

This is not a single category name. It's a layered category:

| Layer | Category Name | Target Audience | What It Solves |
|---|---|---|---|
| Technical | Standing computation | Researchers, engineers | Deterministic computation of effective claims from authority frameworks |
| Developer | Effective directive resolution | Developers | "What should my agent do, given conflicting instructions?" |
| Enterprise | Institutional intelligence / governance infrastructure | Compliance, governance, platform teams | "What is effective across our systems, with a record for audit?" |

**The technical category is the truth.** Standing computation is what Bridge does. It's the primitive. It's the differentiator. It's the moat (if it materializes).

**The developer category is the wedge.** Effective directive resolution is the smallest useful product that demonstrates standing computation's value.

**The enterprise category is the expansion.** Institutional intelligence / governance infrastructure is where Bridge goes if standing computation proves valuable beyond the developer wedge.

**The recommendation:** Use "standing computation" as the internal category (what Bridge is). Use "effective directive resolution" as the developer-facing category (what developers buy). Use "institutional intelligence" as the enterprise-facing category (what enterprises buy). Don't force a single category name — different audiences need different framing.

---

## 5. WHY NOT OTHER CATEGORIES?

| Category | Why It's Wrong |
|---|---|
| Agent coordination | Bridge doesn't coordinate agents; it computes standing |
| Context infrastructure | Too broad; memory systems already here |
| Project intelligence | Vague, anthropomorphic; implies understanding, not computation |
| Decision infrastructure | Too broad; includes many non-standing decision systems |
| Authority infrastructure | Too broad; OPA, Cedar, IAM already here |
| Policy resolution | Wrong framing; Bridge resolves claims, not policies |
| Agent governance | Bridge doesn't enforce; it recommends with authority |
| Instruction hierarchy | Too narrow; it's a model-training problem, not a system problem |
| Compliance tool | Too narrow for the vision; compliance is an expansion, not the category |

---

## 6. THE CATEGORY MAP (SUMMARY)

See `docs/research/bridge-category-map.md` for the full category map, including existing standards, existing systems, Bridge's boundary, developer wedge, enterprise expansion, and potential moat.

---

*End of category research.*
