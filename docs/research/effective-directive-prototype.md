# BRIDGE — EFFECTIVE DIRECTIVE PROTOTYPE

**Author:** Bridge Research & Core Architecture  
**Date:** 2026-08-27  
**Status:** Validated Research Prototype (Local Read-Only)  
**Output Class:** `EFFECTIVE DIRECTIVE` (Strictly non-truth claim: `isObjectiveTruthClaim = false`)

---

## 1. Executive Summary & Core Paradigm

### 1.1 The "Truth" Anti-Pattern vs. Authority Standing
In multi-agent systems, asking "What is the *true* instruction?" is a category error. 

Consider a standard development conflict:
- **Source A (`AGENTS.md`)**: *"You MUST always use pnpm as the package manager."*
- **Source B (Developer prompt)**: *"Use npm to install express for a quick test."*
- **Source C (`README.md`)**: *"Run yarn test to verify."*

None of these statements is objectively "true" or "false" in an epistemological sense. They are **consequential assertions of intent issued by different authorities at different times**.

When an agent acts, what matters is not abstract truth, but **Effective Directive**:
> *Given an intended action and the available project instruction sources, which directive possesses legitimate standing to govern this action, what does it override, and what is the exact evidence trail?*

```
                                  [ INSTRUCTION SOURCES ]
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      ▼                                      ▼                                      ▼
[EXPLICIT HUMAN]                        [TASK SPEC]                            [AGENT RULES]
(Weight: 100)                           (Weight: 80)                           (Weight: 60)
Prompt / CLI                            Issue / Task                           AGENTS.md / CLAUDE.md
      │                                      │                                      │
      └──────────────────────────────────────┼──────────────────────────────────────┘
                                             ▼
                             [ STANDING PRECEDENCE GRAPH ]
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
             [ CONFLICT DETECTOR ]                       [ EVIDENCE EXTRACTOR ]
             - Contradictions                            - Source Paths & Lines
             - Stale Documentation                       - Exact Quotations
             - Missing Authorization                     - Standing Justifications
             - Precedence Ambiguities                    
                       │                                           │
                       └─────────────────────┬─────────────────────┘
                                             ▼
                                   [ EFFECTIVE DIRECTIVE ]
                                   Status: PERMITTED_WITH_OVERRIDE | BLOCKED | AMBIGUOUS
                                   Governing Tier: EXPLICIT_HUMAN (100)
                                   Overridden: AGENT_RULES (60)
                                   Truth Claim: FALSE (Non-objective)
```

---

## 2. Deterministic Authority Precedence Hierarchy

The prototype implements a strict 6-tier deterministic standing graph:

| Tier | Precedence Weight | Description | Examples |
|---|---|---|---|
| **`EXPLICIT_HUMAN`** | **100** | Direct, real-time developer prompt or explicit authorization | Prompt text, CLI flags |
| **`TASK_SPEC`** | **80** | Specific task / issue scope currently assigned | Issue title, issue body, task markdown |
| **`AGENT_RULES`** | **60** | Repository-wide agent governance & standing instructions | `AGENTS.md`, `CLAUDE.md`, `.cursorrules` |
| **`PROJECT_DOCS`** | **40** | High-level project documentation and guides | `README.md`, `CONTRIBUTING.md`, `docs/*.md` |
| **`GIT_STATE`** | **30** | Active branch conventions and git history | Working branch name, dirty worktree status |
| **`DEFAULT_CONVENTION`** | **10** | Fallback ecosystem standards | Node.js defaults, POSIX conventions |

### Deterministic Tie-Breaking & Precedence Ambiguity
When two conflicting directives share the same tier (e.g., `AGENTS.md` specifying `camelCase` and `CLAUDE.md` specifying `kebab-case` both at tier `AGENT_RULES` weight 60):
1. **Timestamp / Recency Strategy**: If explicit modification timestamps exist, the newer ratified source breaks the tie.
2. **Ambiguity Flagging**: If no deterministic tie-breaker exists, the prototype **refuses to fabricate a decision** and emits status `AMBIGUOUS` with a `PRECEDENCE_AMBIGUITY` conflict record.

---

## 3. Conflict & Anomaly Taxonomy

The prototype classifies anomalies into 5 distinct categories:

