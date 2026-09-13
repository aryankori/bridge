# Bridge Thesis v2: Effective Standing & Authority Arbitration

**Document ID:** `BRIDGE-THESIS-V2` 
**Date:** 2026-08-27 
**Author:** Antigravity (ENI) & Bridge Integration Team 
**Status:** Architectural Specification & Strategic Thesis 
**Standard:** ASD-STE100 Simplified Technical English 

---

## 1. The Current Problem

AI software engineering agents (Claude Code, OpenCode, Hermes, Gemini CLI, Cursor) operate as **ephemeral, isolated silos**:

1. **Context Amnesia Across Sessions:** Every agent session starts blind or relies on raw chat transcript replay. When context windows fill up, knowledge truncates haphazardly.
2. **Handoff Friction:** Passing work from one agent to another (or from an agent to a human) requires manual explanation or raw transcript dumping, resulting in high token waste, context pollution, and frequent rework.
3. **Contradiction and Drift:** Over time, agents propose ideas that conflict with prior decisions. Without a single source of truth, different agents (or the same agent on different days) reverse architectural patterns, re-introduce fixed bugs, or re-explore discarded dead ends.
4. **The "Memory" Fallacy:** Current AI memory tools (vector stores, raw key-value logs) store *everything an agent says*. But agent output is noisy, speculative, and frequently wrong. Storing unverified LLM output produces a contaminated memory store that compounds hallucinations over time.

---

## 2. Product Thesis Evolution

Bridge has evolved through five distinct conceptual stages:

```
[Phase 0: Multi-Agent UI]
 │ (Commoditized wrapper: "one box to chat with N models")
 ▼
[Phase 1: Work Transfer]
 │ (Point-to-point: structured handoff schemas between agents, e.g., EXP-001)
 ▼
[Phase 2: Project Memory]
 │ (Cross-session storage: passive vector/key-value logs of agent outputs)
 ▼
[Phase 3: Project Intelligence]
 │ (Lifecycle-aware facts with provenance, linked to files and commits)
 ▼
[Phase 4: Project Truth & Reconciliation] (FALSIFIED)
 │ (Authoritative, reconciled ground truth. Falsified: Bridge should not own the ledger)
 ▼
[Phase 5: Effective Standing / Authority Arbitration] <-- CURRENT THESIS
 (Computing comparative authority under conflict from fragmented, existing authority sources)
```

### The Current Thesis

> **Bridge computes Effective Standing to provide federated, project-specific, runtime authority arbitration across heterogeneous AI agents.**

Bridge does not own a standalone "Project Truth" ledger, nor does it replace existing systems of record. Instead, Bridge **consumes** existing authority sources (IAM, Git, Jira, policy, etc.) to compute the "Effective Standing" (comparative authority under conflict) of agents at runtime. The core moat is the project-specific authority graph and the integration work required to compute it.

---

## 3. What EXP-001 Is Intended to Prove

**EXP-001 (Work Transfer Experiment)** evaluates the foundational transition from Phase 0 to Phase 1:

- **Hypothesis:** Passing structured, schema-validated task state (`ExperimentalWorkTransfer` v0.2.0) to a receiver agent (Agent B: OpenCode) reduces token consumption, eliminates exploratory rework, and increases test pass rates compared to passing raw, unpruned conversation transcripts (Condition B) or zero task context (Condition A).
- **Narrow Focus:** EXP-001 specifically measures the **single-hop transmission efficiency** of task state between two distinct agent runtimes (Claude Code as Analyzer, OpenCode as Executor).
- **Scope Limit:** EXP-001 proves *work-transfer packaging*; it does not yet evaluate cross-session longitudinal memory.

---

## 4. What Project Intelligence Adds

Where EXP-001 addresses single-hop task handoffs, **Project Intelligence** introduces longitudinal, cross-session continuity:

1. **Durable Knowledge Graph:** Captures architectural decisions, conventions, invariants, and known failure modes across days, weeks, and multiple developers.
2. **Strict Provenance Tracking:** Every item of knowledge records its origin (e.g., "Proposed by Claude in session S1, confirmed by human H1 in commit C1, verified by test suite T1").
3. **Symbol & Entity Grounding:** Semantic assertions are bound directly to concrete code symbols (classes, functions, interfaces) and file paths rather than floating as abstract text summaries.

---

## 5. What Effective Standing / Authority Arbitration Adds

Where EXP-001 addresses single-hop task handoffs, **Authority Arbitration** provides the critical control layer for multi-agent environments without requiring a new centralized database:

1. **Federated Authority Sources:** Consumes identity and policy from where it already lives (OIDC, Git roles, Jira assignments).
2. **Dynamic Computation:** Calculates "Effective Standing" at runtime when two agents, or an agent and a human, conflict over a decision or resource.
3. **No New Ledger:** Avoids the trap of building a centralized "Project Truth" database. The system of record remains the underlying infrastructure.
4. **The Moat:** The defensible value is the project-specific authority graph and the deep integration work required to compute it across fragmented enterprise tools.

---

## 6. What Is Fact, Hypothesis, and Unknown

