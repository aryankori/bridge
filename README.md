# Bridge

The interoperability and orchestration layer between AI agents running on your computer.

## Vision

Bridge sits between you and your AI tools. Instead of context-switching between Claude Code, OpenCode, Hermes, Gemini, Cursor, and whatever ships next month - Bridge provides a unified substrate that can discover, connect to, launch, observe, and coordinate all of them.

```
                    HUMAN
                      │
                      ▼
                    BRIDGE
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       CLAUDE        OPENCODE    HERMES
          ↕           ↕           ↕
     ANTIGRAVITY    GEMINI     OTHER AI
```

Bridge is **not** a chat UI. It is **not** a wrapper around LLM APIs. It is a systems-level interoperability layer that speaks each agent's native protocol.

## Current Status

**Phase 0 - Reconnaissance (Complete)**

The project is in its foundation phase. We have:

- ✅ Discovered 6 AI agents on the development machine
- ✅ Mapped their process architectures, session storage, and communication protocols
- ✅ Identified ACP (Agent Client Protocol) as the minimum common substrate
- ✅ Established the core type system, event bus, and agent registry
- ✅ Set up the development toolchain

Active work is on Phase 1 (Foundation) and Phase 2 (First Adapter).

## Problem

AI tools are fracturing into isolated silos:

- **Context fragmentation**: Each agent maintains its own conversation history, project context, and memory. Nothing transfers.
- **Agent isolation**: Claude Code can't ask Hermes for help. OpenCode can't read Antigravity's research. Each agent works alone.
- **Workflow tax**: Users manually copy-paste context between tools, losing fidelity and wasting time.
- **No coordination**: There's no way to assign tasks to the right agent for the job and aggregate results.

Bridge solves this by providing a common interoperability layer that respects each agent's unique architecture while enabling them to work together.

## Architecture

### Confirmed (from evidence)

```
Bridge Core
    │
    ├── Agent Registry ── tracks discovered agents + adapters
    ├── Event Bus ─────── typed internal pub/sub
    ├── Session Manager ── (planned) lifecycle management
    └── Adapter Layer ──── agent-specific integrations
         │
         ├── Claude Code Adapter (ACP + stream-json + named pipes)
         ├── OpenCode Adapter (ACP + serve HTTP)
         ├── Hermes Adapter (ACP + serve WebSocket)
         └── ... more adapters
```

### Protocol Stack (discovered on machine)

| Layer   | Protocol                     | Purpose                           |
| ------- | ---------------------------- | --------------------------------- |
| **ACP** | JSON-RPC 2.0 over stdio/HTTP | Editor ↔ Agent communication      |
| **MCP** | JSON-RPC 2.0 over stdio      | Agent ↔ Tools communication       |
| **A2A** | HTTP + JSON-RPC + SSE        | Agent ↔ Agent (industry standard) |

Bridge integrates at the ACP layer primarily, and will implement A2A for inter-agent communication.

### Hypotheses (to be validated)

- Context can be transferred between agents without losing critical information
- A unified session model can abstract over JSONL, SQLite, and YAML storage
- Agent-to-agent communication via Bridge is more reliable than direct A↔B coupling

## Repository Structure

```
bridge/
├── src/
│   ├── core/           # Agent-agnostic Bridge core
│   │   ├── types.ts    # Fundamental type definitions
│   │   ├── events.ts   # Typed event bus
│   │   ├── registry.ts # Agent registry
│   │   └── index.ts    # Core exports
│   ├── adapters/       # Agent-specific integrations
│   └── transport/      # Communication layer abstractions
├── tests/
│   └── core/           # Core test suite
├── docs/
│   ├── architecture/   # Architecture Decision Records
│   ├── research/       # Reconnaissance findings
│   ├── adapters/       # Per-adapter documentation
│   ├── security/       # Security model documentation
│   ├── decisions/      # Decision log
│   └── development/    # Development guides
├── .env.example        # Environment variable template
├── package.json        # Project configuration
├── tsconfig.json       # TypeScript configuration
├── vitest.config.ts    # Test configuration
└── tsup.config.ts      # Build configuration
```

