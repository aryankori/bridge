# Bridge: Pre-Architecture Decision Memo

**Date:** 2026-08-27  
**Status:** Pre-Architecture (Awaiting EXP-001 Validation)  
**Author:** Kori

## Executive Summary
This memo defines the architectural boundaries and product strategy for the Bridge framework. It establishes what Bridge will govern, what it will delegate, and crucially, what it will refuse to build. This document reflects the updated thesis: Bridge computes **Effective Standing** from existing, fragmented authority sources for federated, runtime authority arbitration across heterogeneous AI agents, explicitly rejecting the prior "Project Truth / Commitment Control" ledger model.

---

## MISSION 1 — ARCHITECTURAL BOUNDARY

To define Bridge, we must identify the exact boundary it intercepts and governs. 

*   **A. agent ↔ agent:** DELEGATE. Transport protocols like A2A handle point-to-point payload delivery.
*   **B. agent ↔ project:** TOO BROAD.
*   **C. agent ↔ project state:** OBSERVE. Agents interact with state via MCP or direct filesystem access.
*   **D. project state ↔ systems of record:** OBSERVE. Git and CI manage this boundary.
*   **E. intent ↔ authorized action:** MEDIATE. Bridge translates intent into verifiable structures.
*   **F. action ↔ evidence:** OBSERVE. The compiler/test-runner generates evidence from action.
*   **G. evidence ↔ accepted state:** DELEGATE. Existing systems of record (Git, CI) own this. The prior hypothesis (that Bridge should own this as "Project Truth") has been falsified.
*   **H. intent ↔ comparative authority:** **OWN.** This is the core thesis of Bridge. Bridge computes "Effective Standing" (comparative authority under conflict) dynamically.

**Conclusion:** Bridge is not a communication router, a vector database, or a new system of record. Bridge is the **authority arbitration layer** that computes effective standing from existing authority sources.

---

## MISSION 2 — BUILD / ADOPT / WRAP / AVOID

To maintain a lean engineering footprint and focus purely on the reconciliation value proposition, Bridge will adhere to the following technological boundaries:

| Technology/Domain | Decision | Rationale |
| :--- | :--- | :--- |
| **A2A** | ADOPT | Utilize existing transport layers for agent communication. Do not rebuild JSON-RPC routing. |
| **MCP** | ADOPT | Utilize the Model Context Protocol for extracting context. Bridge should act as an MCP server/middleware, not a competitor. |
| **ACP** | AVOID | Nascent and redundant with A2A/MCP convergence. |
| **Git** | WRAP | Git is the absolute system of record. Bridge wraps Git to tie deterministic diffs to agent intents. |
| **CI** | WRAP | CI provides the deterministic evidence (exit codes, test coverage). Bridge consumes this via webhooks or CLI parsing. |
| **IAM / Policy** | WRAP | Consume identity and policy from where it already lives (OIDC, Git roles, Jira). Do not build a standalone policy engine. |
| **Retrieval** | WRAP | If semantic search is needed, wrap existing engines (Chroma, Pinecone). Do not build custom HNSW indexing. |
| **Code Graphs** | WRAP | Use AST extractors (e.g., tree-sitter, Cognee). Do not build a custom code parsing engine. |
| **Memory/Ledgers** | AVOID | Reject the concept of owning a standalone "Project Truth" ledger. Bridge computes standing; it does not store an omniscient truth. |
| **Authority Graph** | BUILD | Bridge's core IP: The project-specific authority graph and the integration work required to compute effective standing across fragmented tools. |
| **Arbitration** | BUILD | The engine that calculates comparative authority under conflict. |

---

## MISSION 3 — MINIMUM PRODUCT OBJECT

If Bridge is the authority arbitration layer, it requires a canonical object for computing comparative authority.

*Rejected Objects:*
*   `ProjectTruth` / `Commitment`: Falsified. Implies Bridge owns a massive ledger that competes with existing systems of record.
*   `Policy`: Too static. Standing is comparative and contextual, not just RBAC.

**The Minimum Canonical Object: `EffectiveStanding`**

`EffectiveStanding` represents the dynamically computed authority of an agent (or human) in a specific conflict context, derived from external sources (Git history, Jira assignments, IAM).

```typescript
type EffectiveStanding = {
  subject: AgentIdentity;
  context: ResourceURI;
  authoritySources: AuthoritySource[]; // e.g., Git Blame, Jira Assignee
  computedWeight: number;
  standing: 'DOMINANT' | 'SUBORDINATE' | 'PEER' | 'UNAUTHORIZED';
};
```
By focusing solely on computing `EffectiveStanding` at runtime, Bridge avoids becoming a bloated policy engine or a redundant system of record.

---

## MISSION 4 — MINIMUM PRODUCT

Assuming research validates the thesis, the Minimum Viable Product (MVP) is a **CLI/local-first Daemon (`bridge-cli`)**.

