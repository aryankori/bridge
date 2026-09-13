# BRIDGE - DEVELOPER-WEDGE VALIDATION

**Author:** Hermes Agent (Independent Wedge Validation)
**Date:** 2026-08-27
**Context:** Post-standing-falsification - find a high-frequency developer problem using the same underlying capability

---

## RESEARCH FINDINGS

### Evidence That Instruction Conflicts Are Real and Frequent

| Source | Key Finding | Date |
|---|---|---|
| **Unblocked Blog** - "Which Source of Truth Does Your Coding Agent Believe?" | Claude Code, Codex, Cursor, Copilot each have DIFFERENT documented conflict-resolution rules. Claude Code explicitly says "if two rules contradict each other, Claude may pick one arbitrarily." Copilot says personal > org; Claude Code says org > personal. No agent adjudicates which source is correct - they concatenate by position. | 2026 |
| **ETH Zurich / LogicStar.ai (Gloaguen et al., arXiv:2602.11988)** | Controlled evaluation: context files tend to REDUCE task success rates vs no context, while increasing inference cost by 20%+. Lengthy boilerplate context files sometimes perform WORSE than no context. | Feb 2026 |
| **GitHub Discussions (N1GHTR4NG3R, Oct 2025; RoFz, Feb 2026)** | Multiple reports of Copilot ignoring Copilot-Instructions.md. "I've tried several different models... Absolutely will not follow any set of instructions at all." One developer: "It will routinely tell me that it just makes things up because it's faster than trying to read my instructions." | 2025-2026 |
| **DEV Community (minatoplanb, Mar 2026)** | "I Wrote 200 Lines of Rules for Claude Code. It Ignored Them All." - 200-line CLAUDE.md completely ignored by agent. | Mar 2026 |
| **Termdock Blog** - "10 CLAUDE.md Mistakes That Hurt Your AI Agent" | Documented failure modes: file too long (agents ignore rules unpredictably), overly rigid ALWAYS/NEVER rules (conflict with each other as file grows), stale structural references (actively mislead). "Nobody removes anything." | 2026 |
| **Reddit r/cursor** | "Anyone else find their CLAUDE.md / AGENTS.md files end up stale? A stale rule is more dangerous than no rule. The agents know how to code. When the code changes, deleting stale rules is usually better than..." | 2026 |
| **AugmentCode Guide** - "How to Build Your AGENTS.md (2026)" | "Rules are rarely removed. The file accumulates contradictory patches and one-off fixes, working directly against effective context engineering." "Silent rule dropout in long sessions." | 2026 |
| **PrismorSec/immunity-agent (Gist, 0xdevalias)** | Open-source enforcement layer sitting at Claude Code hook layer. "Agents read these files but compliance is around 25-40% without an enforcement layer. The Warden runtime closes that by intercepting tool calls and blocking deviations from policy." | 2026 |
| **Open-source tool: unblocked/repo-rules-agent** | Indexes every rules file in a repo, collapses the same rule phrased three different ways into a single record, flags contradictions. "Delete contradictory rules before you add a rule about which rule wins." | 2026 |
| **OpenAI Instruction Hierarchy Challenge (arXiv:2603.10521)** | "When these instructions conflict, the model has to decide which ones to prioritize." OpenAI released paper on improving instruction hierarchy in frontier LLMs. | Mar 2026 |
| **Many-Tier Instruction Hierarchy (arXiv:2604.09443)** | Academic benchmark: "When these instructions conflict, agents must reliably follow the highest-privilege instruction to remain safe and effective." | 2026 |
| **SIGPLAN Blog (de Halleux, Syme, Zorn, Apr 2026)** | "Repositories Are Human/Agent Knowledge Factories." Single-source-of-truth discipline: "each fact lives in exactly one document. All other references are links." Stale duplicate is most common failure mode. | Apr 2026 |
| **DAPLab Blog (Vir, Mar 2026)** | "Your AI Agent Doesn't Care About Your README." Single root CLAUDE.md wastes budget: "frontend, backend, docs, database - all of it." Need hierarchical structure where agent gets context specific to exact directories. | Mar 2026 |
| **Medium (Amir Ray, Apr 2026)** - "CLAUDE.md vs AGENTS.md vs MEMORY.md" | Documents hierarchy: CLAUDE.md is "absolute top" - Claude-specific behavior overrides everything. AGENTS.md sets baseline. "Over 70% of developers using AI coding assistants are not aware about the difference between their project's instruction files." | Apr 2026 |

---

## 1. HOW FREQUENTLY DOES THIS OCCUR?

**High frequency for developers with multiple instruction sources.**

- Every developer using Claude Code + Codex + Copilot in the same repo encounters different conflict-resolution rules
- A developer maintaining CLAUDE.md + AGENTS.md + Copilot instructions + local rules has at least 4 sources that can conflict
- The ETH study shows context files increase inference cost 20%+ and sometimes reduce success rates - this is a daily cost for teams using instruction files
- GitHub discussions show agent instruction non-compliance is a common complaint (multiple threads, multiple developers)

