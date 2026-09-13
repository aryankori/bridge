# BRIDGE - Control Plane Attack: Could OPA/Cedar/Gateways Replace Bridge?

**Status:** Research analysis
**Date:** 2026-08-27
**Scope:** Attack the hypothesis that Bridge should be a control plane. Find the strongest existing system that could replace Bridge. Determine exactly what it cannot do.

---

## 1. THE CONTROL PLANE HYPOTHESIS

**Hypothesis:** Bridge should be a control plane that sits between agents and their tools, enforcing policy before every action.

**Architecture:**
```
Agent -> Bridge Policy Engine -> Tool/API
 ↓
 Allow / Deny / Modify / Escalate
```

**Competitive landscape (through August 2026):**

| System | Type | Policy Language | Agent-Specific | Key Capability |
|---|---|---|---|---|
| **OPA (Open Policy Agent)** | General policy engine | Rego (declarative) | No (infrastructure-focused) | Unified policy across microservices, K8s, CI/CD |
| **AWS Cedar** | Authorization language | Cedar (constrained grammar) | Partial (AgentCore integration) | Application-level authorization, human-readable |
| **AWS AgentCore Policy** | Agent gateway | Cedar + NL -> Cedar | Yes | Intercepts every agent tool call, deterministic enforcement |
| **Databricks Unity AI Gateway** | Agent gateway | Service policies | Yes | LLM access control, MCP governance, cost controls |
| **NeuralTrust TrustGate** | AI gateway | Custom | Yes | Tool invocation interception, risk scoring, policy enforcement |
| **ElixirData Context OS** | Governed agent runtime | Policy Gates | Yes | Policy Gates (Allow/Modify/Escalate/Block), RBAC, Decision Traces |
| **Cerbos** | PDP service | YAML policies | No (application-level) | RBAC/ABAC, role hierarchies, tenant isolation |
| **Kubernetes Admission Control** | Cluster policy | Various (webhooks, Kyverno) | No (cluster resources) | Mutating/validating admission, policy-as-code |
| **SPIFFE/SPIRE** | Identity | SPIFFE IDs, X.509 SVIDs | No (workload identity) | Strongly attested cryptographic identities |

**Source:** Web searches through August 2026, including aws.amazon.com, databricks.com, neuraltrust.ai, elixirdata.co, osohq.com, arxiv.org.

---

## 2. WHAT OPA/CEDAR CAN DO

### OPA (Open Policy Agent)

**What it does:** Declarative policy engine that evaluates Rego policies against request context and returns allow/deny (or custom decisions).

**Strengths:**
- Mature ecosystem (CNCF graduated, 29% of OSS projects using PaC per arXiv 2601.05555)
- Rich data joins (can reason over entire request context + external data via OPAL)
- Versioned, testable, reviewable policies (treated like code)
- Sidecar pattern: OPA-as-sidecar fronting tool gateway

**Limitations for Bridge:**
- Rego is a difficult language (closer to Datalog than YAML); policy authoring is a barrier
- OPA is infrastructure-focused (service-to-service, K8s admission), not agent-instruction-focused
- OPA evaluates policy against a request; it does not evaluate competing claims about what the request SHOULD be
- OPA has no concept of "instruction source authority" - it evaluates rules, not instruction hierarchy
- OPA does not produce citation-backed rationale; it produces allow/deny

### AWS Cedar

**What it does:** Open-source authorization language designed for application-level authorization with constrained grammar for safety and readability.

**Strengths:**
- Human-readable policies (permit/when/unless structure)
- Default-deny, forbid-wins-over-permit, order-independent evaluation
- AWS-backed; shipped in Amazon Bedrock AgentCore Policy (March 2026)
- NL -> Cedar formalization (natural-language policy authoring)

**Limitations for Bridge:**
- Cedar is an authorization language, not a claim-resolution engine
- Cedar evaluates "does principal X have permission for action Y on resource Z?" - not "which instruction source governs this action?"
- Cedar policies are static (configured by administrator); they don't evaluate per-action standing from multiple sources
- Cedar doesn't model instruction sources as claims with tiers, staleness, scope, and evidence

### AWS AgentCore Policy (July 2026)

**What it does:** Intercepts every agent-tool call at the gateway boundary, evaluates against Cedar policies, enforces deterministically before tool access is granted.

**Strengths:**
- Purpose-built for agent governance
- Deterministic enforcement outside the model (model cannot bypass)
- Log-only mode for safe pre-production testing
- Integrates with Bedrock Guardrails for content filtering

**Limitations for Bridge:**
- AgentCore Policy governs TOOL ACCESS (what the agent can do), not INSTRUCTION RESOLUTION (what the agent should do)
- AgentCore answers "can this agent call this tool with these arguments?" - not "given conflicting instructions about this task, what should the agent do?"
- AgentCore is AWS-centric; Bridge aims to be agent- and platform-agnostic
- AgentCore enforces policy; it does not author policy from project instruction sources

### Databricks Unity AI Gateway

