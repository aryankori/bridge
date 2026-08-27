# BRIDGE — STANDING FALSIFICATION REPORT

**Author:** Hermes Agent (Independent Falsification Reviewer)
**Date:** 2026-08-27
**Status:** Attempting to destroy the "STANDING" breakthrough hypothesis

---

## 1. DEFINITIONS — FORMAL COMPARISON

| Term | Formal Definition | Anti-Definition | Example |
|---|---|---|---|
| **Identity** | Who/what this actor is | — | "agent-alpha", "aryan@example.com" |
| **Authentication** | Proof that this actor IS who it claims | — | OAuth token, SPIFFE SVID |
| **Authorization** | Binary answer: **CAN** actor X perform action Y? | Gatekeeping, not arbitration | IAM says "yes" or "no" |
| **Permission** | Granted capability to perform action | — | `merge:pull-requests` |
| **Role** | Named grouping of permissions | — | "Maintainers" role |
| **Delegation** | Transfer of authority from delegator to delegatee | — | Authored by human, executed by agent |
| **Policy** | Rule set: IF conditions THEN allow/deny/redirect | Static, not adaptive | Security policy "no prod access after hours" |
| **Precedence** | Ordering among potentially conflicting authorities | Implicit in most systems | Security > Product in org chart |
| **Decision Right** | Specific grant to make a decision of type T | Decentralized authority | "Board approves M&A" |
| **STANDING** | **Comparative**: when A and B both have authority over X and conflict, **which authority prevails and why** | Not binary; not a gate; an arbitration primitive | "Security veto defeats Product approval" |
| **Commitment** | A decision that has been made and recorded | Retrospective | "We use PostgreSQL" |
| **Accountability** | Who answers for the outcome | Retrospective | "Aryan answers for this incident" |

---

## 2. THE 100-AGENT TEST — CONFLICT CASES

### Case 1: Security vs Product
| Actor | Statement | Verification Status |
|---|---|---|
| Security Agent | "Feature X contains CVE-2026-XXXX. Block deployment." | Verified: CVE confirmed |
| Product Agent | "Customer explicitly requested X. Ship by Friday." | Verified: Customer email exists |
| **Conflict** | Both statements are factually true. | **Neither is a "false" claim.** |

**What resolves it:** Not memory (both agents remember). Not verification (both verified). Not communication (both can send). What decides is **whose authority over deployment decisions carries greater standing.**

### Case 2: Legal vs Engineering
| Actor | Statement | Verification Status |
|---|---|---|
| Legal Agent | "X violates EU AI Act Article 5. Block release." | Verified: clause exists |
| Engineering Agent | "X has been tested and works correctly." | Verified: tests pass |
| **Conflict** | Both true. One is regulatory; one is technical. | **Different domains; different standing.** |

### Case 3: Old Decision vs New Delegation
| Actor | Statement | Status |
|---|---|---|
| Old Policy | "All database schemas must be reviewed by DBA." | Ratified 2024-01 |
| New Delegate | "Agent may apply schema changes directly (delegated 2026-08)." | Delegated 2026-08 |
| **Conflict** | New delegate has *authorization* to act. Old policy has *standing* to block. | **Authorization vs standing conflict.** |

### Case 4: Org-wide policy vs project-specific decision
| Actor | Statement | Status |
|---|---|---|
| Org Policy | "All services must use approved cloud providers." | Approved by CISO |
| Project Decision | "This project uses on-prem for latency reasons." | Approved by VP Engineering |
| **Conflict** | Both ratified. Which wins? | **Precedence unknown.** |

### What Information is Required to Resolve Each Conflict?

| Case | Information Needed |
|---|---|
| Security vs Product | Which authority has higher precedence for *deployment decisions*? |
| Legal vs Engineering | Does regulatory authority override technical authority? If so, under what conditions? |
| Old vs New delegation | Does the new delegation override the old policy, or are they domain-scoped? |
| Org policy vs project | Does VP's project-specific authority override CISO's org-wide authority for *this* decision? |

**Each case reveals the same information requirement: a precedence graph.**

---

## 3. EXISTING SYSTEM ATTACK

### RBAC (Role-Based Access Control)
| | Value |
|---|---|
| **What it solves** | Who can perform which actions | 
| **What it does NOT solve** | What happens when two roles both have authority and conflict |
| **Overlap with standing** | Roles carry inherent precedence in org chart (e.g., VP > IC), but RBAC itself is purely additive (union of permissions), not comparative |
| **Remaining gap** | RBAC cannot express "VP's approval defeats IC's proposal" — it can only say both have the permission |

