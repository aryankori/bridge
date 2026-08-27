# BRIDGE — Primitive Hunt: What Is Below Standing? What Is Above It?

**Status:** Research analysis
**Date:** 2026-08-27
**Scope:** For each candidate primitive, determine formal meaning, inputs, outputs, lifecycle, dependencies, standards, products, commoditization risk, novelty, usefulness, defensibility. Find the primitive BELOW standing that explains all observed problems. Find the primitive ABOVE standing that better generalizes.

---

## CANDIDATE PRIMITIVES — EVALUATION MATRIX

### 1. MESSAGE

| Dimension | Assessment |
|---|---|
| **Formal meaning** | A unit of communication between actors (agent, human, system) |
| **Inputs** | Sender, recipient, content, metadata (timestamp, channel, priority) |
| **Outputs** | Received message, acknowledged message, acted-upon message |
| **Lifecycle** | Sent → received → interpreted → (possibly) acted upon → archived/forgotten |
| **Dependencies** | Transport layer, encoding, addressing |
| **Existing standards** | HTTP, JSON-RPC, ACP, A2A, MCP, email, chat protocols — extremely mature |
| **Existing products** | Every messaging system ever built |
| **Commoditization risk** | **MAXIMUM.** Messaging is solved. Any Bridge layer built on "messages" is trivially replaceable. |
| **Technical novelty** | None expected |
| **Product usefulness** | Necessary infrastructure, not a product |
| **Business defensibility** | None |

**Verdict:** Message is a transport primitive, not the Bridge primitive. It is the pipe, not the water.

---

### 2. CONTEXT

| Dimension | Assessment |
|---|---|
| **Formal meaning** | The set of information available to an actor at a point in time when making a decision |
| **Inputs** | Files, instructions, memories, conversation history, tool outputs, environment state |
| **Outputs** | Informed decision, action, response |
| **Lifecycle** | Assembled → consumed → evolves with new information → discarded/replaced |
| **Dependencies** | Memory, file system, instruction sources, agent runtime |
| **Existing standards** | Context engineering (Anthropic 2025), prompt engineering, RAG — emerging but not standardized |
| **Existing products** | Context7, Mem0, agentmemory, Zep, Letta, Cognee, PROJECTMEM — all competing in this space |
| **Commoditization risk** | **HIGH.** Multiple open-source and commercial projects targeting "agent memory/context." Anthropic ships built-in memory. The space is crowded. |
| **Technical novelty** | Moderate — Bridge's contribution would be structured, authority-aware context, not context itself |
| **Product usefulness** | High — context is the raw material of agent decisions |
| **Business defensibility** | Low to moderate — depends on what is done WITH context, not context itself |

**Verdict:** Context is the raw material. Bridge adds structure (authority, provenance, decision rights) to context, but context alone is not the primitive. The crowd is already here.

---

### 3. STATE

| Dimension | Assessment |
|---|---|
| **Formal meaning** | The condition of a system at a point in time, characterized by the values of its relevant variables |
| **Inputs** | Prior state, actions, events, external inputs |
| **Outputs** | New state, state transitions, derived projections |
| **Lifecycle** | Initialized → transitions through actions/events → observed/queried → archived |
| **Dependencies** | Storage, serialization, versioning, mutation mechanisms |
| **Existing standards** | Git (file/project state); database ACID; state machines; CRDTs; event sourcing; Kubernetes resource state |
| **Existing products** | Git, databases, Kubernetes, event-sourcing frameworks, Redux, Zustand — infinitely many |
| **Commoditization risk** | **MAXIMUM for generic state.** Git already solves project file state. Databases solve structured state. |
| **Technical novelty** | Bridge's contribution: authority-annotated state (state + who can change it + why + when) |
| **Product usefulness** | High as infrastructure; only valuable as a product if the annotation is the differentiator |
| **Business defensibility** | None for raw state; moderate for authority-annotated state IF that annotation is systematically valuable |

**Verdict:** State is the medium. Git already owns project file state. Bridge's "structured state" thesis (Hermes review) is closest to this primitive, but the key question is whether authority-annotated state is a real category or an enhancement to existing state management.

---

### 4. MEMORY