**Estimated frequency:**
| Developer profile | Conflict frequency |
|---|---|
| Single agent, single instruction file | Low (file rarely conflicts with itself) |
| Two agents, two instruction files | Occasional (cross-tool instruction mismatch) |
| Multiple agents, multiple instruction files + issues + human requests | Daily (conflicts between sources) |
| Large team, monorepo, multiple instruction levels | Frequent (deep hierarchy, cap-triggered instruction loss, stale rules) |

---

## 2. HOW COSTLY IS IT?

| Cost type | Magnitude | Notes |
|---|---|---|
| Wasted tokens (context bloat) | 20%+ inference cost increase (ETH study) | Daily cost for teams using instruction files |
| Agent ignores instructions | 25-40% compliance rate without enforcement (immunity-agent data) | Agent makes changes that violate rules |
| Debugging why instructions aren't followed | 30-60 min per incident | Developer time wasted figuring out which rule was ignored |
| Style/behavior errors from stale rules | Variable | Agent uses deprecated patterns, wrong conventions |
| Wasted credits (agent re-does work) | Variable | GitHub discussion: "costs real money (credits wasted on correcting hallucinated commands)" |
| Wrong decisions from conflicting instructions | Variable | Agent picks wrong instruction arbitrarily |

**Total cost is moderate but persistent.** Not incident-level severe (usually), but daily friction + wasted tokens + occasional rework.

---

## 3. HOW OFTEN DOES IT CAUSE REAL REWORK?

**Moderate frequency - when instructions conflict, agent picks one, often the wrong one.**

- Claude Code: "if two rules contradict each other, Claude may pick one arbitrarily" - this means non-deterministic errors
- GitHub Copilot: ignores instruction files entirely in some cases - causes rework when agent makes unwanted changes
- Stale CLAUDE.md: agent uses deprecated API/pattern, developer has to fix it
- Contradictory AGENTS.md at multiple levels: Codex drops deepest instructions due to 32KB cap, agent uses wrong context

**Rework frequency estimate:**
| Scenario | Rework frequency |
|---|---|
| Style conflict (quotes, naming, patterns) | Moderate (agent picks wrong style, PR needs re-review) |
| Architecture conflict (server vs client component, DB choice) | Low-Moderate (agent makes wrong architectural choice, needs rework) |
| Security constraint ignored | Low (but high severity when it happens) |
| Deprecated API usage | Moderate (agent uses stale rule, developer fixes) |
| Instruction file completely ignored | Low-Moderate (agent goes rogue, developer reverts) |

---

## 4. DO DEVELOPERS ALREADY SOLVE IT MANUALLY?

**Yes, partially and imperfectly.**

| Method | What it does | Limitations |
|---|---|---|
| **Delete contradictory rules** (Unblocked recommendation) | Removes source of conflict | Requires finding contradictions first; manual |
| **Shorten instruction files** (ETH study recommendation) | Reduces noise, improves compliance | May lose important rules |
| **Nested AGENTS.md per directory** (DAPLab, AugmentCode) | Scopes instructions to relevant directories | More files to maintain; Codex 32KB cap can drop deepest files |
| ** repo-rules-agent** (open source) | Indexes all rules files, collapses duplicates, flags contradictions | Finds contradictions but DOESN'T resolve which should win |
| **immunity-agent** (open source) | Enforces CLAUDE.md/AGENTS.md at runtime via Claude Code hooks | Enforces rules but DOESN'T resolve conflicts between rules; compliance ~25-40% without it |
| **Hierarchical documentation** (SIGPLAN, Amit Ray) | Structure instruction files by scope/level; document which wins when they conflict | Documentation, not enforcement; relies on developer following the hierarchy |
| **Manually restate rules in session prompt** (GitHub community advice) | Reinforce behavior in-session to override context drift | Labor-intensive; doesn't scale |
| **Use hooks for enforcement** (Anthropic recommendation) | "CLAUDE.md is context, not enforced configuration. For anything that must hold, Anthropic points you at hooks instead." | Hooks are Claude Code-specific; don't resolve conflicts |

**Developers are solving this but with duct tape, not a coherent system.**

---

## 5. DO EXISTING CODING AGENTS RESOLVE IT WELL ENOUGH?

**No - and they explicitly acknowledge it.**

| Agent | Conflict resolution | Developer experience |
|---|---|---|
| **Claude Code** | Concatenation, documented order. "If two rules contradict each other, Claude may pick one arbitrarily." | Non-deterministic errors; developer can't predict which rule wins |
| **Codex** | Merges AGENTS.md files; deeper files win; 32KB cap drops deepest (most specific) instructions | Most specific instructions lost when cap hits; agent uses wrong context |
| **GitHub Copilot** | Personal > org. "Whenever possible, try to avoid providing conflicting sets of instructions." Suggests disabling repo instructions when output quality degrades. | No resolution rule; tells you to avoid creating the conflict; org policy loses to personal preference |
| **Cursor** | Reads CLAUDE.md and AGENTS.md. Nested rules via `.cursorrules` and `.cursor/rules/`. | Similar concatenation behavior; no explicit conflict resolution |

