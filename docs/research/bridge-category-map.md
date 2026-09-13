# BRIDGE - Category Map

**Status:** Research analysis
**Date:** 2026-08-27
**Scope:** Show existing standards, existing systems, Bridge candidate boundary, developer wedge, enterprise expansion, and potential moat.

---

## 1. EXISTING STANDARDS

### Agent Protocols

| Standard | Purpose | Scope | Governance | Status (Aug 2026) |
|---|---|---|---|---|
| **MCP** (Model Context Protocol) | Tool-to-agent communication | Tools expose capabilities; agents invoke tools | Anthropic (primary) | Widely adopted; stable |
| **ACP** (Agent Client Protocol) | Editor-to-agent communication | Editors host agents; agents provide capabilities | Open standard (Zed, JetBrains, Gemini) | Growing; stable |
| **A2A** (Agent-to-Agent) | Inter-agent communication | Agents discover and communicate with peers | Linux Foundation / Google / AAIF | Emerging; early implementation |
| **SPIFFE/SPIRE** | Workload identity | Cryptographic identities for services/workloads | CNCF | Mature; expanding to agents |

### Policy and Authorization

| Standard | Purpose | Scope | Governance | Status |
|---|---|---|---|---|
| **OPA** (Open Policy Agent) | Policy-as-code engine | Infrastructure, K8s, CI/CD, service-to-service | CNCF (graduated) | Mature; 29% of OSS projects |
| **Cedar** | Authorization language | Application-level authorization | AWS (open-source) | Growing; AgentCore integration |
| **RBAC/ABAC** | Access control models | Permission allocation | Industry standard | Universal |

### Audit and Compliance

| Standard | Purpose | Scope | Status |
|---|---|---|---|
| **EU AI Act Article 12** | Tamper-evident logs for high-risk AI | Record-keeping, audit trails | Enforcement Aug 2026 |
| **NIST AI RMF** | AI risk management framework | Govern, Map, Measure, Manage | Voluntary; influential |
| **SOC 2** | Security, availability, processing integrity | Service organizations | Mature |
| **ISO 27001** | Information security management | Organizations | Mature |

---

## 2. EXISTING SYSTEMS (COMPETITIVE / COMPLEMENTARY)

### Agent Platforms with Built-In Hierarchy

| System | Instruction Hierarchy | Memory | Governance | Scope |
|---|---|---|---|---|
| **OpenAI Codex** | Model Spec (5 tiers: root, system, developer, user, guideline) | Not announced | Not announced | Developer agent CLI |
| **Anthropic Claude Code** | AGENTS.md, CLAUDE.md, system prompts | Claude Managed Agents with memory (April 2026) | Not announced | Developer agent CLI |
| **OpenCode** | AGENTS.md, config files | Not announced | Not announced | Open-source agent CLI (165k GitHub stars) |
| **Gemini CLI** | Config files, prompts | Not announced | Not announced | Developer agent CLI |

### Agent Memory Projects

| Project | Purpose | Agents Supported | Status |
|---|---|---|---|
| **agentmemory** (rohitg00) | Persistent memory for coding agents | Claude Code, Codex, Copilot, Gemini, OpenCode, Hermes, pi, OpenClaw | 311+ GitHub PRs, active (Aug 2026) |
| **Mem0** | Long-term memory with retrieval | General agents | Startup; benchmark results |
| **Zep / Graphiti** | Graph-based memory with temporal validity | General agents | Startup; enterprise scale |
| **Letta** (formerly MemGPT) | Persistent memory blocks, self-editing | General agents | Startup |
| **PROJECTMEM** | Local-first event-sourced memory and judgment layer | AI coding agents | arXiv paper (2606.12329, 2026) |
| **Cognee** | Knowledge graph memory | General agents | Startup |

### Agent Governance Platforms