**What it does:** Governs LLM access, MCP server usage, and API calls with consistent policies across providers.

**Strengths:**
- Cross-provider policy consistency
- Cost controls, observability, guardrails
- MCP governance

**Limitations for Bridge:**
- Databricks ecosystem; not general-purpose
- Tool/gateway-level governance, not instruction-level resolution
- Does not evaluate conflicting project instructions; enforces access control

---

## 3. WHAT NONE OF THESE CAN DO

### The Gap: Instruction Resolution vs. Access Control

All existing systems answer the SAME type of question:

> "Given a policy, and a request, is the request allowed?"

None answer Bridge's question:

> "Given multiple conflicting instruction sources with different authority, what is the effective directive for this specific action, and why?"

### Specific Gaps

| Gap | Why Existing Systems Don't Cover It |
|---|---|
| **Multiple legitimate authorities** | OPA/Cedar assume one policy set. Bridge evaluates multiple competing sources. |
| **Instruction source authority tiers** | No existing system models "AGENTS.md has higher standing than stale README for this action." |
| **Staleness detection** | No existing system compares timestamps across instruction sources to determine which is current. |
| **Citation-backed rationale** | OPA/Cedar return allow/deny. Bridge returns permit/block/flag + citations + why. |
| **Project-specific standing** | Existing systems use admin-configured policies. Bridge computes standing from project's own instruction sources. |
| **Ambiguity flagging** | OPA/Cedar return allow/deny. Bridge returns AMBIGUOUS when equal-tier sources conflict. |
| **Precedent and memory** | Existing systems don't record standing determinations as precedent for future actions. |
| **Agent-facing output format** | Existing systems enforce at the gateway. Bridge produces a directive that the agent reads and acts on (or doesn't). |

---

## 4. THE STRONGEST REPLACEMENT CANDIDATE

### Could AWS AgentCore Policy Replace Bridge?

**Yes, for the GOVERNANCE use case.** If Bridge's value is "enforce policy before agent actions," AgentCore Policy (or a similar gateway) already does this, and is backed by AWS.

**No, for the RESOLUTION use case.** AgentCore Policy does not:
- Read project instruction sources (AGENTS.md, CLAUDE.md, docs, manifests, human prompts)
- Evaluate conflicts between them
- Compute effective standing based on authority tiers
- Produce citation-backed effective directives
- Flag ambiguity when sources conflict at equal tier

**The distinction:**
- AgentCore Policy = "Does this agent have permission to call this tool?" (access control)
- Bridge = "Given all the instructions about this task, what should the agent do?" (instruction resolution)

These are different questions. Access control is necessary but not sufficient for instruction resolution.

---

## 5. THE CONTROL PLANE POSITION FOR BRIDGE

Bridge should NOT be a control plane (gateway, enforcement layer). The control plane is being built by AWS, Databricks, and startups. Bridge cannot win there.

**Bridge's correct position:**

```
Agent -> [reads] -> Bridge Effective Directive <- [computed from] <- Project Instruction Sources
 ↓
 Standing Records (audit, precedent, memory)
```

Bridge sits ABOVE the control plane (if one exists):
- The control plane enforces what the agent can do (tool access, security boundaries)
- Bridge tells the agent what it should do (effective directive from project's own instructions)
- The agent may act on Bridge's directive, or ignore it - Bridge doesn't enforce, it recommends with authority

**If a control plane exists (AgentCore, Unity Gateway, etc.), Bridge feeds it:**
- Bridge resolves the effective directive from project instructions
- Bridge records the standing determination
- The control plane enforces the boundary (security, tool access)
- The agent acts on the directive within the enforced boundary

**If no control plane exists, Bridge still provides value:**
- The agent reads the directive and acts accordingly
- Standing records provide audit trail and precedent
- No enforcement is needed for the developer-wedge case (the agent is trusted to follow its instructions)

---

## 6. THE BRIDGE DIFFERENTIATION - SUMMARY

| Dimension | Control Plane (OPA/Cedar/Gateway) | Bridge |
|---|---|---|
| **Question answered** | Is this action allowed? | What is the effective directive for this action? |
| **Source of authority** | Admin-configured policy | Project's own instruction sources |
| **Output** | Allow / Deny | Permit / Block / Flag / Escalate + rationale + citations |
| **Relationship to agent** | Enforces at gateway (agent cannot bypass) | Produces directive agent reads (agent may follow or ignore) |
| **Conflict handling** | Policy violation = deny | Conflicting instructions = resolve by standing |
| **Audit value** | Access log (what was allowed/denied) | Standing record (what was determined, why, with what authority) |
| **Memory value** | None (ephemeral decisions) | Standing records are precedent for future actions |
| **Project specificity** | Generic (same policy for all projects) | Project-specific (computed from project's own sources) |

**The moat:** Bridge's value is NOT in enforcing boundaries - that's the control plane's job. Bridge's value is in computing effective standing from project-specific instruction sources, with citation-backed rationale and durable standing records. This is a different category from access control.

---

*End of control plane attack.*
