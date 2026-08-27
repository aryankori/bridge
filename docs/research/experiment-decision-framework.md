# BRIDGE — EXPERIMENT DECISION FRAMEWORK

**Author:** Hermes Agent (Independent Research Synthesizer)
**Date:** 2026-08-27
**Status:** Pre-EXP-001 execution — defines decision rules before seeing results

---

## 1. CURRENT THESIS

### Fact
- A2A standardizes agent communication (identity, discovery, tasks, lifecycle, streaming)
- SPIFFE standardizes workload identity and authentication
- Mem0/Honcho/Cognee provide persistent memory and retrieval
- Git owns code state; CI/CD owns verification; Jira/Linear owns work state

### Evidence
- A2A Specification v1.0, Section 1.2: "Opaque Execution" — agents don't share internal state
- SPIFFE Workload API: "explicitly does not include an authentication handshake"
- Singh (1996): "S-commitments play a similarly important role in coordinating and structuring multiagent systems"
- NIST AI RMF 1.0, Section 3: "Accountable and Transparent" is a characteristic of trustworthy AI

### Hypothesis
> A model-neutral commitment layer that binds agent-generated proposals to human-ratified, evidence-backed project state reduces contradictory agent output and rework compared with existing tools (CLAUDE.md + Git + CI/CD).

### Proposed Architecture
```
HUMAN / INSTITUTION
        │
   COMMITMENT LAYER (Bridge) ← proposed
        │
   AGENT EXECUTION (A2A/MCP)
        │
   EVIDENCE / RESULTS
        │
   VERIFICATION (CI/CD, tests)
        │
   DOMAIN SYSTEMS (Git, Jira, etc.)
```

---

## 2. WHAT EXP-001 TESTS

### Conditions
| Condition | Description |
|---|---|
| **A** | OpenCode alone (baseline) |
| **B** | OpenCode + raw Claude transcript (unstructured prior knowledge) |
| **C** | OpenCode + structured work transfer (ExperimentalWorkTransfer v0.2.0) |

### Hypotheses
| Hypothesis | What It Means |
|---|---|
| **H1** | Cross-agent prior knowledge is useful (B > A) |
| **H2** | Structured work-state is better than raw transcript (C > B) |
| **H3** | Structured transfer is worth its overhead (C > A, with cost justification) |

---

## 3. WHAT EXP-001 CANNOT TEST

| Concept | Why EXP-001 Can't Test It |
|---|---|
| **Persistent project intelligence** | Single-session experiment; no cross-session learning |
| **Commitment control** | No commitment lifecycle, no human ratification gate |
| **Accountability** | No audit trail, no responsibility attribution |
| **Organizational authority** | No concept of decision rights or authority chains |
| **Supersession** | No temporal dimension; no prior decisions to supersede |
| **Reconciliation** | No contradictions to detect or resolve |

**Implication:** EXP-001 is a *necessary but insufficient* experiment. It validates work-state transfer (T2) but cannot validate the broader commitment-control thesis (T6). Even a perfect EXP-001 result only justifies EXP-002.

---

## 4. RESULT INTERPRETATION MATRIX

### Outcome 1: C > B > A
| Aspect | Interpretation |
|---|---|
| **Meaning** | Structured transfer is best; prior knowledge helps |
| **H1 support** | ✅ Strong |
| **H2 support** | ✅ Strong |
| **H3 support** | ✅ Strong |
| **Next experiment** | EXP-002 (persistent intelligence) |
| **Bridge continues?** | ✅ Yes — work-state transfer is validated |

### Outcome 2: C ≈ B > A
| Aspect | Interpretation |
|---|---|
| **Meaning** | Prior knowledge helps, but structure adds no value |
| **H1 support** | ✅ Strong |
| **H2 support** | ❌ Rejected |
| **H3 support** | ❌ Rejected — overhead not justified |
| **Next experiment** | Redesign transfer schema; test with different tasks |
| **Bridge continues?** | ⚠️ Conditional — only if schema can be improved |

### Outcome 3: B > A and B ≈ C
| Aspect | Interpretation |
|---|---|
| **Meaning** | Raw transcript is as good as structured transfer |
| **H1 support** | ✅ Strong |
| **H2 support** | ❌ Rejected |
| **H3 support** | ❌ Rejected — structure is waste |
| **Next experiment** | Abandon structured transfer; focus on memory/intelligence |
| **Bridge continues?** | ⚠️ Pivot to T4 (Project Intelligence) |