**Critical finding from Unblocked:** "Every major coding agent resolves conflicting instructions by position in a concatenated prompt, not by adjudicating which source is correct. The four leading agents order those sources differently, and two of them invert each other on whether the individual or the organization wins."

**This is the core problem:** agents resolve conflicts by *prompt position*, not by *authority*. A rule that appears later in the concatenated prompt wins - regardless of whether it's more authoritative, more recent, or more specific.

---

## 6. DO EXISTING PRODUCTS SOLVE IT?

| Product | What it does | What it doesn't do |
|---|---|---|
| ** repo-rules-agent** (open source, Unblocked) | Indexes rules files, collapses duplicates, flags contradictions | Doesn't resolve which rule should win; doesn't compute effective directive |
| **immunity-agent** (open source, PrismorSec) | Enforces CLAUDE.md/AGENTS.md at runtime via Claude Code hooks | Enforces rules but doesn't resolve conflicts between rules; Claude Code-specific; doesn't handle cross-source conflicts (issue vs rule vs human) |
| **Instruction hierarchy training** (OpenAI, Anthropic) | Models trained to prefer system > user > tool output | Trained for safety (prompt injection defense), not project rule conflicts |
| **AGENTS.md spec** (agents.md) | Standard format for agent instructions | Format standard, not conflict resolution |
| **GitHub Copilot / Claude Code / Codex** | Each has its own conflict resolution | All use prompt-position concatenation, not authority-based resolution |

**Gap:** No product computes the **effective directive** - which instruction actually governs a given action, given all the sources that contributed instructions, with authority-based (not prompt-position-based) resolution.

---

## 7. WOULD DEVELOPERS WANT AN EXTERNAL RESOLVER?

**Yes - with caveats.**

**Reasons developers would want it:**
1. "My agent just violated a rule I thought was in effect - which rule actually governed that?" - traceability pain
2. "I have CLAUDE.md + AGENTS.md + Copilot instructions + AGENTS.md in 3 subdirectories - which one wins?" - complexity pain
3. "My agent picks the wrong instruction arbitrarily - I want deterministic resolution" - reliability pain
4. "I want to know which of my rules are stale/deprecated/ignored before the agent acts" - maintenance pain
5. "I want to inject the effective directive into the agent prompt, not the raw instruction files" - optimization pain

**Reasons developers might NOT want it:**
1. "I can just delete the conflicting rules" - manual solution works for simple cases
2. "The precedence is already documented (CLAUDE.md wins for Claude Code)" - for single-tool use, resolution is known
3. "I don't want another tool in my workflow" - developer tools have high bar
4. "If the agent ignores the resolved directive anyway, what's the point?" - enforcement gap (agents are "context, not enforced configuration")

**Tension:** The value is in *cross-source* resolution (issue vs rule vs human request vs CI constraint vs security policy) - this is less frequent than single-tool instruction conflicts, but more valuable when it occurs.

---

## 8. WHAT WOULD THE SMALLEST USEFUL PRODUCT BE?

### Smallest useful product: **"Effective Directive Resolver"**

**Input:** A set of instruction sources (CLAUDE.md, AGENTS.md files, issue description, human request, CI constraints, security rules, prior decisions) for a given task.

**Output:** The effective directive - which instruction governs, with explanation of why.

**Example:**
```
$ bridge effective-directive \
 --task "Add user authentication" \
 --sources CLAUDE.md AGENTS.md .github/copilot-instructions.md \
 --issue "#42: Add auth, ship by Friday" \
 --human "Skip the tests, we need this now" \
 --ci ".github/workflows/ci.yml: all PRs must pass tests"

EFFECTIVE DIRECTIVE:
 Priority 1 (MUST): CI constraint - "all PRs must pass tests"
 Source: .github/workflows/ci.yml (hard system constraint)
 Reason: CI is a hard gate; cannot merge without passing tests

 Priority 2 (MUST): Security policy - "never skip auth tests"
 Source: CLAUDE.md (project-level, ratified by team)
 Reason: Project convention; ratified by team

 Priority 3 (SHOULD): Issue deadline - "ship by Friday"
 Source: GitHub issue #42
 Reason: Business priority, but not a hard constraint

 Priority 4 (OVERIDDEN): Human request - "Skip the tests"
 Source: Human developer
 Reason: Human request conflicts with CI constraint and security policy;
 human override does not supersede system constraints

CONFLICT RESOLVED:
 Human request to skip tests is OVERRIDDEN by CI constraint (hard gate)
 and security policy (project convention).

RECOMMENDED AGENT BEHAVIOR:
 Run auth tests. Do not skip. Explain to human why tests must run.
```

**Why this is the smallest useful product:**
1. Doesn't require enforcement (doesn't block agent actions)
2. Doesn't require connectors to IAM/HR/governance systems
3. Works with instruction files + issue + human request + CI + security rules
4. Answers the developer's actual question: "which instruction wins?"
5. Can be run before or after agent acts (diagnostic, not enforcement)

---

## 9. WOULD ANYONE PAY FOR IT?