| Dimension | Assessment |
|---|---|
| **Formal meaning** | Persistent record of past events, decisions, or facts, retrievable for future use |
| **Inputs** | Observations, decisions, events, explicit writes |
| **Outputs** | Retrieved memories, context assembled from memories, forgetting/decay |
| **Lifecycle** | Written → stored → retrieved → may decay or be updated → archived/deleted |
| **Dependencies** | Storage, retrieval mechanisms, relevance scoring, update policies |
| **Existing standards** | No universal standard; Mem0, Letta, Zep/Graphiti, Cognee, LlamaIndex Memory, PROJECTMEM, agentmemory — all competing |
| **Existing products** | Above — crowded field. Anthropic ships built-in agent memory. |
| **Commoditization risk** | **HIGH AND INCREASING.** Anthropic, OpenAI, and Google all shipping or planning agent memory. Open-source projects proliferating. If memory becomes a feature of agent platforms, standalone memory products face existential threat. |
| **Technical novelty** | Bridge's contribution: memory as decision record with authority annotation, not just fact retrieval |
| **Product usefulness** | High near-term; potentially zero if platform memory subsumes it |
| **Business defensibility** | **WEAK.** Memory is the most likely candidate to be subsumed by platform features. The moat would be cross-agent, cross-platform memory — but platform vendors may block that. |

**Verdict:** Memory is a strong near-term wedge but a weak long-term moat. If Bridge's memory thesis depends on platforms NOT building memory, that is a fragile bet.

---

### 5. CLAIM

| Dimension | Assessment |
|---|---|
| **Formal meaning** | An assertion made by an actor about the world, a decision, a fact, or a preference, with an identifiable source |
| **Inputs** | Claimant, content, evidence (optional), timestamp, scope |
| **Outputs** | Recorded claim, evaluated claim (accepted/rejected/flagged), used claim (influences decision) |
| **Lifecycle** | Made → recorded → evaluated (against other claims, evidence, authority) → accepted/rejected/flagged → may be superseded |
| **Dependencies** | Claim registration, evidence attachment, evaluation mechanism, authority for acceptance |
| **Existing standards** | No direct standard. Closest: RDF/semantic web triples, legal pleadings, scientific claims, git commit messages (implicit claims about code) |
| **Existing products** | No dominant "claim management" product. Decision logs, audit trails, CRDT conflict resolution, version control, consensus systems all handle claims indirectly. |
| **Commoditization risk** | **LOW.** Claim-centric systems are not yet commoditized. But the concept is abstract — products built on "claims" risk being too general. |
| **Technical novelty** | **MODERATE-HIGH.** The idea that project state is fundamentally a set of competing claims with varying authority is not a standard framing. |
| **Product usefulness** | Potentially high — claims naturally capture the multi-source instruction conflict problem |
| **Business defensibility** | Moderate — depends on whether claim management becomes a recognized category |

**Verdict:** Claim is the most promising primitive BELOW standing. It explains the core observed problem: multiple legitimate actors make conflicting claims about what should happen, and the system needs to evaluate them. Standing is a property of claims (which claims are effective for which actions), not a primitive itself.

**Formal claim structure:**

```
Claim {
  id: unique identifier
  source: Actor (human, agent, system, document)
  content: Assertion (what is claimed)
  scope: Action/Decision/State that the claim pertains to
  evidence: Evidence supporting the claim (optional)
  timestamp: When the claim was made
  status: ACTIVE / SUPERSEDED / REJECTED / AMBIGUOUS
}
```

**Why claims explain the Bridge problem better than "instructions":**
- An instruction file is a claim: "AGENTS.md claims all functions should be camelCase"
- A human prompt is a claim: "Developer claims this specific function should be snake_case"
- A stale document is a claim: "2021 tooling guide claims Jest is the test runner"
- An active manifest is a claim: "package.json claims Vitest is the test runner"
- A security policy is a claim: "SECURITY.md claims secrets must never be hardcoded"
- An issue is a claim: "Issue #78 claims the token should be hardcoded"

The conflict is not between "instruction files." It is between claims with different sources, scopes, timestamps, and evidence. Standing is the evaluation of which claim is effective for which action.

---

### 6. EVIDENCE

