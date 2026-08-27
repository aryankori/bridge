# BRIDGE — NOVELTY AUDIT

**Author:** Hermes Agent (Independent Novelty Auditor)
**Date:** 2026-08-27
**Purpose:** Explicitly audit every proposed Bridge contribution against prior work.

---

## NOVELTY AUDIT TABLE

| Proposed Contribution | Existing Work | Remaining Difference | Defensible? |
|---|---|---|---|
| **Agent interoperability layer** | A2A (2026), MCP (2024–2026), ACP (2025), InterSAGE (2026) | None. A2A standardizes identity, discovery, tasks, lifecycle, streaming, push notifications. MCP standardizes tool access. | ❌ **NOT DEFENSIBLE** — commoditized |
| **Persistent project memory** | Honcho (2026), Mem0 (2025–2026), Cognee (2025–2026), agentmemory (2026) | None. These systems store cross-session memory, extract facts, and retrieve context. | ❌ **NOT DEFENSIBLE** — commoditized |
| **Work-state transfer schema** | EXP-001 (Bridge, 2026) | The `ExperimentalWorkTransfer` v0.2.0 schema is novel, but the concept of "transfer structured state between agents" is trivially obvious and likely independently discovered. | ⚠️ **WEAKLY DEFENSIBLE** — schema is novel, concept is obvious |
| **Project intelligence (lifecycle-aware facts)** | Cognee (knowledge graphs + AST), Mem0 (graph memory) | Bridge proposes explicit lifecycle states (`proposed` → `decided` → `implemented` → `verified` → `superseded`). This is more formal than existing systems. | ⚠️ **PARTIALLY DEFENSIBLE** — lifecycle formalization is novel |
| **Project truth / reconciliation** | Git (code state), CI/CD (verification), Jira (work state) | No existing system reconciles contradictions between agent claims and verified project state. This is the strongest novelty claim. | ✅ **DEFENSIBLE** — if narrowed to "commitment reconciliation" |
| **Commitment control plane** | Workflow engines (Temporal, Airflow), policy engines (OPA), IAM (OIDC/SPIFFE) | Commitment theory (Singh 1996, Yolum & Singh 2002) formalizes social commitments, but no existing system implements a commitment lifecycle for AI agents. | ✅ **DEFENSIBLE** — if distinguished from workflow/policy |
| **Accountability layer** | NIST AI RMF (2023), IBM trace layer (2026), InterSAGE accountability (2026) | NIST requires accountability; IBM proposes trace layers. Bridge's contribution would be *operationalizing* accountability for agents, but the concept is not novel. | ⚠️ **PARTIALLY DEFENSIBLE** — implementation is novel, concept is not |
| **Governed state transitions** | A2A (task lifecycle), Git (commit DAG), CI/CD (pipeline stages) | Bridge proposes a *semantic* state machine (commitment lifecycle) that sits above mechanical state machines. This is a novel positioning. | ✅ **DEFENSIBLE** — if positioned above existing systems |

---

## PRIMARY SOURCE ANALYSIS

### A2A Specification (2026)

**What it standardizes:**
- Agent identity (`AgentCard`)
- Discovery (`GetAgentCard`)
- Task lifecycle (`TaskState`: `submitted`, `working`, `input-required`, `completed`, `failed`, `canceled`, `rejected`)
- Messages and artifacts
- Streaming and push notifications
- Security (`SecurityScheme`, `AuthenticationInfo`)

**What it explicitly leaves open:**
> "Agents collaborate based on declared capabilities and exchanged information, **without needing access to each other's internal state, memory, or tool implementations**." (Section 1.2)

**Bridge opportunity:** The semantic layer above tasks — authority, acceptance, commitments, supersession.

### SPIFFE Specification (2026)

**What it standardizes:**
- Workload identity (`SPIFFE ID`)
- Verifiable identity documents (`SVID`: X.509, JWT, WIT)
- Workload API (local identity issuance)
- Trust domains and federation