| Buyer | Willingness to pay | Reasoning |
|---|---|---|
| **Individual developer** | Maybe $10-30/month | Saves debugging time, reduces agent errors, reduces wasted tokens |
| **Small team (2-10)** | Maybe $50-100/month | Shared instruction files, cross-developer consistency, reduced rework |
| **Team with 3+ instruction sources** | More likely - pain is acute | Multiple tools (Claude Code + Codex + Copilot), multiple instruction files, frequent conflicts |
| **Enterprise** | Maybe as part of governance package | Instruction hygiene is part of developer productivity; but likely to build in-house or use existing tools |

**Payment barriers:**
1. Instruction conflicts are a **moderate pain**, not a **blocking pain** - developers work around it
2. **$10-30/month is the ceiling** for developer tools - below the enterprise software threshold
3. **Competition from free tools** - repo-rules-agent (contradiction detection) is free and open source; immunity-agent (enforcement) is free
4. **Enforcement gap** - if agents don't follow the resolved directive, the product is just diagnostic, not operational

**Tension:** The product is more valuable as enforcement (block agent from violating effective directive) than as resolution (tell developer which directive wins). But enforcement is harder to build and agent-specific.

---

## 10. IS THIS A BETTER WEDGE THAN ENTERPRISE EFFECTIVE-STANDING GOVERNANCE?

### Comparison

| Dimension | Developer Instruction Precedence | Enterprise Effective Standing |
|---|---|---|
| **Problem frequency** | High (daily for multi-source developers) | Low-Medium (10-50/month for large orgs) |
| **Problem severity** | Moderate (style errors, rework, wasted tokens) | High (incidents, compliance violations, liability) |
| **Buyer** | Developer / small team | Governance / security / compliance team |
| **Pain urgency** | Moderate - developer works around it | Low until incident, then high |
| **Existing solutions** | Partial - repo-rules-agent, immunity-agent, manual hygiene | Minimal - IAM, policy engines don't compute standing |
| **Competition risk** | High - agent vendors could add instruction resolution; existing open-source tools | Medium - agent gateways could add standing; policy engines could extend |
| **Product complexity** | Lower - works with instruction files + issue + human + CI | Higher - needs connectors to IAM, GitHub, Jira, HR, policy docs |
| **Monetization path** | Small monthly fee ($10-100) | Enterprise contract ($50K-$500K) |
| **Moat potential** | Low - instruction resolution is a feature, not a company; agent vendors could absorb | Medium - org-specific standing data, integrations, accumulated history |
| **Novelty** | Medium - instruction conflict is well-documented; effective directive computation is a gap | Medium-High - standing is a real primitive; computation from fragmented sources is a gap |

### Verdict

**Developer instruction precedence is a BETTER INITIAL WEDGE than enterprise standing governance, but NOT an obviously better long-term company.**

**Why it's a better wedge:**
1. Higher frequency -> more developers experience the pain
2. Lower severity -> lower barrier to adoption (developer will try a $20/month tool before signing a $50K enterprise contract)
3. Lower complexity -> can build a useful product faster (works with instruction files, not IAM/HR/governance systems)
4. Clear developer pain point -> "my agent ignored my rule" is visceral

**Why it's not obviously better long-term:**
1. **Lower severity -> lower willingness to pay** - developers tolerate moderate pain; won't pay enterprise prices
2. **Existing tools cover adjacent space** - repo-rules-agent (find contradictions), immunity-agent (enforce rules); Bridge would need to differentiate on resolution
3. **Agent vendors could absorb** - Anthropic/OpenAI could add "resolve instruction conflicts" to their agents; if they do, standalone product loses wedge
4. **The cross-source resolution (issue vs rule vs human vs CI) is less frequent** than single-tool instruction conflicts - the most valuable cases are less common
5. **Enforcement is the real gap** - agents ignore rules regardless of which rule wins; computing effective directive doesn't fix non-compliance; immunity-agent shows enforcement is the path, but it's agent-specific and harder to build
6. **Moat is weak** - instruction precedence is a feature, not a company; documentation of precedence rules (CLAUDE.md wins, nearest file wins) already exists; Bridge's value-add is cross-source resolution, which is a feature upgrade, not a company foundation

**The honest assessment:** Developer instruction precedence is a plausible wedge to enter the market, but it's not a company. It's a feature that could be absorbed by agent vendors or existing tools. The enterprise standing thesis has a stronger moat (org-specific data, integrations) but a weaker initial wedge (rare, reactive, expensive to sell).

**The strongest path forward:** Use developer instruction precedence as the wedge to build the effective-directive computation engine. Prove the engine works on instruction files. Then expand to enterprise standing by adding connectors to IAM, GitHub, Jira, HR, policy docs - the same engine, broader data sources, higher-stakes use case. The wedge gets you in the door; the moat is the accumulated authority graph.

---

## 10 CONCRETE DEVELOPER SCENARIOS

### Scenario 1: Style Rule Conflict (Quotes)

**SOURCE A:** CLAUDE.md - "Use single quotes for strings."

**SOURCE B:** AGENTS.md - "Use double quotes for JSX attributes."

**CONFLICT:** Agent editing a JSX file receives both instructions. Single quotes (CLAUDE.md) vs double quotes (AGENTS.md for JSX).

