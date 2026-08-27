# BRIDGE — EFFECTIVE STANDING PRODUCT FALSIFICATION

**Author:** Hermes Agent (Independent Product Falsification Reviewer)
**Date:** 2026-08-27
**Status:** Attempting to destroy the "effective standing" product thesis

---

## 1. CAN EXISTING IAM/POLICY ENGINES ALREADY COMPUTE EFFECTIVE STANDING?

### IAM Systems (AWS IAM, Azure AD, GCP IAM, Okta)

**What they compute:** Binary authorization — "Can principal P perform action A on resource R?"

**What they do NOT compute:**
- Authority conflicts between multiple authorized principals
- Precedence between competing authorities
- Delegation chain standing (transitive authority)
- Domain-scoped precedence (security > product for deployment, but not for hiring)
- Temporal validity (does this authority expire?)
- Ratification provenance (who granted this authority?)

**Verdict:** IAM answers the *gate* question. It does not answer the *arbiter* question.

### Policy Engines (OPA/Rego, Cedar, Amazon Verified Permissions)

**What they compute:** Policy evaluation — "Given policy set P and input I, what is the decision?"

**Can they express standing?**

Partially. OPA/Rego can encode precedence logic:

```rego
# deny overrides allow (built-in pattern)
default allow := false
allow {
    input.authority == "security-reviewer"
    input.action == "block-deployment"
}
allow {
    input.authority == "product-manager"
    input.action == "approve-deployment"
    not input.security_reviewer_veto
}
```

But this requires the policy author to **explicitly encode** precedence rules. OPA does not:
- Discover precedence from existing systems (DOA matrices, org charts, policy docs)
- Maintain a standing graph with delegation chains
- Compute effective standing from fragmented authority sources
- Track temporal validity or ratification provenance

**What OPA can do:** Evaluate a standing rule that you give it.
**What OPA cannot do:** Discover, maintain, or propagate standing from existing authority sources.

**Verdict:** Policy engines are the *execution layer* for standing, not the *standing computation layer*. They need standing data as input; they don't create it.

---

## 2. CAN OPA/REGO OR EQUIVALENT EXPRESS EFFECTIVE STANDING?

### What OPA Can Express

| Standing Concept | OPA Expression | Limitation |
|---|---|---|
| Binary authorization | `allow { ... }` / `deny { ... }` | Well-supported |
| Precedence (deny overrides allow) | Built-in pattern | Only binary precedence, not multi-level |
| Role hierarchy | `role := "manager"` implies `role := "engineer"` | Static, not dynamic |
| Domain scoping | `allow { input.domain == "production" ... }` | Requires explicit domain policy |
| Denial conditions | `deny { input.security_veto }` | Requires policy author to encode |

### What OPA Cannot Express (Without Custom Data)

| Standing Concept | Why OPA Can't Do It |
|---|---|
| **Dynamic precedence from authority graph** | OPA needs the graph as input data; it doesn't construct it |
| **Delegation chain standing** | OPA can check "is A delegated to B?" if given the chain; it can't discover the chain |
| **Cross-system authority federation** | OPA evaluates one policy set; it doesn't aggregate authority from IAM + Jira + Git + HR |
| **Temporal validity** | OPA can check timestamps if given them; it doesn't maintain expiry data |
| **Ratification provenance** | OPA can log decisions; it doesn't track who ratified what |
| **Conflict detection** | OPA evaluates to allow/deny; it doesn't flag "two authorities both satisfied, no precedence rule" |

### Could a Cedar Policy Express Standing?

Amazon Verified Permissions / Cedar can express:

```cedar
permit(
    principal in SecurityReviewerRole,
    action == Action::"block-deployment",
    resource in ProductionService
);

 forbid(
    principal in ProductManagerRole,
    action == Action::"approve-deployment",
    resource in ProductionService,
    conditions [DelegationExceedsLimit]
);
```

Cedar's `forbid` overrides `permit` — this IS a form of standing (deny overrides allow). But again:
- Cedar needs the policy rules given to it
- Cedar doesn't discover standing from existing systems
- Cedar doesn't maintain authority graphs