### ABAC (Attribute-Based Access Control)
| | Value |
|---|---|
| **What it solves** | Conditional access based on user/resource/environment attributes |
| **What it does NOT solve** | Does not model authority conflicts between two *authorized* actors |
| **Overlap** | Can encode "security-role AND after-hours → deny" but not "security-decision > product-decision" |
| **Remaining gap** | ABAC is a gate, not an arbiter. It denies access; it cannot rank two valid authorities |

### IAM / OIDC / OAuth
| | Value |
|---|---|
| **What it solves** | Identity and token issuance |
| **What it does NOT solve** | Authority precedence |
| **Overlap** | None — IAM answers "who are you?" not "whose decision wins?" |

### OPA / Rego (Policy Engine)
| | Value |
|---|---|
| **What it solves** | Policy evaluation — IF conditions THEN decision |
| **What it does NOT solve** | The policy rules themselves — OPA evaluates what you give it |
| **Overlap** | A sufficiently expressive policy *could* encode standing: `allow if precedence(security, product) > threshold`. But OPA does not *discover* or *maintain* that precedence. |
| **Remaining gap** | OPA is an engine. Standing is the *source data* it needs. OPA makes standing *executable*, not standing itself. |

### Delegation Systems (UCAN, HDP)
| | Value |
|---|---|
| **What it solves** | Cryptographic proof that authority was delegated from human to agent |
| **What it does NOT solve** | What happens when two delegates conflict |
| **Overlap** | HDP captures *provenance of delegation* — "human X delegated to agent Y." Does not capture *precedence* between two delegations. |
| **Remaining gap** | Provenance answers "who delegated to whom." Standing answers "whose delegation prevails when both execute." |

### Workflow / Approval Systems (Jira, Approvals)
| | Value |
|---|---|
| **What it solves** | Who approves what in a workflow |
| **What it does NOT solve** | Cross-workflow conflicts. Two workflows both approved; which wins? |
| **Overlap** | Captures approval events. Does not capture authority hierarchy. |
| **Remaining gap** | Workflow captures *sequence*, not *precedence*. |

### Corporate Governance / Delegation of Authority Matrices
| | Value |
|---|---|
| **What it solves** | Who can approve what up to what limit |
| **What it does NOT solve** | Digital, machine-readable, runtime enforcement against autonomous agents |
| **Overlap** | DOA matrices *are* standing documents — they record "VP can approve up to $100K, CFO up to $1M." This IS a standing representation. |
| **Remaining gap** | DOA matrices are *documents*, not *machine-usable authority predicates*. They exist as spreadsheets or PDFs, not as runtime-assertable primitives. |

### Multi-Agent Systems Literature
| | Value |
|---|---|
| **What it solves** | Conflict resolution via negotiation, voting, or meta-governance |
| **What it does NOT solve** | Legitimate authority (not majority vote, not negotiation outcome) — which authority *deserves* to win |
| **Overlap** | Multi-agent conflict resolution treats authority as negotiated/consensus. Standing treats authority as *institutional* (ratified, not negotiated). |
| **Remaining gap** | Consensus ≠ legitimacy. Standing is about *who has the right*, not *what the group agrees on*. |

---

## 4. STANDING VS AUTHORIZATION — ARE THEY DISTINCT?

### The Two Questions

```
AUTHORIZATION:  "Can actor A perform action X?"
STANDING:       "Actor A and Actor B both have authority over X. 
                 Which authority prevails, and why?"
```

### Example Where This Matters

| Situation | Authorization Answer | Standing Answer |
|---|---|---|
| Engineer may merge PR | **YES** | (no conflict) |
| Engineer and Security both may block merge; Security's concern is raised | **YES** (both can act) | **SECURITY WINS** — security veto is higher precedence for deployment decisions |
| Two managers both approve different code changes for same file | **YES** (both can approve) | **UNRESOLVED** — needs standing: which manager has higher precedence for *this file type*? |

### Formal Distinction

```
AUTHORIZATION:  predicate(A, X) → {true, false}
STANDING:       arbitration(A, B, X) → {A_wins, B_wins, unresolved}
                       where predicate(A, X) = true AND predicate(B, X) = true
```

