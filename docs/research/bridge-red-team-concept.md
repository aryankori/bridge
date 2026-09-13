# BRIDGE - Red Team the Concept: One Product or Two?

**Status:** Research analysis
**Date:** 2026-08-27
**Scope:** Could Bridge be two unrelated products? Determine whether they share enough underlying machinery to become one platform. If not, recommend separating them.

---

## 1. THE TWO CANDIDATE PRODUCTS

### Bridge A: Developer Instruction Resolver

**What it is:** A tool for developers that reads project instruction sources, resolves conflicts, and produces effective directives for agent actions.

**Target user:** Individual developers, small teams, open-source maintainers

**Use case:** "Before I let my agent act, I want to know what the project's rules say I should do."

**Key functions:** Instruction source scanning, conflict detection, authority evaluation, directive output, citation display

**Technical requirements:** File I/O, graph traversal, anomaly detection, prompt formatting

**Market:** Developer tools, agent tooling, open source

**Example scenario:** A developer works on a project with AGENTS.md, CLAUDE.md, stale docs, and a human prompt. They run `bridge check --action "implement feature X"` and get a directive with citations.

---

### Bridge B: Enterprise Authority Arbitration

**What it is:** A platform for enterprises that computes standing across fragmented systems, records standing determinations as auditable decisions, and serves standing to agents, tools, and governance processes.

**Target user:** Enterprise compliance teams, governance officers, platform engineering teams

**Use case:** "Our enterprise has agents operating across multiple systems with multiple authorities. We need to know what is effective for any action, with a record for audit and compliance."

**Key functions:** Multi-system claim extraction, enterprise authority framework configuration, standing computation across systems, standing record storage and query, compliance export, integration with governance platforms

**Technical requirements:** Multi-system integrations, enterprise auth, compliance formatting, standing record database, query API, governance platform integration

**Market:** Enterprise governance, compliance, audit, AI agent operations

**Example scenario:** A financial institution deploys agents that operate across trading systems, compliance systems, and documentation systems. Each system has its own authority rules. Bridge computes standing across all systems, records the determinations, and exports audit trails for EU AI Act compliance.

---

## 2. DO THEY SHARE ENOUGH MACHINERY?

### Shared Components

| Component | Bridge A | Bridge B | Shared? |
|---|---|---|---|
| Claim extraction | Yes (from project files) | Yes (from project files + enterprise systems) | Partial |
| Authority framework | Yes (project tiers) | Yes (enterprise tiers + multi-system) | Partial (B is broader) |
| Conflict detection | Yes (same anomaly detectors) | Yes (same + enterprise-specific) | Yes (core logic shared) |
| Standing computation | Yes (deterministic resolver) | Yes (same resolver + multi-system scope) | Yes (core algorithm shared) |
| Standing records | Yes (local storage) | Yes (database, query, export) | Partial (B is more robust) |
| Directive output | Yes (prompt injection) | Yes (API, governance integration) | Partial (different consumers) |
| Citation format | Yes (same format) | Yes (same format) | Yes |

### Divergent Components

| Component | Bridge A | Bridge B | Divergence |
|---|---|---|---|
| Scope of sources | Project files (AGENTS.md, docs, prompts) | Project files + enterprise systems (databases, APIs, configs, policies) | B is broader |
| Authority configuration | Project-specific, simple tiers | Enterprise-specific, complex delegation chains, multi-system precedence | B is more complex |
| Standing record storage | Local files, simple format | Database, query API, compliance export, tamper-evidence | B is more robust |
| Consumer of directives | Agent prompts (CLI, IDE) | Agents, governance platforms, audit systems, compliance reports | Different consumers |
| User interface | CLI, developer-facing | Dashboard, compliance reports, API, governance integration | Different UIs |
| Buying process | Individual or team (npm install, open source) | Enterprise procurement (sales cycle, compliance review, integration) | Different buyers |
| Monetization | Developer subscription or open source | Enterprise license or subscription | Different models |
| Distribution | npm, GitHub, developer communities | Sales team, conferences, partnerships, enterprise procurement | Different channels |

---

## 3. THE SHARED MACHINERY HYPOTHESIS