| Dimension | Assessment |
|---|---|
| **Formal meaning** | A record that supports or refutes a claim, with provenance |
| **Inputs** | Evidence producer, content, claim it pertains to, timestamp, provenance |
| **Outputs** | Validated/invalidated claim, strength assessment |
| **Lifecycle** | Produced → attached to claim → evaluated → archived |
| **Dependencies** | Claim framework, provenance tracking, verification mechanisms |
| **Existing standards** | Evidence-based medicine, legal evidence rules, audit trails, scientific citation — fragmented |
| **Existing products** | Audit trail systems, evidence management (legal), citation systems — no unified "evidence layer" for agents |
| **Commoditization risk** | Low — no dominant evidence layer exists |
| **Technical novelty** | Moderate — evidence attachment to agent claims is not standard |
| **Product usefulness** | High for audit/compliance; moderate for real-time agent decisions |
| **Business defensibility** | Moderate — evidence archival is valuable for compliance (EU AI Act), but real-time evidence use is harder to monetize |

**Verdict:** Evidence is a supporting primitive, not the core. It is what makes claims evaluable, but the core problem is claim evaluation, not evidence storage.

---

### 7. DECISION

| Dimension | Assessment |
|---|---|
| **Formal meaning** | A commitment to a specific course of action, made by an identifiable authority, with recorded rationale |
| **Inputs** | Decision-maker, options considered, rationale, constraints, timestamp |
| **Outputs** | Recorded decision, action taken, accountability trail |
| **Lifecycle** | Proposed → evaluated → decided → recorded → implemented → may be revisited/superseded |
| **Dependencies** | Authority for decision, evaluation of options, recording mechanism, implementation follow-through |
| **Existing standards** | ADRs (Architecture Decision Records), RFCs, meeting minutes, decision logs, legal judgments, git commits (implicit decisions) |
| **Existing products** | ADR tools, decision log templates, Confluence pages, Notion databases — all informal; no dominant "decision management" product |
| **Commoditization risk** | Low — decision management as a systematic product is underserved |
| **Technical novelty** | **MODERATE.** The systematic treatment of decisions as first-class objects with authority, rationale, and supersession is not standard in software tooling. |
| **Product usefulness** | High — every project makes decisions; most lose track of them |
| **Business defensibility** | Moderate — depends on whether "decision infrastructure" becomes a recognized category |

**Verdict:** Decision is a strong candidate. It captures the "commitment" layer of the dependency chain. But it is downstream of claims: decisions resolve claims. The core primitive may be claims-with-evaluation, of which decisions are the output.

---

### 8. AUTHORITY

| Dimension | Assessment |
|---|---|
| **Formal meaning** | The recognized right of an actor to make decisions or claims that bind others in a given domain |
| **Inputs** | Actor, domain, scope, delegation chain (optional), recognition mechanism |
| **Outputs** | Authoritative decisions, binding claims, enforcement of decisions |
| **Lifecycle** | Granted/delegated → exercised → may be revoked/limited/superseded |
| **Dependencies** | Recognition framework, delegation mechanism, enforcement mechanism |
| **Existing standards** | RBAC, ABAC, IAM, SPIFFE/SPIRE (identity), OAuth scopes, legal authority, corporate governance, Zanzibar-style authorization |
| **Existing products** | OPA, Cedar, Cerbos, AWS Verified Permissions, Azure RBAC, Kubernetes RBAC — mature authorization ecosystems |
| **Commoditization risk** | **HIGH for generic authorization.** OPA (29% of OSS projects using PaC), Cedar (AWS-backed), Cerbos, and many others compete. Authorization is a solved problem for traditional systems. |
| **Technical novelty** | **MODERATE.** Bridge's contribution: authority is not static (RBAC) but dynamic and action-specific (standing). This is novel but unproven. |
| **Product usefulness** | High IF dynamic standing is real and useful; zero if static authorization suffices |
| **Business defensibility** | **WEAK for authorization alone.** OPA, Cedar, IAM exist. Bridge must differentiate on dynamic/contextual authority, not authorization itself. |

**Verdict:** Authority is the current Bridge framing, but it is also the most commoditized adjacent space. The key question: is dynamic, action-specific standing a real extension of authority, or is it a solution looking for a problem that static authorization + policy engines already solve?

---

### 9. STANDING

