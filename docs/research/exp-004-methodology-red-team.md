# BRIDGE - EXP-004 METHODOLOGY RED TEAM

**Author:** Hermes Agent (Independent Red Team Reviewer)
**Date:** 2026-08-27
**Subject:** Attack the Effective Directive Resolver benchmark methodology before it becomes publishable evidence.

---

## CONTEXT

Antigravity reports:
- Created an Effective Directive Resolver
- 100% resolution accuracy on 6 internally constructed scenarios
- Treats these as internal engineering validation, not empirical proof

This review determines whether EXP-004 can become publishable evidence, and if so, under what conditions.

---

## 1. ATTACK: CIRCULAR BENCHMARK CONSTRUCTION

**The Problem:**

If the resolver was designed using assumptions about what the correct answer looks like, and the benchmark scenarios were then constructed to match those assumptions, the 100% accuracy is circular.

**How it happens:**

1. Resolver team designs resolution logic (e.g., "nearest-file wins," "specific overrides general," "hard gates beat soft requests").
2. Benchmark team constructs scenarios where those rules give the right answer.
3. Resolver achieves 100% on those scenarios.
4. The benchmark validates the resolver design, which was already the resolver's design assumption.

**How to break the circle:**

- Scenarios must be constructed by a **different team** than the resolver design team.
- Scenarios must include cases where the resolver's designed rules would give the **wrong** answer - to test whether the resolver detects and reports the conflict rather than forcing a resolution.
- The gold standard must be created **before** the resolver is run, by annotators who have not seen the resolver's output.

**Minimum protection:** Gold standard annotators must be blind to resolver output. Scenario authors must not be resolver designers.

---

## 2. ATTACK: GOLD-STANDARD BIAS

**The Problem:**

Who creates the gold standard? If the gold standard was created by the resolver team (or a team aligned with them), it encodes their assumptions about what "correct resolution" means.

**Example of gold-standard bias:**

Scenario: "Use double quotes for JSX attributes" (AGENTS.md) vs "Use single quotes for strings" (CLAUDE.md).

Gold standard created by resolver team says: "AGENTS.md wins - more specific rule."

But a reasonable alternative adjudication: "CLAUDE.md wins - it's the Claude-specific file, and the AGENTS.md rule is for a different tool. For Claude Code sessions, CLAUDE.md's quote rule is the operative one, even for JSX."

If the gold standard encodes one adjudication and penalizes the other, accuracy is artificially inflated.

**How to break the bias:**

- Gold standard must be created by **multiple independent adjudicators** with diverse perspectives.
- Disagreements between adjudicators must be **preserved and reported**, not collapsed into a single "correct" answer.
- The resolver should be evaluated on whether it **identifies the conflict** and **provides a defensible resolution rationale**, not just whether it picks the same answer as one gold-standard annotator.

---

## 3. ATTACK: PRECEDENCE-POLICY BIAS

**The Problem:**

The resolver presumably encodes specific precedence rules (e.g., "hard gate > soft request," "specific > general," "nearest file > root file"). If the benchmark scenarios are designed to test those specific rules, the resolver is being evaluated on whether it implements its own rules correctly - not on whether those rules are correct.

**Example:**

Resolver encodes: "CI constraint is always a hard gate."

Benchmark scenario: "CI requires tests. Human asks to skip tests."

Resolver correctly identifies CI as hard gate. 100% accuracy.

But what about: "CI constraint is a soft advisory, not a hard gate. Human override is legitimate for this specific exception."

If the resolver always treats CI as hard gate, it's wrong in cases where CI is advisory. The benchmark doesn't test this because all scenarios treat CI as hard gate.

**How to break the bias:**

- Scenarios must include **varying CI constraint types**: hard gate, advisory, team-specific override.
- Resolver must be able to **detect constraint type** from the source (e.g., branch protection = hard; CI advisory check = soft), not assume all CI is hard.
- Gold standard must include cases where CI is advisory, and the resolver should correctly identify the constraint type rather than hard-coding "CI = hard."

---

## 4. ATTACK: SCENARIO SELECTION BIAS

**The Problem:**

6 scenarios is a very small sample. If they were selected to be "clean" cases where the correct resolution is unambiguous, the resolver's accuracy is inflated relative to real-world usage.

**What's missing from 6 scenarios:**

