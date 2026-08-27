# BRIDGE — Paper Strategy: The Smallest Coherent Contribution

**Status:** Research analysis
**Date:** 2026-08-27
**Scope:** Determine what the final academic paper should actually contribute. Choose the smallest scientifically coherent contribution. Do not create a kitchen-sink paper.

---

## 1. CANDIDATE PAPER CONTRIBUTIONS

### Option A: Empirical Study of Work Transfer (EXP-001)

**Contribution:** Evidence that structured work transfer between coding agents improves productivity / reduces errors / reduces context re-establishment time.

**Strengths:**
- Concrete empirical result
- Directly addresses a real pain point
- Transfer is a recognized problem (cross-audit confirmed)

**Weaknesses:**
- Transfer is a means to an end, not the end itself
- The paper would be about a feature, not a category
- Doesn't connect to the broader standing/authority thesis

**Verdict:** Useful as a component paper, but not the flagship contribution. If EXP-001 is positive, it's a solid empirical paper, but it doesn't establish Bridge as a category.

---

### Option B: Benchmark of Instruction Conflict Resolution (EXP-004)

**Contribution:** A benchmark of deterministic instruction conflict resolution with 40 scenarios, 76% accuracy, 0% false allow, citation-backed output.

**Strengths:**
- Concrete benchmark with quantitative results
- Benchmark format is standard for CS papers
- Demonstrates resolver works at computation level

**Weaknesses:**
- 76% accuracy is "honest baseline" — not groundbreaking
- Benchmark alone doesn't prove the resolver improves agent behavior
- Doesn't connect to the broader institutional state thesis

**Verdict:** Solid benchmark paper. Useful as a methods paper. But it doesn't establish the broader thesis that Bridge matters for agent behavior or institutional state.

---

### Option C: Framework for Effective Directives (EXP-004 + EXP-005)

**Contribution:** A framework for computing effective directives from conflicting instruction sources, with deterministic resolution, citation-backed output, and agent behavior validation.

**Strengths:**
- Connects computation (resolver) to behavior (agent outcomes)
- Framework format is standard for CS papers
- Addresses a recognized problem (instruction hierarchy, conflict resolution)

**Weaknesses:**
- "Effective directive" is a narrow framing — may not generalize
- The paper would be about a feature (resolution), not a platform
- Doesn't capture the institutional state vision

**Verdict:** Strong candidate for the flagship paper IF EXP-005 is positive. It combines the benchmark (EXP-004) with the behavioral validation (EXP-005) into a coherent framework paper.

---

### Option D: Framework for Agent Authority (Standing)

**Contribution:** A framework for computing agent authority standing — which instruction source governs which action, with what authority, under what conditions — with deterministic evaluation, project-specific authority configuration, and standing records as institutional memory.

**Strengths:**
- Broader than "effective directive" — captures the standing concept
- Connects to authority, delegation, precedence literature
- Opens the door to institutional state platform vision
- More defensible as a category contribution

**Weaknesses:**
- Standing is less tested than effective directive (EXP-005 tests directive, not standing explicitly)
- The paper would be ahead of the experimental evidence (standing is the vision, not the proven result)
- Risk of being too abstract if the behavioral evidence is narrow

**Verdict:** Strong candidate for a SECOND paper (after the effective directive paper). The standing framework is the theoretical contribution that generalizes beyond the directive wedge. It should be grounded in the directive results, not stand alone.

---

### Option E: Cross-Agent Project State (EXP-001 + EXP-004 + EXP-005)

**Contribution:** A comprehensive framework for cross-agent project state — interoperability, transfer, memory, intelligence, reconciliation, commitment, authority, standing — showing how these layers combine to enable coherent multi-agent development.

**Strengths:**
- Ambitious, comprehensive
- Connects all the Bridge research threads

**Weaknesses:**
- Kitchen-sink paper — tries to do too much
- The layers are at different maturity levels (transfer proven? resolver proven? standing unproven?)
- Hard to tell a coherent story when some layers are experimental and others are visionary

**Verdict:** AVOID. This is the kitchen-sink paper the mission instructions explicitly warn against. Wait until multiple layers are proven before attempting a comprehensive paper.

---

### Option F: Computational Institutional State (Papers D + C combined over time)

**Contribution:** A framework for computing institutional state — the claims, authority, decisions, standing, and accepted state of an organization — in a form that any agent or actor can query and use.

**Strengths:**
- Ambitious and novel
- Connects to institutional knowledge, decision rights, governance literature
- Could be the definitive Bridge paper if the platform vision materializes

**Weaknesses:**
- Highly speculative at this point
- Requires substantial experimental evidence across multiple layers
- May be too early for a paper (needs more proof points)