**If this distinction is meaningful, STANDING is a real computational primitive.** Authorization is the *gate*. Standing is the *arbiter*.

### Edge Case: When Standing Reduces to Authorization

If every action can only be performed by ONE authorized actor (exclusive authority), standing *reduces* to authorization — there is no conflict to resolve.

**Standing matters only when multiple actors can be authorized to act on the same subject.**

---

## 5. STANDING VS POLICY — CAN A POLICY ENGINE REPRESENT IT?

### Could a Sufficiently Expressive Policy Encode Standing?

A policy like this could represent standing:

```
policy "deployment-decision" {
  subject: "feature deployment"
  authorities: [
    { role: "security-reviewer", precedence: 90 },
    { role: "product-manager", precedence: 70 },
    { role: "engineering-lead", precedence: 80 }
  ]
  rule "when conflicting" {
    winner = max_by(precedence)
    if winner.role != proposed_by {
      require_human_review
    }
  }
}
```

### What Such a Policy Fails to Capture

| Missing Aspect | Why It Matters |
|---|---|
| **Ratification provenance** | Where did the precedence come from? CISO's letter? Board resolution? Delegated authority? |
| **Domain scoping** | Does security-veto precedence apply to *all* decisions, or only *deployment* decisions? |
| **Temporal validity** | Does this precedence hold forever, or does it expire when a new policy is ratified? |
| **Override history** | Has this precedence been contested and overridden before? |
| **Cross-system scope** | Does org-policy precedence apply in project-specific contexts? |
| **Delegation chains** | If A delegated to B, and B delegates to C, does C's standing inherit A's precedence? |

### What Bridge Adds (If Policy Engine Isn't Enough)

Policy engines *evaluate* standing. They don't *discover*, *maintain*, or *propagate* it.

**Bridge could provide:**
- Discovering standing from existing sources (DOA matrices, org charts, policies, Git commits with authority metadata)
- Maintaining standing history (who ratified what, with what precedence, when)
- Propagating delegation chains (transitive standing)
- Computing *effective standing* across system boundaries

**But:** Is this a *new primitive* or an *integration layer*?

---

## 6. STANDING VS COMMITMENT — COMPARISON

### Standing as a Property of Commitment

**Argument for:** Every commitment has an authority behind it. "We use PostgreSQL" — who decided? DBA lead? If standing is just "commitment.decided_by + commitment.precedence," then standing is metadata, not a separate object.

**Counter-argument:** Two commitments can conflict. "We use PostgreSQL" (DBA lead) vs "We use MongoDB" (CTO). Both are commitments. Standing answers *which commitment wins*, not just who made it.

### Standing as a Prerequisite for Commitment

**Argument for:** Before a commitment can be made, someone must have standing to commit. Standing is the *precondition* for a valid commitment.

**Counter-argument:** Standing isn't required to *make* a commitment (you can commit anything), it's required for the commitment to *govern others*. Standing is about *authority to bind*, not the binding itself.

### Standing as a Separate Object

**Argument for:** Standing has its own lifecycle: granted → contested → ratified → expired. It has its own properties: precedence, overrides, domain scope, delegation chains. It's not just metadata on a commitment — it's a distinct graph.

**Counter-argument:** Standing without commitment is a tree without leaves — it describes who *would* win if there were a conflict, but without commitments, there are no conflicts.

### Standing as Authorization Metadata

**Argument for:** Authorization systems already track who has what rights. Standing is just "authorization with precedence attached."

**Counter-argument:** Authorization is binary (can/cannot). Standing is comparative (which-wins-when-both-can). Binary ≠ comparative. **Precedence is not a permission — it's a ranking.**

### Verdict

**Standing is a separate object, not merely metadata.** It is the *graph of authority relations among authorized actors*, distinct from the *actions they are authorized to perform* (authorization) and the *actions they have performed* (commitment).

---

## 7. SYSTEMS OF RECORD — CAN STANDING LIVE ELSEWHERE?

### Could Standing Live in Existing Systems?