- Contradictory instructions where both are legitimate (no clear winner)
- Ambiguous scope boundaries (which AGENTS.md applies to this file?)
- Temporal staleness (rule was correct when written, is now wrong)
- Cross-tool instruction files (CLAUDE.md vs AGENTS.md vs .cursorrules vs copilot-instructions.md)
- Multi-level monorepo hierarchies (3+ AGENTS.md levels)
- Instruction loss due to context caps (Codex 32KB)
- Agent non-compliance (instruction file exists but agent ignores it)
- Security vs feature conflict where security policy is not machine-readable
- Human authority questions (whose human request counts? lead dev vs intern?)
- CI constraint type ambiguity (hard gate vs advisory)

**How to break the bias:**

- Scenario set must include a **known proportion of ambiguous cases** - cases where even expert adjudicators disagree.
- Scenario set must include **unsolvable cases** - cases where no resolution is possible without additional information not available to the resolver.
- Scenario set must include **edge cases** from real developer experiences (GitHub discussions, Reddit, blog reports).

---

## 5. ATTACK: INSTRUCTION-VOLUME CONFOUNDING

**The Problem:**

Resolver accuracy may be confounded by instruction volume. If all 6 scenarios have short, clean instruction sets (one CLAUDE.md, one AGENTS.md, one issue), the resolver is being evaluated on easy cases.

Real-world usage involves:
- Multiple instruction files at multiple levels
- Long CLAUDE.md files (200+ lines) with many rules
- Multiple AGENTS.md files in a monorepo
- Context caps that drop instructions
- Stale rules mixed with current rules

**How to break the confounding:**

- Scenario set must include **instruction volume variation**: 2 files, 5 files, 10+ files, long files (200+ lines), short files.
- Resolver accuracy should be reported **stratified by instruction volume** - does accuracy degrade as volume increases?
- If accuracy drops with volume, the resolver is not robust to real-world usage.

---

## 6. ATTACK: MODEL-SPECIFIC EFFECTS

**The Problem:**

The resolver's accuracy may depend on which model is being used to generate the agent's instructions, which model is being used to create the gold standard, or which model is being used to evaluate the resolver's output.

**Example:**

- Resolver accuracy is measured against gold standard created by Claude 4.
- If gold standard creator has Claude 4 biases (e.g., "CLAUDE.md always wins"), gold standard encodes those biases.
- Resolver tested against gold standard. If resolver agrees with Claude 4 biases, accuracy is high. If resolver disagrees (e.g., "AGENTS.md wins for specific cases"), accuracy is lower - not because resolver is wrong, but because gold standard is biased.

**How to break the bias:**

- Gold standard must be created by **multiple models** or by **humans** (not a single model).
- If using model-based gold standard, report **model-specific accuracy** - does resolver accuracy vary by which model created the gold standard?
- If resolver accuracy is high only against Claude 4 gold standard but low against GPT-4 gold standard, the resolver is biased, not robust.

---

## 7. ATTACK: OPENCODE-SPECIFIC EFFECTS

**The Problem:**

The resolver's accuracy may be specific to Claude Code's instruction resolution behavior, not generalizable to OpenCode or other agents.

**Why this matters:**

- Claude Code concatenates instructions in a specific order (managed policy -> user -> project -> local).
- Codex merges AGENTS.md files with deepest-wins rule and 32KB cap.
- Copilot prioritizes personal > repo > org.
- OpenCode may have a different resolution order.

If the resolver is designed to output the effective directive **for Claude Code**, but the benchmark doesn't test whether the directive is correct for OpenCode, the resolver is Claude Code-specific, not agent-agnostic.

**How to break the bias:**

- Benchmark must include **multi-agent scenarios** - same instruction set, different agents (Claude Code, Codex, Copilot, OpenCode).
- Resolver output should be **agent-aware** - the effective directive depends on which agent is acting (because different agents resolve conflicts differently).
- If resolver always outputs the same directive regardless of agent, it's not agent-aware and may be wrong for some agents.

---

## 8. ATTACK: EVALUATOR LEAKAGE

**The Problem:**

If the resolver's output is evaluated by a model or human that has seen the resolver's design, training data, or prior outputs, the evaluation may be biased in favor of the resolver.

**Example:**