| System | Governance Function | Agent-Specific | Status |
|---|---|---|---|
| **AWS AgentCore Policy** | Deterministic tool-access enforcement (Cedar) | Yes | GA (July 2026) |
| **Databricks Unity AI Gateway** | LLM access control, MCP governance, cost controls | Yes | GA |
| **NeuralTrust TrustGate** | Tool invocation interception, risk scoring, policy enforcement | Yes | Startup |
| **ElixirData Context OS** | Policy Gates (Allow/Modify/Escalate/Block), RBAC, Decision Traces | Yes | Startup |
| **ServiceNow AI Control Tower** | Runtime enforcement for ServiceNow-hosted agents | Partial | Enterprise |
| **Credo AI** | Governance platform (runtime governance on roadmap) | No (yet) | Startup |

### Compliance and Audit Tools

| Tool | Purpose | License | Status |
|---|---|---|---|
| **MakerChecker** | Self-hosted governance for AI agents, hash-chained audit log, human approval gates | AGPL-3.0 | 2026-present |
| **auditable** (yzhao062) | Records inputs relied on, re-evaluates actions, reverses via rail | Apache-2.0 | 2026-present |
| **Agent-Sentry** | Bounding LLM agents via execution provenance | Research | arXiv paper (2603.22868) |

---

## 3. BRIDGE CANDIDATE BOUNDARY

### What Bridge IS

```
Bridge = Standing Computation Engine + Standing Records + Citation-Backed Directives

Core functions:
 1. Read project instruction sources (files, prompts, manifests, policies, docs)
 2. Extract and normalize claims with provenance (source, tier, timestamp, scope, content)
 3. Evaluate claims against configurable authority framework (tiers, delegation, override, veto)
 4. Detect conflicts (direct contradiction, staleness, missing authorization, ambiguity)
 5. Resolve conflicts through authority evaluation (deterministic, citation-backed)
 6. Produce effective directive (PERMITTED / BLOCKED / PERMITTED_WITH_OVERRIDE / AMBIGUOUS / REQUIRES_AUTHORIZATION)
 7. Record standing determination (status, rationale, citations, timestamp, authority basis)
 8. Serve standing to agents, tools, and governance processes
```

### What Bridge IS NOT

```
Bridge ≠ Agent platform (doesn't run agents)
Bridge ≠ Memory system (doesn't store conversation history or agent memory)
Bridge ≠ Policy engine (doesn't evaluate generic policies; computes standing from project sources)
Bridge ≠ Access control (doesn't enforce tool access; recommends actions with authority)
Bridge ≠ Control plane (doesn't intercept and block agent actions; produces directives)
Bridge ≠ Agent orchestrator (doesn't coordinate multiple agents; provides standing for any agent)
Bridge ≠ Instruction hierarchy training (doesn't train models; computes standing deterministically)
```

### Bridge's Boundary in the Stack

```
Layer | What It Does | Bridge's Position
 | |
Agent Platforms | Run agents, manage models, | NOT Bridge
 | provide memory, handle UI |
 | |
Agent Protocols | Transport, discovery, tools | NOT Bridge (uses them)
(MCP, ACP, A2A, SPIFFE) | |
 | |
Control Plane / Gateway | Enforce tool access, block | NOT Bridge (sits below)
(AWS AgentCore, Unity GW) | unauthorized actions |
 | |
─────────────────────────────────────────────────────────────────────────────
 | |
BRIDGE | Compute standing from project | <- Bridge's layer
 | instruction sources; produce |
 | citation-backed directives; |
 | record standing records |
 | |
─────────────────────────────────────────────────────────────────────────────
 | |
Project Instruction Sources | Provide claims (AGENTS.md, | NOT Bridge (these are
(AGENTS.md, CLAUDE.md, | docs, prompts, manifests, | the inputs to Bridge)
docs, prompts, manifests, | policies, issue trackers) |
policies, etc.) | |
 | |
```

**Bridge sits between project instruction sources and agents/tools/governance.** It reads the sources (inputs), computes standing (core function), and produces directives and records (outputs). It does not run agents, enforce access, or store agent memory.

---

## 4. DEVELOPER WEDGE

### Product: Pre-Commit Standing Checker

