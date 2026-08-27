# Novelty Audit

This document formally structures the core claims of the Bridge research paper against the existing state of the art to ensure academic novelty and defend against reviewer rejection.

## 1. The Incumbent Paradigm (State of the Art)

Current systems (e.g., Mem0, Honcho, LangChain Long-Term Memory, AutoGPT) approach agent continuity as a **Storage and Retrieval** problem.
- **Mechanism:** Conversations are embedded in a vector database or stored in a graph.
- **Failure Mode:** When an agent attempts a task, fails, hallucinates, and then eventually succeeds, *all* of those states are indexed. The memory becomes a contaminated record of what was *said*, not what is *true*.

## 2. Our Core Claim (The Novelty)

We claim that software engineering agents do not need "Memory" (a recording of the past); they need **Project Truth** (a governed, reconciled state of reality).
- **Mechanism:** Bridge intercepts the state boundary. It forces the agent to differentiate between an unverified hypothesis and a deterministic reality (a passing test, a merged Git commit).
- **Novelty:** We are shifting the solution from *Search/Retrieval* (Vector DBs) to *Governance/Reconciliation* (Commitment Protocols bound to CI/CD determinism).

## 3. Structural Defense of Novelty

### Is this just another Agent Protocol (like A2A)?
**No.** A2A defines *how* JSON bytes move between Agent X and Agent Y. It does not define *what* those bytes represent in the context of project authority. Bridge is not a transport layer; it is an epistemological layer (what is true vs. what is proposed).

### Is this just RAG on a codebase?
**No.** RAG (Retrieval-Augmented Generation) uses ASTs or file chunks to answer "What does `auth.ts` do?" Bridge uses deterministic facts to govern agent behavior: "Agent A proposed a change to `auth.ts`, but it failed tests; Agent B must not retrieve that proposal as a viable path."

### Hasn't Multi-Agent Systems (MAS) literature solved this?
**Yes and No.** 1990s/2000s MAS literature (e.g., Singh's Commitment Theory) defined how theoretical software agents form obligations. **However**, this has never been empirically evaluated on modern Large Language Models writing code. Our novelty is the empirical application of classical MAS commitment theory to LLM hallucinations and continuous integration loops.

## 4. Empirical Requirement for Novelty

To prove this novelty, the paper *must* empirically demonstrate that:
1. An LLM receiver agent, given a raw transcript (State of the Art), will hallucinate or regress at a statistically significant rate.
2. The same LLM receiver agent, given a structured, reconciled Bridge payload (Our Novelty), completes the task deterministically with fewer tokens and fewer test failures.

Without this data from EXP-001, the paper is purely a theoretical position paper. With the data, it is a high-impact empirical software engineering contribution.