*   **INPUT:** An agent initiates an action that conflicts with another agent or established state.
*   **PROCESSING:** `bridge-cli` queries existing authority sources (Git, local IAM, assigned tasks) to compute the `EffectiveStanding` of the acting agent.
*   **OUTPUT:** An arbitration decision (e.g., "Agent A has dominant standing over Agent B for this file due to recent commit history").
*   **USER VALUE:** Automated resolution of agent conflicts without requiring a centralized, synchronized "Project Truth" database.

*No GUI, no cloud sync, no custom policy engine, no standalone ledger.*

---

## MISSION 5 — 30/60/90 DAY ARCHITECTURE

*(Assumption: 1–2 Engineers)*

### DAY 30: The State Ledger
*   **Built:** A local SQLite-backed CLI (`bridge-cli`) that accepts, stores, and queries `Commitment` objects.
*   **Not Built:** Any Git/CI integration, network sync, or UI.
*   **Experimental Validation:** Can a receiver agent parse the SQLite ledger efficiently via an MCP tool?
*   **Success Metric:** Agent B successfully reads Agent A's commitments without raw transcript injection.

### DAY 60: The Verification Engine
*   **Built:** Git hooks and local test-runner wrappers that automatically append `Evidence` to pending commitments and transition their status to `VERIFIED` or `REJECTED`.
*   **Not Built:** Cloud infrastructure, webhooks, multi-repo support.
*   **Experimental Validation:** Does the system accurately reject hallucinated agent claims when Git diffs don't match?
*   **Success Metric:** Zero false-positive `VERIFIED` commitments during automated agent loops.

### DAY 90: Interoperability Boundary
*   **Built:** A local MCP server exposing the verified Project Truth to heterogeneous agents (e.g., Claude Code, OpenCode, Cursor).
*   **Not Built:** Centralized enterprise dashboard, custom agent chat interface.
*   **Experimental Validation:** Can two different foundational models (e.g., Sonnet 3.5 and Nemotron) seamlessly hand off a complex task using only the Bridge MCP server?
*   **Success Metric:** >80% reduction in rework loops during cross-model handoffs.

---

## MISSION 6 — "WHAT NOT TO BUILD" (Anti-Roadmap)

To survive as a foundational infrastructure layer, Bridge must aggressively refuse to build the following:

1.  **Universal Chat UI:** Bridge is headless infrastructure. If we are rendering markdown chat bubbles, we have lost focus.
2.  **Agent Marketplace:** We do not host, sell, or evaluate agents. We govern their state.
3.  **Custom Protocol:** If A2A or MCP exists, use it. Do not invent "Bridge-RPC."
4.  **Proprietary Vector DB:** Semantic search is a commodity. Do not build indexing engines.
5.  **Cloud-First Sync:** The MVP must work entirely on `localhost` within an air-gapped corporate network. 
6.  **Autonomous Swarm Engine:** Bridge does not *orchestrate* agents (it doesn't tell them what to do). It *reconciles* them (it tells them what is true).
7.  **Generic Workflow Builder:** We are not a low-code/no-code pipeline tool.
8.  **Replacing Git/Jira/IAM:** We wrap them. We do not replace them. We compute standing *from* them.
9.  **A Standalone "Project Truth" Ledger:** We do not store an omniscient truth. We compute comparative authority on demand.
10. **Enterprise Control Plane (Too Early):** No RBAC, no SSO, no billing engine until the local open-source primitive is ubiquitous.

---

## MISSION 7 — FAILURE-RESILIENT ARCHITECTURE

How does Bridge prevent itself from becoming a bottleneck?

*   **If an authority source is down:** Bridge falls back to the most recent cached graph or degrades to peer standing (requiring human arbitration).
*   **If agents disagree:** The arbitration engine relies purely on computed standing from external systems of record.
*   **If Git contradicts Bridge:** **Git wins.** Bridge does not own the ledger. It computes standing based on Git's absolute reality.

---

## FINAL DELIVERABLES SUMMARY

1.  **What should Bridge own?** The dynamic computation of Effective Standing (authority arbitration) across heterogeneous agents.
2.  **What should Bridge not own?** The ledger, the system of record, policy engines, reconciliation engines, or agent orchestration.
3.  **What is the smallest canonical Bridge object?** `EffectiveStanding` (Agent Identity + Context + Authority Sources $\to$ Standing).
4.  **What is the minimum viable product?** A local daemon that computes standing from local Git/Jira/IAM to resolve agent conflicts.
5.  **What should the first production architecture look like?** A local MCP server exposing computed authority graphs to standard IDEs and agent CLI tools.
6.  **What architectural decision must wait for empirical evidence?** EXP-001 will measure work-transfer baseline, setting the stage for evaluating how effective standing reduces multi-agent friction.