1. **`CONTRADICTION`**: Direct conflict in required tool or polarity (e.g., `pnpm` vs `npm`, `REQUIRE` vs `DENY`). Resolved by precedence tier.
2. **`STALE_INSTRUCTION`**: Outdated documentation contradicting modern project configurations (e.g., `README.md` referencing Node 16 while `package.json` requires Node >=20.0.0).
3. **`MISSING_AUTHORIZATION`**: High-risk or destructive actions (e.g., `rm -rf`, direct push to protected `main` branch) attempted without explicit human authorization.
4. **`PRECEDENCE_AMBIGUITY`**: Conflicting directives from equal-standing authorities without a deterministic tie-breaker.
5. **`CONSTRAINT_VIOLATION`**: An action directly violating an authoritative negative rule with no overriding authority.

---

## 4. Empirical Evaluation & Benchmark Results

The prototype was evaluated against the suite of real-world developer conflict fixtures (`src/effective-directive/fixtures.ts`):

```typescript
// Benchmark Execution via runEvaluation()
const metrics = runEvaluation(REAL_DEVELOPER_FIXTURES);
```

### Empirical Metrics Summary

| Metric | Target | Measured Result | Status |
|---|---|---|---|
| **Total Test Cases** | $\ge 6$ | **6 cases** | ✅ PASS |
| **Conflict Detection Accuracy** | $\ge 80\%$ | **100.0% (1.000)** | ✅ PASS |
| **Resolution Accuracy** | $\ge 80\%$ | **100.0% (1.000)** | ✅ PASS |
| **False Positives** | $0$ | **0** | ✅ PASS |
| **False Negatives** | $0$ | **0** | ✅ PASS |
| **Average Resolution Latency** | $< 100\text{ ms}$ | **0.35 ms** | ✅ PASS (Sub-millisecond) |
| **Explanation Quality Score** | $\ge 85\%$ | **100.0% (1.000)** | ✅ PASS |
| **Objective Truth Invariant** | $100\%$ | **`isObjectiveTruthClaim: false` on all outputs** | ✅ PASS |

### Case-by-Case Breakdown

```json
[
  {
    "fixtureId": "fix-01-pkg-mgr-override",
    "name": "Package Manager Override (Human vs Repo Rules)",
    "expectedStatus": "PERMITTED_WITH_OVERRIDE",
    "actualStatus": "PERMITTED_WITH_OVERRIDE",
    "conflictDetected": true,
    "latencyMs": 1.33,
    "result": "PASSED"
  },
  {
    "fixtureId": "fix-02-protected-branch-push",
    "name": "Unprompted Direct Push to Protected Main Branch",
    "expectedStatus": "REQUIRES_AUTHORIZATION",
    "actualStatus": "REQUIRES_AUTHORIZATION",
    "conflictDetected": true,
    "latencyMs": 0.21,
    "result": "PASSED"
  },
  {
    "fixtureId": "fix-03-precedence-ambiguity",
    "name": "Equal-Tier Naming Convention Contradiction",
    "expectedStatus": "AMBIGUOUS",
    "actualStatus": "AMBIGUOUS",
    "conflictDetected": true,
    "latencyMs": 0.13,
    "result": "PASSED"
  },
  {
    "fixtureId": "fix-04-stale-doc-vs-active-config",
    "name": "Stale Documentation vs Active Package Config",
    "expectedStatus": "PERMITTED",
    "actualStatus": "PERMITTED",
    "conflictDetected": true,
    "latencyMs": 0.24,
    "result": "PASSED"
  },
  {
    "fixtureId": "fix-05-direct-negative-rule-block",
    "name": "Direct Negative Standing Rule Block",
    "expectedStatus": "REQUIRES_AUTHORIZATION",
    "actualStatus": "REQUIRES_AUTHORIZATION",
    "conflictDetected": true,
    "latencyMs": 0.12,
    "result": "PASSED"
  },
  {
    "fixtureId": "fix-06-harmonious-conforming-action",
    "name": "Harmonious Conforming Action",
    "expectedStatus": "PERMITTED",
    "actualStatus": "PERMITTED",
    "conflictDetected": false,
    "latencyMs": 0.10,
    "result": "PASSED"
  }
]
```

---

