# BRIDGE - Decision Tree: IF/THEN Strategy

**Status:** Research analysis
**Date:** 2026-08-27
**Scope:** Construct the complete strategy for every outcome branch. For each branch, specify next research, next product, next paper, next business action.

---

## 1. EXP-001 OUTCOME BRANCHES

### IF EXP-001 POSITIVE (structured work transfer improves outcomes)

| Dimension | Action |
|---|---|
| **Next Research** | Analyze transfer quality: what transfers well, what transfers poorly, what limits transfer value. Publish transfer taxonomy. |
| **Next Product** | Add transfer as a Bridge feature (not the main product). Transfer-cli: extract context from agent A, format for agent B, inject. |
| **Next Paper** | Component paper: "Structured Work Transfer for Multi-Agent Development" - empirical results from EXP-001. |
| **Next Business Action** | Validate transfer as a feature, not the wedge. The wedge remains standing computation. Transfer is a complement. |

### IF EXP-001 NEGATIVE (work transfer does not improve outcomes)

| Dimension | Action |
|---|---|
| **Next Research** | Investigate why transfer didn't help: was the transfer format wrong? Did agents not use the transferred context? Was the pain not real? |
| **Next Product** | Defer transfer. Do not invest in transfer as a product feature until the pain is validated. |
| **Next Paper** | No transfer paper. Do not publish negative results unless they inform the standing thesis. |
| **Next Business Action** | Drop transfer from the product roadmap. Focus on standing computation. Transfer was a hypothesis; the data rejected it. |

---

## 2. EXP-004 OUTCOME (KNOWN - COMPLETED)

**Results:** 76% exact resolution accuracy, 76.9% conflict detection F1, 0% false allow, 8% false block, 88% citation recall on 25 held-out scenarios.

**Assessment:** The resolver works at the computation level. It's not perfect (76% is honest baseline, not 99%), but it's safe (0% false allow) and explainable (88% citation recall).

### IF RESOLVER ACCURACY REMAINS ~75% (does not improve significantly)

| Dimension | Action |
|---|---|
| **Next Research** | Characterize the 24% of failures: what types of conflicts does the resolver miss? Are they addressable with better anomaly detectors, more tiers, or different authority rules? |
| **Next Product** | Ship the resolver at 75% accuracy with honesty about limitations. "75% accurate, 0% false allow, 25% of conflicts need human review." This is a feature, not a bug - honest accuracy builds trust. |
| **Next Paper** | Paper 1 (Effective Directives) reports 75% accuracy honestly. The paper's contribution is the framework + safety guarantee + explainability, not superhuman accuracy. |
| **Next Business Action** | Position as "resolver with safety guarantee." 75% accuracy with 0% false allow is valuable for compliance and cautious agent deployment. Don't overclaim. |

### IF RESOLVER ACCURACY IMPROVES SIGNIFICANTLY (>90%)

| Dimension | Action |
|---|---|
| **Next Research** | Analyze what changed: better detectors, more tiers, better temporal reasoning, better scope handling? Extract generalizable lessons. |
| **Next Product** | Ship improved resolver. Accuracy improvement strengthens the wedge and the moat. |
| **Next Paper** | Paper 1 reports improved accuracy. Stronger empirical results strengthen the paper. |
| **Next Business Action** | Improve resolver before scaling to more scenarios or customers. Accuracy matters for trust. |

---

## 3. EXP-005 OUTCOME BRANCHES (CRITICAL)

### IF EXP-005 POSITIVE (BRIDGE improves agent behavior vs RAW)

**Sub-condition A: BRIDGE > RAW by a large margin (>15% correct action improvement)**

| Dimension | Action |
|---|---|
| **Next Research** | EXP-006: mechanism isolation (is it the resolution or the format?). EXP-007: generalization to more scenarios. |
| **Next Product** | Ship Bridge resolver as a developer tool (CLI + agent injection). The wedge is proven. Invest in the product. |
| **Next Paper** | Paper 1: "Effective Directives for AI Coding Agents" - framework + benchmark + live agent validation. This is the flagship paper. |
| **Next Business Action** | Raise stakes. The thesis is validated at the behavioral level. Pursue developer adoption, open-source distribution, and enterprise compliance angle. The company is viable if the market materializes. |