| System | What It Could Contain | Why It Falls Short |
|---|---|---|
| **IAM** | Role hierarchies, permission grants | No domain scoping, no temporal validity, no delegation chains |
| **HR system** | Org chart, reporting lines | Org chart ≠ decision authority. VP of Sales doesn't have standing over engineering decisions. |
| **Legal systems** | Policies, regulations, contracts | Legal authority exists but is not machine-readable for runtime agent arbitration |
| **Jira** | Approval workflows | Workflow captures approval event, not authority hierarchy for cross-workflow conflicts |
| **GitHub** | CODEOWNERS, branch protection, approvals | Captures *code review* authority, not *semantic* authority over product/security/legal decisions |
| **Org policy** | Precedence rules (in natural language) | Exists but is not programmable; requires interpretation |
| **Contracts** | Delegation clauses | Exist but are not queryable by agents at runtime |

### Could Bridge Instead Compute a Federated "Effective Standing" View?

**Yes — this is a stronger formulation than owning a separate ledger.**

Bridge could *aggregate* standing fragments from:
- IAM (role permissions)
- HR/org chart (reporting lines where relevant)
- Git (CODEOWNERS, branch protections, commit authority)
- Jira/Linear (approval events)
- Policy documents (parsed into structured rules)
- Contracts/sign-offs (external authority grants)
- HDP/UCAN tokens (delegation provenance)

**The value is not owning a new ledger — it's computing a unified, current, machine-readable standing view from existing fragments.**

---

## 8. MULTI-SYSTEM CONFLICT — REAL EXAMPLE

```
GitHub says:
  Engineer may merge PR #42 (branch protection allows, CODEOWNERS approved).

Security system says:
  Engineer may NOT approve security exception (security policy blocks).

Jira says:
  Product owner approved feature X (ticket approved).

CI says:
  Tests passed (pipeline green).

Legal policy says:
  Feature X cannot ship without DPO sign-off (GDPR requirement).
```

### Where Does the "Winner" Come From?

This is a multi-system conflict with **five authorities**, each valid in its domain:

| Authority | Domain | Precedence |
|---|---|---|
| GitHub (branch protection) | Code merge | Procedural rule |
| Security system | Security exceptions | Policy rule |
| Jira (product owner) | Feature approval | Business decision |
| CI (tests) | Technical verification | Technical gate |
| Legal policy | Ship compliance | Regulatory constraint |

**There is no single "winner" — there are five orthogonal decisions:**
1. Merge? → GitHub allows
2. Security exception? → Security blocks
3. Feature approved? → Jira says yes
4. Tests pass? → CI says yes
5. Ship? → Legal says no

**The actual question is: "Can this feature ship to production?"**

The answer requires:
- Merge AND security-exception AND feature-approved AND tests-pass AND legal-signoff
- Each is a gate. Each must pass.
- Standing doesn't help here — this is AND logic, not precedence.

**BUT:** If security *reverses* (policy changes), or legal *signs off*, or product *withdraws approval*, the standing ledger tells you *whose authority changed* and *what the new effective standing is*.

**Standing is most valuable when one authority *veto-overrides* another — not when all gates must be checked.**

---

## 9. OPEN-STANDARD ATTACK

### Can Standing Be Standardized?

A standing data model could be standardized:

```
STANDING_RECORD {
  subject: URI
  authorities: Authority[]
  precedence: number (higher wins)
  overrides: URI[] (which authorities this defeats)
  ratified_by: URI
  contested_by: URI[]
  expires: Timestamp
  domain: URI (scope this applies to)
}
```

### If Every Agent Protocol Defines This, Would Bridge Become Unnecessary?

**Partially yes. Here's why:**

| What Protocol Defines | What Remains Project-Specific |
|---|---|
| Format of standing record | Which authorities exist in your org |
| Precedence field semantics | What precedence values your org assigns |
| Domain scoping | Which domains matter for your project |
| Ratification field | Who your org considers legitimate ratifiers |
| Delegation chain format | How your org delegates authority |
| Override semantics | How your org handles contested standing |

**Protocol captures the *syntax*. Bridge captures the *project-specific semantics*.**

### What Remains Project-Specific

- Your org's authority graph (who has standing over what)
- Your org's precedence assignments (security > product in your org)
- Your org's ratification provenance (which human/ratifier is legitimate)
- Your org's delegation chains (how authority propagates through your org)
- Your org's domain scoping (which decisions fall under which authority)
- Your org's override history (which standing conflicts were actually contested)

**Protocol is commoditized. Org-specific standing data is not.**

---

## 10. PRODUCT TEST

### First Concrete Problem Standing Solves

**Scenario:**

A developer runs `bridge standing-check` before allowing an agent to modify production configuration.