```
Developer Workflow with Bridge:

 1. Developer plans an action: "implement format_user_name"
 2. Developer runs: bridge check --action "implement format_user_name in packages/data/src/formatter.ts"
 3. Bridge reads: AGENTS.md (root), packages/data/AGENTS.md (nested), package.json, any active prompts
 4. Bridge detects: Root says camelCase. Nested data package says snake_case. Conflict.
 5. Bridge resolves: Nested AGENTS.md has higher standing for data package functions (scope rule).
 6. Bridge outputs:
 Status: PERMITTED_WITH_OVERRIDE
 Directive: Export format_user_name (snake_case) - nested data package rule overrides root rule for data-layer functions.
 Rationale: Scope-based authority - the nested AGENTS.md governs functions within its package scope.
 Evidence:
 - packages/data/AGENTS.md: "All data access and formatting functions MUST use snake_case"
 - AGENTS.md (root): "All helper functions across this repository MUST be named using camelCase"
 [Scope rule: nested package rule overrides root rule for functions within the package]
 8. Developer sees: The project wants snake_case. The agent should follow the nested rule.
 9. Developer proceeds (with confidence) or adjusts their plan.
```

**Wedge characteristics:**
- One command, one answer
- Reads local files, runs locally
- No agent required (but can inject directive into agent prompt)
- No enterprise procurement
- No new protocol
- Works offline
- Understandable in < 10 minutes

---

## 5. ENTERPRISE EXPANSION

### From Developer Wedge to Enterprise Platform

```
Expansion Path:

 Step 1: Developer resolver (npm, open source)
 ↓
 Proves: Standing computation is useful for developers
 Validates: Authority tiers, conflict detection, citation format

 Step 2: Standing records (add persistence to resolver)
 ↓
 Proves: Standing records are useful for audit, precedent, memory
 Validates: Record format, storage, query

 Step 3: Cross-agent standing (serve records to multiple agents)
 ↓
 Proves: Standing consistency across agents is valuable
 Validates: Multi-agent, multi-platform use case

 Step 4: Enterprise governance (compliance export, dashboard, API, integrations)
 ↓
 Proves: Standing computation is valuable for regulated enterprises
 Validates: Compliance angle, enterprise budgets, governance integration

 Step 5: Institutional state platform (full vision)
 ↓
 Proves: Institutional state is a real, valuable category
 Validates: Claims, authority, decisions, standing, precedent, query layers
```

### Enterprise Product: Standing Governance Platform

```
Enterprise Workflow with Bridge:

 1. Enterprise configures authority framework across systems:
 - Trading system: TRADE_APPROVAL_POLICY (tier 100: compliance officer approval)
 - Documentation system: DOC_PUBLISHING_RULES (tier 60: docs team authority)
 - Code repository: REPO_AGENT_RULES (tier 80: tech lead authority)
 - Cross-system delegation: Tech lead can override docs rules for code-adjacent docs

 2. Agent proposes action: "update API documentation for /trade endpoint"

 3. Bridge computes standing:
 - Claims: TRADE_APPROVAL_POLICY (governs trade-related content), DOC_PUBLISHING_RULES (governs docs), REPO_AGENT_RULES (governs repo)
 - Conflict: Trade content in docs - which authority governs?
 - Resolution: DOC_PUBLISHING_RULES governs documentation content. TRADE_APPROVAL_POLICY governs actual trades. The docs update is a documentation action, not a trade action.
 - Standing: PERMITTED under DOC_PUBLISHING_RULES. Comments about trade behavior must reference actual trade policy (citation required).

 4. Bridge records standing determination:
 - Action: update API documentation for /trade endpoint
 - Standing: PERMITTED
 - Governing authority: DOC_PUBLISHING_RULES (tier 60)
 - Rationale: Documentation action governed by docs policy, not trade policy
 - Citations: DOC_PUBLISHING_RULES section 3.2, TRADE_APPROVAL_POLICY section 1.1 (scope exclusion)
 - Timestamp: 2026-08-27T14:32:00Z
 - Record ID: standing-record-8f3a2b1c

 5. Agent acts (within standing)
 6. Audit trail: Standing record exported for EU AI Act Article 12 compliance
 7. Precedent: Future documentation updates about trade endpoints reference this standing record
```

---

## 6. POTENTIAL MOAT

### Moat Sources (Ranked)