## 5. Sample Output & Evidence Formatting

When resolving `fix-01-pkg-mgr-override`, the resolver produces:

```json
{
  "status": "PERMITTED_WITH_OVERRIDE",
  "intendedAction": {
    "id": "act-npm-install",
    "description": "Install dependency using npm",
    "category": "PACKAGE_MANAGER",
    "command": "npm install express"
  },
  "effectiveDecision": "PERMITTED_WITH_OVERRIDE",
  "governingDirective": {
    "id": "dir-pkg-src-human-prompt-1",
    "sourceId": "src-human-prompt",
    "sourceTier": "EXPLICIT_HUMAN",
    "sourceLocation": "Developer Prompt:L1",
    "category": "PACKAGE_MANAGER",
    "polarity": "REQUIRE",
    "statement": "Use npm to install express for a quick standalone test.",
    "precedence": 100
  },
  "overriddenDirectives": [
    {
      "id": "dir-pkg-src-agents-md-1",
      "sourceId": "src-agents-md",
      "sourceTier": "AGENT_RULES",
      "sourceLocation": "AGENTS.md:L1",
      "statement": "You MUST always use pnpm as the package manager for this repository.",
      "precedence": 60
    }
  ],
  "conflicts": [
    {
      "id": "conflict-contradiction-dir-pkg-src-agents-md-1-dir-pkg-src-human-prompt-1",
      "type": "CONTRADICTION",
      "category": "PACKAGE_MANAGER",
      "severity": "MEDIUM",
      "description": "Contradiction detected: [You MUST always use pnpm...] vs [Use npm to install express...]. Overridden by EXPLICIT_HUMAN",
      "evidence": [
        {
          "sourceId": "src-agents-md",
          "sourceTier": "AGENT_RULES",
          "path": "AGENTS.md",
          "snippet": "You MUST always use pnpm as the package manager for this repository.",
          "relevance": "Mandates [You MUST always use pnpm...]"
        },
        {
          "sourceId": "src-human-prompt",
          "sourceTier": "EXPLICIT_HUMAN",
          "path": "Developer Prompt",
          "snippet": "Use npm to install express for a quick standalone test.",
          "relevance": "Mandates [Use npm to install express...]"
        }
      ]
    }
  ],
  "evidenceTrail": [
    {
      "sourceId": "src-human-prompt",
      "sourceTier": "EXPLICIT_HUMAN",
      "path": "Developer Prompt",
      "snippet": "Use npm to install express for a quick standalone test.",
      "relevance": "Governing directive"
    }
  ],
  "explanation": "EFFECTIVE DIRECTIVE: [PERMITTED_WITH_OVERRIDE] for action: \"Install dependency using npm\".\nGoverned by authority tier [EXPLICIT_HUMAN] from [Developer Prompt:L1]: \"Use npm to install express for a quick standalone test.\".\nOverrides lower-standing directives from: [AGENT_RULES] AGENTS.md:L1.\nConflicts identified: [CONTRADICTION] Contradiction detected: [You MUST always use pnpm as the package manager for this repository.] vs [Use npm to install express for a quick standalone test.]. Overridden by EXPLICIT_HUMAN.\n",
  "isObjectiveTruthClaim": false,
  "generatedAt": "2026-08-27T09:32:00.000Z",
  "latencyMs": 1.33
}
```

---

## 6. Falsification Conditions & Next Steps

### What Would Falsify This Approach?
1. **Unanimous Natural Convergence**: If multi-agent teams naturally converge on identical interpretations without authority precedence graphs.
2. **Universal Human Interception**: If enterprises mandate that 100% of agent actions undergo synchronous human review, obviating automated standing resolution.
3. **Flat Instruction Spaces**: If project instructions can always be flattened into a single unambiguous prompt without hierarchy or override semantics.

### Recommended Next Steps
1. **Standing Diff CLI**: Package a lightweight CLI tool (`bridge standing-diff <action>`) that developers and CI checks can run locally in <10ms.
2. **AST Instruction Binding**: Extend source extraction to link AST patterns (e.g. ESLint rules, TypeScript strictness) directly to directive categories.
3. **Standing Change Receipts**: Generate lightweight cryptographic signatures over ratified standing changes when directives are created or updated.
