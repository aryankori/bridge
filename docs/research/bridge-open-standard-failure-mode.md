# BRIDGE - Open Standard Failure Mode: What If A2A/MCP/ACP/SPIFFE Add Standing?

**Status:** Research analysis
**Date:** 2026-08-27
**Scope:** Imagine A2A 2.0, MCP 2.0, ACP 2.0, and SPIFFE evolution add authority, delegation, precedence, policy, commitments, provenance, and accepted state. What remains for Bridge? Identify what must be built ABOVE the protocol to retain value.

---

## 1. THE HYPOTHETICAL SCENARIO

Assume that by 2028, the major agent protocols have evolved to include:

- **Authority:** instruction sources can declare their authority tier
- **Delegation:** authority can be delegated from one source to another
- **Precedence:** a standard way to express which source overrides which
- **Policy:** declarative rules for conflict resolution
- **Commitments:** decisions are recorded as signed commitments
- **Provenance:** every claim has a verifiable origin
- **Accepted state:** the system records which state was accepted and why

**This is not implausible.** These are natural extensions of existing protocol directions. A2A is a Linux Foundation standard - it could add these. MCP could add them. OpenAI and Anthropic could add them to their respective platforms.

**If they do, what is Bridge's remaining value?**

---

## 2. THE PROTOCOL LAYER vs. THE INSTITUTIONAL LAYER

### What Protocols Can Provide

Protocols (A2A, MCP, ACP, SPIFFE) operate at the **transport and interchange layer**. They define:
- How agents discover each other
- How they communicate
- How tools are invoked
- How identity is verified
- How messages are formatted

If protocols add standing primitives, they can provide:
- A standard format for expressing authority tiers
- A standard way to attach provenance to claims
- A standard format for recording commitments
- A standard for signing and verifying claims

**What protocols CANNOT provide:**
- The specific authority framework for a specific project (which tiers apply, in what order, with what override rules)
- The specific claims that exist in a specific project (which files, which prompts, which policies)
- The specific resolution logic for a specific project's conflicts (what happens when tier 60 conflicts with tier 80 in this project's context)
- The historical standing records for a specific project (what was decided before, what precedent exists)
- The interpretation of project-specific conventions (what "AGENTS.md" means in this project's conventions vs. that project's)

### What Remains Above the Protocol