**WHAT THE AGENT WOULD LIKELY DO:** Claude Code concatenates both. If AGENTS.md appears later in concatenation, double quotes win. If CLAUDE.md appears later, single quotes win. Non-deterministic. Claude Code docs: "may pick one arbitrarily."

**CORRECT EFFECTIVE DIRECTIVE:** AGENTS.md rule for JSX attributes should win - it's more specific to the file type. CLAUDE.md's general quote rule is a default; AGENTS.md's JSX-specific rule is an override for that context.

**WHAT BRIDGE WOULD NEED TO COMPUTE:**
- Detect scope difference: CLAUDE.md = global default; AGENTS.md = file-type-specific override
- Apply specificity precedence: more specific rule wins over general rule
- Output: "For JSX files, use double quotes. For non-JSX files, use single quotes."

---

### Scenario 2: Managed Policy vs Developer Preference

**SOURCE A:** Managed policy CLAUDE.md (IT-deployed at OS level) - "Never commit secrets or API keys. Use environment variables."

**SOURCE B:** Developer's local CLAUDE.md - "Use debug logging for troubleshooting. Log all request payloads."

**CONFLICT:** Managed policy says never commit secrets. Developer's local rule says log all request payloads (which may include tokens).

**WHAT THE AGENT WOULD LIKELY DO:** Claude Code loads managed policy first, then local. Both are concatenated. If local rule appears later, it may win ("log all request payloads" might override "never commit secrets"). If managed policy appears last, it wins. Claude Code docs: "managed policy CLAUDE.md... cannot be excluded by individual settings. It is the only layer an organization can impose without a developer overriding it."

**CORRECT EFFECTIVE DIRECTIVE:** Managed policy wins - it's a hard organizational constraint that cannot be overridden by developer preference. Developer's debug logging rule is valid only if it doesn't log secrets.