**Sub-condition B: BRIDGE > RAW by a small margin (5-15% improvement)**

| Dimension | Action |
|---|---|
| **Next Research** | EXP-006: is the small margin real or noise? Mechanism isolation. EXP-008: real-world use - does the small margin translate to real value? |
| **Next Product** | Ship Bridge resolver with honest characterization: "improves agent behavior modestly; most valuable for high-stakes or high-conflict actions." |
| **Next Paper** | Paper 1 reports small but significant improvement. The paper's contribution is the framework and the proof of concept, not a dramatic behavioral improvement. |
| **Next Business Action** | Bridge is a useful tool, not a transformative product. The company is viable only if the compliance/enterprise angle provides enough revenue. Developer wedge alone is not enough for a company. |

**Sub-condition C: BRIDGE ≈ RAW (no statistically significant difference)**

| Dimension | Action |
|---|---|
| **Next Research** | Why no difference? Did agents ignore the directive? Was the RAW baseline already good? Was the directive format unhelpful? Deep investigation before concluding. |
| **Next Product** | Defer resolver as a product. The behavioral value is not demonstrated. The resolver may still be useful for audit/compliance (standing records), but the developer wedge is not compelling. |
| **Next Paper** | Paper 1 reports negative behavioral result honestly. "Resolver computes correct standing, but agent behavior does not improve." This is an important negative result - it tells the field that resolution alone is insufficient. |
| **Next Business Action** | Pivot. If the agent doesn't benefit from the directive, Bridge's developer wedge is dead. Pivot to: (a) standing records for compliance/audit only, or (b) a different intervention that actually changes agent behavior. |

### IF EXP-005 NEGATIVE (BRIDGE does not improve agent behavior vs RAW)

**Sub-condition A: Agents ignored the directive**

| Dimension | Action |
|---|---|
| **Next Research** | Why did agents ignore the directive? Was it injected correctly? Did agents not trust it? Did agents have their own resolution that overrode it? |
| **Next Product** | Investigate agent integration: how to make agents actually read and follow the directive. This is an agent-adapter problem, not a resolver problem. |
| **Next Paper** | Report negative result with investigation: "Effective directives did not improve agent behavior because agents did not follow them." Contribution: identifies a failure mode for the field. |
| **Next Business Action** | If agents can't be made to follow directives, Bridge's core mechanism is broken. Pivot to standing records for compliance (no agent behavior claim). |

**Sub-condition B: RAW baseline was already good (agents resolved conflicts well without help)**

| Dimension | Action |
|---|---|
| **Next Research** | Characterize the scenarios where RAW already works. Are these the common cases? If most real-world conflicts are easy for agents, the resolver's value is limited. |
| **Next Product** | Position resolver for the hard cases: "most conflicts are easy; Bridge handles the hard ones." This is a niche product. |
| **Next Paper** | Paper 1 reports that agents are better at conflict resolution than expected. The resolver provides marginal value for hard cases. Contribution: benchmarks agent conflict resolution capability. |
| **Next Business Action** | Niche product. If hard cases are rare, Bridge is not a big product. If hard cases are common and important, Bridge is a valuable niche. |

**Sub-condition C: Directive was wrong (resolver made errors that led agent astray)**

| Dimension | Action |
|---|---|
| **Next Research** | Why was the directive wrong? Was the resolver's accuracy lower than EXP-004 suggested? Were the live scenarios harder than the benchmark? |
| **Next Product** | Improve resolver before shipping. If the resolver gives wrong directives, it's harmful, not helpful. |
| **Next Paper** | Paper 1 reports resolver errors and their impact. Honest reporting of failure modes. |
| **Next Business Action** | Fix the resolver. Do not ship until accuracy is acceptable. If accuracy cannot be improved, the resolver is not safe to ship. |

---

## 4. EXP-006 OUTCOME (MECHANISM ISOLATION)

### IF BRIDGE > PLACEBO (resolution-specific improvement, not just structure)