**What it explicitly leaves open:**
> "The SPIFFE Workload API... **explicitly does not include an authentication handshake** or authenticating token from the workload." (Workload API Spec)

**Bridge opportunity:** Everything above identity — authorization, authority, delegation, commitment, accountability.

### Commitment Theory (Singh 1996)

**What it formalizes:**
- **S-commitments (social):** Exist between agents. "The commiter is liable for not acting up on them." (Section 2)
- **P-commitments (psychological):** Exist within agents. "Intentions are taken to be causes of actions." (Section 2.1)
- **Commitment lifecycle:** Adopt → Fulfill / Violate → Revoke
- **Delegation:** "Transferring commitment to another agent" (Section 2.3)
- **Nonmonotonic commitment machines:** Allow commitments to be revised (Yolum & Singh 2002)

**What it does NOT formalize:**
- Computational representation of commitments in AI-agent systems
- Integration with Git, CI/CD, or existing software systems
- Human ratification protocols for agent-generated proposals

**Bridge opportunity:** Computational implementation of commitment theory for AI-assisted software development.

### NIST AI RMF (2023)

**What it validates:**
- "Accountable and Transparent" as characteristics of trustworthy AI
- "The joint responsibility of all AI actors to determine whether AI technology is an appropriate or necessary tool" (Section 3)

**What it does NOT validate:**
- Any specific technical implementation
- That a commercial product must exist
- That "commitment control" is the right abstraction

**Bridge opportunity:** NIST validates the *need* for accountability, but not the *product*.

---

## COMPETITIVE THREAT ANALYSIS

### Biggest Threats to Novelty

| Threat | Severity | Why |
|---|---|---|
| **A2A extension mechanism** | HIGH | A2A supports extensions. If commitments are valuable, A2A could absorb them. |
| **Anthropic adds "Claude remembers decisions"** | HIGH | Claude Code has auto-memory. Adding commitment tracking is a natural extension. |
| **InterSAGE accountability layer** | MEDIUM | InterSAGE (2026) already proposes accountability as a layer. |
| **IBM trace layer** | MEDIUM | IBM (2026) proposes action accountability as a trace layer. |
| **GitHub Copilot + Actions** | MEDIUM | GitHub could add "Copilot checks prior decisions" natively. |

### Novelty Survival Strategy

To survive these threats, Bridge must:
1. **Be model-neutral** — work across Claude, Codex, Gemini, OpenCode (vendors won't do this)
2. **Be project-specific** — accumulate commitment history that migrates across agents (vendors can't copy this)
3. **Be theoretically grounded** — cite commitment theory (Singh 1996) to establish prior art and novelty

---

## FINAL NOVELTY ASSESSMENT

| Claim | Novelty Confidence | Notes |
|---|---|---|
| Agent interoperability | ❌ **NONE** | A2A owns this |
| Project memory | ❌ **NONE** | Honcho/Mem0/Cognee own this |
| Work-state transfer schema | ⚠️ **LOW** | Schema is novel, concept is obvious |
| Lifecycle-aware project intelligence | ⚠️ **MEDIUM** | Formalization is novel, concept is intuitive |
| Commitment reconciliation | ✅ **HIGH** | No existing system implements this |
| Commitment control plane | ✅ **MEDIUM-HIGH** | Theory exists (Singh), implementation doesn't |
| Accountability layer | ⚠️ **LOW** | NIST/IBM/InterSAGE already propose this |

---

## CONCLUSION

**Bridge's strongest novelty claim is: a commitment reconciliation layer that binds agent-generated proposals to human-ratified, evidence-backed project state.**

This is:
1. **Theoretically grounded** in commitment theory (Singh 1996)
2. **Not implemented** by any existing system
3. **Defensible** against vendor absorption (requires model neutrality)
4. **Empirically testable** via EXP-002

**Bridge's weakest claims are: agent interoperability, project memory, and accountability layer — all commoditized or proposed by others.**

---

*End of novelty audit.*