- Agent proposes: "Apply config change to production."
- Standing check reveals:
  - **Authorization:** Agent has `prod:config:write` permission (IAM says YES)
  - **Standing:** Engineering Lead has standing over production config changes (precedence 80). But the proposed change was *not* reviewed by the Lead. Current standing requires Lead ratification for *this type* of change (infrastructure, not feature flag).
  - **Conflict:** Authorization granted. Standing not satisfied.
  - **Resolution:** Block the action. Require Lead ratification.

**Is this painful enough to pay for?**

For a *single* team: probably not. The pain is manageable with existing tools (branch protection, manual review, CLAUDE.md).

For a *team with 10+ agents* making concurrent production changes: YES. Standing becomes critical when multiple autonomous agents with overlapping permissions conflict on the same resource.

**The pain point is emergent at scale, not immediate for a single developer.**

---

## 11. MOAT TEST

### Useful / Defensible / Ownable Breakdown

| Aspect | Useful? | Defensible? | Ownable? |
|---|---|---|---|
| **Standing data model** | Yes | No (protocol can standardize) | No |
| **Authority graph construction** | Yes | Partial (can be replicated) | Maybe (accumulated) |
| **Cross-system standing federation** | Yes | **Yes** (requires integrations) | **Yes** (integration work) |
| **Delegation chain tracking** | Yes | Partial (HDP/UCAN can standardize) | No |
| **Precedence assignment** | Yes | **Yes** (org-specific, sensitive) | **Yes** (org-specific knowledge) |
| **Standing history** | Yes | **Yes** (accumulates over time) | **Yes** (time moat) |
| **Dispute resolution log** | Yes | **Yes** (ratified disputes are scarce) | **Yes** (rare events, cumulative) |
| **Effective standing computation** | Yes | Partial (algorithm can be copied) | No |

### What Could Actually Become a Moat

**The moat is NOT the standing primitive.** It's the *accumulated, project-specific standing data*:

1. **Authority graph** — who has standing over what in your project (takes time to discover/encode)
2. **Precedence assignments** — your org's specific priority ordering (sensitive, hard to extract from existing systems)
3. **Ratification provenance** — who ratified which decisions, with what authority (accumulated committed decisions)
4. **Cross-system integrations** — pulling standing from Git, Jira, IAM, HR, policy docs (integration work)
5. **Standing history** — how authority evolved over time (time moat)

**The moat is project-specific institutional knowledge, encoded as standing.**

---

## 12. NEXT ABSTRACTION — IF STANDING IS ALSO NOT THE ANSWER

If standing reduces to authorization + precedence metadata, and precedence is just RBAC hierarchy + policy rules, what's underneath?

| Candidate | What It Is | Problem |
|---|---|---|
| **Decision Rights** | "Who may make which decisions" | DOA matrices already solve this in documents; Standing is the machine-readable version |
| **Effective Authority** | "Who currently has authority over X, considering all delegations, policies, and overrides" | This IS standing — just renamed |
| **Institutional State** | "What the institution currently accepts as authoritative" | Too vague. What's the primitive? |
| **Mandate** | "Grant of authority with scope, precedence, expiry, delegation" | Standing *is* a mandate |
| **Governed Intent** | "Intent that has been ratified by an authority" | Partial — standing is what makes intent governed |
| **Consequence Rights** | "Who is responsible for the consequences of an action" | Accountability is retrospective; standing is prospective (governs before action) |
| **Something Else** | — | Unknown |

### The Strongest Candidate After Standing

**Effective Authority** = the *current, computed, unified view* of who has standing for each decision.

This is Bridge's potential role: **compute effective authority from fragmented sources (IAM, Git, Jira, policy, HR, HDP tokens) into a single machine-readable standing view.**

---

## 13. CURRENT THESIS

### Verdict: REFRAME STANDING

**Why:** Standing is real as a concept — it's the comparative/arbitration primitive that authorization lacks. But "owning a standing ledger" is less defensible than "computing effective standing from existing sources." The moat is not the ledger — it's the org-specific authority graph and the integration work to compute it.

### Final Statements

> **Bridge should OWN:** The computation of *effective standing* — a unified, current, machine-readable view of who has authority over each decision, with precedence, domain scope, delegation chains, and temporal validity — aggregated from existing systems-of-record.

