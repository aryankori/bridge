# Bridge: Pre-Architecture Decision Memo

**Date:** 2026-08-27  
**Status:** Pre-Architecture (Awaiting EXP-001 Validation)  
**Author:** Kori

## Executive Summary
This memo defines the architectural boundaries and product strategy for the Bridge framework. It establishes what Bridge will govern, what it will delegate, and crucially, what it will refuse to build. This document assumes that the core hypothesis—that agentic software engineering requires deterministic state reconciliation rather than passive memory—is empirically validated by ongoing research.

---

## MISSION 1 — ARCHITECTURAL BOUNDARY

To define Bridge, we must identify the exact boundary it intercepts and governs. 

*   **A. agent ↔ agent:** DELEGATE. Transport protocols like A2A handle point-to-point payload delivery.
*   **B. agent ↔ project:** TOO BROAD.
*   **C. agent ↔ project state:** OBSERVE. Agents interact with state via MCP or direct filesystem access.
*   **D. project state ↔ systems of record:** OBSERVE. Git and CI manage this boundary.
*   **E. intent ↔ authorized action:** MEDIATE. Bridge translates intent into verifiable structures.
*   **F. action ↔ evidence:** OBSERVE. The compiler/test-runner generates evidence from action.
*   **G. evidence ↔ accepted state:** **OWN.** This is the core thesis of Bridge. Evidence (a passing test) does not become *Project Truth* until it is reconciled against the original agent's intent. 
*   **H. commitment ↔ fulfillment:** **OWN.** Bridge governs the lifecycle of an agent's obligation to the codebase.

**Conclusion:** Bridge is not a communication router, nor is it a vector database. Bridge is the **epistemological boundary** between an agent's claim (intent/action) and deterministic reality (evidence/accepted state).

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
| **IAM** | AVOID | Do not build authentication or authorization layers. Rely on enterprise OIDC/SAML or local system identity. |
| **Retrieval** | WRAP | If semantic search is needed, wrap existing engines (Chroma, Pinecone). Do not build custom HNSW indexing. |
| **Code Graphs** | WRAP | Use AST extractors (e.g., tree-sitter, Cognee). Do not build a custom code parsing engine. |
| **Memory** | AVOID | Reject the concept of raw "memory." Do not store unpruned conversation transcripts. |
| **Provenance** | BUILD | Bridge's core IP: Structurally linking an LLM generation ID to a specific Git commit and CI test result. |
| **Verification** | BUILD | The reconciliation engine that evaluates evidence against claims to transition state to "Project Truth." |

---

## MISSION 3 — MINIMUM PRODUCT OBJECT

If Bridge is the governance layer between intent and reality, it requires a canonical state object. 

*Rejected Objects:*
*   `WorkState` / `ProjectState`: Too monolithic and prone to bloat.
*   `Claim` / `Evidence` / `Decision`: Too fragmented; these are properties, not the core entity.

**The Minimum Canonical Object: `Commitment`**

A `Commitment` represents an agent's obligation to mutate the project state. It is the smallest unit that encapsulates the entire Bridge lifecycle.

```typescript
type Commitment = {
  id: string;
  proposer: AgentIdentity;
  intent: string;              // What the agent wants to do
  target: ResourceURI;         // Where the change happens
  expectedEvidence: string[];  // e.g., "Passes test-auth.ts"
  actualEvidence: Evidence[];  // Git diff hash, CI exit code
  status: 'PROPOSED' | 'IMPLEMENTED' | 'VERIFIED' | 'SUPERSEDED' | 'REJECTED';
};
```
By focusing solely on tracking and reconciling `Commitments`, Bridge avoids becoming a bloated general-purpose database.

---

## MISSION 4 — MINIMUM PRODUCT

Assuming research validates the thesis, the Minimum Viable Product (MVP) is a **CLI/local-first Daemon (`bridge-cli`)**.

*   **INPUT:** An agent initiates a task by submitting a `Commitment` proposal (via local MCP or CLI invocation).
*   **PROCESSING:** `bridge-cli` observes the local Git worktree and standard out/error streams of the test runner to gather `Evidence`. It reconciles the `Evidence` against the `Commitment`.
*   **OUTPUT:** A local JSON/SQLite ledger of `Verified` and `Superseded` commitments, which acts as the strict contextual filter for the next agent session.
*   **USER VALUE:** Agent B picks up exactly where Agent A left off, without hallucinating discarded code paths, reading zero unverified conversational noise.

*No GUI, no cloud sync, no enterprise control plane.*

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
8.  **Replacing Git/Jira/IAM:** We wrap them. We do not replace them.
9.  **Giant Ontology:** Do not attempt to map every concept in computer science. Track commitments, diffs, and tests.
10. **Enterprise Control Plane (Too Early):** No RBAC, no SSO, no billing engine until the local open-source primitive is ubiquitous.

---

## MISSION 7 — FAILURE-RESILIENT ARCHITECTURE

How does Bridge prevent itself from becoming a source of false project state?

*   **If an agent disappears:** The `Commitment` remains in `PROPOSED` or `IMPLEMENTED` state, but never reaches `VERIFIED`. The next agent sees it as incomplete work.
*   **If memory is stale / agents disagree:** The reconciliation engine relies purely on deterministic evidence. If Agent A claims a feature is complete, but the CI evidence is `exit code 1`, the claim is overridden.
*   **If Git contradicts documentation:** **Git wins.** Bridge establishes a strict epistemological hierarchy: `Deterministic Reality (Git/CI) > Verified Commitment > Agent Claim`.
*   **If a tool lies:** This is the hardest failure mode. Bridge must eventually rely on cryptographic provenance (e.g., SPIFFE identities for build tools) to ensure evidence cannot be spoofed by a rogue agent payload.

---

## FINAL DELIVERABLES SUMMARY

1.  **What should Bridge own?** The reconciliation lifecycle between an agent's commitment (intent) and deterministic reality (evidence).
2.  **What should Bridge not own?** Agent orchestration, transport protocols, semantic storage engines, or source code versioning.
3.  **What is the smallest canonical Bridge object?** The `Commitment` (Agent Intent + Expected Evidence + Actual Evidence $\to$ State).
4.  **What is the minimum viable product?** A local, CLI-based SQLite daemon that intercepts agent intent and verifies it against local Git/test outcomes.
5.  **What should the first production architecture look like?** A local MCP server exposing verified `Commitments` as context to standard IDEs and agent CLI tools.
6.  **What architectural decision must wait for empirical evidence?** Whether token-reduction alone justifies the overhead of structured state transfer, or if explicit negative constraints (pruning superseded hypotheses) are required to prevent agent hallucination loops. This is exactly what EXP-001 will measure.
