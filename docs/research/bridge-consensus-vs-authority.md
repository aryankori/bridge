# BRIDGE — Consensus vs Authority vs Arbitration vs Policy vs Decision

**Status:** Research analysis
**Date:** 2026-08-27
**Scope:** Formalize the distinction between consensus, authority, arbitration, policy, and decision layers. Determine which layer Bridge occupies — or should occupy.

---

## 1. CONSENSUS LAYER

**Question:** "What agreement can the actors reach?"

**Formal model:**
- Set of actors A = {a₁, a₂, ..., aₙ}
- Each actor proposes a state sᵢ
- Consensus protocol produces agreed state s* where s* is acceptable to a quorum of actors
- Dissent is resolved through majority, supermajority, or acceptance

**Properties:**
- Democratic: each actor's view counts
- Convergent: the system moves toward agreement
- Non-hierarchical: no actor inherently dominates
- Conflict is a problem to be solved (disagreement is abnormal)

**Existing implementations:** Raft, Paxos, blockchain consensus (PoW, PoS, BFT), CRDT merge, Git merge (three-way merge resolves content conflict through structure, not votes)

**Where consensus fits for Bridge:** Consensus is appropriate for determining *project state* when actors are symmetric (e.g., two developers editing the same file — Git's three-way merge). But Bridge's problem is not symmetric: a human developer's instruction has different standing than a stale README.

**Bridge is NOT a consensus layer.** The actors are not symmetric. The standing hierarchy means some claims are inherently more authoritative than others. Consensus would treat a README's claim ("use npm") as equal to a human developer's claim ("use pnpm for this module") — which is wrong.

---

## 2. AUTHORITY LAYER

**Question:** "Whose decision governs if they don't agree?"

**Formal model:**
- Set of actors A, each with authority weight wᵢ in domain D
- For action α in domain D, the effective authority is argmaxᵢ wᵢ (or a function of weights, scope, temporal context)
- Conflict resolution: the highest-authority claim wins; lower-authority claims are recorded but not effective

**Properties:**
- Hierarchical: authority is a partial order (not total — some actors have equal standing in some domains)
- Deterministic: given the authority graph and the action, the effective authority is computable
- Non-negotiable (within the framework): the authority structure defines the answer
- Conflict is expected and resolved by the structure, not by agreement

**Existing implementations:** RBAC, ABAC, legal hierarchies (constitution > statute > regulation), corporate governance (board > CEO > manager), SPIFFE/SPIRE (identity-based authorization)

**Where authority fits for Bridge:** This is the core of Bridge's standing concept. The authority layer answers: "given all the claims about this action, which one is effective?" The answer is determined by the authority framework (tiers, delegation, temporal context, scope).

**Bridge IS (primarily) an authority layer.** Standing is authority computation: which claim governs this action, given the authority framework and the current context.

**Critical nuance:** Authority is not static RBAC. It is dynamic, action-specific, and temporal:
- Static: "the developer role can approve PRs" (RBAC)
- Dynamic: "for this specific function-naming decision, the nested AGANTS.md has higher standing than the root AGENTS.md because the action is scoped to the data package" (Bridge standing)

---

## 3. ARBITRATION LAYER

**Question:** "Given conflicting claims with evidence, what is the reasoned determination?"

**Formal model:**
- Set of claims C = {c₁, c₂, ..., cₙ} with sources, evidence, and scopes
- Arbitrator evaluates claims against rules R (authority framework, evidence rules, conflict rules)
- Arbitrator issues determination D: which claim is effective, with rationale, citations, and status
- D is binding for the action in question, but is recordable and appealable (in human systems)

**Properties:**
- Evaluative: claims are assessed against criteria, not just ranked
- Reasoned: the determination includes why (rationale, citations)
- Binding: the determination governs the action
- Recordable: the determination is stored as a precedent
- Neutral: the arbitrator applies the rules, not its own preferences

**Existing implementations:** Legal arbitration, expert determination, mediation (non-binding), some policy engines with reasoning (limited)

**Where arbitration fits for Bridge:** Bridge's resolver is an arbitrator. It receives claims (instruction sources), evaluates them against the authority framework, and issues a reasoned determination (effective directive with citations and rationale).

**Bridge IS an arbitration layer.** The resolver's output (effective directive) is an arbitral award: it says what should happen, why, and with what authority.

**Key distinction from legal arbitration:**
- Legal arbitration is ad-hoc (each case is evaluated on its merits by a human arbitrator)
- Bridge arbitration is systematic (the same authority framework applies to all actions; the resolver is deterministic)

---

## 4. POLICY LAYER

**Question:** "What rules apply to this action?"

**Formal model:**
- Policy set P = {p₁, p₂, ..., pₙ} where each policy is a rule (allow/deny/modify under conditions)
- Request R = (principal, action, resource, context)
- Policy evaluation: P(R) → decision ∈ {allow, deny, modify, escalate}
- Policies are typically authored by an administrator and applied uniformly

**Properties:**
- Rule-based: decisions are the output of rule evaluation
- Uniform: the same policy applies to all requests of the same type
- Configurable: policies are set by administrators, not by the request context
- Static (typically): policies are versioned and deployed; they don't change per-request

**Existing implementations:** OPA/Rego, Cedar, Cerbos, AWS Verified Permissions, Kubernetes admission control, API gateways, firewall rules

**Where policy fits for Bridge:** Policy is a component. Bridge needs policy to define the authority framework (tiers, veto rules, conflict rules). But Bridge is not just policy evaluation — it is claim evaluation within a policy framework.

**Bridge USES a policy layer but is NOT a policy layer.** The authority tiers, the security veto rules, and the conflict detection rules are policy. The resolver is the evaluator of claims against that policy. The effective directive is the output.

**Key distinction:** OPA evaluates "does this request violate policy?" Bridge evaluates "given these conflicting claims about this action, what is the effective directive under the authority policy?" The first is binary (yes/no). The second is nuanced (permit/block/flag/escalate with rationale).

---

## 5. DECISION LAYER

**Question:** "What was decided, by whom, why, and when?"

**Formal model:**
- Decision D = (decider, action, rationale, timestamp, authority basis, status, superseded-by?)
- Decisions are records, not computations
- Decisions can be queried, audited, superseded, appealed

**Properties:**
- Retrospective: decisions are records of what was decided
- Accountable: the decider is identified
- Rationale-captured: the why is recorded
- Temporal: decisions have timestamps and can be superseded
- Precedential (optional): past decisions can influence future ones

**Existing implementations:** ADRs, decision logs, meeting minutes, legal judgments, git commits (as implicit decisions), audit logs

**Where decision fits for Bridge:** Decisions are the OUTPUT of standing evaluation. When the resolver determines the effective directive, that determination is recorded as a decision (or standing record). The decision is the institutional memory of what was determined and why.

**Bridge PRODUCES decisions but is not a decision layer.** The decision record is a necessary output (for audit, precedent, memory), but the core function is the computation that produces the decision (standing evaluation), not the decision record itself.

---

## LAYER STACK — HOW THEY RELATE

```
DECISION LAYER (output)
  ← Standing records, decision logs, precedent
  ← What was decided, by whom, why, when

  ↑ produced by

ARBITRATION LAYER (computation)
  ← Resolver evaluates claims against authority framework
  ← Produces effective directive with rationale and citations
  ← Bridge's core function

  ↑ uses

AUTHORITY LAYER (framework)
  ← Standing tiers, delegation, scope, temporal rules
  ← Defines whose claims are effective for which actions
  ← Bridge's authority configuration

  ↑ evaluated by

POLICY LAYER (rules)
  ← Security vetoes, conflict detection rules, override rules
  ← Configured by project administrators
  ← Shared with policy engines (OPA/Cedar) but action-specific

  ↑ constrains

CONSENSUS LAYER (optional, for symmetric cases)
  ← When actors have equal standing, consensus may apply
  ← Git merge for equal-tier file conflicts
  ← Not Bridge's primary mode
```

**Bridge's position:** Bridge is primarily an **ARBITRATION LAYER** that uses an **AUTHORITY LAYER** framework, configured by a **POLICY LAYER**, and produces **DECISION LAYER** outputs. It uses **CONSENSUS** only for the special case of equal-tier conflicts (which it flags as AMBIGUOUS rather than resolving by consensus).

---

## THE CRITICAL DISTINCTION: AUTHORITY vs CONSENSUS

This is the most important conceptual move in the entire analysis.

**Consensus** assumes actors are symmetric and seeks agreement. When they cannot agree, the system forces a decision through majority or leader primacy. The losers' views are overruled.

**Authority** assumes actors have different standing and seeks to determine which standing governs. When they conflict, the higher-standing claim wins. The lower-standing claim is recorded but not effective.

**Why this matters for Bridge:**

A consensus-based approach to conflicting instructions would:
- Treat all instruction sources as equal
- Try to find a compromise that all sources "agree" on
- Fail when sources genuinely disagree (stale doc vs active manifest)

An authority-based approach to conflicting instructions:
- Recognizes that AGENTS.md has higher standing than a stale 2021 README
- Recognizes that an explicit human prompt has higher standing than a general rule
- Produces the effective directive based on standing, not compromise
- Records the lower-standing claim as superseded, not discarded

**Bridge must be authority-based, not consensus-based.** The moment Bridge seeks consensus among instruction sources, it loses its value proposition. The value is in recognizing that not all instructions are equal.

---

## THE SECOND CRITICAL DISTINCTION: ARBITRATION vs POLICY

**Policy** says: "Here is a rule. Does this request violate it? Yes or no."

**Arbitration** says: "Here are multiple claims about what should happen. Which claim is effective, and why?"

Policy engines (OPA, Cedar) are excellent at the first. They are not designed for the second.

Bridge's resolver is an arbitrator:
- It receives multiple claims (instruction sources)
- It evaluates each claim's authority (tier, scope, staleness, override)
- It detects conflicts (contradictions between claims)
- It resolves conflicts through authority evaluation
- It produces a reasoned determination (effective directive with citations)

This is not policy evaluation. It is claim arbitration within a policy framework.

**The policy layer defines the rules of arbitration.** The authority tiers, the security veto, the conflict detection rules — these are policy. The resolver applies the policy to the claims. The effective directive is the arbitral award.

---

## THE THIRD CRITICAL DISTINCTION: ARBITRATION vs DECISION

**Arbitration** is the computation: "given these claims and this authority framework, what is effective?"

**Decision** is the record: "this is what was determined, by this framework, at this time, with this rationale."

Bridge must produce both:
- The arbitration (the resolver's computation) is the real-time function
- The decision (the standing record) is the durable output

The decision is what enables:
- Audit (EU AI Act compliance)
- Precedent (future similar actions can reference past standing records)
- Memory (the project remembers what was decided)
- Accountability (who authorized what, and why)

But the decision is not the product. The product is the arbitration — the ability to compute effective standing in real time, before the agent acts.

---

## FORMAL SUMMARY

| Layer | Question | Bridge's Role | Example |
|---|---|---|---|
| **Consensus** | What do actors agree on? | Not Bridge's role (except equal-tier flagging) | Git merge, Raft |
| **Authority** | Whose claim governs? | Bridge's framework (standing tiers, delegation, scope) | RBAC, legal hierarchy |
| **Arbitration** | What is the reasoned determination? | Bridge's core computation (resolver) | Legal arbitration, expert determination |
| **Policy** | What rules apply? | Bridge's configuration (veto rules, conflict rules) | OPA, Cedar, admission control |
| **Decision** | What was decided and why? | Bridge's output (standing records, audit trail) | ADRs, commit messages, audit logs |

**Bridge is an arbitration layer with an authority framework, configured by policy, producing decision records.**

---

*End of consensus/authority/arbitration/policy/decision analysis.*
