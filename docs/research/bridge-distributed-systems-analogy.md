# BRIDGE - Distributed Systems Analogy Map

**Status:** Research analysis
**Date:** 2026-08-27
**Scope:** Map Bridge's problem onto analogous problems in distributed systems, consensus, conflict resolution, transaction systems, access control, policy engines, Kubernetes, Git, financial clearing, network routing, operating systems, database concurrency, event sourcing, legal systems, corporate governance, supply chain control. Determine which analogy is closest - WITHOUT copying terminology.

---

## THE BRIDGE PROBLEM (REFORMULATED)

Multiple legitimate actors (humans, agents, systems, documents) make claims about what state an action should produce. The system must determine, for each action, which claim is effective - accounting for authority, staleness, scope, conflict, and evidence - and produce an auditable record of the determination.

This is NOT:
- Consensus (all actors agree on one state)
- Leader election (one actor dominates)
- Simple policy evaluation (a fixed rule set evaluates actions)

This IS closer to:
- Determining authoritative state when multiple valid sources disagree
- Conflict resolution when no single source has absolute primacy
- Precedence computation when partially ordered authorities overlap

---

## ANALOGY 1: DISTRIBUTED CONSENSUS (RAFT, PAXOS, ZAB)

**What it solves:** Multiple nodes must agree on a single ordered log of state transitions, despite failures and network partitions.

**Mechanism:** Leader election, quorum voting, log replication, term numbers for conflict resolution.

**Closest Bridge parallel:** None. Consensus assumes all nodes want the same log. Bridge assumes actors genuinely disagree and some disagreements are legitimate (not errors to be voted out).

**Key distinction:** Consensus resolves disagreement through majority or leader primacy. Bridge resolves disagreement through authority evaluation. In consensus, a minority view is overruled. In Bridge, a lower-authority claim is superseded by a higher-authority claim - but the lower-authority claim is recorded, not discarded.

**What Bridge can learn:** Term numbers / versioning for temporal ordering. Quorum is NOT applicable - Bridge is not democratic.

---

## ANALOGY 2: LEADER ELECTION

**What it solves:** In a distributed system, one node is designated as the authority for a given partition or role. All others defer to it.

**Mechanism:** Election protocols, leases, heartbeats, fencing tokens.

**Closest Bridge parallel:** Authority tier assignment is a form of leader election - but static, not dynamic. The "leader" for a given action is determined by the authority graph, not by election.

**Key distinction:** Leader election produces one leader for all decisions in a domain. Bridge produces a different effective authority for each action, based on scope and context. A human developer is the leader for "what function name to use in this PR" but not for "what security policy applies."

**What Bridge can learn:** Fencing tokens - a mechanism to prevent stale authorities from acting after they've been superseded. Bridge's staleness detector is a form of fencing.

---

## ANALOGY 3: ARBITRATION (LEGAL)

**What it solves:** Two parties have a dispute. A neutral third party (arbitrator) evaluates evidence and issues a binding decision.

**Mechanism:** Party submissions, evidence rules, arbitrator authority, binding award, limited appeal.

**Closest Bridge parallel:** **STRONG.** Bridge's resolver is an arbitrator:
- It receives claims from multiple sources (parties)
- It evaluates evidence (citations, timestamps, content)
- It issues a binding decision (effective directive)
- The decision is recorded (award)
- Parties can see why the decision was made (rationale)

**Key distinctions:**
- Legal arbitration is human; Bridge is deterministic computation
- Legal arbitration resolves disputes between parties; Bridge resolves claims about actions
- Legal arbitration produces a binary outcome (who wins); Bridge produces a nuanced outcome (PERMITTED / BLOCKED / AMBIGUOUS / REQUIRES_AUTHORIZATION)
- Legal arbitration is ad-hoc; Bridge's authority framework is systematic

**What Bridge can learn:** The arbitration framing is valuable - it correctly captures that conflicts are resolved by evaluation, not consensus. The "arbitrator neutrality" question is critical: Bridge's resolver should not favor any source beyond what the authority framework specifies.