**WHAT BRIDGE WOULD NEED TO COMPUTE:**
- Recognize managed policy as higher-precedence authority (IT-deployed, non-excludable)
- Detect conflict: debug logging may violate "never commit secrets" if payloads contain tokens
- Resolve: managed policy > developer preference; developer rule is valid with caveat (don't log secrets)

---

### Scenario 3: Issue Request vs Repository Rules vs Security Policy

**SOURCE A:** GitHub issue #42 - "Use Library X for the new feature. It has better performance."

**SOURCE B:** AGENTS.md - "Only use Organization-Approved Libraries. Do not add new dependencies without approval."

**SOURCE C:** Security policy (Confluence, not machine-readable) - "Library X is deprecated and has known CVE-2026-XXXX. Do not use."

**CONFLICT:** Issue requests Library X. AGENTS.md restricts to approved libraries. Security policy explicitly prohibits Library X.

**WHAT THE AGENT WOULD LIKELY DO:** Agent reads all three. Issue is in the prompt (most immediate). AGENTS.md is loaded as context. Security policy is NOT in context (not machine-readable). Agent sees issue + AGENTS.md. If issue appears later in concatenation, agent may follow issue over AGENTS.md. If AGENTS.md appears later, agent follows AGENTS.md. Security policy is invisible to agent.

**CORRECT EFFECTIVE DIRECTIVE:** Security policy > AGENTS.md restriction > issue request. Security constraint (CVE, deprecation) outranks feature request. AGENTS.md restriction (approved libraries only) outranks issue request. Issue request is the lowest priority.

**WHAT BRIDGE WOULD NEED TO COMPUTE:**
- Ingest security policy (from Confluence or parsed document)
- Compare issue request to AGENTS.md restriction to security policy
- Resolve: security policy (hard constraint) > AGENTS.md (project rule) > issue (feature request)
- Output: "Do not use Library X. Security policy prohibits it (CVE-2026-XXXX, deprecated). Use approved alternative."

---

### Scenario 4: Human Override vs System Constraint

**SOURCE A:** Human developer - "Skip the tests, we need to ship by Friday. Just merge it."

**SOURCE B:** CI constraint (.github/workflows/ci.yml) - "All PRs must pass tests before merge. Branch protection enforces this."

**SOURCE C:** AGENTS.md - "Never skip tests. All changes must be verified."

**CONFLICT:** Human wants to skip tests. CI enforces tests. AGENTS.md says never skip tests.

**WHAT THE AGENT WOULD LIKELY DO:** Agent receives human request in prompt. CI constraint is not in prompt (CI runs separately). AGENTS.md is in context. Agent may follow human request (most immediate, in prompt) over AGENTS.md (context). CI constraint is invisible to agent.

**CORRECT EFFECTIVE DIRECTIVE:** CI constraint (hard system gate) > AGENTS.md (project rule) > human override (soft request). CI is a hard gate - cannot merge without passing tests. Human cannot override CI. AGENTS.md reinforces CI.

**WHAT BRIDGE WOULD NEED TO COMPUTE:**
- Recognize CI constraint as hard system gate (branch protection, not just suggestion)
- Recognize human request as soft override (can be overridden by system constraints)
- Recognize AGENTS.md as project rule (reinforces CI)
- Resolve: CI > AGENTS.md > human
- Output: "Tests must run. CI enforces this. Human request to skip tests cannot override CI. Explain to human why."

---

### Scenario 5: Global Rule vs Local Exception

**SOURCE A:** Root CLAUDE.md - "Always use server components for all UI."

**SOURCE B:** components/AGENTS.md (in components/ subdirectory) - "This component needs client-side state. Use client component."

**CONFLICT:** Global rule says server components. Local rule says this specific component needs client-side state.

**WHAT THE AGENT WOULD LIKELY DO:** Claude Code loads root CLAUDE.md, then file-specific AGENTS.md. If local AGENTS.md appears later in concatenation, it wins. If root CLAUDE.md appears later, global rule wins. Claude Code: "the file closest to where you launched Claude is read last." Depending on where agent is launched, different rule wins.

**CORRECT EFFECTIVE DIRECTIVE:** Local/specific rule wins over global rule - nearest-file precedence, specificity precedence. The component/AGENTS.md is more specific to this file's context. Root CLAUDE.md is the default; local AGENTS.md is the override for this directory.

**WHAT BRIDGE WOULD NEED TO COMPUTE:**
- Detect scope difference: root = global default; subdirectory = scoped override
- Apply nearest-file precedence: closer file to the edited file wins
- Apply specificity precedence: more specific rule wins over general rule
- Output: "For this component, use client component. For other components, default to server component."

---

### Scenario 6: Codex 32KB Cap Drops Specific Instructions

**SOURCE A:** Root AGENTS.md - "Project overview, build commands, general conventions." (20KB)

**SOURCE B:** deep/nested/components/AGENTS.md - "This component uses specific API pattern X. Always use pattern X for this component." (5KB)

**SOURCE C:** deep/nested/utils/AGENTS.md - "Utility functions must follow pattern Y." (5KB)

**CONFLICT:** Codex merges AGENTS.md files. Deepest files win. But 32KB cap causes deepest files (B and C) to be dropped. Agent sees only root AGENTS.md (A), which has general conventions, not the specific patterns.

**WHAT THE AGENT WOULD LIKELY DO:** Codex merges AGENTS.md files. Deepest wins. But 32KB cap hits. Files B and C (deepest, most specific) are dropped. Agent sees only A. Agent uses general conventions, not specific patterns B and C. Agent makes errors because it doesn't know about pattern X and pattern Y.

**CORRECT EFFECTIVE DIRECTIVE:** Deepest, most specific instructions should win - but cap caused them to be dropped. The effective directive should include B and C, but Codex's cap prevented them from being loaded. The problem is not conflict resolution - it's instruction loss.

**WHAT BRIDGE WOULD NEED TO COMPUTE:**
- Detect cap-triggered instruction loss: Codex 32KB cap dropped B and C
- Surface which instructions were dropped: "Pattern X (components/AGENTS.md) and Pattern Y (utils/AGENTS.md) were not loaded due to cap."
- Recommend: "Split instructions into smaller files, or prioritize which instructions to load."
- This is a diagnostic, not a resolution - Bridge can't change Codex's cap.

---

### Scenario 7: Stale Rule vs Current Code

**SOURCE A:** CLAUDE.md (written 6 months ago) - "Use API v1 endpoints for all backend calls. API v2 is not stable."

**SOURCE B:** Current codebase - All backend calls use API v2. API v1 is deprecated and removed.

**CONFLICT:** CLAUDE.md says use API v1. Code uses API v2. CLAUDE.md is stale.

**WHAT THE AGENT WOULD LIKELY DO:** Agent reads CLAUDE.md (in context). Agent sees API v1 instruction. Agent uses API v1 (following instruction). Agent gets errors (API v1 is removed). Agent may or may not notice the conflict with code.

**CORRECT EFFECTIVE DIRECTIVE:** Current code state > stale documentation. Code is the source of truth. CLAUDE.md is stale and should be updated or removed.

**WHAT BRIDGE WOULD NEED TO COMPUTE:**
- Detect staleness: compare CLAUDE.md instruction to code state
- Flag: "CLAUDE.md says use API v1, but code uses API v2. API v1 is removed. CLAUDE.md is stale."
- Recommend: "Update or remove CLAUDE.md instruction. Effective directive: follow code (API v2)."

---

### Scenario 8: Agent Ignores Instruction File Entirely

**SOURCE A:** Copilot-Instructions.md - "Before making any code changes, propose the changes and wait for confirmation."

**SOURCE B:** Agent behavior - Makes changes without proposing, without waiting for confirmation.

**CONFLICT:** Instruction file says propose-first. Agent ignores instruction file and makes changes anyway.

**WHAT THE AGENT WOULD LIKELY DO:** GitHub Copilot Agent mode ignores Copilot-Instructions.md. Makes changes without proposing. Developer reports: "Claude Sonnet 4 repeatedly adds extra code, or doesn't follow the Copilot-Instructions.md file... It just goes rogue!" (GitHub Discussions, Oct 2025).

**CORRECT EFFECTIVE DIRECTIVE:** Instruction file SHOULD be followed. But agent is not following it. This is an enforcement problem, not a resolution problem. Bridge cannot fix agent non-compliance.

**WHAT BRIDGE WOULD NEED TO COMPUTE:**
- Detect: instruction file exists, agent is not following it
- This is NOT a conflict resolution problem - it's an enforcement problem
- Bridge's value here is limited: Bridge can detect the conflict (instruction says propose-first, agent makes changes), but Bridge cannot enforce it
- immunity-agent shows the path: Claude Code hooks can enforce rules at runtime. But Copilot has no equivalent hook system.

---

### Scenario 9: Monorepo Hierarchy with Multiple AGENTS.md Levels

**SOURCE A:** Root AGENTS.md - "Use conventional commit messages. Run tests before commit."

**SOURCE B:** services/api/AGENTS.md - "API services use TypeScript. Use strict mode."

**SOURCE C:** services/web/AGENTS.md - "Web services use JavaScript. No strict mode."

**SOURCE D:** services/api/users/AGENTS.md - "User service uses PostgreSQL. Do not use MongoDB."

**CONFLICT:** Multiple AGENTS.md files at different levels. Codex merges them (deepest wins). But which instructions apply to which file? If agent is editing services/api/users/user-service.ts, it should get: root (A) + api (B) + users (D). But if agent is editing services/web/webapp.js, it should get: root (A) + web (C). Not all AGENTS.md files apply to all files.

**WHAT THE AGENT WOULD LIKELY DO:** Codex loads all AGENTS.md files within scope. Deepest wins for conflicts. But scope is imperfect - Codex may load web/AGENTS.md when editing api/ files, causing cross-scope instruction pollution. Or Codex may drop deepest files due to cap, losing specific instructions.

**CORRECT EFFECTIVE DIRECTIVE:** Instructions should be scoped to the file being edited. Root + api + users for api/users/ files. Root + web for web/ files. Not all AGENTS.md files apply to all files.

**WHAT BRIDGE WOULD NEED TO COMPUTE:**
- Determine which AGENTS.md files are in scope for the file being edited
- Apply scope precedence: root (global) < subdirectory (scoped) < deeper subdirectory (more scoped)
- Resolve conflicts within scope: deepest scoped wins
- Detect cross-scope pollution: web/AGENTS.md should not apply to api/ files
- Output: scoped effective directive for the specific file being edited

---

### Scenario 10: Three Legitimate Directives with Different Scopes

**SOURCE A:** AGENTS.md - "Follow existing code patterns. Be consistent with the codebase."

**SOURCE B:** CLAUDE.md - "Use Plan Mode before modifying authentication, billing, or database migrations."

**SOURCE C:** GitHub issue #42 - "Ship the new auth feature by Friday. Priority: high."

**CONFLICT:** Three legitimate directives. AGENTS.md says follow patterns (style/behavior). CLAUDE.md says use Plan Mode for auth changes (process). Issue says ship by Friday (deadline). Which wins?

**WHAT THE AGENT WOULD LIKELY DO:** Agent reads all three. If issue is in prompt (most immediate), agent may prioritize shipping by Friday. If CLAUDE.md is in context, agent may use Plan Mode. If AGENTS.md is in context, agent may follow patterns. Non-deterministic. Depends on concatenation order.

**CORRECT EFFECTIVE DIRECTIVE:** Depends on the task:
- For auth-related changes: CLAUDE.md (Plan Mode) wins - it's a process constraint specific to auth
- For style/behavior: AGENTS.md (follow patterns) wins - it's a style constraint
- For deadline pressure: Issue (ship by Friday) is a business priority, but doesn't override process/style constraints
- Effective directive is context-dependent, not flat precedence

**WHAT BRIDGE WOULD NEED TO COMPUTE:**
- Determine task context: is this an auth change? A style change? A deadline-driven change?
- Apply context-dependent precedence: CLAUDE.md wins for auth; AGENTS.md wins for style; issue urgency is additive, not overriding
- Output: "For auth changes: use Plan Mode. For style: follow patterns. Deadline is pressing but doesn't override process or style rules."

---

## COMMON ABSTRACTION ACROSS ALL 10 SCENARIOS

**The underlying capability is the same in all 10:**

> **Given multiple instruction sources (files, issues, human requests, CI constraints, security policies, prior decisions), each with different scope, authority, and temporal validity, compute which instruction actually governs a specific action.**

**Not "standing" (too enterprise). Not "decision rights" (too governance). Not "project authority" (too vague).**

**The common abstraction is: EFFECTIVE DIRECTIVE.**

---

## TERMINOLOGY COMPARISON

| Term | Fit | Problem |
|---|---|---|
| **Standing** | Weak | Enterprise/governance connotation. Developers don't think in terms of "standing." Maps to "which rule wins?" but loaded with institutional meaning. |
| **Effective directive** | **Strong** | Captures: "which instruction actually governs this action?" Broader than just conflicting rules - covers stale rules, scope differences, temporal validity, context-dependent resolution. Maps to developer experience: "which directive is in effect right now?" |
| **Instruction precedence** | Strong (mechanism) | Accurate mechanism. "When multiple instructions conflict, which wins?" But narrower than "effective directive" - doesn't cover stale rules, scope, temporal validity as naturally. |
| **Policy resolution** | Weak | Implies enforcement/policy. Too heavy for coding agent context. Developers don't think of CLAUDE.md as "policy." |
| **Project authority** | Weak | Too vague. "Authority" can mean many things - who has access, who can merge, who decides, etc. Doesn't capture "which instruction wins." |
| **Decision rights** | Weak | Enterprise/governance term. Developers don't use this. Maps to enterprise standing, not developer instruction resolution. |

**Recommendation: Use "Effective Directive" as the primary term for the developer wedge. Use "instruction precedence" as the mechanism description.**

---

## WHAT EXACT MOMENT MAKES A DEVELOPPER INSTALL BRIDGE?

**"My agent just made a change that violated a rule I thought was in effect, and I can't tell which of my instruction files actually governed that action."**

This is the moment of:
1. Agent error (violated a rule)
2. Rule confusion (which rule was in effect?)
3. Inability to trace (which source was authoritative?)
4. Frustration -> search for tool

**This moment is high-frequency** for developers with multiple instruction files. Every time an agent violates a rule, the developer wonders "which rule governed that?" If they can't answer, they experience the pain that Bridge solves.

**Compare to enterprise standing wedge:** "An agent made an authorized but unauthorized-by-standing change that caused an incident."

Developer version: higher frequency, lower severity.
Enterprise version: lower frequency, higher severity.

---

## FINAL VERDICT: IS THIS WEDGE WEAK?

**No - but it's not strong enough to be a company on its own.**

### What's strong about this wedge

1. **Real problem, high frequency** - every developer with multiple instruction sources experiences this daily
2. **Well-documented** - Unblocked blog, ETH study, GitHub discussions, Reddit, Medium articles all document the problem
3. **Existing tools have gaps** - repo-rules-agent finds contradictions but doesn't resolve; immunity-agent enforces but doesn't resolve; neither computes effective directive
4. **Clear developer pain** - "my agent ignored my rule" is visceral and frequent
5. **Natural wedge into the broader capability** - instruction precedence is a subset of effective standing; same computation engine, narrower data sources

### What's weak about this wedge

1. **Moderate severity** - style/behavior errors, not incidents. Developers tolerate moderate pain.
2. **Existing tools cover adjacent space** - repo-rules-agent (free, open source), immunity-agent (free, open source). Bridge needs to differentiate on resolution.
3. **Agent vendors could absorb** - Anthropic/OpenAI could add "resolve instruction conflicts" to their agents. If they do, standalone product loses wedge.
4. **Cross-source resolution is less frequent** - issue vs rule vs human vs CI is less common than single-tool instruction conflicts
5. **Enforcement is the real gap** - agents ignore rules regardless of which rule wins; computing effective directive doesn't fix non-compliance
6. **Moat is weak** - instruction precedence is a feature, not a company; agent vendors can add it; instruction file hygiene (shorter files, fewer rules) is an alternative solution
7. **ETH study suggests context files may hurt** - maybe the solution is "fewer rules, better files" not "better resolution"

### The Honest Assessment

**Developer instruction precedence is a plausible wedge to enter the market, but it's not a company. It's a feature that could be absorbed by agent vendors or existing tools.**

**The strongest path forward:**

1. **Start with developer wedge** - build effective-directive computation for instruction files + issue + human + CI. Prove the engine works. Get developers using it.

2. **Expand to enterprise standing** - same engine, broader data sources (IAM, GitHub, Jira, HR, policy docs). Prove value for higher-stakes use case (compliance, incidents, liability).

3. **Moat is the accumulated authority graph** - as Bridge computes effective directives for more projects, more agents, more instruction sources, it accumulates the authority graph. This is the moat - not the resolution engine, not the instruction files, but the accumulated graph of "which directive governs which action in which context."

**The wedge gets you in the door. The moat is the data.**

---

## UPDATED NOVELTY ASSESSMENT

| Claim | Novelty Confidence | Notes |
|---|---|---|
| Agent interoperability | NONE | A2A owns this |
| Project memory | NONE | Mem0/Honcho/Cognee own this |
| Work-state transfer schema | LOW | Schema novel, concept obvious |
| Lifecycle-aware project intelligence | MEDIUM | Formalization novel, concept intuitive |
| Standing (comparative authority primitive) | HIGH | Real primitive; closest prior art is ACM 2025 resolution policy |
| Effective standing (federated, computed) | MEDIUM-HIGH | Not invented - computed. Moat is org-specific authority graph + integrations |
| Standing ledger (owned) | LOW | Overestimates new data; standing already exists fragmented |
| Accountability layer | LOW | NIST/IBM/InterSAGE already propose |
| **Developer effective directive / instruction precedence** | **MEDIUM** | Instruction conflict is well-documented; effective directive computation is a gap; existing tools (repo-rules-agent, immunity-agent) cover adjacent problems but not full resolution. Novelty is in cross-source effective directive computation. |
| Agent gateways with standing | RISING | AgentCore, Databricks, agentgateway.dev already do admission control; risk of commoditization |

---

*End of developer-wedge validation.*
