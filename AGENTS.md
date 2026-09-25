# AGENTS.md — Bridge Repository Directives & Agent Context

> **Project:** Bridge (`aryankori/bridge`)  
> **Substrate:** Epistemological boundary and orchestration layer between AI agents.  
> **GitLab Duo Agent ID:** `1003979`  
> **Target Runtimes:** Node.js >= 20.0.0, TypeScript 5.7.3, ESM only.

---

## 1. System Overview & Architectural Thesis

Bridge is an agent interoperability and orchestration substrate. It sits between software engineers and heterogeneous coding agents (Claude Code, OpenCode, Hermes, Antigravity) to **discover, launch, monitor, arbitrate, and mathematically govern** multi-agent execution.

### Core Architectural Invariants

* **Project Truth vs. Vector Memory:** Bridge does not rely on naive vector search or probabilistic hallucinated context. Canonical ground truth is established deterministically from code, repository AST, test receipts, and the `Deterministic Evidence Ledger`.
* **Deterministic Authority Matrix:** Disagreements across agents or branches are arbitrated by the Authority Conflict Resolver (`src/effective-directive/`), using CODEOWNERS and typed decision boundaries.
* **Formal Transfer Proofs:** Cross-agent handoffs are strictly structured via `WorkTransferPackage` primitives (`src/core/work-transfer.ts`), ensuring secret scrubbing and strict directory path confinement.

---

## 2. Repository Layout

```text
bridge/
├── src/
│   ├── index.ts                  # Public package entrypoint (re-exports core)
│   ├── core/                     # Foundational orchestration engine
│   │   ├── types.ts              # System primitives (AgentId, SessionId, EvidenceLevel)
│   │   ├── events.ts             # Strongly typed EventBus
│   │   ├── registry.ts           # AgentRegistry and capability catalog
│   │   ├── router.ts             # AgentRouter (capability & authority routing)
│   │   └── work-transfer.ts      # WorkTransferPackage serialization & sandbox confinement
│   ├── effective-directive/      # Arbitration, CODEOWNERS resolver, precedence rules
│   ├── transport/                # Stdio & JSON-RPC 2.0 communication transports
│   └── adapters/                 # ACP, MCP, and A2A protocol adapters
├── research/
│   └── experiments/              # Empirical benchmarks (EXP-001, EXP-005 conflict suites)
├── tests/                        # Vitest test suite mirroring src/ and research/
├── .gitlab-ci.yml                # GitLab CI/CD multi-stage validation pipeline
└── .github/workflows/            # GitHub Actions CI mirror
```

---

## 3. Development Toolchain & Verification Invariants

All agents interacting with this repository MUST adhere to the following package and execution standards:

* **Package Manager:** `pnpm` (version `9.15.4`). **NEVER** use `npm` or `yarn`.
* **Module System:** Strict ESM (`"type": "module"`). All relative imports in TypeScript source must include the `.js` extension (e.g., `import { EventBus } from './events.js';`).
* **Node Target:** Node.js `20.x` or higher.

### Mandatory Verification Commands

Before generating or finalizing any commit or Merge Request, run:

```bash
# 1. Type Verification (Strict TypeScript - zero errors tolerated)
pnpm typecheck

# 2. Code Quality & Linting
pnpm lint

# 3. Unit & Integration Test Suite
pnpm test

# 4. Empirical Benchmark Validation
pnpm experiment:validate

# 5. Production Build Artifact Compilation
pnpm build

# 6. Dependency Security Audit
pnpm audit --audit-level=high
```

---

## 4. Security & Safety Guidelines

* **Path Traversal Defense:** Any file system operation inside adapters or transfer packages must assert boundary confinement via `assertPathConfinement`. Attempting to access parent directories (`../`) outside the configured workspace root must throw immediately.
* **Credential Redaction:** Never persist raw environment variables or API keys into transfer packages or evidence ledgers. All payloads must pass through `scrubTransferSecrets`.
* **Lockfile Hygiene:** Do not edit `pnpm-lock.yaml` manually. Modify `package.json` and execute `pnpm install --frozen-lockfile=false` only when dependency updates are explicitly instructed.

---

## 5. GitLab Duo Agent Directive (Agent #1003979)

When operating as or collaborating with **GitLab Duo Agent 1003979**:

* **Autonomous Code Review:**
  * Verify that new functions have explicit TypeScript return types.
  * Ensure new modules include corresponding unit tests under `tests/`.
  * Validate that no async error promises are unhandled.
* **Merge Request Protocol:**
  * Summarize architectural decisions and changed invariants in the MR description.
  * Confirm that all CI pipeline jobs (lint, typecheck, unit-tests, experiment-validate, security-audit, build) succeed.
* **Conflict Resolution Discipline:**
  * If resolving merge or authority conflicts, preserve the canonical gold labels in `research/experiments/` without regression.