---

## ANALOGY 4: TRANSACTION SYSTEMS (DATABASE)

**What it solves:** Multiple concurrent operations must produce a consistent state, with ACID guarantees (Atomicity, Consistency, Isolation, Durability).

**Mechanism:** Locking, MVCC, two-phase commit, serializability, conflict detection.

**Closest Bridge parallel:** **MODERATE.** Bridge is about conflict detection before action, similar to transaction conflict detection. But:
- Database transactions conflict on data access (two writes to the same row)
- Bridge conflicts on instruction/claim authority (two sources say different things about what to do)

**Key distinction:** Database conflict resolution is about serializing concurrent operations. Bridge conflict resolution is about evaluating which source has authority for a given operation. The conflict is not about timing - it's about authority.

**What Bridge can learn:** MVCC (Multi-Version Concurrency Control) - keeping multiple versions of state and determining which version is visible to which reader. Bridge's temporal reasoning (staleness detection) is a form of MVCC for claims.

---

## ANALOGY 5: ACCESS CONTROL (RBAC, ABAC, ZANZIBAR)

**What it solves:** Which principals can access which resources, under which conditions?

**Mechanism:** Roles, permissions, attributes, relationships, policy evaluation.

**Closest Bridge parallel:** **MODERATE but misaligned.** Access control asks "can X do Y?" Bridge asks "what should happen when X tries to do Y, given conflicting instructions about Y?"

**Key distinction:** Access control is about permission (yes/no). Bridge is about effective directive (what is the right action, given all the sources of advice about what to do?). Access control says "the developer can push to main." Bridge says "the developer's prompt says push to main, but the security policy says never force-push to main - the effective directive is BLOCKED."

**What Bridge can learn:** Policy evaluation engines (OPA, Cedar) are the infrastructure for evaluating rules. Bridge needs to sit ABOVE policy evaluation - it determines which policy applies, not just whether a rule fires.

---

## ANALOGY 6: POLICY ENGINES (OPA, CEDAR)

**What it solves:** Evaluate a policy against a request and return allow/deny (or modify/escalate).

**Mechanism:** Policy language (Rego, Cedar), policy data, request context, evaluation engine.

**Closest Bridge parallel:** **MODERATE.** Policy engines evaluate rules. Bridge evaluates claims with authority. But:
- Policy engines typically have a single policy set (one source of truth for rules)
- Bridge has multiple competing policy sources with different authority
- Policy engines are typically static (policy is configured); Bridge is dynamic (authority depends on context)

**Key distinction:** OPA/Cedar answer "does this request violate policy?" Bridge answers "given all the conflicting guidance about this action, what is the effective directive?" The policy engine is a component, not the whole system.

**What Bridge can learn:** Policy-as-code (versioned, testable, reviewable policies) is a good model for Bridge's authority rules. The determinism guarantee (same input -> same output) is essential.

---

## ANALOGY 7: KUBERNETES ADMISSION CONTROL

**What it solves:** Intercept resource creation/update requests and validate or mutate them against policies before they are accepted.

**Mechanism:** Admission webhooks, mutating/validating controllers, policy enforcement points.

**Closest Bridge parallel:** **MODERATE.** Admission control is a "governed action" pattern - every request passes through a policy evaluation before acceptance. Bridge's effective directive is conceptually similar: before an agent acts, the directive is evaluated.

**Key distinction:** Kubernetes admission control is about cluster resource policy (the cluster decides what resources are allowed). Bridge is about project instruction policy (the project decides what the agent should do). The scope is different, but the pattern (intercept -> evaluate -> decide) is the same.

**What Bridge can learn:** The admission control pattern is the right enforcement architecture: a policy decision point (PDP) that evaluates requests before they execute. Bridge should be the PDP for agent actions, not the agent itself.

---

## ANALOGY 8: GIT (VERSION CONTROL)

**What it solves:** Track changes to a set of files over time, with branching, merging, conflict detection, and provenance.