| Moat Source | Strength | Why | Risk |
|---|---|---|---|
| **Accumulated standing records** | Moderate-Strong | Precedent, audit history, institutional memory grow over time. Replacing Bridge loses history. | Records must be exportable; otherwise switching cost is artificial. |
| **Project-specific authority configuration** | Moderate | Each project's tiers, delegation, override rules are unique. Reconfiguring elsewhere is work. | Configuration is not deeply technical; competitors could offer similar config. |
| **Claim extraction across diverse sources** | Moderate | Each project has sources in different formats. Bridge's extraction pipeline is tailored. | Formats can be standardized; adapters are replicable. |
| **Citation format and rationale** | Weak-Moderate | Citation-backed output is valuable for audit and trust. But format could be standardized. | Standardization would make Bridge's format replaceable. |
| **Deterministic guarantee** | Weak | Determinism is important for audit. But platform vendors could also be deterministic. | Determinism is a feature, not a moat. |
| **Workflow embedding** | Moderate | If agents read Bridge directives, Bridge is embedded. Replacing means workflow change. | Embedding depends on agent uptake (EXP-005 tests this). |
| **Cross-agent network effects** | Weak-Potential | If many agents use Bridge, standing records become shared infrastructure. | Network effects require adoption; not guaranteed. |
| **Compliance niche** | Strong (narrow) | Compliance demands specific formats and determinism. Competitors must match compliance. | Compliance restricts Bridge to regulated enterprises. |

### The Moat Thesis

**Bridge's moat is not in the algorithm. It's in the accumulation and the category.**

- **Accumulation:** Standing records, authority configurations, and claim extractions accumulate over time, creating switching costs and data value.
- **Category:** If Bridge defines "institutional state" or "standing computation" as a category, the moat shifts from usage-based to category-based. First mover in an uncategorized space can define the standard.

**The weakest moat claim:** "Our algorithm is novel and defensible." It's not. Graph traversal + anomaly detectors is not a secret. The moat is in the application (project-specific standing from diverse instruction sources) and the accumulation (records, configuration, precedent).

**The strongest moat claim:** "Bridge becomes the standing computation infrastructure that every agent, every platform, and every compliance framework reads and writes." This is a platform moat - like Git for version control, like OPA for policy. It's achievable only if the category materializes.

---

## 7. THE CATEGORY MAP - VISUAL SUMMARY

```
EXISTING STANDARDS (transport, policy, compliance)
├── MCP (tool-to-agent)
├── ACP (editor-to-agent)
├── A2A (agent-to-agent, emerging)
├── SPIFFE (workload identity)
├── OPA / Cedar (policy/authorization)
├── EU AI Act Article 12 (audit trail)

EXISTING SYSTEMS (agents, memory, governance)
├── Codex, Claude Code, OpenCode, Gemini CLI (agent platforms)
├── agentmemory, Mem0, Zep, Letta, PROJECTMEM (agent memory)
├── AWS AgentCore, Unity Gateway, NeuralTrust, ElixirData (governance)
├── MakerChecker, auditable, Agent-Sentry (compliance/audit)

BRIDGE CANDIDATE BOUNDARY
├── SITS BETWEEN: Project instruction sources (inputs)
├── CORE FUNCTION: Standing computation (claims -> authority -> resolution -> directive + record)
├── OUTPUTS TO: Agents, tools, governance, compliance (outputs)
├── NOT: Agent runtime, memory, policy engine, access control, control plane, orchestrator

DEVELOPER WEDGE
├── Pre-Commit Standing Checker (CLI: bridge check --action "...")
├── One command, one answer, local, offline, no agent required
├── Proves: Standing computation is useful for developers

ENTERPRISE EXPANSION
├── Standing Records (persistence, audit, precedent)
├── Cross-Agent Standing (multi-agent consistency)
├── Enterprise Governance (compliance export, dashboard, API)
├── Institutional State Platform (full vision)

POTENTIAL MOAT
├── Accumulated standing records (precedent, audit, memory)
├── Project-specific authority configuration (switching cost)
├── Claim extraction pipeline (diverse sources)
├── Compliance niche (EU AI Act, deterministic audit trail)
├── Category definition (if institutional state materializes)
└── NOT: Algorithm (replicable), citation format (standardizable), determinism (feature)
```

---

*End of category map.*
