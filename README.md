<div align="center">
 <img src="docs/assets/bridge-logo.jpg" alt="Bridge Logo" width="280" style="border-radius: 12px; margin-bottom: 12px;" />

 <h1>Bridge</h1>

 <p>
 <strong>The epistemological boundary and orchestration substrate between AI agents.</strong>
 </p>

  <p>
    <a href="https://github.com/aryankori/bridge/actions/workflows/ci.yml"><img src="https://github.com/aryankori/bridge/actions/workflows/ci.yml/badge.svg" alt="GitHub CI" /></a>
    <a href="https://gitlab.com/aryankori/bridge/-/pipelines"><img src="https://gitlab.com/aryankori/bridge/badges/main/pipeline.svg" alt="GitLab CI" /></a>
    <a href="https://bridge-rho-wine.vercel.app"><img src="https://img.shields.io/badge/website-live-000000?style=flat-square&logo=vercel" alt="Website" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-Private-107C41.svg?style=flat-square" alt="License" /></a>
    <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%E2%89%A520.0.0-339933.svg?style=flat-square&logo=node.js&logoColor=white" alt="Node" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/typescript-5.7-3178C6.svg?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
    <a href="https://vitest.dev/"><img src="https://img.shields.io/badge/vitest-4.1-FCC72B.svg?style=flat-square&logo=vitest&logoColor=black" alt="Vitest" /></a>
    <img src="https://img.shields.io/badge/protocols-ACP%20%7C%20MCP%20%7C%20A2A-6E40C9?style=flat-square" alt="Protocols" />
  </p>
</div>

---

[[_TOC_]]

---

## 1. Vision & Executive Summary

Bridge sits between the software engineer and heterogeneous AI coding agents. Instead of engineers constantly context-switching between Claude Code, OpenCode, Hermes, and Antigravity, Bridge establishes a unified system substrate that can **discover, launch, monitor, arbitrate, and mathematically govern** all of them.

Bridge is **not** a chat UI or wrapper around LLM APIs. It is a systems-level interoperability layer that interfaces with each agent's native protocol and preserves formal **Project Truth**.

```mermaid
graph TD
 User([Human Lead / Engineer]) -->|Directives & Intent| BridgeCore

 subgraph BridgeCore["BRIDGE SYSTEM SUBSTRATE"]
 direction TB
 Truth["Project Truth & Reconciliation Core"]
 Router["AgentRouter (Capability & Authority Matrix)"]
 Resolver["Authority Conflict Resolver (EXP-005)"]
 Ledger["Deterministic Evidence Ledger"]
 Truth <--> Router
 Router <--> Resolver
 Resolver <--> Ledger
 end

 subgraph ProtocolLayer["UNIFIED PROTOCOL TRANSLATION"]
 ACP["ACP Adapter<br/><i>(Editor <-> Agent JSON-RPC 2.0)</i>"]
 MCP["MCP Adapter<br/><i>(Agent <-> Tool Substrate)</i>"]
 A2A["A2A Protocol<br/><i>(Agent <-> Agent Transfer)</i>"]
 end

 BridgeCore --> ProtocolLayer

 subgraph AgentFleet["MULTI-AGENT RUNTIME FLEET"]
 Claude["Claude Code"]
 OpenCode["OpenCode"]
 Hermes["Hermes Agent"]
 Antigravity["Antigravity / Gemini CLI"]
 end

 ACP <---> Claude
 ACP <---> OpenCode
 A2A <---> Hermes
 MCP <---> Antigravity
```

---

## 2. The Thesis: Project Truth vs. Vector Memory

Current agentic tools rely heavily on naive vector "memory", which systematically leads to context pollution:
- Vector indices store hallucinations, dead ends, and superseded code paths alongside valid architecture.
- When multiple autonomous agents edit a repository simultaneously, context drift leads to semantic collisions and conflicting implementations.