**Mechanism:** Object store, DAG of commits, three-way merge, conflict markers, signed commits.

**Closest Bridge parallel:** **STRONG.** Git is the closest existing system to Bridge's vision:
- Git tracks claims about file state (each commit is a claim: "this is the state of the files at this point")
- Git has authority (the committer, the signer, the branch protection rules)
- Git detects conflicts (merge conflicts when two branches modify the same file)
- Git has temporal reasoning (commits are ordered; "stale" branches exist)
- Git produces provenance (git log, blame - who changed what and when)

**Key distinction:** Git resolves file-content conflicts. Bridge resolves instruction-authority conflicts. Git's merge conflict is "these two commits changed the same line differently." Bridge's conflict is "these two instruction sources say different things about what the agent should do."

**What Bridge can learn:** Git's conflict model is the right analogy for Bridge's conflict detection. Git's "merge base" concept is the right analogy for temporal reasoning (what was the state before these claims diverged?). Git's signed commits are the right model for claim provenance.

---

## ANALOGY 9: FINANCIAL CLEARING AND SETTLEMENT

**What it solves:** Multiple parties submit payment orders. A clearing system determines which orders are valid, nets them, and settles the resulting obligations. Finality is critical - once settled, a transaction cannot be reversed.

**Mechanism:** Clearing houses, central counterparties (CCPs), netting, margin requirements, settlement finality.

**Closest Bridge parallel:** **STRONG in the authority dimension.** Financial clearing is about determining which payment orders are valid when multiple parties have conflicting interests:
- A payment from A to B is a claim: "A authorizes B to receive X"
- The clearing system evaluates claims against rules (account balances, regulatory limits, fraud checks)
- Conflicts (double-spend, insufficient funds, regulatory block) are resolved before settlement
- Settlement is final and auditable

**Key distinction:** Financial clearing deals with financial obligations, not instructional claims. But the structure is identical: multiple claims -> evaluation against rules -> conflict resolution -> final, auditable determination.

**What Bridge can learn:** The concept of "finality" - once a directive is resolved and the agent acts, the determination should be final and auditable. The clearing model of netting (combining multiple claims into a single settlement) is interesting for multi-action scenarios.

---

## ANALOGY 10: NETWORK ROUTING (BGP, OSPF)

**What it solves:** Multiple routers have different views of the network topology. Routing protocols determine the best path for packets, with convergence when views differ.

**Mechanism:** Path vectors, link state, tie-breaking rules, convergence, route preference.

**Closest Bridge parallel:** **MODERATE.** Routing determines the best path when multiple paths exist. Bridge determines the effective directive when multiple directives exist.

**Key distinction:** Routing is about optimization (shortest path, least cost). Bridge is about authority (which directive governs). Routing tie-breaks are deterministic (BGP uses AS path length, then local preference, then...). Bridge tie-breaks are authority-based.

**What Bridge can learn:** Deterministic tie-breaking is essential. BGP's hierarchical path preference (local pref > AS path > origin > MED > ...) is a model for Bridge's authority tiers. Convergence (all routers eventually agree on the routing table) is a model for "all agents eventually receive the same effective directive."

---

## ANALOGY 11: OPERATING SYSTEMS (PROCESS SCHEDULING, RESOURCE ALLOCATION)

**What it solves:** Multiple processes compete for CPU, memory, I/O. The OS decides which process gets which resource, when, and under what policy.

**Mechanism:** Scheduling algorithms, resource quotas, priority inheritance, deadlock detection, policy-driven allocation.

**Closest Bridge parallel:** **MODERATE.** OS resource allocation is about competing claims for limited resources. Bridge is about competing claims for authority over actions.

**Key distinction:** OS allocation is about resource scarcity (not enough CPU for all processes). Bridge is about instructional conflict (not one "right" answer, but multiple legitimate claims). OS policy is typically fixed (nice values, cgroups). Bridge policy is project-specific.