- Resolver team creates scenarios, runs resolver, sees output.
- Evaluator (same team) evaluates resolver output against gold standard.
- If resolver output is "close" to gold standard, evaluator may give credit for partial correctness.
- If resolver output is "different" from gold standard but defensible, evaluator may penalize it because they know the resolver's intended logic.

**How to break the leakage:**

- Evaluator must be **blind to resolver output** - evaluate gold standard first, then resolver output, without seeing resolver output during gold standard creation.
- Alternatively, use **automated evaluation** against a fixed gold standard that was created before resolver was run.
- If human evaluation, use **multiple blinded evaluators** and report inter-annotator agreement.

---

## 9. ATTACK: AMBIGUOUS AUTHORITY CASES

**The Problem:**

The resolver is designed to resolve conflicts - to pick a winner. But some cases have no clear winner. Forcing a resolution in ambiguous cases produces false positives (resolver picks a winner when it should report ambiguity).

**Example:**

"Developer A says use library X. Developer B says use library Y. Both are senior engineers. No organizational policy says whose preference wins."

Resolver picks one. Gold standard says resolver is wrong (no clear winner). But resolver was designed to pick a winner - it's doing what it was designed to do.

**The real test:** How often does the resolver correctly identify ambiguity and report it, rather than forcing a resolution?

**How to test:**

- Include scenarios with genuine ambiguity.
- Resolver should return **AMBIGUOUS** with explanation, not a forced resolution.
- Accuracy should be measured as: resolver correctly identifies ambiguity (true positive) + resolver correctly resolves unambiguous cases (true positive) + resolver incorrectly forces resolution on ambiguous cases (false positive) + resolver incorrectly reports ambiguity on unambiguous cases (false negative).

---

## 10. ATTACK: FALSE-POSITIVE VS FALSE-NEGATIVE ASYMMETRY

**The Problem:**

Resolver accuracy treats false positives and false negatives as equally bad. But they're not.

- **False positive:** Resolver says directive A governs, but directive B actually governs. Agent follows A, makes error. (Agent error caused by resolver.)
- **False negative:** Resolver says AMBIGUOUS, but directive A actually governs. Agent hesitates or asks human. (Agent inefficiency caused by resolver over-caution.)

**Which is worse?**

Depends on use case:
- For safety-critical actions (production deploy, security change), false positive is worse - agent makes dangerous error.
- For low-stakes actions (style, naming), false negative is worse - agent wastes time asking human.

**How to account for asymmetry:**

- Report **false positive rate** and **false negative rate** separately.
- Weight errors by **action severity** - safety-critical errors count more than style errors.
- Primary outcome should be **severity-weighted accuracy**, not raw accuracy.

---

## 11. ATTACK: SAFETY-CRITICAL VS LOW-STAKES ACTIONS

**The Problem:**

All 6 scenarios may be low-stakes (style, naming, code organization). If so, resolver accuracy on low-stakes cases doesn't generalize to high-stakes cases (security, compliance, production).

**Example:**

Scenario: "Use single vs double quotes." Resolver resolves correctly. 100% accuracy.

But scenario: "Security policy requires approval before production deploy. Human asks to skip approval." Resolver may not handle this correctly because it was designed for low-stakes style conflicts.

**How to test:**

- Scenario set must include **stratification by action severity**: style, naming, code organization, architecture, security, compliance, production.
- Resolver accuracy should be reported **stratified by severity**.
- If accuracy drops for high-severity cases, the resolver is not ready for production use.

---

## 12. ATTACK: BENCHMARK OVERFITTING

**The Problem:**

If the resolver was iteratively improved based on performance on these 6 scenarios, the 100% accuracy reflects overfitting to those specific scenarios, not generalizable resolution capability.

**How overfitting happens:**

1. Resolver v1 achieves 80% on 6 scenarios.
2. Team analyzes failures, adjusts resolver logic.
3. Resolver v2 achieves 90%.
4. Team analyzes failures, adjusts again.
5. Resolver v3 achieves 100%.
6. 100% reflects overfitting to the 6 scenarios, not generalizable capability.

**How to detect overfitting:**

- Hold out a **test set** that was not used during resolver development.
- Report **training accuracy** (on development scenarios) vs **test accuracy** (on held-out scenarios).
- If training accuracy >> test accuracy, overfitting is present.

---

## SUMMARY: TWELVE ATTACKS, ONE CONCLUSION