> **Bridge should NOT OWN:** A separate standing ledger (that's a protocol artifact), IAM, Git, Jira, HR, or policy documents (those are existing systems-of-record).

> **The smallest unique primitive:** `STANDING_QUERY(scopes, subject) → {authorities[], effective_winner, requires_ratification, contested}` — a query against the computed standing graph, not a stored ledger.

> **The first product:** "Standing Diff" — run before an agent acts, show whether the proposed action has satisfying effective standing, and flag when authorization is granted but standing is contested/incomplete.

> **The single best experiment:** Take a repo with known authority conflicts (security vs product, legal vs engineering). Run agent with and without standing query. Measure: does standing prevent the agent from taking an unauthorized action that authorization alone would permit?

---

## 14. LITERATURE FINDINGS

### Existing Work That Partially Covers Standing

| Work | What It Covers | Gap |
|---|---|---|
| **AID-Guard** (arXiv 2608.21159, 2026) | Stateful authorization for delegated agent effects; revalidates authority graph at each operation | Focuses on authorization, not comparative standing between multiple authorized actors |
| **HDP Protocol** (arXiv 2604.04522, 2026) | Cryptographically captures human-to-agent delegation provenance | Captures delegation chains, not precedence between conflicting delegations |
| **UCAN** (IETF draft) | Decentralized capability tokens with delegation chains | Capability-based, not authority-ranking |
| **Resolution Policy as Delegation Governance** (ACM 2025) | First-class resolution policy for when constraints conflict in autonomous agents | Closest to standing — explicitly models what happens when multiple authorities conflict |
| **AuthGraph / SEAgent** | Graph-based authorization for autonomous agents | Authorization graphs, not standing arbitration |
| **Decision Rights Theory** (Diakopoulos 2016, cited in ResearchGate 2025) | How organizations distribute authority | Organizational theory, not computational primitive |
| **MultiAgent Conflict Resolution** (Lorojournals 2026) | Goal conflict, resource conflict, control conflict | Treats authority as negotiated/consensus, not institutional standing |
| **Context Engineering for AI Agents** (Nestr 2026) | "AI agents need a living organisational structure where governance records, role definitions, project state, and policy decisions are current" | Describes the problem; doesn't provide standing primitive |
| **Aptly / DOA Matrix Software** | Delegation of authority matrices for enterprises | DOA matrices are *documents*, not *machine-readable runtime primitives* |

### Key Finding

**The closest existing work is "Resolution Policy as Delegation Governance" (ACM 2025).** It explicitly models what happens when multiple authorized agents conflict and proposes a resolution policy as a first-class component. Standing is not entirely novel, but:

1. Resolution policy is framed as part of the *delegation mandate* (agent-centric, not org-centric)
2. Standing reframes it as an *org-wide authority graph* (project-centric, not agent-centric)
3. Standing adds temporal validity, domain scoping, and cross-system federation that Resolution Policy doesn't require

**Novelty claim:** Standing is a *reframing* of resolution policy into an org-wide, runtime-computable, project-specific authority graph — not a new primitive, but a new *application layer* of an existing concept.

---

## VERDICT

Standing is a **real conceptual distinction** — it is not merely authorization repackaged. Authorization answers "can you do X?" Standing answers "when you and another actor both can do X, whose authority prevails?" This is a meaningful computational primitive that existing systems (RBAC, ABAC, IAM, OPA, delegation protocols, workflow engines) address only partially and incompletely. However, standing as a *separate owned ledger* is not the right product framing — it overestimates how much new data Bridge would create and underestimates how much standing information already exists in IAM, DOA matrices, org charts, policy docs, HDP tokens, and Git authority records. The more defensible position is that Bridge computes *effective standing* — a federated, current, machine-readable standing view from existing fragments — and the moat is the project-specific authority graph and integration work, not the standing primitive itself. Standing is real, but Bridge's opportunity is in the *computation and federation*, not the *invention* of standing.

---

## WHAT WE STILL DON'T KNOW

1. Does standing actually prevent bad agent actions in practice, or is the conflict rate low enough that authorization alone suffices?
2. Can standing be computed purely from existing systems-of-record, or does it require new organizational practices (encoded DOA matrices, policy-as-code)?
3. Is the "effective standing" computation tractable at scale — can it be done cheaply enough for every agent action?
4. Does the business case hold — do organizations actually pay for authority arbitration, or do they solve it through existing governance (human review, committee approval)?
5. Is standing a feature that agent vendors (Anthropic, OpenAI, Google) will absorb, or is it project-specific enough to remain a standalone product?

---

*End of standing falsification.*