**Verdict:** Policy engines can *enforce* standing rules. They cannot *discover, maintain, or propagate* standing from fragmented organizational sources.

---

## 3. CAN EXISTING SYSTEMS COLLECTIVELY SOLVE EFFECTIVE STANDING WITHOUT A NEUTRAL LAYER?

### Authority Sources and What They Capture

| System | Authority Captured | Format | Machine-Readable? |
|---|---|---|---|
| **IAM** | Role permissions, policy grants | JSON/YAML policies | YES |
| **GitHub** | CODEOWNERS, branch protection, approvals | YAML + API | YES |
| **Jira** | Approval workflows, issue assignees | API | YES |
| **HR/org chart** | Reporting lines, role assignments | HRIS export | PARTIALLY |
| **Policy docs** | Security policies, DOA matrices | PDF/Word/Confluence | NO (mostly) |
| **Slack/Teams** | Informal standing rules | Chat logs | NO |
| **Contracts** | Delegation clauses, SLAs | Signed documents | NO |
| **HDP/UCAN tokens** | Delegation provenance | Cryptographic tokens | YES |

### Can These Collectively Solve Standing?

**What they collectively provide:**
- Binary authorization from IAM
- Code review authority from GitHub
- Business decision authority from Jira
- Reporting structure from HR
- Policy rules from documents (if parsed)

**What they collectively MISS:**
1. **Precedence across domains** — No system says "security veto > product approval for deployment decisions"
2. **Authority graph** — No system connects "Alice's agent is delegated from Alice, who reports to Bob, who has standing over engineering decisions"
3. **Domain-scoped precedence** — No system encodes "security > product for deployment, but product > security for feature prioritization"
4. **Temporal validity** — No system tracks "this standing expired when policy v2 was ratified"
5. **Conflict detection** — No system detects "two authorities both satisfied, no precedence rule exists"
6. **Delegation chain standing** — No system propagates "A delegated to B, B delegated to C, C's standing inherits A's precedence"

### Can a Custom Integration Solve This Without Bridge?

**Yes, but at what cost?**

An enterprise could build:
1. Connectors to IAM, GitHub, Jira, HR, policy docs
2. Standing computation engine (authority graph + precedence + conflict detection)
3. Integration with agent gateways for admission control

**Cost estimate:**
- Connectors: 2-4 weeks each × 5 systems = 10-20 weeks
- Standing engine: 4-8 weeks
- Gateway integration: 2-4 weeks
- Maintenance: ongoing (systems change, policies change)

**Total:** 3-6 months for initial build, ongoing maintenance.

**Would an enterprise build this?**
- **Large enterprise with 100+ agents:** YES, if they have the engineering capacity
- **Mid-size enterprise with 20-50 agents:** MAYBE, if standing conflicts are painful enough
- **Small team with 1-5 agents:** NO, not worth the effort

**Where Bridge fits:** For enterprises that don't want to build this in-house, or want a portable standing computation layer that works across agent platforms.

---

## 4. IS THERE A REAL RUNTIME PROBLEM WHERE AGENTS NEED EFFECTIVE STANDING?

### Yes, but with caveats

**The runtime problem exists when:**
1. Multiple agents have overlapping authorization
2. Their directives conflict
3. No existing system resolves the conflict

**The runtime problem does NOT exist when:**
1. Authorization is exclusive (only one agent can act)
2. All gates are AND-gated (all must pass, no conflict)
3. Human review catches conflicts before they cause harm

**The runtime problem is real for:**
- Large enterprises with 50+ agents from multiple teams
- Regulated organizations where standing is legally significant
- Organizations with complex delegation chains

**The runtime problem is NOT real for:**
- Small teams with 1-5 agents
- Teams where all agents are from the same vendor (Claude Code, Codex)
- Teams where all actions go through human review

---

## 5. HOW FREQUENTLY WOULD AUTHORITY CONFLICTS ACTUALLY OCCUR?

### Estimated Conflict Frequency