### Outcome 4: A > B ≈ C
| Aspect | Interpretation |
|---|---|
| **Meaning** | Prior knowledge actually hurts performance |
| **H1 support** | ❌ Rejected — noise exceeds signal |
| **H2 support** | ❌ Rejected |
| **H3 support** | ❌ Rejected |
| **Next experiment** | Diagnose why (transcript quality? task mismatch?) |
| **Bridge continues?** | ❌ Likely kill T2; consider T8 (no additional layer needed) |

### Outcome 5: A ≈ B ≈ C
| Aspect | Interpretation |
|---|---|
| **Meaning** | No detectable effect of prior knowledge or structure |
| **H1 support** | ❌ Rejected |
| **H2 support** | ❌ Rejected |
| **H3 support** | ❌ Rejected |
| **Next experiment** | A > B ≈ C — diagnose task design; consider T8 |
| **Bridge continues?** | ❌ Strong evidence for T8 |

### Outcome 6: C < B
| Aspect | Interpretation |
|---|---|
| **Meaning** | Structure actively harms performance |
| **H1 support** | ⚠️ Weak (B might still > A) |
| **H2 support** | ❌ Rejected — structure is harmful |
| **H3 support** | ❌ Rejected |
| **Next experiment** | Diagnose: is schema misleading? Are diagnostics wrong? |
| **Bridge continues?** | ❌ Strong evidence against T2 |

---

## 5. EXP-002 GATE

### Minimum Evidence from EXP-001 to Justify EXP-002

EXP-002 is justified if and only if:

1. **C > A** (structured transfer beats baseline) — minimum 20% improvement in test pass rate
2. **OR B > A** (raw transcript beats baseline) — minimum 20% improvement
3. **AND** the effect is consistent across at least 2 of 3 trials

### If EXP-001 Fails (A ≈ B ≈ C)
- **Do NOT proceed to EXP-002**
- **Instead:** Reconsider the thesis. Evidence supports T8 (no additional layer needed).

### If EXP-001 Succeeds (C > B > A)
- **Proceed to EXP-002** with commitment-aware condition added:
  - Condition D: OpenCode + commitment context (active commitments with evidence status)

---

## 6. COMMITMENT-CONTROL EXPERIMENT

### Hypothesis
> Governing proposals, authorization, verification, and acceptance reduces contradictory or unauthorized agent actions.

### Smallest Realistic Experiment

**Design:** 2 conditions × 3 trials

| Condition | Description |
|---|---|
| **Control** | Agent receives task prompt + CLAUDE.md + Git history |
| **Commitment** | Agent receives task prompt + Bridge Commitment Context (active commitments with evidence status) |

**Task:** Modify code that was previously the subject of a deliberate architectural decision (e.g., "Add a new API endpoint" where the project has an active commitment to "Use RESTful resource naming conventions").

**Metrics:**
| Metric | How Measured |
|---|---|
| Contradictory output | Binary: does the agent violate the prior decision? |
| Rework | Count of human corrections needed |
| Time to first useful output | Seconds from prompt to first code change |
| Human interventions | Count of human corrections |

**Success Criteria:**
- Contradictory output reduced by ≥50%
- Rework reduced by ≥25%
- No significant increase in time to first useful output

**Failure Criteria:**
- No significant difference between conditions
- Commitment condition performs worse (commitments mislead the agent)

---

## 7. PRODUCT BOUNDARY

### Bridge Should OWN
- Commitment lifecycle (proposed → decided → implemented → verified → superseded)
- Human ratification gates
- Contradiction detection between agent claims and verified state
- Evidence binding (linking claims to Git commits, test results, file refs)
- Temporal reasoning (staleness, supersession)

### Bridge Should CONSUME
- A2A (agent communication)
- MCP (agent-to-tool communication)
- SPIFFE (workload identity)
- Git (code state)
- CI/CD (verification)
- Jira/Linear (work state)
- Honcho/Mem0/Cognee (memory, if needed)

### Bridge Should OBSERVE
- Agent outputs (transcripts, artifacts)
- Git commits and diffs
- Test results
- Human decisions (ratifications, rejections)