## Development Setup

### Prerequisites

- Node.js ≥ 20.0.0
- pnpm

### Install dependencies

```bash
pnpm install
```

### Run tests

```bash
pnpm test
```

### Run tests in watch mode

```bash
pnpm test:watch
```

### Type checking

```bash
pnpm typecheck
```

### Linting

```bash
pnpm lint
```

### Formatting

```bash
pnpm format
```

### Build

```bash
pnpm build
```

## Continuous Integration (CI)

Bridge runs an automated GitHub Actions CI pipeline (`.github/workflows/ci.yml`) on every `push` and `pull_request` targeting `main`.

### CI Pipeline Checks

1. **Dependency Installation:** `pnpm install --frozen-lockfile` on Node.js 20 with pnpm store caching.
2. **Type Checking:** `pnpm run typecheck` (`tsc --noEmit`) ensures strict TypeScript compilation.
3. **Linting & Code Style:** `pnpm run lint` (`eslint src/ tests/`) enforces ESLint rules and formatting.
4. **Unit Test Suite:** `pnpm run test` (`vitest run`) executes all core and transport unit tests (56/56 passing).
5. **Experiment Harness Validation:** `pnpm run experiment:validate` verifies offline schema compliance, security filters, and fixture integrity.

> [!NOTE]
> **No External AI / Live Execution in CI:** The CI workflow strictly executes deterministic static checks, unit tests, and offline validators. It does **not** execute live agent trials (`pnpm experiment:pilot`, `pnpm experiment:replicate`), invoke Claude/OpenCode CLI processes, or make outbound AI API calls. Live research runs are strictly local and manually authorized.

## Environment Variables

Bridge currently requires no environment variables. It discovers agents through filesystem inspection and process enumeration.

See `.env.example` for documentation of future variables.

## Security

### Current Constraints

- Bridge performs **read-only** discovery of agent installations
- No credentials are stored in the repository
- No secrets are committed to git
- Agent communication uses each agent's native authentication
- Bridge does not yet implement its own permission system

### Future Security Architecture (planned)

- Capability-based permissions per agent
- Filesystem boundary enforcement
- Command execution sandboxing
- Agent-to-agent trust model
- Audit logging
- Human-in-the-loop approval for sensitive operations

## Development Principles

1. **Evidence before abstraction** - Every type, interface, and architectural decision is grounded in observed agent behavior
2. **Agent-specific logic belongs in adapters** - The core never imports agent-specific code
3. **Core remains agent-agnostic** - Adding a new agent means writing a new adapter, not modifying the core
4. **No secrets in git** - Environment files, API keys, tokens, and credentials are always excluded
5. **Prefer official integration surfaces** - Use ACP, MCP, and documented CLIs before resorting to process hacking
6. **Isolate undocumented hacks** - When unofficial behavior is used, it's contained in an adapter with documented risk
7. **Security-first process control** - Bridge may control powerful agents; every control surface is a security boundary

## Roadmap

| Phase       | Description                                        | Status      |
| ----------- | -------------------------------------------------- | ----------- |
| **Phase 0** | Machine reconnaissance & agent discovery           | ✅ Complete |
| **Phase 1** | Foundation (types, event bus, registry, toolchain) | ✅ Complete |
| **Phase 2** | First agent adapter (Claude Code or OpenCode)      | 🔜 Next     |
| **Phase 3** | Second agent adapter                               | Planned     |
| **Phase 4** | Context transfer between agents                    | Planned     |
| **Phase 5** | Agent-to-agent communication via Bridge            | Planned     |
| **Phase 6** | Orchestration & workflow coordination              | Planned     |

## License

Private. Not yet licensed for distribution.