**What Bridge can learn:** Priority inheritance - when a high-priority task blocks on a low-priority resource, the low-priority task inherits priority. Bridge's "explicit human override" is a form of priority inheritance: a human claim inherits priority over a static rule.

---

## ANALOGY 12: DATABASE CONCURRENCY (LOCKS, MVCC, SERIALIZABILITY)

**What it solves:** Multiple transactions read and write data concurrently. The database ensures that the final state is as if transactions ran serially, despite concurrent execution.

**Mechanism:** Locking (pessimistic), MVCC (optimistic), conflict detection, rollback, isolation levels.

**Closest Bridge parallel:** **MODERATE.** Database concurrency is about data conflicts. Bridge is about authority conflicts. But the conflict detection pattern is similar.

**Key distinction:** Database conflicts are detected at commit time (or earlier, with locks). Bridge conflicts should be detected BEFORE the agent acts (proactive, not reactive). The "isolation level" concept maps to Bridge's "how much conflict resolution is required before acting?"

**What Bridge can learn:** MVCC's visibility rules - a reader sees a consistent snapshot of the data as of a point in time. Bridge's "effective standing at time T" is a visibility rule for claims.

---

## ANALOGY 13: EVENT SOURCING

**What it solves:** State is derived from an immutable log of events. The current state is a projection of the event history. Conflicts are resolved by event ordering and processing rules.

**Mechanism:** Event store, aggregate roots, projections, event versioning, upcasting.

**Closest Bridge parallel:** **STRONG.** Event sourcing is the closest architectural pattern to Bridge's vision:
- Every claim/decision/action is an event in the institutional state log
- The current institutional state is a projection of all events
- Standing is computed by replaying events through the authority framework
- Conflicts are detected when events contradict (two events claim different states)
- The event log is the audit trail (EU AI Act compliance)

**Key distinction:** Event sourcing is typically used for system state (orders, accounts, inventory). Bridge would apply it to institutional state (decisions, claims, authority, standing). The pattern is the same; the domain is different.

**What Bridge can learn:** Event sourcing's "upcasting" - old events are transformed to new schemas when the schema evolves. Bridge's authority framework will evolve; the standing records for past actions need to remain interpretable.

---

## ANALOGY 14: LEGAL SYSTEMS (PRECEDENT, JURISDICTION, STATUTE)

**What it solves:** Multiple sources of law (constitutions, statutes, regulations, precedents, contracts) can conflict. Legal systems determine which source governs which situation, with hierarchical precedence and temporal rules.

**Mechanism:** Hierarchy of laws (constitution > statute > regulation > precedent), jurisdiction (which court has authority), temporal rules (new law supersedes old law), stare decisis (precedent binds future decisions), conflict rules.

**Closest Bridge parallel:** **VERY STRONG.** Legal systems are the most sophisticated existing model for Bridge's problem:
- Multiple legitimate sources of authority (constitution, statute, precedent, contract)
- Hierarchical precedence (higher authority overrides lower)
- Temporal rules (newer law supersedes older; but not always - some laws take effect on a schedule)
- Jurisdiction (which authority applies to which domain)
- Precedent (past decisions influence future ones)
- Conflict rules (when two sources conflict, which wins and why)

**Key distinction:** Legal systems are human-run, adversarial, and centrally coordinated by courts. Bridge is computational, non-adversarial, and decentralized (each project defines its own authority framework). But the conceptual structure is identical.

**What Bridge can learn:** The legal concept of "stare decisis" - past decisions create precedent that constrains future decisions. Bridge's standing records could create precedent: "in this project, when X and Y conflict, X has prevailed in 3 of the last 4 cases, suggesting X has higher effective standing for this type of conflict."

---

## ANALOGY 15: CORPORATE GOVERNANCE

**What it solves:** Multiple stakeholders (shareholders, board, executives, employees) have different authority over different decisions. Governance structures determine who decides what, with what checks and balances.

**Mechanism:** Charters, bylaws, board resolutions, delegated authority, voting, fiduciary duties, conflict-of-interest rules.