**Verdict:** This is the LONG-TERM paper. It's the paper Bridge would write if the platform vision succeeds. But it's not the next paper. The next paper should be narrower.

---

## 2. RECOMMENDED PAPER STRATEGY

### Paper 1 (Next, if EXP-005 positive): "Effective Directives for AI Coding Agents"

**Contribution:** A deterministic framework for computing effective directives from conflicting instruction sources, validated by blind benchmark (40 scenarios, 76% accuracy, 0% false allow) and live agent experiment (RAW vs HUMAN vs BRIDGE conditions).

**Structure:**
1. Problem: Conflicting instruction sources in AI coding agent workflows
2. Framework: Authority tiers, conflict detection, resolution, citation-backed output
3. Benchmark: EXP-004 results (40 scenarios, blind, 76% accuracy, 0% false allow)
4. Behavioral validation: EXP-005 results (RAW vs HUMAN vs BRIDGE, 60 trials)
5. Discussion: Limitations, future work, connection to standing and institutional state

**Why this paper:** It's the smallest coherent contribution that demonstrates Bridge's value. It connects the computation (resolver) to the behavior (agent outcomes). It's empirically grounded. It leaves the door open for the standing/institutional state paper later.

**Target venues:** ICSE (International Conference on Software Engineering), FSE (Foundations of Software Engineering), ASE (Automated Software Engineering), or a reputable AI/agents venue (if the behavioral results are strong).

---

### Paper 2 (Next-next, after EXP-006/007): "Standing and Authority for AI Agents"

**Contribution:** A framework for computing agent authority standing — which instruction source governs which action, under what conditions — with project-specific authority configuration, standing records as institutional memory, and precedent reasoning.

**Structure:**
1. Problem: Authority is not static; standing is action-specific and temporal
2. Framework: Standing computation from claims, authority graph, temporal context
3. Evidence: EXP-006 mechanism isolation, EXP-007 generalization
4. Standing records: Precedent, audit, institutional memory
5. Discussion: Connection to institutional state, decision rights, governance

**Why this paper:** It generalizes from "effective directive" (one action at a time) to "standing" (all actions, all context, all time). It establishes standing as a concept distinct from static authority or dynamic policy. It sets up the institutional state platform vision.

**Target venues:** Same as Paper 1, or a governance/policy venue if the standing contribution is more theoretical.

---

### Paper 3 (Long-term, if platform vision materializes): "Computational Institutional State"

**Contribution:** A comprehensive framework for computing institutional state — claims, authority, decisions, standing, precedent, accepted state — as a queryable, interoperable layer for any actor in an organization.

**Structure:**
1. Problem: Organizations have fragmented state; no systematic way to compute what is effective
2. Framework: All six layers (claims, authority, resolution, records, precedent, query)
3. Evidence: Multiple experiments, real-world deployments, case studies
4. Platform: How the framework operates as infrastructure
5. Discussion: Implications for agent coordination, governance, compliance, interoperability

**Why this paper:** It's the definitive Bridge paper. It establishes institutional state as a category. It's the culmination of the research program.

**Target venues:** Top-tier CS venues (ICSE, FSE, OOPSLA, or a cross-disciplinary venue if the institutional state contribution is broad).

---

## 3. WHAT THE PAPER MUST NOT BE

1. **A product pitch.** Papers are about contributions to knowledge, not product promotion. Bridge's paper should present the framework, the evidence, and the limitations — not "Bridge is a great product."

2. **A kitchen sink.** One coherent contribution per paper. Don't try to cover transfer, memory, reconciliation, commitment, authority, directive, and standing in one paper.

3. **Overclaiming.** 76% accuracy is not 99%. It's honest and defensible. The paper should be clear about limitations. A skeptical reviewer will check the claims against the evidence.

4. **Premature.** Don't write a paper about standing or institutional state before the evidence supports it. Paper 1 should be about what EXP-004 and EXP-005 demonstrate. Paper 2 can be about what EXP-006/007 generalize. Paper 3 can be about what the platform proves over time.

---

## 4. THE MINIMAL COHERENT CONTRIBUTION

**If I had to write ONE paper today (assuming EXP-004 complete, EXP-005 pending):**

"Effective Directives for Resolving Conflicting Instructions in AI Coding Agent Workflows"

This paper contributes:
1. A formalization of the instruction conflict problem in AI coding agent workflows
2. A deterministic framework for resolving conflicts through authority evaluation, with citation-backed output
3. A blind benchmark demonstrating 76% accuracy with 0% false allow on 40 scenarios
4. A live agent experiment design (EXP-005) — methodology only, results pending

This is the smallest coherent contribution. It establishes the problem, the framework, the benchmark, and the live validation design. If EXP-005 is positive, add the behavioral results. If EXP-005 is negative, report the negative result honestly and discuss implications.

---

*End of paper strategy.*