| Scenario | Conflict Frequency | Notes |
|---|---|---|
| Single team, 1-5 agents | Very rare (<1/month) | Most actions are uncontested |
| Multiple teams, 10-20 agents | Occasional (1-5/month) | Some cross-team conflicts |
| Large enterprise, 50-100 agents | Frequent (10-50/month) | Many cross-team, cross-domain conflicts |
| Regulated org, 100+ agents | Very frequent (50+/month) | Compliance-driven conflicts common |

### Conflict Types and Frequency

| Conflict Type | Frequency | Severity |
|---|---|---|
| Authorization vs standing (IAM says yes, policy says no) | High | Medium-High |
| Competing authorities (two agents both authorized) | Medium | Medium |
| Delegation limit exceeded (agent exceeds delegated scope) | Medium | High |
| Policy vs project decision (org policy vs project exception) | Low-Medium | High |

### Key Insight

**Most authority conflicts are low-stakes** — they're caught by existing tools (branch protection, manual review, CI gates) before causing harm.

**High-stakes conflicts are rare but consequential** — when they occur, they cause incidents, compliance violations, or liability issues.

**The value of standing is disproportionate to frequency** — it's valuable not because conflicts are common, but because the rare high-stakes conflict is very expensive.

---

## 6. WHAT HAPPENS WHEN AUTHORITY SOURCES DISAGREE?

### Scenario: DOA Matrix vs IAM vs Policy Doc

| Source | Statement |
|---|---|
| **DOA Matrix** | "Finance agent authorized up to $25K" |
| **IAM** | "Finance agent has `billing:approve` permission (no limit)" |
| **Policy doc** | "All cloud spend > $10K requires CFO sign-off" |

### What Happens Without Standing Computation

1. Finance agent approves $50K spend (IAM says authorized)
2. DOA matrix limit ($25K) is not checked (not in IAM)
3. CFO sign-off requirement ($10K threshold) is not checked (not in IAM)
4. Spend goes through
5. CFO discovers: "Who approved $50K?"
6. Investigation: Finance agent had IAM permission, but exceeded DOA delegation and policy threshold
7. Liability question: "Who was responsible?"

### What Standing Would Compute

- Effective standing for finance agent: authorized up to $25K (from DOA matrix)
- Policy threshold: CFO sign-off required for > $10K
- Result: $50K approval VIOLATES standing (both DOA limit and policy threshold)

### When Sources Disagree, Who Wins?

This is the core question standing must answer. Options:

1. **Most restrictive wins** — DOA limit ($25K) and policy threshold ($10K) both restrict IAM's unlimited permission
2. **Most recent wins** — If policy was ratified after DOA matrix, policy wins
3. **Highest precedence wins** — CFO authority > Finance agent authority
4. **Domain-specific rule** — For financial approvals, DOA + policy combined > IAM

**Standing requires a resolution rule for each conflict domain.**

---

## 7. WHO IS RESPONSIBLE FOR MAINTAINING PRECEDENCE RULES?

### The Hard Problem

Precedence rules are **organizational knowledge**, not technical configuration. They live in:
- Org charts (who reports to whom)
- DOA matrices (who can approve what)
- Policy documents (which rules override which)
- Corporate governance (board > CEO > VP > IC)
- Informal norms (security always vetoes production changes)

### Who Maintains Them?

| Source | Owner | Maintenance Cadence | Machine-Readable? |
|---|---|---|---|
| Org chart | HR | Quarterly updates | Partially |
| DOA matrix | Finance / Legal | Annual review | NO (document) |
| Security policy | CISO | Annual review | NO (document) |
| Project decisions | Project lead | Ad hoc | NO (Jira/GitHub) |
| Informal norms | Team culture | Continuous | NO (tacit) |

### Implications for Bridge

**Bridge cannot maintain precedence rules.** They are owned by the organization, not by Bridge.

**What Bridge can do:**
1. **Extract** precedence rules from existing sources (DOA matrices, policy docs, org charts)
2. **Encode** them in a machine-readable standing graph
3. **Compute** effective standing at runtime
4. **Flag** when precedence rules are missing or contested

**What Bridge cannot do:**
1. Decide which authority has higher precedence (the org decides)
2. Update precedence rules when the org changes (the org updates)
3. Resolve contested standing (the org resolves)