**Hypothesis:** Bridge A and Bridge B share a common core (claim extraction, conflict detection, standing computation, citation format) but differ in scope, configuration, storage, consumers, UI, buyers, and distribution. They can be built as one platform with two interfaces: a developer CLI and an enterprise dashboard/API.

**Architecture:**

```
Core Engine (shared)
 ├── Claim extraction (project files, enterprise systems)
 ├── Authority framework (project tiers, enterprise delegation)
 ├── Conflict detection (same anomaly detectors)
 ├── Standing computation (deterministic resolver)
 ├── Standing records (local + database storage)
 └── Citation format (same format)

Developer Interface (Bridge A)
 ├── CLI: bridge check, bridge prep, bridge lint
 ├── Local standing records
 ├── Agent prompt injection
 └── Open source / npm distribution

Enterprise Interface (Bridge B)
 ├── Dashboard: standing visualization, authority configuration
 ├── Standing record database + query API
 ├── Compliance export (EU AI Act, SOC 2, etc.)
 ├── Governance platform integration
 └── Enterprise sales / license distribution
```

**The argument for one platform:** The core computation (standing) is the same. Building two separate products would duplicate the core engine. A unified platform serves both markets with a shared foundation.

**The argument for two products:** The buyers, buying processes, interfaces, and distribution channels are entirely different. A developer CLI and an enterprise dashboard have different design requirements, different users, and different sales motions. Trying to serve both with one product risks alienating both.

---

## 4. THE VERDICT

**They share enough machinery to be one platform, but they should be presented and sold as two products.**

**Rationale:**

1. **Shared core is real.** The standing computation, conflict detection, and citation format are identical. Building them twice is wasteful.

2. **Divergence is real.** The enterprise product needs multi-system integrations, compliance export, robust storage, governance integration, and enterprise sales. The developer product needs simplicity, local-first operation, open-source distribution, and CLI/IDE integration. These are different engineering and business requirements.

3. **One platform, two interfaces.** The core engine serves both products. The developer CLI is the wedge (small, simple, immediate value). The enterprise platform is the expansion (broader scope, compliance angle, larger budgets). They share the core but have separate interfaces, buyers, and distribution.

4. **The risk of one product:** Trying to serve both developers and enterprises with one interface (e.g., a CLI that also does enterprise compliance export) creates a product that is too complex for developers and too limited for enterprises. Separate interfaces avoid this.

5. **The risk of two products:** Building two separate codebases duplicates the core engine. The shared-core approach avoids this. But the two products must be marketed, sold, and supported separately.

**Recommendation:**

- **Build one core engine** (claim extraction, authority framework, conflict detection, standing computation, standing records, citation format)
- **Build two interfaces** (developer CLI for Bridge A, enterprise dashboard/API for Bridge B)
- **Market as two products** (developer tool vs. enterprise governance platform)
- **Sell to different buyers** (developers/team leads vs. compliance/governance teams)
- **Distribute through different channels** (npm/GitHub vs. enterprise sales)

**This is the "shared core, separate interfaces" model.** It's how many platform companies operate: one technology foundation, multiple product interfaces for different markets.

---

## 5. THE ALTERNATIVE: BRIDGE IS JUST ONE PRODUCT

**Alternative hypothesis:** Bridge is not two products. It's one product that operates at different scales.

- For a developer, it's a CLI that resolves instructions for their project.
- For a team, it's a shared standing layer that all team members' agents consult.
- For an enterprise, it's a governance platform that computes standing across systems.

**The argument:** The product is the same at all scales. The difference is the scope of sources, the number of agents, the complexity of authority, and the robustness of storage. These are scale differences, not product differences.

**The counter-argument:** The buyer, buying process, and UI are fundamentally different at enterprise scale. A tool that a developer installs with `npm install -g` is not the same product as a platform that an enterprise procures through a 6-month sales cycle. The scale difference is so large that it becomes a product difference.

**Verdict:** The shared-core, separate-interfaces model is more accurate than either "one product" or "two products." Bridge has a single technological core (standing computation) but operates in two distinct markets with distinct interfaces, buyers, and distribution.

---

*End of red team analysis.*