| Dimension | Action |
|---|---|
| **Next Research** | The resolver's specific resolution logic matters. Invest in improving the resolution logic. The authority framework is the differentiator. |
| **Next Product** | The resolver's authority framework is the product. Invest in making it configurable, transparent, and powerful. |
| **Next Paper** | Paper 2 (Standing and Authority) is justified. The mechanism is resolution-specific, which supports the standing concept. |
| **Next Business Action** | The resolver's resolution logic is defensible. Invest in the authority framework as the moat. |

### IF BRIDGE ≈ PLACEBO (any structure helps, not specific resolution)

| Dimension | Action |
|---|---|
| **Next Research** | The format and structure are the value, not the resolution logic. Investigate what structural elements help: citations? status labels? section headers? |
| **Next Product** | The product is "structured directive format," not "resolver." Invest in the format, not the resolution logic. The resolver becomes a format generator, not a computation engine. |
| **Next Paper** | Paper 2 (if any) is about directive format, not standing. The standing concept is weakened - if any structure helps, standing is not the differentiator. |
| **Next Business Action** | The resolver's resolution logic is less valuable than expected. The moat shifts to format and structure, which is weaker. Pivot to compliance/audit (where the computation matters more than the format). |

---

## 5. EXP-007 OUTCOME (GENERALIZATION)

### IF RESOLVER GENERALIZES (accuracy holds >= 70% on expanded set)

| Dimension | Action |
|---|---|
| **Next Research** | Scale Standing computation to more scenarios. Investigate remaining failure modes. |
| **Next Product** | Ship resolver with confidence that it generalizes. The product is viable for a wide range of projects. |
| **Next Paper** | Paper 2 (Standing and Authority) reports generalization results. Standing is a general concept, not a narrow one. |
| **Next Business Action** | Scale the product. The resolver works across diverse scenarios. Pursue broader adoption. |

### IF RESOLVER DOES NOT GENERALIZE (accuracy drops < 65%)

| Dimension | Action |
|---|---|
| **Next Research** | Characterize failure modes. What scenario types, source types, or conflict types break the resolver? What expansion is needed? |
| **Next Product** | Expand the resolver's authority framework, detectors, and source types before shipping broadly. The current resolver is narrow. |
| **Next Paper** | Paper 2 reports generalization limits. Standing computation needs expansion to generalize. Contribution: identifies generalization challenges. |
| **Next Business Action** | Invest in resolver expansion. The product is not ready for broad use until it generalizes. |

---

## 6. EXP-008 OUTCOME (REAL-WORLD USE)

### IF BRIDGE HELPS IN REAL USE (error rates lower, developers satisfied, standing records used)

| Dimension | Action |
|---|---|
| **Next Research** | Study long-term use: how does standing accumulate? How do projects evolve their authority frameworks? How do standing records help over time? |
| **Next Product** | Ship Bridge as a production tool. Real-world validation is the strongest evidence. |
| **Next Paper** | Paper 3 (Institutional State) or a field-study paper. Real-world evidence of standing value. |
| **Next Business Action** | Pursue production deployment, enterprise contracts, and scale. Real-world validation is the strongest signal for a company. |

### IF BRIDGE DOES NOT HELP IN REAL USE (no behavioral difference, developers don't use it, records are ignored)

| Dimension | Action |
|---|---|
| **Next Research** | Why doesn't Bridge help in real use? Is the lab-to-real gap too large? Do developers not trust the resolver? Are real project conflicts different from experimental ones? |
| **Next Product** | Investigate adoption barriers. If developers don't use Bridge in real workflows, the product needs redesign or a different approach. |
| **Next Paper** | Paper reports negative real-world result. Important for the field: standing computation doesn't translate to real value. |
| **Next Business Action** | Pivot or shut down. If Bridge doesn't help in real use, it's not a product. The lab results don't translate. |

---

## 7. CROSS-CUTTING BRANCHES

### IF DEVELOPER WEDGE IS WEAK (developers don't care about standing checker, don't adopt resolver)

| Dimension | Action |
|---|---|
| **Next Research** | Why don't developers care? Is the pain not real? Is the tool not simple enough? Is the value proposition wrong? |
| **Next Product** | Pivot to enterprise/compliance. If developers don't buy, the wedge is wrong. The enterprise angle (compliance, audit, governance) may be the real market. |
| **Next Paper** | Paper focuses on enterprise/compliance value, not developer value. |
| **Next Business Action** | Target enterprise buyers (compliance, governance). Drop developer wedge. |