**This is a critical constraint.** Bridge is a *computation layer*, not an *authority owner*. If the org doesn't maintain clear precedence rules, Bridge can't compute effective standing.

---

## 8. WHO WOULD BUY THIS?

### Buyer Personas

| Persona | Motivation | Buying Trigger | Budget |
|---|---|---|---|
| **Enterprise Governance Team** | Prevent unauthorized agent actions, provide audit trails | Agent sprawl causing governance gaps | $50K-$200K/year |
| **Security Team** | Enforce security policy on agent actions | Agent bypassed security policy | $50K-$150K/year |
| **Compliance Team** | Prove authority for regulated decisions | Audit requirement for agent decisions | $100K-$500K/year |
| **CTO/VP Engineering** | Scale agent operations without governance breakdown | 50+ agents, conflicts causing incidents | $100K-$300K/year |
| **Regulated Organization (Finance, Healthcare, Gov)** | Legal liability for agent decisions | Regulatory requirement for authority proof | $200K-$1M/year |

### Who Would NOT Buy

| Persona | Reason |
|---|---|
| Individual developer | 1-2 agents, no standing conflicts |
| Small team (2-10 people) | Manual review suffices |
| Startup without compliance needs | No regulatory driver |

### Buying Trigger Analysis

**The most compelling trigger:** "An agent made an authorized but unauthorized-by-standing change that caused an incident or compliance violation."

**Secondary trigger:** "We have 50+ agents and standing conflicts are causing operational friction."

**Tertiary trigger:** "Our compliance team requires proof of authority for agent decisions."

**The trigger is reactive (incident-driven) or proactive (scale-driven).** It is NOT a developer tool trigger.

---

## 9. DOES THE DEVELOPER HAVE THIS PROBLEM, OR ONLY LARGE ORGANIZATIONS?

### Developer (1-5 agents)

**Problem profile:**
- 1-2 agent types (Claude Code, Codex)
- Single team, single project
- Most actions are uncontested
- Conflicts caught by manual review, branch protection, CLAUDE.md
- Standing conflicts: near zero

**Would developer buy?** NO. Not enough pain. Manual processes work.

### Team (5-20 people, 5-20 agents)

**Problem profile:**
- Multiple agent types possible
- Cross-team conflicts possible
- Some standing conflicts (security vs feature, project vs org policy)
- Partially solved by existing tools (GitHub branch protection, Jira approvals)
- Standing gaps: occasional, manageable

**Would team buy?** MAYBE. If standing conflicts are causing incidents or friction. But likely to solve with existing tools + manual processes first.

### Enterprise (50-500+ people, 50-500+ agents)

**Problem profile:**
- Many agent types, many teams
- Frequent cross-team, cross-domain conflicts
- Existing tools insufficient (IAM, GitHub, Jira each capture partial authority)
- Standing gaps: frequent, sometimes consequential
- Compliance/liability drivers

**Would enterprise buy?** YES, if standing conflicts are costing them. But they might build in-house.

### Regulated Organization (Finance, Healthcare, Government)

**Problem profile:**
- Legally significant authority decisions
- Compliance requires proof of standing
- Agent actions have liability implications
- Existing tools don't provide standing audit trails

**Would regulated org buy?** YES, if compliance requires it. This is the strongest buyer segment.

### Verdict

**This is NOT a developer problem.** It is an **enterprise governance** or **regulated compliance** problem. The buyer is not the developer — it's the governance, security, or compliance team.

---

## 10. IS THIS A PRODUCT OR INFRASTRUCTURE PRIMITIVE?

### Product Arguments

1. **Solves a specific business problem** — agent governance, compliance, audit trails
2. **Has a clear buyer** — enterprise governance/security/compliance teams
3. **Has a clear value proposition** — prevent unauthorized actions, prove authority
4. **Requires integration work** — connectors to existing systems, precedence encoding
5. **Has a clear wrapper** — could be packaged as SaaS or self-hosted

### Infrastructure Arguments