| Dimension | Assessment |
|---|---|
| **Formal meaning** | For a given action, under current conditions, the effective authority that governs — which claims are active, which are superseded, which conflict, and what the resolution is |
| **Inputs** | Action, claims/sources, authority graph, temporal context, policy rules |
| **Outputs** | Effective directive, conflict status, governing authority, resolution rationale |
| **Lifecycle** | Computed at decision time → may be cached → recomputed when conditions change → archived as decision record |
| **Dependencies** | Claim framework, authority hierarchy, temporal reasoning, conflict detection |
| **Existing standards** | No direct standard. Closest: legal precedent systems, policy evaluation engines, consensus protocols — none capture action-specific dynamic standing |
| **Existing products** | No dominant "standing" product. OPA/Cedar evaluate policies but don't model competing legitimate authorities with temporal standing. |
| **Commoditization risk** | **LOW currently, but at risk from policy engine evolution.** If OPA/Cedar add dynamic standing semantics, Bridge's differentiation shrinks. |
| **Technical novelty** | **HIGH.** Action-specific, temporally-aware standing across competing legitimate authorities is not a standard concept. |
| **Product usefulness** | Potentially high — but unproven. EXP-004 shows resolver works (76% accuracy); EXP-005 is testing whether it improves agent behavior. |
| **Business defensibility** | **UNKNOWN.** Depends on whether standing proves to be a durable category or a feature of a larger system. |

**Verdict:** Standing is the current Bridge thesis. It is the most defensible primitive IF it proves useful. But it is downstream of claims (standing is claim evaluation) and may be upstream of something broader (effective state, institutional intelligence).

---

### 10. EFFECTIVE DIRECTIVE

| Dimension | Assessment |
|---|---|
| **Formal meaning** | The single actionable output of standing evaluation: what the agent should do, what it should not do, and why |
| **Inputs** | Standing evaluation (claims, authority, conflicts, resolution) |
| **Outputs** | Directive (permit/block/flag/escalate), rationale, citations |
| **Lifecycle** | Computed → injected into agent context → agent acts or doesn't → outcome recorded |
| **Dependencies** | Standing evaluation, agent context injection |
| **Existing standards** | No standard. Closest: policy engine allow/deny decisions, but those don't include rationale or citations |
| **Existing products** | Policy engines produce allow/deny; Bridge produces allow/deny + why + citations |
| **Commoditization risk** | **MODERATE.** Policy engines could add rationale, but currently don't. Citations are Bridge's differentiator. |
| **Technical novelty** | Moderate — the format and citation-backed nature are novel |
| **Product usefulness** | High for agent instruction; may be too narrow as a standalone product |
| **Business defensibility** | Moderate — depends on whether the format becomes a standard agents expect |

**Verdict:** Effective directive is the developer wedge — the smallest useful output. It is a projection of standing, not the primitive itself.

---

### 11. GOVERNED ACTION

| Dimension | Assessment |
|---|---|
| **Formal meaning** | An action proposed by an agent, evaluated against standing/authority, and either permitted, modified, blocked, or escalated |
| **Inputs** | Proposed action, actor, context, standing evaluation |
| **Outputs** | Decision: allow / deny / modify / escalate, with record |
| **Lifecycle** | Proposed → evaluated → decided → executed (or not) → recorded |
| **Dependencies** | Standing evaluation, policy enforcement point, action detection |
| **Existing standards** | OPA/Cedar policy evaluation, Kubernetes admission control, API gateways — mature for traditional systems |
| **Existing products** | AgentCore Gateway, Unity AI Gateway, NeuralTrust TrustGate, ElixirData Context OS — emerging agent-specific enforcement |
| **Commoditization risk** | **HIGH AND RISING.** AWS AgentCore Policy (Cedar, July 2026), Databricks Unity AI Gateway, multiple startup governance platforms all target "govern agent actions at runtime." |
| **Technical novelty** | Low to moderate — action gating is the standard control-plane pattern |
| **Product usefulness** | High for security/compliance; Bridge's differentiation would be policy authoring (standing), not enforcement |
| **Business defensibility** | **WEAK.** The governance enforcement space is being populated by AWS, Databricks, and startups. Bridge cannot win as a generic action gate. |

**Verdict:** Governed action is the enforcement layer. Bridge should NOT own enforcement — it should own policy authoring (standing) that feeds enforcement. This is the control-plane attack conclusion.

---

### 12. ACCEPTED STATE