The 100% accuracy on 6 internally constructed scenarios is **consistent with multiple explanations**:

1. Resolver is genuinely excellent.
2. Resolver is overfitting to 6 scenarios designed by the same team.
3. Gold standard encodes resolver team's assumptions.
4. Scenarios are too clean (no ambiguity, no volume, no severity variation).
5. Resolver is Claude Code-specific, not agent-agnostic.
6. Evaluator is not blinded, introducing bias.

**None of these can be ruled out with the current methodology.**

---

## MINIMAL METHODOLOGY FOR PUBLISHABLE EVIDENCE

### How Many Scenarios Are Minimally Necessary?

**Minimum: 30 scenarios**, stratified across:

| Dimension | Levels |
|---|---|
| Instruction volume | 2 files, 5 files, 10+ files, long files (200+ lines) |
| Conflict type | Specificity, authority, scope, temporal, cross-tool, agent non-compliance |
| Action severity | Style, naming, code org, architecture, security, compliance, production |
| Ambiguity | Unambiguous (clear winner), ambiguous (genuine disagreement), unsolvable (missing info) |
| Agent | Claude Code, Codex, Copilot, OpenCode (multi-agent scenarios) |
| Constraint type | Hard gate, advisory, team-specific override |

**Why 30:** Small enough to construct with care, large enough to detect overfitting and report stratified accuracy. 6 is insufficient. 100+ is unnecessary for a first benchmark.

### How Should Gold Standards Be Created?

**Gold standard creation process:**