1. **Standing could become a standard primitive** — like authorization in IAM
2. **Agent gateways could absorb it** — AgentCore Gateway, Databricks Unity AI Gateway already do admission control
3. **Policy engines could extend to standing** — OPA/Cedar could add standing computation
4. **DOA matrices could become machine-readable** — if enterprises encode DOA in computable form

### Verdict

**This is currently a product hypothesis, but it has infrastructure risk.**

The risk is that standing becomes commoditized as:
- A feature of agent gateways (admission control with standing)
- A policy engine extension (OPA/Cedar with standing computation)
- A standard protocol (standing data model like A2A)

If any of these happens, Bridge's standalone product thesis weakens.

**Bridge's defense:**
- Standing data (project-specific authority graph) is the moat, not the computation
- Cross-system integration is the moat (connectors, precedence encoding)
- Accumulated standing history is the moat (time moat)

**But if standing becomes a protocol standard, Bridge's moat shrinks to "who has the most standing data" — which is a weaker moat than "who invented standing."**

---

## 11. FIVE CONCRETE REAL-WORLD AGENT SCENARIOS

### Scenario 1: Production Config Change Without Required Security Review

**Agents involved:**
- Engineer agent (deployed by engineering team)
- Security agent (monitoring, not acting)

**Conflicting directives:**
- Engineer agent: "Apply auto-scaling config change to production (threshold: 80% → 90%)."
- Security policy: "All production config changes require security team review per Security Policy v3.2 §4.2."

**Existing authority sources:**
- IAM: Engineer agent has `prod:config:write` permission (authorized)
- GitHub: Branch protection requires security-team review for `prod/*` files (exists)
- Security Policy v3.2: PDF document, not machine-readable (exists but not computable)
- HR/org chart: Security team has authority over production security (exists)

**What fails without effective-standing computation:**
- IAM authorizes the change (binary yes)
- GitHub branch protection requires review, but agent has bypass permission (or review is automated)
- Security policy is not checked (not in IAM, not in GitHub, not computable)
- Agent applies change
- Security incident: misconfigured auto-scaling causes outage

**What Bridge would compute:**
- Effective standing: security-review-required for production config changes
- Precedence: security-policy-standing > IAM-permission for production configuration
- Result: BLOCK — requires security team ratification

**What happens if Bridge is absent:**
- Agent applies change
- Incident occurs
- Post-mortem: "Agent had IAM permission, but policy required review. Gap between authorization and standing."

---

### Scenario 2: Developer Agent Deploys Code Violating Project Security Policy

**Agents involved:**
- Developer agent (deployed by dev team)

**Conflicting directives:**
- Developer agent: "Deploy service X to production (tests pass, CODEOWNERS approved, branch protection passed)."
- Project security policy: "All production services must use Organization-Approved Encryption Library v2. Service X uses unapproved library v1."

**Existing authority sources:**
- GitHub: CODEOWNERS approved, branch protection passed (code authority — satisfied)
- CI: Tests pass (technical authority — satisfied)
- IAM: Developer has `deploy:prod` permission (deployment authority — satisfied)
- Project security policy: Confluence page, not machine-readable (exists but not computable)
- Organization-approved library list: Managed in security system, not connected to deployment pipeline

**What fails without effective-standing computation:**
- All technical authorizations satisfied (code approved, tests pass, IAM permission granted)
- Security policy is not checked (not in GitHub, not in CI, not in IAM)
- Agent deploys service X with unapproved encryption
- Security vulnerability or compliance violation

**What Bridge would compute:**
- Effective standing: security-policy-standing requires approved encryption for production services
- Precedence: security-policy-standing > deployment-authorization for production services
- Result: BLOCK — requires security approval or exemption

**What happens if Bridge is absent:**
- Agent deploys
- Security vulnerability discovered (or compliance audit finds violation)
- Incident or audit finding

---

### Scenario 3: DBA Agent Bypasses Safety Checklist for Schema Migration

**Agents involved:**
- DBA agent (deployed by data team)

**Conflicting directives:**
- DBA agent: "Apply schema migration v2.3 to production database (alter table, add column)."
- Safety checklist: "All production schema migrations require DBA lead review and rollback plan per Data Policy v2.1."

