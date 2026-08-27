# BRIDGE — Experiment Roadmap: EXP-006, EXP-007, EXP-008

**Status:** Research analysis
**Date:** 2026-08-27
**Scope:** Map every surviving product hypothesis to an experiment. Only design experiments that resolve a major uncertainty. For each: question, control, treatment, primary metric, falsification criteria, why it matters.

---

## CURRENT EXPERIMENT STATUS

| Experiment | Status | Question | What It Proves |
|---|---|---|---|
| **EXP-001** | Completed | Does structured work transfer improve cross-agent productivity? | Work transfer has value (if positive) |
| **EXP-004** | Completed | Can a deterministic resolver correctly identify effective directives? | Resolver works at the computation level (76% accuracy, 0% false allow) |
| **EXP-005** | Running | Does effective directive resolution improve live agent behavior vs. raw instructions? | Resolver improves agent outcomes (if positive) — this is the critical test |

**The critical path:** EXP-005 results determine everything. If positive, the resolver is proven to improve agent behavior. If negative, the resolver may be a solution to a problem that doesn't matter (agents either don't need resolution, or resolution doesn't change behavior).

**No experiment should be designed until EXP-005 results are in.** The design of EXP-006, EXP-007, EXP-008 depends on what EXP-005 proves.

---

## EXP-006 (CONDITIONAL ON EXP-005 POSITIVE)

**Question:** Does the resolver's improvement come from the directive content or from the presence of any structured guidance?

**Control:** Condition A (RAW) — no directive
**Treatment 1:** Condition C (BRIDGE) — resolver directive with citations
**Treatment 2:** Condition D (PLACEBO) — generic structured directive without resolution ("Follow the most recent instruction source for this task. Check timestamps.")
**Treatment 3:** Condition E (HUMAN-STRUCTURED) — human-written directive in the same format as Bridge, but without resolver involvement

**Primary metric:** Correct action rate, instruction violation rate, false allow rate — same as EXP-005

**Falsification criteria:**
- If Treatment 2 (PLACEBO) performs as well as Treatment 1 (BRIDGE), the resolver's specific resolution is not the source of improvement — any structured guidance works. This weakens the resolver's differentiation.
- If Treatment 3 (HUMAN-STRUCTURED) performs as well as Treatment 1 (BRIDGE), the resolver matches human-structured guidance but doesn't exceed it. This is acceptable — it means the resolver is as good as a human at structuring guidance.

**Why it matters:** EXP-005 shows that Bridge > RAW. But it doesn't isolate WHY. Is it the resolution (the specific directive)? Is it the format (structured, citation-backed)? Is it the presence of ANY guidance? This experiment isolates the mechanism. If the mechanism is "any structure helps," the resolver's specific resolution logic is less valuable than its format.

**Design constraint:** Use the same 10 EXP-005 scenarios. Same model. Same randomization. Same replication. Add 2 new conditions → 10 × 5 × 2 = 100 trials. Feasible.

**When to run:** After EXP-005 completes and shows positive result. Before scaling to more scenarios or publishing.

---

## EXP-007 (CONDITIONAL ON EXP-005 POSITIVE AND EXP-006 COMPLETED)

**Question:** Does standing computation generalize across more scenarios, more conflict types, and more instruction source categories?

**Control:** EXP-004 benchmark (40 scenarios, 76% accuracy, 0% false allow)
**Treatment:** Expanded benchmark — add scenarios that test:
- More instruction source types (IDE settings, Copilot instructions, CI configuration files, branch protection rules, PR descriptions, CODEOWNERS, CONTRIBUTING.md, STYLE.md)
- More conflict types (temporal conflicts where both sources are current but disagree, scope conflicts where sources apply to different parts of the action, multi-hop conflicts where A overrides B and B overrides C)
- More action types (not just code changes — configuration changes, documentation changes, dependency updates, refactoring, test writing, CI configuration)
- Real repositories (not synthetic fixtures — use actual open-source repos with real instruction conflicts)

**Primary metric:** Exact resolution accuracy, conflict detection F1, false allow rate, false block rate, citation recall — same as EXP-004

**Falsification criteria:**
- If accuracy drops below 65% on the expanded set, the resolver's current authority framework doesn't generalize. The tier structure needs expansion.
- If false allow rate > 0 on any scenario, the resolver's safety guarantees don't generalize. The anomaly detectors need expansion.
- If citation recall drops below 75%, the resolver's explainability doesn't generalize.

**Why it matters:** EXP-004 and EXP-005 use 10-40 carefully constructed scenarios. Real projects have more instruction source types and more complex conflicts. This experiment tests whether the resolver's current framework is sufficient for real-world diversity or needs expansion.

**Design constraint:** Expand from 40 to 80-100 scenarios. Maintain the blind benchmark design (scenario authors, adjudicators, and execution runner are separate). Use both synthetic and real-repo scenarios.