| Category | Item | Verification Status |
| :--- | :--- | :--- |
| **FACT** | Git commits, branch topology, diffs, and blamelines are absolute ground truth. | Verified by Git internals |
| **FACT** | AST structures, exported symbols, types, and call graphs are deterministic. | Verified by parsers/compilers |
| **FACT** | Test execution results (exit codes, assertions) are objective binary evidence. | Verified by test runners (Vitest) |
| **FACT** | ACP (JSON-RPC 2.0) and stdio (stream-json) provide reliable agent I/O transport. | Verified by Bridge transport layer |
| **HYPOTHESIS** | Schema-driven work transfer (EXP-001) significantly outperforms raw transcripts in receiver agent task completion. | Formulated in EXP-001; awaiting empirical pilot & replication |
| **HYPOTHESIS** | Computing Effective Standing from existing authority sources arbitrates conflicts better than a centralized policy engine. | Formulated for EXP-002 |
| **HYPOTHESIS** | LLM extraction can reliably parse structured transfer state from arbitrary unstructured agent transcripts. | Initial harness testing positive; full variance unknown |
| **UNKNOWN** | The exact degradation curve of receiver agents across varying task complexities ($n=3$ pilot will measure). | Empirical data pending |
| **UNKNOWN** | Optimal balance between fully automated reconciliation from Git events versus human confirmation gates. | To be researched in Phase 2 |

---

## 7. Deterministic Codebase Intelligence vs. LLM Synthesis

Bridge strictly separates what can be computed **deterministically** from what requires **probabilistic LLM inference**:

```
┌────────────────────────────────────────────────────────┐
│ DETERMINISTIC LAYER (No LLM) │
│ - Git commit DAG, author, timestamps, file history │
│ - Diff analysis (lines added/removed, touched files) │
│ - AST parsing (symbols, function signatures, types) │
│ - Static typechecking (`tsc --noEmit`) │
│ - Test execution & failure stack traces │
│ - Dependency graphs & workspace package manifests │
│ - JSON-RPC protocol framing & secret scrubbing │
└──────────────────────────┬─────────────────────────────┘
 │ Grounding Evidence
 ▼
┌────────────────────────────────────────────────────────┐
│ LLM SYNTHESIS LAYER (AI) │
│ - Intent extraction from unstructured chat turns │
│ - Semantic rationale extraction ("Why this choice?") │
│ - Natural language task summary generation │
│ - Disambiguation of conflicting natural-language specs │
│ - Context materialization tailored to target agent │
└────────────────────────────────────────────────────────┘
```

**Architectural Rule:** Never use an LLM to derive what Git, Tree-sitter, or the compiler can determine with 100% mathematical certainty.

---

## 8. Technology Strategy: Adopt, Wrap, Build, Avoid

| Action | Technology | Rationale |
| :--- | :--- | :--- |
| **ADOPT** | **ACP (Agent Client Protocol) & MCP** | Standardized, multi-vendor agent and tool transport layer. |
| **ADOPT** | **ast-grep / Tree-sitter / TypeScript Compiler API** | Instant, deterministic AST and symbol graph extraction without LLM cost. |
| **ADOPT** | **QMD / BM25 Local Indexing** | Fast, local-first keyword and markdown search over workspace documentation. |
| **WRAP** | **Honcho / Mem0 / Cognee (via MCP)** | If raw session storage or basic graph storage is needed, wrap existing tools behind standard interfaces; do not treat them as the product core. |
| **BUILD** | **The Authority Graph** | The core proprietary moat: mapping fragmented enterprise tools into a unified authority representation. |
| **BUILD** | **Effective Standing Computation** | The engine that calculates comparative authority under conflict. |
| **BUILD** | **Work-Transfer Materializer** | Generating target-agent-specific injection payloads with strict token budget enforcement. |
| **AVOID** | **Custom Vector Databases** | Vector storage is an undifferentiated commodity. |
| **AVOID** | **Generic Multi-Agent Chat GUIs** | Shallow chat wrappers offer zero defensibility and solve the wrong problem. |
| **AVOID** | **Monolithic Cloud SaaS Architectures** | Bridge must remain local-first, privacy-respecting, and embedded in developer CLI workflows. |

---

## 9. The Fundamental Product Object

### Question
What is the core conceptual primitive of Bridge: `Memory`, `Context`, `WorkTransfer`, `ProjectTruth`, or `EffectiveStanding`?

### Decision & Rationale

**The fundamental Bridge object is `EffectiveStanding`.**

1. **Why not `ProjectTruth`?** (Falsified Hypothesis). A standalone "Project Truth" ledger assumes Bridge can and should become the ultimate system of record. This competes with Git and introduces massive synchronization overhead.
2. **Why `EffectiveStanding`?** 
 - Standing is comparative authority under conflict.
 - Bridge dynamically computes this standing from existing authority sources rather than attempting to store an omniscient truth.
 - The value is in the arbitration of authority, not the storage of state.

Everything in Bridge flows from, validates against, or updates the computation of **EffectiveStanding**.

---

## 10. Summary & Next Steps

1. **Current Blocker:** EXP-001 pilot execution is paused strictly due to upstream Claude quota exhaustion (`429 RESOURCE_EXHAUSTED`).
2. **Execution Integrity:** The harness, test suite (64/64 passing), typecheck, and pinned OpenCode model (`nvidia/nvidia/nemotron-3-super-120b-a12b`) are certified and locked.
3. **Immediate Next Step:** Upon upstream quota reset or account addition, execute the single authorized pilot run (`pnpm run experiment:pilot`) and produce the `EXP-001 N=1 PILOT REPORT`.
