<div align="center">
  <img src="docs/assets/bridge-logo.jpg" alt="Bridge Logo" width="300" />

  <h1>Bridge</h1>

  <p>
    <strong>The epistemological boundary and orchestration layer between AI agents.</strong>
  </p>

  <p>
    <a href="https://github.com/aryankori/bridge/actions"><img src="https://img.shields.io/github/actions/workflow/status/aryankori/bridge/ci.yml?branch=main&style=flat-square&color=000000" alt="Build Status" /></a>
    <a href="https://github.com/aryankori/bridge/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Private-000000.svg?style=flat-square" alt="License" /></a>
    <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%E2%89%A5%2020.0.0-000000.svg?style=flat-square" alt="Node Version" /></a>
  </p>
</div>

---

## Vision

Bridge sits between you and your AI tools. Instead of context-switching between Claude Code, OpenCode, Hermes, and whatever ships next month - Bridge provides a unified substrate that can discover, connect to, launch, observe, and mathematically govern all of them.

It is **not** a chat UI. It is **not** a wrapper around LLM APIs. It is a systems-level interoperability layer that speaks each agent's native protocol and maintains formal Project Truth.

```text
                    HUMAN
                      │
                      ▼
                   BRIDGE
        (Project Truth & Reconciliation)
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       CLAUDE      OPENCODE     HERMES
          ↕           ↕           ↕
     ANTIGRAVITY    GEMINI     OTHER AI
```

## The Thesis: Project Truth vs. Agent Memory

AI tools are fracturing into isolated silos, relying on flawed vector "memory" that inevitably indexes hallucinations and discarded code paths.

Bridge replaces passive memory with **Project Truth**. Read our foundational research on this transition:
- [The Bridge Thesis v2](docs/research/bridge-thesis-v2.md)
- [Pre-Architecture Decision Memo](docs/research/bridge-prearchitecture-decision-memo.md)
- [Empirical Paper Development Status](docs/research/paper-development-status.md)

## Current Status: Phase 0 

**Reconnaissance & Foundation Phase (Complete)**

- ✅ Discovered AI agents on the development machine (Claude Code, OpenCode, Hermes).
- ✅ Mapped their process architectures, session storage, and communication protocols.
- ✅ Identified ACP (Agent Client Protocol) as the minimum common substrate.
- ✅ Established the core type system, event bus, and agent registry.
- 🚧 **Active:** Empirical evaluation via `EXP-001` (Cross-Agent Work Transfer).

## Protocol Stack 

| Layer | Protocol | Purpose |
| --- | --- | --- |
| **ACP** | JSON-RPC 2.0 over stdio/HTTP | Editor ↔ Agent communication |
| **MCP** | JSON-RPC 2.0 over stdio | Agent ↔ Tools communication |
| **A2A** | HTTP + JSON-RPC + SSE | Agent ↔ Agent (industry standard) |

Bridge integrates primarily at the ACP layer and will implement A2A for inter-agent communication, strictly governing state through the `ExperimentalWorkTransfer` schema.

## Development Setup

### Prerequisites

- Node.js ≥ 20.0.0
- [pnpm](https://pnpm.io/)

### Installation & Scripts

```bash
pnpm install
```

| Command | Action |
| :--- | :--- |
| `pnpm test` | Runs the core test suite (Vitest) |
| `pnpm typecheck` | Validates TypeScript configuration |
| `pnpm lint` | Runs ESLint checks |
| `pnpm format` | Formats codebase |
| `pnpm build` | Builds the project via tsup |
| `pnpm experiment:validate` | Validates offline schema compliance and fixtures |

## Continuous Integration (CI)

Bridge runs an automated GitHub Actions CI pipeline (`.github/workflows/ci.yml`) on every push to `main`. 

> [!NOTE]
> **No External AI / Live Execution in CI:** The CI workflow strictly executes deterministic static checks, unit tests, and offline validators. It does **not** execute live agent trials (`pnpm experiment:pilot`) or invoke outbound API calls. Live research runs are strictly local.

## Roadmap & Architecture

See the [Architecture Decision Log](docs/research/bridge-prearchitecture-decision-memo.md) for detailed boundaries. 

1. **Evidence before abstraction** - Every decision is grounded in empirical agent behavior.
2. **Core remains agent-agnostic** - Adding an agent means writing an adapter, not modifying core.
3. **Security-first process control** - Bridge controls powerful agents; every control surface is a boundary.