**The institutional layer:**
- Project-specific authority configuration (tiers, delegation chains, override rules, veto rules)
- Project-specific claims (the actual instruction files, prompts, policies, and their content)
- Project-specific standing computation (resolving claims using the project's authority framework)
- Project-specific standing records (the history of what was determined for which actions)
- Project-specific precedent (how past standing determinations influence future ones)
- Project-specific conventions (what AGENTS.md means, where it lives, how it's formatted)

**The protocol is the pipe. The institution is the water.**

A protocol can standardize how authority is expressed and how claims are transmitted. It cannot standardize what the institution's authority structure IS or what claims exist.

---

## 3. SCENARIO ANALYSIS

### A2A 2.0 Adds Standing Primitives

**Scenario:** A2A (Linux Foundation) adds authority, delegation, precedence, policy, commitments, provenance, accepted state to the A2A specification.

**What A2A provides:** A standard format for agents to exchange authority-annotated claims and standing records.

**What remains for Bridge:**
- Project authority configuration (A2A can carry it, but someone must define it for each project)
- Standing computation (A2A can transmit claims, but the resolver logic is project-specific)
- Standing records as institutional memory (A2A can transmit them, but Bridge owns the queryable history)
- Precedent reasoning (A2A can carry past decisions, but Bridge applies them to new actions)
- The developer-facing tool (the resolver UI/CLI that developers use to see and configure standing)

**Bridge's remaining value:** Bridge is the institutional layer that sits on top of the A2A transport. A2A is how Bridge communicates with other agents and systems. Bridge is what knows the project's authority structure and computes standing.

**Risk:** If A2A defines a default authority framework that most projects adopt, and that framework is good enough, Bridge's project-specific configuration becomes less valuable. But the default would have to handle the full diversity of project structures - which is unlikely.

### MCP 2.0 Adds Standing Primitives

**Scenario:** MCP adds authority, delegation, precedence, policy, commitments, provenance, accepted state.

**What MCP provides:** Tools can declare their authority, and MCP clients can evaluate claims from tools with authority annotations.

**What remains for Bridge:**
- MCP-governed tool access is about tool authority (which tools can be called). Bridge is about instruction authority (which instructions govern which actions).
- MCP tools are one type of claim source. Bridge evaluates all claim sources, including non-MCP ones (human prompts, documents, policies).
- MCP can carry Bridge's standing records as resources. But Bridge computes them.

**Bridge's remaining value:** Bridge evaluates a broader set of claims than MCP tools alone. MCP is a transport for some claims; Bridge is the evaluator of all claims.

### ACP 2.0 Adds Standing Primitives

**Scenario:** ACP (editor-to-agent protocol) adds standing primitives.

**What ACP provides:** Editors can send authority-annotated instructions to agents, and agents can report standing records back.

**What remains for Bridge:**
- ACP connects editors to agents. Bridge connects projects to agents. The scope is different.
- ACP's standing primitives would be about the editor-agent interaction. Bridge's standing is about the project's full instruction set.
- Bridge could integrate with ACP (send standing records to the editor, receive instruction claims from the editor). But Bridge is not ACP.

**Bridge's remaining value:** Bridge is project-centric, not editor-centric. Even if every editor uses ACP, the project's instruction sources (AGENTS.md, docs, policies, manifests) still need resolution.

### SPIFFE Evolution Adds Standing Primitives

**Scenario:** SPIFFE/SPIRE adds authority delegation, policy attachment, and provenance to workload identities.

**What SPIFFE provides:** Strongly attested identities with authority claims and policy attachment points.

**What remains for Bridge:**
- SPIFFE is about identity and authentication, not instruction resolution. An identity can say "I am the tech lead with authority over coding style" - but it doesn't say "AGENTS.md overrides the root rule for data package functions."
- SPIFFE can provide the identity layer for claims (who made this claim?). Bridge provides the resolution layer (which claim is effective?).

**Bridge's remaining value:** SPIFFE is the identity substrate. Bridge is the resolution substrate. They are complementary, not competitive.

---

## 4. WHAT MUST BE BUILT ABOVE THE PROTOCOL

If protocols standardize the transport of standing primitives, Bridge's value shifts entirely to the institutional layer:

### 1. Project Authority Configuration

Every project defines its own authority framework:
- Which tiers exist and in what order
- Which sources belong to which tiers
- What override rules apply (explicit human override, temporal override, scope override)
- What veto rules apply (security, destructive operations)
- What ambiguity rules apply (equal-tier conflicts)

This configuration is project-specific and cannot be standardized by a protocol.

### 2. Claim Extraction and Normalization

Projects have instruction sources in many formats:
- Markdown files (AGENTS.md, CLAUDE.md, docs/)
- JSON manifests (package.json, tsconfig.json)
- Human prompts (CLI input, IDE prompts)
- Issue trackers (GitHub issues, Jira)
- Policy documents (SECURITY.md, CONTRIBUTING.md)
- External systems (CI constraints, branch protection)

Bridge must extract claims from these diverse sources, normalize them into a standard claim format, and attach provenance.

### 3. Standing Computation Engine

Given normalized claims and a project's authority configuration, Bridge computes standing for any proposed action:
- Which claims are in scope?
- Which conflict?
- Which is effective?
- What is the directive?
- What is the standing record?

This computation is the core intellectual property. It cannot be offloaded to a protocol.

### 4. Standing Record Storage and Query

Standing determinations are recorded and made queryable:
- What was the effective directive for this action?
- Why was it effective?
- What claims were considered?
- What conflicts were detected?
- What precedent exists for similar actions?

This is institutional memory. It is project-specific and grows over time.

### 5. Precedent and Learning

Past standing records inform future determinations:
- If similar conflicts were resolved a certain way before, that precedent influences current standing
- If an authority framework changed, past standing records need recomputation
- If new claims are added, standing for existing actions may change

This is the "institutional intelligence" layer.

---

## 5. THE BOTTOM LINE

**If protocols add standing primitives, Bridge's moat gets STRONGER, not weaker.**

Reason: Protocols standardize the transport layer. Bridge owns the institutional layer. The more protocols standardize transport, the more value concentrates in the institutional layer (the thing protocols cannot standardize).

**Bridge's defensibility in a world with standing-aware protocols:**
- Protocols can't define your project's authority structure
- Protocols can't compute your project's standing
- Protocols can't record your project's standing history
- Protocols can't learn your project's precedent
- Protocols can't extract claims from your project's specific files and tools

**What protocols CAN do that threatens Bridge:**
- Define a default authority framework that projects adopt instead of configuring their own
- Provide a standard resolver that projects use instead of Bridge's resolver
- Become the embed for standing computation (like OPA embed for policy)

**Mitigation:** Bridge's value is in project-specific authority configuration and standing computation. If a protocol provides a default framework, Bridge can adopt it as a starting point and then customize it per project. If a protocol provides a standard resolver, Bridge's differentiator becomes the institutional layer (claims, precedent, memory) that the standard resolver doesn't have.

**The worst case for Bridge:** A major platform (OpenAI, Anthropic, Google) ships a built-in instruction resolver that is "good enough" for most projects, and projects use it instead of Bridge. This is the single-vendor scenario (Mission I). Bridge's defense: the built-in resolver uses generic hierarchy, not project-specific standing. Bridge's value is project-specificity.

---

*End of open standard failure mode analysis.*