| Dimension | Assessment |
|---|---|
| **Formal meaning** | The state of a system after a governed action has been applied and accepted as valid |
| **Inputs** | Prior state, action, decision, actor |
| **Outputs** | New state, audit record, acceptance trail |
| **Lifecycle** | State transition → acceptance check → committed → observable |
| **Dependencies** | State management, governance, acceptance criteria |
| **Existing standards** | Git (committed state), database transactions (committed state), event sourcing (accepted events) |
| **Existing products** | Git, databases, event stores — mature |
| **Commoditization risk** | **HIGH for generic accepted state.** Git already does this for code. |
| **Technical novelty** | Low — accepted state is a standard concept |
| **Product usefulness** | Only valuable if "accepted" carries authority annotation |
| **Business defensibility** | Low |

**Verdict:** Accepted state is a consequence of governed action, not a primitive. Git already owns accepted state for code.

---

### 13. DECISION RIGHTS

| Dimension | Assessment |
|---|---|
| **Formal meaning** | The formally allocated authority to make specific types of decisions, as distinct from general authority |
| **Inputs** | Decision type, allocator, delegatee, scope, constraints |
| **Outputs** | Decision right record, decision within rights, violation record |
| **Lifecycle** | Allocated → exercised → may be modified/revoked |
| **Dependencies** | Organizational structure, allocation mechanism, enforcement |
| **Existing standards** | DOA (Delegation of Authority) policies in enterprises, corporate governance, legal delegation doctrine |
| **Existing products** | Enterprise DOA tools, governance platforms — fragmented, mostly manual |
| **Commoditization risk** | Low — decision rights as a systematic software concept is underserved |
| **Technical novelty** | **HIGH.** Translating organizational decision rights into computational form is not standard. |
| **Product usefulness** | High for enterprise; may be too organizational for developer wedge |
| **Business defensibility** | Moderate — depends on enterprise adoption |

**Verdict:** Decision rights is the most promising primitive ABOVE standing. It generalizes the problem from "which instruction source wins?" to "who has the right to decide what, and how do we know?" This is institutional knowledge, not just developer tooling.

---

### 14. INSTITUTIONAL STATE

| Dimension | Assessment |
|---|---|
| **Formal meaning** | The state of an institution (team, company, project) as captured by its decisions, claims, authority relations, precedents, and accepted practices — distinct from the state of its artifacts (code, docs, configs) |
| **Inputs** | All institutional claims, decisions, authority assignments, precedents, exceptions, temporal context |
| **Outputs** | Queryable institutional state, effective standing for any action, decision precedent, authority map |
| **Lifecycle** | Continuously evolving as new claims/decisions/authority changes occur |
| **Dependencies** | Claim framework, decision records, authority graph, temporal reasoning, precedent tracking |
| **Existing standards** | No direct standard. Closest: legal knowledge systems, organizational memory systems, governance platforms — fragmented |
| **Existing products** | No dominant "institutional state" product. PROJECTMEM comes closest with "memory and judgment layer." Organizational memory startups (Mem0, Zep) focus on conversation/entity memory, not institutional decision state. |
| **Commoditization risk** | **LOW.** This category is not yet served. If Bridge defines it, it could own it. But the category may not exist as a market. |
| **Technical novelty** | **HIGH.** Treating the project's institutional state as a queryable, computable object is novel. |
| **Product usefulness** | Potentially very high — every organization has institutional state; almost none can query it systematically |
| **Business defensibility** | **STRONG IF the category exists.** First mover on institutional state infrastructure. But the category must be recognized by the market. |

**Verdict:** Institutional state is the most promising primitive ABOVE standing. It generalizes from coding agents to any organization making decisions with multiple legitimate authorities. It is also the most speculative — the category may not be recognized, and the technical challenge of computing institutional state at scale is large.

---

## WHAT IS BELOW STANDING?

**The strongest candidate: CLAIM.**

Claims explain why standing exists:
- Multiple actors make claims about what should happen
- Claims have sources with varying authority
- Claims have scopes (which actions they pertain to)
- Claims have timestamps (staleness matters)
- Claims can conflict (contradictions)
- Claims can be evaluated (which is effective for which action?)
- Standing is the evaluation of claims for a specific action

"Standing" is not a primitive. It is a derived property of claims under an authority framework.

"Effective directive" is not a primitive. It is the output of standing evaluation.

"Authority" is not a primitive. It is a property of claim sources.

The primitive is: **Actor makes Claim about Action/State. System evaluates Claim under Authority framework. Effective claims become Standing. Standing produces Effective Directive.**