**When to run:** After EXP-006 completes and confirms the resolver's mechanism. Before claiming the resolver generalizes beyond the pilot scenarios.

---

## EXP-008 (CONDITIONAL ON EXP-005 POSITIVE, EXP-006, AND EXP-007)

**Question:** Does standing computation improve outcomes when used by real developers on real projects over an extended period?

**Control:** Projects using agents without Bridge (agent runs with raw instructions + developer judgment)
**Treatment:** Projects using agents with Bridge (agent runs with Bridge-resolved directives + standing records)

**Primary metrics:**
- Agent error rate (instructions violated, incorrect actions taken)
- Time to correct action (how long to resolve conflicts without vs. with Bridge)
- Developer satisfaction (survey: do you feel more confident about agent actions?)
- Standing record utility (how often are standing records consulted? cited? useful?)

**Falsification criteria:**
- If error rates are not statistically different between control and treatment, Bridge adds no behavioral value in real use.
- If developers don't consult standing records, the records are not useful.
- If developers don't adopt Bridge workflow, the wedge is not compelling.

**Why it matters:** Lab experiments (EXP-004, EXP-005, EXP-006, EXP-007) test the resolver in controlled conditions. Real-world use tests whether the resolver fits into actual developer workflows, whether developers trust it, whether it survives contact with real project complexity, and whether it provides value over an extended period.

**Design constraint:** 5-10 real projects, 2-4 weeks each, with developer surveys, error logs, and standing record usage metrics. This is a field study, not a lab experiment.

**When to run:** After EXP-007 confirms generalization. Before claiming Bridge is ready for production use.

---

## EXPERIMENT DECISION TREE

```
IF EXP-005 POSITIVE (Bridge improves agent behavior):
  │
  ├─ Run EXP-006 (mechanism isolation)
  │   │
  │   ├─ IF PLACEBO ≈ BRIDGE: Mechanism is "structure helps," not "resolution helps"
  │   │   └─ Pivot: Invest in format and structure, not resolution logic
  │   │
  │   └─ IF BRIDGE > PLACEBO: Mechanism is resolution-specific
  │       └─ Continue to EXP-007
  │
  ├─ Run EXP-007 (generalization)
  │   │
  │   ├─ IF accuracy drops < 65%: Authority framework needs expansion
  │   │   └─ Invest in expanding tiers, detectors, source types
  │   │
  │   └─ IF accuracy holds ≥ 70%: Resolver generalizes
  │       └─ Continue to EXP-008
  │
  └─ Run EXP-008 (real-world field study)
      │
      ├─ IF no behavioral difference: Bridge doesn't fit real workflows
      │   └─ Investigate adoption barriers, workflow integration
      │
      └─ IF positive: Bridge is ready for production use
          └─ Proceed to productization and publication

IF EXP-005 NEGATIVE (Bridge does not improve agent behavior):
  │
  ├─ Investigate why:
  │   ├─ Did agents ignore the directive? → Agent behavior problem
  │   ├─ Was the directive wrong? → Resolver accuracy problem
  │   ├─ Was the directive right but agent followed it and still failed? → Directive insufficient problem
  │   └─ Was the RAW baseline already good? → Resolution not needed problem
  │
  ├─ IF agents ignored directive: Stop. Bridge's core thesis (agents benefit from resolution) is falsified.
  │
  ├─ IF directive was wrong: Improve resolver. Re-run EXP-005 with improved resolver.
  │
  ├─ IF directive right but agent still failed: Resolution helps but is insufficient.
  │   └─ Bridge needs additional interventions (not just directives)
  │
  └─ IF RAW baseline already good: Agents don't need resolution for these scenarios.
      └─ Bridge's developer wedge is not compelling. Pivot to enterprise/compliance niche.
```

---

## HARDER TO JUSTIFY EXPERIMENTS (DO NOT RUN WITHOUT STRONGER RATIONALE)

### EXP-009: Cross-Agent Standing Consistency (defer)

**Question:** Does a shared standing layer improve consistency across multiple agents?

**Why defer:** This requires multi-agent setup, which is more complex. It's a natural follow-on after EXP-008 proves single-agent value. Running it before EXP-008 is putting the cart before the horse.

### EXP-010: Standing Records as Precedent (defer)

**Question:** Do past standing records improve future standing determinations?

**Why defer:** This tests the accumulation thesis. It requires a project with existing standing records. It's a long-term study, not a short experiment. Worth running after Bridge has been used by real projects for a while.

### EXP-011: Authority Framework Transfer (defer)

**Question:** Can a project's authority framework be transferred to a similar project and produce good standing?

**Why defer:** This tests the generality of authority frameworks. It's a niche question that matters for platform scalability but not for initial validation.

---

*End of experiment roadmap.*