**Existing authority sources:**
- IAM: DBA agent has `db:migrate` permission (authorized)
- Git: Migration files require DBA lead approval (exists in repo, not enforced by IAM)
- Data Policy v2.1: Document, not machine-readable (exists but not computable)
- HR: DBA lead has authority over schema changes (exists in org chart)

**What fails without effective-standing computation:**
- IAM authorizes the migration
- Git approval requirement exists but agent bypasses (or approval is automated)
- Data policy not checked (not in IAM, not enforced by Git)
- Agent migrates without review or rollback plan
- Migration causes data loss or downtime

**What Bridge would compute:**
- Effective standing: DBA-lead-ratification-required for production schema changes
- Precedence: data-policy-standing > IAM-permission for destructive database operations
- Result: BLOCK — requires DBA lead approval

**What happens if Bridge is absent:**
- Agent migrates
- Incident occurs
- Post-mortem: "Agent had permission but not standing."

---

### Scenario 4: Finance Agent Approves Spend Exceeding Delegated Authority

**Agents involved:**
- Finance agent (deployed by finance team)
- Engineering agent (requesting cloud spend)

**Conflicting directives:**
- Finance agent: "Approve $50K cloud spend for new service deployment."
- Engineering agent: "Deploy new service on cloud provider X ($50K/month)."
- DOA matrix: "Finance agent authorized to approve spend up to $25K."
- Policy: "All cloud spend > $10K requires CFO sign-off."

**Existing authority sources:**
- DOA matrix: Finance agent limit $25K (document, not machine-readable)
- IAM: Finance agent has `billing:approve` permission with no limit (authorized — no cap)
- AWS/GCP billing: No concept of delegation authority (just permission)
- CFO delegation: Not in IAM, not in billing system

**What fails without effective-standing computation:**
- IAM says finance agent CAN approve (binary yes, no limit)
- DOA matrix limit ($25K) not checked (not in IAM)
- CFO sign-off requirement not checked (not in IAM)
- Finance agent approves $50K
- CFO discovers unauthorized spend
- Liability: "Who was responsible for this approval?"

**What Bridge would compute:**
- Effective standing: finance-agent-standing capped at $25K (from DOA matrix)
- Policy threshold: CFO sign-off required for > $10K
- Result: $50K approval VIOLATES standing (exceeds DOA limit and policy threshold)
- Action: FLAG — requires CFO sign-off for > $25K

**What happens if Bridge is absent:**
- Finance agent approves $50K
- CFO discovers unauthorized spend
- Investigation: "Finance agent had IAM permission, but exceeded DOA delegation and policy threshold."
- Liability issue

---

### Scenario 5: Project Agent Uses Library Contradicts Org-Wide Security Policy

**Agents involved:**
- Project A agent (deployed by project A team)
- Org security agent (monitoring)

**Conflicting directives:**
- Project A agent: "Use Library X for new feature (performance advantages, VP Engineering approved in Jira ticket)."
- Org security policy: "Only Organization-Approved Libraries may be used. Library X is not on approved list."

**Existing authority sources:**
- Jira: VP Engineering approved library X for project A (business authority — exists)
- Org security policy: "Approved libraries only" (security authority — exists as policy doc)
- GitHub: No library approval tracking (no authority capture)
- IAM: No library approval concept (no authority capture)
- Organization approved library list: Managed in security system, not connected to project workflow

**What fails without effective-standing computation:**
- Project A agent has business authorization (VP approved in Jira)
- Org security policy is not checked (not in Jira, not in GitHub, not in IAM)
- Conflict: VP Engineering authority vs CISO authority
- Agent uses library X
- Security discovers violation
- Escalation: "VP approved it" vs "Policy prohibits it"