Bridge replaces unstructured probabilistic memory with **Project Truth**:
- **Deterministic State Reconciliation:** Code, architectural invariants, and test evidence form the canonical ground truth.
- **Authority Matrix:** Explicit decision boundaries determine which agent or human holds decisive veto power over specific code paths and specifications.
- **Formal Transfer Proofs:** Cross-agent handoffs are governed through strongly typed transfer schemas (`ExperimentalWorkTransfer`).

Foundational research documents:
- [The Bridge Thesis v2](docs/research/bridge-thesis-v2.md)
- [Pre-Architecture Decision Memo](docs/research/bridge-prearchitecture-decision-memo.md)
- [EXP-005 Post-Pilot Review](docs/research/exp-005-post-pilot-review.md)

---

## 3. Current Milestones & Empirical Status

### Phase 0: Reconnaissance & Foundation (Completed)
- Mapped process topologies, session storage, and communication protocols for primary coding agents (Claude Code, OpenCode, Hermes).
- Selected **ACP (Agent Client Protocol)** as the lowest-common-denominator editor substrate.
- Implemented core type system, event bus, `WorkTransfer` primitive, and `AgentRouter` (`62f47e5`).

### Phase 1: Empirical Conflict Resolution Benchmark (Active)
- **Benchmark `EXP-005`**: 10-scenario cross-agent behavior benchmark testing conflict detection across Unambiguous, Ambiguous, and Unsolvable conditions.
- **Pre-Verification Result**: The deterministic conflict resolver achieved **10/10 (100%) accuracy** against gold standards:
 - 5/5 Unambiguous Scenarios correctly resolved with directive overrides (`PERMITTED_WITH_OVERRIDE` / `PERMITTED`).
 - 3/3 Ambiguous Scenarios correctly flagged as `AMBIGUOUS`.
 - 2/2 Unsolvable Scenarios correctly gated (`BLOCKED_CONFLICT` / `REQUIRES_AUTHORIZATION`).
- **Upcoming Wedge**: Autonomous Developer CLI resolver (`bridge resolve` npm package) to resolve branch divergences and agent collisions at the git worktree layer.

---

## 4. Protocol Stack Architecture

| Layer | Protocol | Wire Format | Functional Boundary |
| :--- | :--- | :--- | :--- |
| **ACP** | Agent Client Protocol | JSON-RPC 2.0 over stdio/HTTP | Client/IDE <-> Agent command execution |
| **MCP** | Model Context Protocol | JSON-RPC 2.0 over stdio | Agent <-> Specialized external tools |
| **A2A** | Agent-to-Agent Transfer | HTTP + JSON-RPC + SSE | Asynchronous task transfer between peer agents |

---

## 5. Development & Local Setup

### Prerequisites
- Node.js >= 20.0.0
- [pnpm](https://pnpm.io/) (`corepack enable && corepack prepare pnpm@latest --activate`)

### Installation
```bash
# Clone and install dependencies
git clone https://gitlab.com/aryankori/bridge.git
cd bridge
pnpm install
```

### Build & Quality Verification
| Command | Action |
| :--- | :--- |
| `pnpm typecheck` | Validates TypeScript compiler strictness |
| `pnpm test` | Executes unit test suite via Vitest |
| `pnpm build` | Bundles TypeScript source via tsup |
| `pnpm lint` | Runs ESLint analysis |
| `pnpm format` | Formats codebase with Prettier |
| `pnpm experiment:validate` | Validates empirical research schemas and offline fixtures |

---

## 6. Continuous Verification (CI/CD)

> **Deterministic CI Guarantee:** Automated pipelines (GitLab CI / GitHub Actions) strictly run deterministic static checks, TypeScript typechecking, and offline unit tests. Outbound LLM API calls and non-deterministic agent runs are strictly segregated to local research harnesses (`pnpm experiment:pilot`).

---

## 7. Core Architectural Invariants

1. **Evidence Before Abstraction:** Architectural decisions are grounded in empirically observed agent failure modes rather than speculative frameworks.
2. **Strict Agent Agnosticism:** Core orchestration logic knows nothing of specific vendor models; new agents integrate solely through standardized protocol adapters.
3. **Defense-in-Depth Process Isolation:** Agents execute in isolated worktrees with gated tool authority.