### IF ENTERPRISE WEDGE IS STRONG (compliance teams want standing records, governance teams want standing computation)

| Dimension | Action |
|---|---|
| **Next Research** | Enterprise requirements: compliance formats, integration points, audit workflows, governance platform integration. |
| **Next Product** | Enterprise Bridge: compliance export, standing dashboard, governance API, integration with existing platforms. |
| **Next Paper** | Paper focuses on enterprise standing computation and compliance value. |
| **Next Business Action** | Enterprise sales motion. Compliance budgets. Longer sales cycles but higher ARPU. |

### IF COMPETITION INTENSIFIES (platform vendors ship resolution, open-source replicates)

| Dimension | Action |
|---|---|
| **Next Research** | How does Bridge differentiate? Determinism? Citations? Project-specificity? Standing records? Compliance? Find the moat. |
| **Next Product** | Double down on the differentiator. If platform vendors have resolution, Bridge's differentiator is standing records, compliance, or project-specific authority. |
| **Next Paper** | Paper emphasizes Bridge's differentiation from platform vendors. The paper is a defense of the category. |
| **Next Business Action** | Compete on differentiation. If platform vendors have the feature, Bridge must be the platform-independent, deterministic, auditable, project-specific alternative. |

### IF CATEGORY MATERIALIZES (institutional state or standing computation becomes recognized)

| Dimension | Action |
|---|---|
| **Next Research** | Define the category standard. What are the interfaces, formats, and protocols? How do systems interoperate? |
| **Next Product** | Platform Bridge: the standard institutional state layer. All agents, all platforms, all compliance frameworks read and write. |
| **Next Paper** | Paper 3 (Institutional State) - the definitive category paper. |
| **Next Business Action** | Platform company. Infrastructure-like moat. Network effects. Category ownership. |

### IF CATEGORY DOES NOT MATERIALIZE (no one recognizes institutional state as a category)

| Dimension | Action |
|---|---|
| **Next Research** | What category does Bridge fit into? Compliance? Governance? Developer tools? Agent platforms? Find the category that exists. |
| **Next Product** | Product within an existing category. Compliance tool, governance component, developer utility. |
| **Next Paper** | Paper within an existing category. Don't create a new category; contribute to an existing one. |
| **Next Business Action** | Compete in an existing category. Smaller moat, clearer buyers, more competition. |

---

## 8. THE MASTER DECISION TREE (CONDENSED)

```
 ┌─────────────────────────────┐
 │ EXP-005 RESULT │
 └─────────────┬───────────────┘
 │
 ┌────────────────────────┼────────────────────────┐
 │ │ │
 POSITIVE (large) POSITIVE (small) NEGATIVE
 │ │ │
 ▼ ▼ ▼
 Ship + paper Ship + paper Investigate why:
 Big bet Smaller bet ├─ Ignored? -> fix integration
 │ │ ├─ RAW good? -> niche only
 ▼ ▼ └─ Wrong? -> fix resolver
 EXP-006/007 EXP-006/007
 │ │
 ▼ ▼
 Generalize? Generalize? ┌─────────────────────────┐
 │ │ │ REPITCH BY BRANCH: │
 ┌─────┴─────┐ ┌─────┴─────┐ │ │
 │ │ │ │ │ | Enterprise/compliance │
 YES NO YES NO │ | Standing records only │
 │ │ │ │ │ | Agent integration fix │
 ▼ ▼ ▼ ▼ │ | Pivot or shut down │
 EXP-008 Invest EXP-008 Defer └─────────────────────────┘
 │ │ │ │
 ▼ ▼ ▼ ▼
 Real-world Real-world Real-world Real-world
 help? help? help? help?
 │ │ │ │
 ┌─┴─┐ ┌─┴─┐ ┌─┴─┐ ┌─┴─┐
 │ │ │ │ │ │ │ │
 YES NO YES NO YES NO YES NO
 │ │ │ │ │ │ │ │
 ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼
 Ship Pivot Ship Pivot Ship Pivot Ship Pivot
 scale down scale down scale down scale down
```

---

*End of decision tree.*