**What Bridge would compute:**
- Effective standing: Need to determine precedence for library approval decisions
- Option A: CISO authority (security) > VP Engineering authority (feature) for library approval
- Option B: VP Engineering can override for specific projects with security review
- Result: DEPENDS ON STANDING RULE (which Bridge encodes from org's precedence rules)

**What happens if Bridge is absent:**
- Project A uses library X
- Org security discovers violation
- Conflict escalates to executive level
- "VP approved it" vs "Policy prohibits it" — no standing resolution

---

## 12. SMALLEST PRODUCT THAT PROVES VALUE

### Product Options Compared

| Option | Description | Pros | Cons | Viability |
|---|---|---|---|---|
| **A. CLI** | `bridge standing-check --action ... --agent ...` | Simplest, developer-friendly, proves concept | Requires manual rule input; no integrations; can't scale | ✅ Proof of concept |
| **B. MCP server** | MCP server that agents query before acting | Agent-native, can be deployed independently | Requires connectors; MCP adoption uncertain | ✅ Best wedge |
| **C. GitHub app** | GitHub app that checks standing before PR merges | Proves value for code changes; GitHub-native | Too narrow (only code); doesn't cover other agent actions | ⚠️ Partial |
| **D. Policy engine plugin** | OPA/Rego plugin for standing computation | Integrates with existing policy infra | Requires OPA adoption; plugin is invisible | ⚠️ Hidden |
| **E. Agent gateway** | Gateway that intercepts all agent actions | Comprehensive, enforcement | Largest product; competes with existing gateways | ❌ Too big |
| **F. Cross-system authority API** | API that computes standing from multiple sources | Flexible, can be used by CLI/MCP/GitHub/gateway | Middleware, not end product; needs consumer | ✅ Foundation |

### Smallest Product: **Option B: MCP Server** + **Option A: CLI** for bootstrap

**Why MCP server:**
1. Agents can query it directly before acting (agent-native)
2. Can be deployed independently (no gateway required)
3. Proves standing computation value without full infrastructure
4. Can be extended to API, gateway, GitHub app later

**Why CLI for bootstrap:**
1. Before connectors exist, CLI allows manual rule input
2. Proves standing computation concept
3. Developers can use CLI to check standing manually
4. Validates the standing semantics before building integrations

**MVP Flow:**

```
# Phase 1: CLI with manual rules (prove concept)
bridge standing-check \
  --action "apply config to production" \
  --agent "engineer-agent" \
  --rules "security-review required for production config changes" \
  --authority "security-team has veto over production config changes"

# Output:
# STANDING: NOT-SATISFIED
# Reason: security-review-required for production config changes
# Authority: security-team has veto (precedence 90) > engineer-agent (precedence 70)
# Action: BLOCK — requires security team ratification

# Phase 2: MCP server with connectors (prove value)
# Agent queries MCP server before acting
# MCP server computes standing from connected systems (IAM, GitHub, Jira)
# Returns: SATISFIED / NOT-SATISFIED / CONTESTED / REQUIRES-RATIFICATION

# Phase 3: Expand connectors (scale)
# Add HR, policy docs, DOA matrices, Slack, contracts
# Compute effective standing from all sources
```

---

## 13. USEFUL / DEFENSIBLE / OWNABLE / PAYABLE

### Useful?

**Yes, with caveats.**
- Useful for enterprises with 50+ agents and standing conflicts
- Useful for regulated organizations with compliance requirements
- NOT useful for developers or small teams
- Value is disproportionate to frequency (rare high-stakes conflicts)

### Defensible?

**Partially.**
- Standing computation algorithm is defensible (not obvious)
- Cross-system integration is defensible (requires work)
- Accumulated standing data is defensible (time moat)
- BUT: standing could be commoditized by agent gateways, policy engines, or standards

### Ownable?

**Partially.**
- Project-specific authority graph: ownable (org-specific)
- Connector integrations: ownable (integration work)
- Accumulated standing history: ownable (time moat)
- Standing primitive: NOT ownable (could be standardized)

### Payable?

**Yes, but limited market.**
- Enterprise governance teams: $50K-$200K/year
- Compliance teams: $100K-$500K/year
- Regulated organizations: $200K-$1M/year
- Developers/small teams: NOT payable (no budget, no pain)

**Total addressable market:** Enterprise + regulated organizations with 50+ agents.
**Market size:** Unclear — agent adoption is early, standing conflicts are rare, compliance drivers are emerging.

---

## 14. WHAT EXACT EVENT MAKES SOMEONE REACH FOR BRIDGE?

### The Best Answer

**"An agent made an authorized but unauthorized-by-standing change that caused an incident or compliance violation, and we need to prevent this from happening again."**

### Why This Is Compelling

1. **Concrete:** The event is specific (agent action caused harm)
2. **Understandable:** "Agent had permission but shouldn't have acted" is intuitive
3. **Painful:** Incident or compliance violation has real cost
4. **Preventable:** Standing computation could have blocked the action
5. **Reproducible:** This happens whenever agents have IAM permission but not standing

### Why This Is NOT Compelling Enough

1. **Reactive:** The trigger is post-incident, not pre-emptive
2. **Rare:** High-stakes standing conflicts are infrequent
3. **Solved by existing tools:** Branch protection, manual review, CLAUDE.md catch many cases
4. **Build vs buy:** Enterprise might build in-house rather than buy a startup product
5. **No developer trigger:** Developers don't feel this pain; governance/compliance teams do

### The Weaker Answer

**"We have 50+ agents and standing conflicts are causing operational friction."**

This is proactive but:
- "Operational friction" is vague
- Hard to quantify
- Might be solved by existing tools + process changes

### The Weakest Answer

**"We want to govern our agents better."**

Too vague. No specific trigger. No compelling event.

---

## 15. FINAL VERDICT

### What Survives

1. **Standing is a real computational primitive** — it's comparative/arbitration, distinct from binary authorization. Authorization = "can you do X?" Standing = "when A and B both can do X, whose wins?"

2. **Effective standing computation is a real gap** — existing systems (IAM, GitHub, Jira, HR, policy docs) capture authority fragments but don't compute unified standing. No system resolves cross-domain authority conflicts.

3. **There is a market** — enterprise governance and regulated compliance teams would pay for standing computation if conflicts are costing them.

4. **MCP server + CLI is a viable wedge** — smallest product that proves value without requiring full infrastructure.

### What Fails

1. **"Standing ledger" as a standalone product** — overestimates new data; standing already exists fragmented. The opportunity is computation, not ledger ownership.

2. **"Developer tool" framing** — developers don't have this problem at scale. The buyer is governance/security/compliance, not the developer.

3. **"We invented standing"** — standing is a reframing of resolution policy (ACM 2025), DOA matrices, and authorization precedence. The novelty is in the *computation and federation*, not the *invention*.

4. **"This is a company"** — the market is unclear (agent adoption is early, standing conflicts are rare), the buyer is narrow (enterprise/regulated), and the product could be commoditized by agent gateways or policy engines.

### The Honest Assessment

**Effective standing computation is a real and underserved problem for large enterprises and regulated organizations with many autonomous agents.** The primitive is sound, the gap is real, and there is a plausible buyer.

**But:**
- The market is early and uncertain
- The buyer is narrow (not developers)
- The trigger is reactive (incident-driven) or scale-driven (50+ agents)
- The product could be commoditized by agent gateways or policy engines
- The moat is limited to org-specific standing data and integration work

**This is a plausible product hypothesis, but not yet a convincing company.** It needs:
1. Evidence that standing conflicts actually cause costly incidents
2. Evidence that enterprises would buy rather than build
3. Evidence that standing won't be commoditized by gateways/policy engines/standards
4. A clear trigger event that makes someone reach for Bridge

**Without these, the thesis remains a hypothesis, not a validated product.**

---

## 16. WHAT WE STILL DON'T KNOW

1. **Do standing conflicts actually cause costly incidents in practice?** — Anecdotal evidence suggests yes, but no systematic data.
2. **Would enterprises build in-house or buy?** — Depends on engineering capacity, pain level, and available solutions.
3. **Can standing be commoditized by agent gateways?** — AgentCore Gateway, Databricks Unity AI Gateway, and agentgateway.dev already do admission control. If they add standing, Bridge's standalone thesis weakens.
4. **Will standing become a standard protocol?** — If A2A or a new standard defines standing, Bridge becomes a library, not a company.
5. **What's the actual market size?** — Agent adoption is early; standing conflicts are rare; compliance drivers are emerging. TAM is unclear.

---

*End of effective standing product falsification.*