This reframing matters because it changes what Bridge builds:
- NOT: "an authority hierarchy that resolves instructions"
- BUT: "a claim evaluation engine that computes effective standing from competing claims"

The difference: claims can come from anywhere (agents, humans, documents, systems, policies, precedent), not just "instruction files." Standing is not about instructions — it is about which claims are effective.

---

## WHAT IS ABOVE STANDING?

**The strongest candidate: INSTITUTIONAL STATE.**

Institutional state is the full picture:
- Claims (what actors assert)
- Decisions (what was decided and why)
- Authority relations (who can decide what)
- Precedents (past decisions that influence future ones)
- Exceptions (explicit overrides and their scope)
- Temporal context (what changed when)
- Effective standing (current evaluation for any action)

Standing is a query on institutional state: "for this action, right now, what is effective?"

The Bridge research program's dependency chain (interop → transfer → memory → intelligence → reconciliation → commitment → authority → effective directive → effective standing) is actually a chain of projections onto institutional state:
- Interoperability: agents can contribute claims to institutional state
- Transfer: claims/decisions can move between agents
- Memory: institutional state persists
- Intelligence: institutional state is queryable and structured
- Reconciliation: conflicting claims are resolved
- Commitment: decisions are recorded in institutional state
- Authority: who can make binding claims/decisions
- Effective directive: standing evaluation produces actionable output
- Effective standing: the queryable institutional state for any action

**If this is right, Bridge is not a developer tool. It is institutional state infrastructure.**

---

## THE TWO PRIMITIVES — SIDE BY SIDE

| | CLAIM (below) | INSTITUTIONAL STATE (above) |
|---|---|---|
| **Abstraction level** | Primitive datum | System-level construct |
| **What it captures** | A single assertion by an actor | The full state of an institution's knowledge, decisions, and authority |
| **Bridge's current framing** | Implicit (claims are "instruction sources") | Implicit (standing is institutional state query) |
| **Novelty** | Medium — claims are not a standard software primitive | High — institutional state as a queryable system is novel |
| **Commoditization risk** | Low | Low — category not yet served |
| **Developer wedge** | "Your agents receive conflicting claims; we evaluate them" | Too broad for a developer wedge |
| **Enterprise expansion** | "Your enterprise has conflicting claims across systems" | "We compute your institutional state so any agent can act correctly" |
| **Moat potential** | Moderate — claim format could be standard | Strong if institutional state becomes a recognized infrastructure category |
| **Risk** | Too abstract; "claims" may not resonate | Too broad; may not be a market |

---

## THE FRACTAL OBSERVATION

Institutional state has a fractal structure:
- A project has institutional state (AGENTS.md, ADRs, decisions, standing)
- A team has institutional state (who decides what, precedents, delegation)
- A company has institutional state (policy, authority, decisions, compliance)
- A supply chain has institutional state (who can authorize what, across organizations)
- A legal system has institutional state (precedent, authority, jurisdiction)

The same primitive (claims → evaluation → standing → decisions → institutional state) applies at every scale. The difference is the authority framework and the scope of claims.

This is both an opportunity and a risk:
- **Opportunity:** One platform scales from project to enterprise to industry
- **Risk:** The developer use case (project-level) may be too narrow to sustain the platform; the enterprise use case may be too hard to reach from a developer wedge

---

## THE STRONGEST PRIMITIVE HYPOTHESIS

**Bridge's fundamental primitive is not standing. It is the claim-to-standing evaluation pipeline.**

Formally:

```
Given:
  - A set of claims C = {c₁, c₂, ..., cₙ}
  - Each claim cᵢ has: source, content, scope, timestamp, evidence, status
  - An authority framework A that assigns standing weights to sources
  - A temporal context T (what is current, what is stale, what changed)

Compute:
  - For a proposed action α:
    - Which claims are in scope for α?
    - Which claims conflict?
    - Which claim is effective under A and T?
    - What is the effective directive?
    - What is the standing record?

Output:
  - Effective directive D(α)
  - Standing record S(α) — auditable, citable, replayable
  - Updated institutional state I' = I ∪ {S(α)}
```

This is the primitive. Everything else (interop, transfer, memory, authority, commitment, reconciliation) is a necessary component of this pipeline.

**The product question:** Is the pipeline a product? Or is it infrastructure that a product is built on?

---

*End of primitive hunt.*