**Closest Bridge parallel:** **STRONG.** Corporate governance is about authority distribution across decision types:
- Board decides strategy; CEO decides execution; managers decide tactics
- Delegation: authority flows down; accountability flows up
- Conflicts: board vs CEO, shareholder vs management - resolved through governance structures
- Standing: who has effective authority for this decision at this time?

**Key distinction:** Corporate governance is organizational and human. Bridge would be computational and agent-facing. But the structure (who decides what, with what override powers, with what record) is the same.

**What Bridge can learn:** Delegation chains - authority is not just tiers but chains of delegation. Bridge's authority graph could model delegation: "the tech lead delegated the coding-style decision to the senior engineer, who delegated the function-naming decision to the AGENTS.md file."

---

## ANALOGY 16: SUPPLY CHAIN CONTROL TOWERS

**What it solves:** Multiple entities (suppliers, manufacturers, logistics providers, retailers) across a supply chain have different Authority over different decisions. Control towers provide visibility and coordination, determining which entity's decision governs for a given disruption or order.

**Mechanism:** Visibility platforms, exception management, escalation paths, authority delegation across tiers, decision rights matrices.

**Closest Bridge parallel:** **MODERATE.** Control towers coordinate across organizational boundaries. Bridge coordinates across instruction sources within a project.

**Key distinction:** Supply chain control towers are about coordination across independent organizations. Bridge is about coordination within a single project (or across projects for enterprise Bridge). The scale is different.

**What Bridge can learn:** The "control tower" concept - a central point that sees all claims and determines effective standing - is a useful architectural metaphor. But Bridge should not be a control tower that dictates; it should be a standing evaluator that computes.

---

## SYNTHESIS: WHICH ANALOGY IS CLOSEST?

Bridge's problem is a hybrid. No single analogy captures it fully.

**Closest analogies, ranked:**

1. **LEGAL SYSTEMS (precedent, jurisdiction, hierarchy)** - Best conceptual fit for multiple legitimate authorities with precedence, conflict, and temporal reasoning. Bridge is "computational common law" for project instructions.

2. **ARBITRATION** - Best fit for the resolver's role: evaluating conflicting claims and issuing a binding, reasoned determination.

3. **GIT** - Best fit for the data model: claims as commits, conflicts as merge conflicts, provenance as history, temporal reasoning as commit ordering.

4. **EVENT SOURCING** - Best fit for the architecture: institutional state as a projection of an immutable event log of claims, decisions, and standing records.

5. **FINANCIAL CLEARING** - Best fit for finality and auditability: once a directive is resolved and acted upon, the determination is final and recorded.

**What Bridge is NOT like:**

- **Consensus/RAFT/PAXOS:** Bridge does not seek agreement among equals. It seeks authoritative resolution among unequals.
- **Leader election:** Bridge does not elect one leader. It computes per-action standing.
- **Simple policy engines:** Bridge does not evaluate a single policy set. It evaluates competing claims with authority.

---

## THE CORE INSIGHT FROM THE ANALOGY MAP

Bridge's problem is most precisely characterized as:

> **Computational common-law authority resolution.**

In a common-law system:
- Multiple sources of law exist (statutes, precedents, constitutional provisions)
- They can conflict
- Courts resolve conflicts through authority evaluation (higher law overrides lower; newer overrides older; specific overrides general)
- The resolution is recorded as precedent (standing for future cases)
- Parties can see why the decision was made (reasoning)

In Bridge:
- Multiple sources of instruction exist (AGENTS.md, human prompts, docs, manifests, policies)
- They can conflict
- The resolver resolves conflicts through authority evaluation (tier precedence, staleness, scope, explicit override)
- The resolution is recorded as standing (authoritative for future similar actions)
- The agent can see why the directive was produced (citations, rationale)

The difference: common law is interpreted by humans (judges). Bridge is computed by a deterministic engine. But the conceptual structure is the same.

---

*End of distributed systems analogy map.*