### Bridge Should NEVER REBUILD
- Agent communication (A2A)
- Code version control (Git)
- Test execution (CI/CD)
- Work tracking (Jira/Linear)
- Memory storage (Mem0/Honcho/Cognee)
- Identity (SPIFFE)

---

## 8. FINAL NOVELTY CHECK

### Targeted Literature Search Results

| Search Term | Findings | Implication |
|---|---|---|
| **Commitment reconciliation** | No existing system implements this for AI agents | ✅ Novel |
| **Agent authorization** | IAM/OIDC/SPIFFE own technical authorization; semantic authority is open | ⚠️ Partially novel |
| **Agent acceptance** | No existing system has human ratification gates for agent output | ✅ Novel |
| **Agent governance state** | NIST requires it; no system implements it | ✅ Novel |
| **Proposal → approval → execution** | Workflow engines exist; but not for AI agent proposals | ⚠️ Partially novel |
| **Cross-agent project state** | No existing system maintains state across heterogeneous agents | ✅ Novel |
| **Institutional agent memory** | Honcho/Mem0/Cognee store memory; don't reconcile it | ✅ Novel |
| **Authoritative AI project state** | No existing system claims this | ✅ Novel (but risky claim) |

### Novelty Classification

**Bridge's contribution should be phrased as:** **new synthesis**

- **Not a new system** (components exist)
- **Not a new abstraction** (commitment theory exists)
- **Not a new empirical finding** (EXP-001/002 will produce this)
- **Not a new experiment** (experiments test hypotheses)
- **A new synthesis:** Combining commitment theory + A2A + Git + CI/CD into a unified commitment layer for AI-assisted software development

**This is the weakest defensible novelty claim.** It acknowledges prior work while positioning Bridge as the integration layer.

---

## 9. PAPER DECISION TREE

### If EXP-001 is Positive (C > B > A)
**Paper thesis:** "Structured work-state transfer between heterogeneous AI agents improves task completion: an empirical study"

**Contribution:** Empirical evidence that structured transfer (ExperimentalWorkTransfer v0.2.0) outperforms raw transcripts and baseline.

**Venue:** ICSE / ASE / RAISE

### If EXP-001 is Negative (A ≈ B ≈ C)
**Paper thesis:** "When does prior knowledge help? Boundary conditions for cross-agent context transfer"

**Contribution:** Empirical evidence that prior knowledge (structured or unstructured) does not always help, with analysis of when it hurts.

**Venue:** ICSE / AAMAS

### If EXP-001 is Inconclusive (mixed results)
**Paper thesis:** "Measuring the effect of structured work transfer: lessons from a pilot study"

**Contribution:** Methodological contribution — how to design agent transfer experiments, what metrics matter, what confounds arise.

**Venue:** RAISE / arXiv

---

## FINAL QUESTIONS

### 1. What result from EXP-001 would be genuinely exciting?
**C > B > A with ≥30% improvement** — this would strongly validate structured transfer and justify EXP-002.

### 2. What result would seriously weaken Bridge?
**A > B ≈ C** — prior knowledge actually hurts, suggesting agents are better off without cross-agent context.

### 3. What result would kill the current work-transfer thesis?
**A ≈ B ≈ C** — no detectable effect of any prior knowledge, suggesting the entire work-transfer approach is misguided.

### 4. What evidence would justify EXP-002?
**C > A with ≥20% improvement** — minimum evidence that structured transfer works.

### 5. What evidence would justify building a commitment engine?
**EXP-002 shows ≥50% reduction in contradictory output** — evidence that commitment context actually changes agent behavior.

### 6. What evidence would justify abandoning Bridge entirely?
**EXP-001 shows A ≈ B ≈ C AND EXP-002 shows no effect** — two consecutive experiments showing no value from cross-agent context.

---

## SUMMARY

| Decision | Rule |
|---|---|
| **Proceed to EXP-002** | If C > A or B > A by ≥20% |
| **Kill T2 (work-transfer)** | If A ≈ B ≈ C |
| **Pivot to T4 (intelligence)** | If B > A but C ≈ B |
| **Build commitment engine** | If EXP-002 shows ≥50% contradiction reduction |
| **Abandon Bridge** | If EXP-001 and EXP-002 both show no effect |

---

*End of experiment decision framework.*