1. **Scenario authors** (different from resolver designers) write 30 scenarios with full context (all instruction sources, agent being used, action being taken).
2. **Multiple independent adjudicators** (3-5, diverse backgrounds: developer, security engineer, product manager, compliance) review each scenario and produce a gold standard resolution + ambiguity rating.
3. **Adjudicators are blind** to resolver output and resolver design.
4. **Inter-annotator agreement** is measured (Cohen's kappa or similar). If agreement is low (<0.6), scenarios are flagged as ambiguous.
5. **Gold standard is the adjudicator consensus** for unambiguous cases; for ambiguous cases, the gold standard is "AMBIGUOUS" with the range of defensible resolutions documented.

### Should There Be Multiple Independent Adjudicators?

**Yes.** This is essential.

- Single gold standard = single perspective = gold-standard bias.
- Multiple adjudicators = measure of genuine ambiguity.
- Disagreements are informative - they tell you which cases are genuinely ambiguous.

### How Should Disagreements Be Represented?

**Disagreements should be preserved and reported, not collapsed.**

For each scenario, report:
- Number of adjudicators who agreed with resolver's resolution.
- Number of adjudicators who disagreed.
- Range of defensible resolutions.
- Inter-annotator agreement score.

If resolver agrees with 3/5 adjudicators, that's different from 5/5 - report both.

### Should the Resolver Be Deterministic?

**Debatable.**

**Pro-deterministic:** Reproducible, debuggable, predictable. Same input -> same output.

**Anti-deterministic:** Real authority resolution is sometimes ambiguous. Forcing determinism in ambiguous cases produces false confidence.

**Recommendation:** Resolver should be **deterministic for unambiguous cases** (same input -> same output), but should return **AMBIGUOUS with probability distribution** for ambiguous cases. The probability distribution reflects the range of defensible resolutions, not a forced choice.

### When Should It Return AMBIGUOUS Instead of Choosing?

**When inter-annotator agreement is low** - if adjudicators disagree, the case is ambiguous, and the resolver should reflect that.

**When the resolver's confidence is below a threshold** - if the resolver's internal confidence (based on authority strength, specificity, recency, etc.) is below threshold, return AMBIGUOUS.

**When critical information is missing** - if the resolver needs information not available (e.g., constraint type unknown, authority source unknown), return AMBIGUOUS with "missing information: X."

**Threshold for AMBIGUOUS:** Should be set such that false-positive rate (forcing resolution when ambiguous) is acceptably low for the use case. For safety-critical actions, threshold should be low (return AMBIGUOUS more readily). For low-stakes actions, threshold can be higher (resolve more readily).

### What Should the Primary Outcome Be?

**Primary outcome: Severity-weighted resolution accuracy, with ambiguity detection as a secondary outcome.**

| Metric | Definition |
|---|---|
| **Severity-weighted accuracy** | Accuracy weighted by action severity (style = 1, security = 5, compliance = 5, production = 10). Weighted accuracy = sum(correct × severity) / sum(severity). |
| **Ambiguity detection rate** | Proportion of genuinely ambiguous cases where resolver correctly returns AMBIGUOUS. |
| **False-positive rate** | Proportion of ambiguous cases where resolver incorrectly forces a resolution. |
| **False-negative rate** | Proportion of unambiguous cases where resolver incorrectly returns AMBIGUOUS. |
| **Stratified accuracy** | Accuracy broken down by instruction volume, conflict type, action severity, agent. |

**Primary outcome should be severity-weighted accuracy** because it captures the real cost of errors - a resolution error on a production deploy is much worse than on a style choice.

### What Result Would Genuinely Support the Effective Directive Thesis?

**Support requires:**

1. **Severity-weighted accuracy >= 85%** on 30-stratum benchmark, with inter-annotator agreement >= 0.6.
2. **Ambiguity detection rate >= 70%** - resolver correctly identifies ambiguous cases at least 70% of the time.
3. **False-positive rate <= 15%** - resolver forces resolution on ambiguous cases <= 15% of the time.
4. **No significant accuracy degradation** with increasing instruction volume (accuracy on 2-file cases ≈ accuracy on 10+ file cases, within 10%).
5. **No significant agent-specific bias** - accuracy similar across Claude Code, Codex, Copilot, OpenCode scenarios.

**This would support the thesis:** The resolver computes effective directives accurately across a range of real-world conditions, correctly identifies ambiguity, and doesn't overfit to specific agents or instruction volumes.

### What Result Would Falsify the Thesis?

**Falsification requires:**

1. **Severity-weighted accuracy < 70%** - resolver makes too many errors to be useful.
2. **Ambiguity detection rate < 50%** - resolver misses most ambiguous cases, producing false confidence.
3. **Significant accuracy degradation with instruction volume** - accuracy drops > 20% from 2-file to 10+ file cases.
4. **Significant agent-specific bias** - accuracy varies > 20% across agents.
5. **Training accuracy >> test accuracy** - overfitting to development scenarios.

**This would falsify the thesis:** The resolver does not generalize beyond the specific conditions it was designed for, and is not ready for production use.

---

## STRONGEST LIVE COMPARISON DESIGN

### RAW vs HUMAN-RESOLVED vs BRIDGE-RESOLVED

**Purpose:** Isolate whether Bridge adds value because of more information, better information, conflict resolution, authority reasoning, or reduced context noise.

**Design:**

For each of 30 scenarios, run three conditions:

| Condition | What the agent sees | What the agent does |
|---|---|---|
| **RAW** | All instruction sources concatenated in prompt (as agent would normally see them) | Agent resolves conflicts itself, using its own concatenation-order logic |
| **HUMAN-RESOLVED** | All instruction sources + human-written effective directive (gold standard or adjudicator consensus) | Agent follows human-written directive |
| **BRIDGE-RESOLVED** | All instruction sources + Bridge-computed effective directive | Agent follows Bridge-computed directive |

**Outcome measures:**

1. **Agent error rate** - does the agent follow the effective directive? (measured by agent's actions vs directive)
2. **Directive correctness** - is the effective directive correct? (measured against gold standard)
3. ** agent compliance** - does the agent comply with the directive it's given? (RAW: does agent follow its own resolution? HUMAN: does agent follow human directive? BRIDGE: does agent follow Bridge directive?)

**Isolating the value sources:**

| Value source | How to isolate |
|---|---|
| **More information** | Compare RAW (agent sees all sources) vs HUMAN-RESOLVED (agent sees all sources + human directive). If HUMAN > RAW, human directive adds value beyond raw sources. |
| **Better information** | Compare HUMAN-RESOLVED vs BRIDGE-RESOLVED. If BRIDGE ≈ HUMAN, Bridge computes directive as well as human. If BRIDGE > HUMAN, Bridge finds something human missed. If BRIDGE < HUMAN, Bridge misses something human catches. |
| **Conflict resolution** | Compare RAW vs HUMAN-RESOLVED on ambiguous scenarios. If HUMAN > RAW on ambiguous cases, human resolution adds value. If RAW ≈ HUMAN on unambiguous cases, resolution doesn't add value when conflict is clear. |
| **Authority reasoning** | Compare scenarios where authority is clear (hard gate > soft request) vs ambiguous (two legitimate authorities). If BRIDGE ≈ HUMAN on clear authority but BRIDGE < HUMAN on ambiguous authority, Bridge's authority reasoning is weak. |
| **Reduced context noise** | Compare agent token usage and inference time across conditions. If BRIDGE uses fewer tokens than RAW (because Bridge filters irrelevant instructions), Bridge reduces noise. |

**Primary comparison:** BRIDGE-RESOLVED vs RAW.

- If BRIDGE > RAW: Bridge adds value beyond raw instruction concatenation.
- If BRIDGE ≈ RAW: Bridge doesn't add value (agent's own resolution is as good as Bridge's).
- If BRIDGE < RAW: Bridge is worse than raw (agent's own resolution is better).

**Secondary comparison:** BRIDGE-RESOLVED vs HUMAN-RESOLVED.

- If BRIDGE ≈ HUMAN: Bridge is as good as human resolution.
- If BRIDGE < HUMAN: Bridge misses something humans catch.
- If BRIDGE > HUMAN: Bridge finds something humans miss (unlikely, but possible if Bridge detects patterns humans don't).

---

## FINAL RECOMMENDATION: WHAT SHOULD EXP-004 BECOME?

### Option A: Next Major Experiment

**Pros:** Investigates the core thesis (effective directive computation). Potentially publishable. Addresses real developer pain.

**Cons:** Requires significant methodology work (30 scenarios, multiple adjudicators, blinding, stratification). Results may beambiguous if resolver is not yet robust. High effort for uncertain outcome.

### Option B: Sub-Experiment

**Pros:** Can be nested within EXP-002 or EXP-003. Lower standalone effort. Provides supplementary evidence.

**Cons:** May not get full attention. May be underpowered if nested experiment is large.

### Option C: Benchmark Only

**Pros:** Establishes a benchmark for future resolver versions. Enables comparison across resolver iterations. Does not require running agents - just computing directives and comparing to gold standard.

**Cons:** Doesn't test whether agents actually follow the resolved directive. Doesn't test whether resolved directive improves agent performance. Purely computational, not empirical.

### Option D: Abandon

**Pros:** Avoids publishing weak evidence. Prevents overclaiming.

**Cons:** Gives up on a potentially valuable research direction.

---

### Recommendation: EXP-004 should become a BENCHMARK FIRST, then a SUB-EXPERIMENT if the benchmark results are promising.

**Phase 1: Benchmark (no agent execution)**

1. Construct 30 scenarios with blinding, multiple adjudicators, stratification.
2. Run resolver on all 30 scenarios.
3. Compare resolver output to gold standard.
4. Report severity-weighted accuracy, ambiguity detection rate, false-positive rate, false-negative rate, stratified accuracy.
5. If severity-weighted accuracy >= 85% and ambiguity detection >= 70%: proceed to Phase 2.
6. If below thresholds: refine resolver, iterate benchmark, or abandon.

**Phase 2: Sub-Experiment (agent execution, nested in EXP-002 or EXP-003)**

1. Select 10 scenarios from benchmark (5 unambiguous, 3 ambiguous, 2 unsolvable).
2. Run RAW, HUMAN-RESOLVED, BRIDGE-RESOLVED conditions.
3. Measure agent error rate, directive correctness, agent compliance, token usage.
4. Report whether Bridge adds value beyond raw instruction concatenation.
5. If Bridge adds value: include as supplementary evidence in paper.
6. If Bridge doesn't add value: report as negative result; refine or abandon.

---

## WHAT CURRENT 100% ACCURACY ON 6 SCENARIOS TELLS US

**Nothing definitive.** It tells us the resolver works on 6 specific scenarios designed by the same team that designed the resolver. This is consistent with:

1. Resolver is excellent (possible but unproven).
2. Resolver is overfitting (likely, given small sample and circular construction).
3. Gold standard is biased (possible, given single-team construction).
4. Scenarios are too clean (likely, given 6 scenarios and no stratification).

**The next step is not to claim 100% accuracy as evidence.** The next step is to construct a proper benchmark that can distinguish between these explanations.

---

*End of EXP-004 methodology red team.*
