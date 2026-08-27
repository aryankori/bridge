# BRIDGE - RECOVERY & STRATEGY REPORT

**Author:** Hermes Agent (Independent Research, Architecture, Security & Strategy Reviewer)
**Date:** 2026-08-27
**Context:** Recovery from interrupted session - power failure during previous Hermes cycle

---

## 1. CURRENT RECOVERED STATE

### Repository State
- **Branch:** `main`
- **Latest commit:** `879e1f2` (fix(research): enforce hard stage gates, failure propagation, and live smoke tests)
- **Status:** Clean working tree, up-to-date with origin
- **Remote:** `https://github.com/aryankori/bridge.git`

### Last Completed Hermes Tasks
1. ✅ **EXP-001E Final Re-Certification** → `bridge-exp-001e-final-certification.md` - GO issued
2. ✅ **Strategic Landscape & Company Design** → `bridge-strategic-landscape-company-design.md`
3. ✅ **Project Intelligence Foundation** → `bridge-project-intelligence-foundation.md`
4. ✅ **Experimental Review** → `bridge-hermes-experimental-review.md`
5. ✅ **Red Team Review** → `bridge-experiment-red-team-review.md`
6. ✅ **Adversarial Cross-Audit** → `bridge-hermes-adversarial-cross-audit.md`
7. ✅ **Independent Technical Review** → `bridge-hermes-independent-review.md`

### Last Completed Antigravity Tasks
1. ✅ Implemented real experiment harness (agent-runners.ts, harness.ts)
2. ✅ Added live smoke tests (smoke-tests.ts)
3. ✅ Added hard stage gates and failure propagation
4. ✅ Removed fake results.json
5. ✅ Added CI pipeline (GitHub Actions)
6. ✅ Resolved executable discovery (resolveExecutable)

### Current Blocker
**EXP-001 pilot execution awaiting runtime prerequisites:**
- Claude upstream quota resolution
- OpenCode inference availability
- Backend reachability (`ANTHROPIC_BASE_URL=http://localhost:8080` - currently unreachable via curl, but user states "ITS CURRENTLY WORKING" - likely a proxy/tunnel)

### Next Required Task
**Execute EXP-001 pilot** once Antigravity confirms runtime readiness. Hermes should then observe results and issue post-pilot assessment.

---

## 2. PREVIOUS-TASK COMPLETION STATUS

| Task | Status | Output |
|---|---|---|
| EXP-001 harness audit | ✅ Complete | GO issued |
| EXP-001E re-certification | ✅ Complete | GO issued |
| Strategic landscape | ✅ Complete | 845-line report |
| Project intelligence foundation | ✅ Complete | Research document |
| Competitive research | ✅ Complete | 40+ web searches |
| Memory thesis development | ✅ Complete | 6-layer model |
| EXP-002 design | ✅ Complete | 3-session experiment |

**Nothing remains unfinished from the interrupted work.** All missions were completed before the interruption.

---

## 3. EXP-001 UNRESOLVED CONCERNS

### Resolved
- ✅ Executable discovery (candidate paths + PATH query)
- ✅ Process failure semantics (AgentExecutionError classifications)
- ✅ Smoke tests (real integration tests in smoke-tests.ts)
- ✅ A/B/C comparability (identical flags, only prompt varies)
- ✅ Model pinning (Claude via ANTHROPIC_BASE_URL, OpenCode via --pure)
- ✅ Information accounting (calculateInformationMetrics)
- ✅ Transfer generation (extractStructuredTransfer with LLM extraction)
- ✅ Contamination prevention (fake results.json removed, artifacts gitignored)

### Remaining (Non-Blocking)
1. **Backend reachability** - `http://localhost:8080` unreachable via direct curl, but user confirms working. Likely requires proxy/tunnel.
2. **OpenCode model selection** - Antigravity investigating which model to pin. Not a blocker for pilot.
3. **Pilot execution** - Not yet run. Awaiting Antigravity's go-ahead.

---

## 4. OPENCODE MODEL RECOMMENDATION

### Analysis

The question is NOT "Which model has the highest benchmark score?" but "What model gives the most reliable and reproducible receiver for EXP-001?"

**Criteria for receiver model:**
- **Reliability:** Consistent output quality across sessions
- **Latency:** Fast enough for iterative coding tasks
- **Context:** Sufficient window for task + injected intelligence
- **Coding ability:** Strong code generation and debugging
- **Provider stability:** No rate limits or outages during experiment
- **Cost:** Affordable for n=3 trials × 3 conditions = 9 sessions
- **Reproducibility:** Deterministic or near-deterministic outputs

### Recommendation

**MODEL SELECTION INCONCLUSIVE** - insufficient evidence to recommend a specific model without knowing:
1. Which models OpenCode supports
2. Which models are available under the user's subscription
3. Current rate limit status

**Guidance for Antigravity:**
- Prefer a model with ≥128K context (to accommodate injected intelligence)
- Prefer a model with consistent coding ability (Sonnet-class or better)
- Avoid models with high variance (some Haiku-class models)
- Pin the model explicitly in the harness (do not rely on OpenCode defaults)

---

## 5. PROJECT INTELLIGENCE RESEARCH

### The Memory Ecosystem (2026)

The AI agent memory space is **crowded and rapidly maturing**. Bridge does not need to build everything from scratch.

#### Key Technologies

| Technology | What It Solves | What It Doesn't Solve | Bridge Could Use It | Build Own? | Dependency Risk |
|---|---|---|---|---|---|
| **Honcho** | Cross-session memory, user modeling, persistent context | Project-specific intelligence, code relationships | As memory backend for agent sessions | No - use as component | Medium (managed service) |
| **Cognee** | Codebase knowledge graph, AST parsing, MCP-native | Real-time session capture, human validation | As code graph engine | No - use as component | Low (open source, Apache 2.0) |
| **Mem0** | Managed memory API, user/session/agent scopes | Code relationships, project truth | As memory API layer | No - use as component | Medium (managed service) |
| **agentmemory** | Lightweight MCP memory, 12 lifecycle hooks | Knowledge graph, contradiction handling | As session capture hook | No - use as component | Low (open source) |
| **QMD** | Local markdown search, BM25 + vector + LLM rerank | Cross-session persistence, agent integration | As local documentation retrieval | No - use as component | Low (open source, local) |

#### Critical Insight

**Bridge should NOT build a memory store.** The memory storage problem is solved. Bridge should build:
1. **The reconciliation engine** - distinguishing "Claude suggested X" from "the project decided X"
2. **The project truth model** - lifecycle states, supersession, staleness detection
3. **The capture pipeline** - extracting intelligence from agent sessions
4. **The materialization layer** - agent-specific context injection

---

## 6. EXISTING-MEMORY TECHNOLOGY ANALYSIS

### Honcho
- **What it solves:** Cross-session persistence, user modeling, continual learning
- **What it doesn't solve:** Project-level intelligence, code relationships, contradiction handling
- **Bridge could use it:** As the session memory backend (replaces custom SQLite)
- **Why build own:** Honcho is user-centric, not project-centric
- **Dependency risk:** Managed service (api.honcho.dev) or self-hosted

### Cognee
- **What it solves:** Codebase knowledge graph, AST parsing, MCP-native querying
- **What it doesn't solve:** Session capture, human validation, project truth lifecycle
- **Bridge could use it:** As the code graph engine (replaces custom code analysis)
- **Why build own:** Cognee is ingestion-focused, not reconciliation-focused
- **Dependency risk:** Open source (Apache 2.0), self-hosted option available

### Mem0
- **What it solves:** Managed memory API, user/session/agent scopes, graph memory
- **What it doesn't solve:** Codebase relationships, project truth, contradiction handling
- **Bridge could use it:** As the memory API layer (if managed service acceptable)
- **Why build own:** Vendor lock-in, no project-centric model
- **Dependency risk:** Managed service (app.mem0.ai)

### agentmemory
- **What it solves:** Lightweight MCP memory, 12 lifecycle hooks, local-first
- **What it doesn't solve:** Knowledge graph, contradiction handling, project truth
- **Bridge could use it:** As the session capture hook (PostToolUse, SessionEnd)
- **Why build own:** Too lightweight for project intelligence
- **Dependency risk:** Open source, local-first

### QMD
- **What it solves:** Local markdown search, hybrid retrieval (BM25 + vector + LLM rerank)
- **What it doesn't solve:** Cross-session persistence, agent integration
- **Bridge could use it:** As the local documentation retrieval engine
- **Why build own:** Not a memory system, just a search engine
- **Dependency risk:** Open source, fully local

---

## 7. COMPETITIVE DEVELOPMENTS

### New Entrants (2026)

| Product | Positioning | Threat Level |
|---|---|---|
| **Cortex (Cursor)** | Production-ready memory for AI agents | HIGH - Cursor has distribution |
| **Mind (OpenCode)** | MCP-native persistent memory extender | MEDIUM - OpenCode-specific |
| **MemoryLake** | Cross-session permanent context retention | LOW - no differentiation |
| **Agent Memory (Cloudflare)** | Agents that remember, persistent memory layer | MEDIUM - Cloudflare has infra |
| **Codebase-Memory (arXiv)** | Tree-Sitter-based knowledge graphs via MCP | LOW - academic, not product |

### Consolidation Trend

The memory space is **consolidating around MCP as the standard interface**. Cognee, agentmemory, and Mem0 all expose MCP servers. This is good for Bridge - it means memory components are interchangeable.

### The Gap

**No one is building the reconciliation layer.** Everyone stores and retrieves. No one distinguishes "suggested" from "decided" from "verified" from "obsolete."

This is Bridge's opportunity.

---

## 8. MEMORY-VS-TRUTH MODEL

### The Six-Layer Distinction

| Layer | Definition | Technical Distinct? | Bridge Should Own? |
|---|---|---|---|
| **Chat History** | Raw conversation log | Yes - append-only, unstructured | No (store, don't process) |
| **Context** | What the agent sees this session | Yes - ephemeral, window-bound | No (materialize, don't store) |
| **Work State** | Current task progress | Yes - transient, task-bound | No (capture, don't persist) |
| **Project Memory** | Distilled session knowledge | Yes - persistent, queryable | Yes (core asset) |
| **Project Intelligence** | Verified, actionable knowledge | Yes - lifecycle-aware, provenance-rich | Yes (the moat) |
| **Project Truth** | Authoritative current state | Yes - reconciled, contradiction-free | Yes (the ultimate goal) |

### How Bridge Should Know

| Claim | Detection Method | Confidence |
|---|---|---|
| "Claude suggested X" | LLM extraction from session | LOW (unverified) |
| "The project decided X" | Human confirmation in session | MEDIUM (decided, not implemented) |
| "X was implemented" | Git diff shows X in code | HIGH (but may be partial) |
| "X was verified" | Tests pass + human review | HIGH (current truth) |
| "X became obsolete" | New decision supersedes X | HIGH (temporal awareness) |

### The Reconciliation Problem

This is harder than retrieval. The model must:
1. **Detect conflicts** - two claims contradict
2. **Establish precedence** - which claim is newer/verified
3. **Resolve contradictions** - mark one as superseded
4. **Surface uncertainty** - when resolution is ambiguous

**This is the technical moat.** Not storage, not retrieval - reconciliation.

---

## 9. EXP-002 DESIGN

### Hypothesis

> Persistent project intelligence accumulated across sessions improves agent performance over repeated sessions compared with starting each session fresh.

### Conditions

| Condition | Description |
|---|---|
| **A (Baseline)** | Fresh agent session with no persistent project intelligence. Task prompt only. |
| **B (Intelligence)** | Fresh agent session with Bridge project intelligence injected as initial context. |

### Session Structure

**Session 1 (both conditions):**
- Task: "Add a new feature described in the issue tracker"
- Agent works independently
- Bridge captures observations (git diff, test results)
- Bridge extracts candidate knowledge (LLM pass)
- Human validates → becomes durable intelligence

**Session 2 (both conditions, 1 day later):**
- Task: "Fix a bug that contradicts the approach from Session 1"
- Condition A: No memory of Session 1
- Condition B: Bridge intelligence from Session 1 injected
- Measure: Does the agent avoid the contradicted approach?

**Session 3 (both conditions, 1 day later):**
- Task: "Extend the feature from Session 1 with a related capability"
- Condition A: No memory of Session 1
- Condition B: Bridge intelligence from Session 1 injected
- Measure: Does the agent build on prior work correctly?

### Controls

| Control | How |
|---|---|
| Same project | Both conditions work on the same codebase |
| Same tasks | Both conditions receive identical task prompts |
| Same agent | Both conditions use the same agent (e.g., Claude Code) |
| Same environment | Same machine, same tools, same configuration |
| Randomized order | Session order randomized across multiple runs |

### Metrics (Minimum Useful Set)

| Metric | How Measured | Primary? |
|---|---|---|
| Time to first useful output | Seconds from prompt to first code change | YES |
| Incorrect assumptions | Count of claims contradicting project intelligence | YES |
| Developer rating | 1-5 subjective quality rating | YES |
| Contradiction rate | % of agent claims contradicting prior decisions | YES |
| Repeated explanations | Count of re-explained concepts | Secondary |
| Task completion | Binary: did the agent complete the task? | Secondary |
| Token cost | Total tokens consumed | Secondary |

### Contamination Controls

| Risk | Mitigation |
|---|---|
| Agent reads .claude/ or .bridge/ directory | Intelligence stored outside project directory |
| Agent infers prior work from git history | Session 1 starts from a clean branch |
| Human bias in validation | Multiple validators; inter-rater reliability |
| Task ordering effects | Randomize task order across runs |

### Success Criteria

Condition B is "better" when:
1. Time to first useful output ≥25% faster in Sessions 2 and 3
2. Incorrect assumptions ≥50% fewer in Sessions 2 and 3
3. Developer rating ≥1 point higher in Sessions 2 and 3
4. Contradiction rate ≥50% lower in Sessions 2 and 3

### Failure Criteria

The thesis is invalid when:
1. No significant difference in any metric across all sessions
2. Condition B performs worse than Condition A (intelligence misleads)
3. Human validation takes longer than the time saved
4. The intelligence store grows without bound (no compactness)

---

## 10. BUILD-VS-ADOPT RECOMMENDATIONS

| Subsystem | Recommendation | Rationale |
|---|---|---|
| **Retrieval** | ADOPT (QMD or Cognee) | Solved problem, MCP-native |
| **Embeddings** | ADOPT (Cognee or local) | Standard technology, no differentiation |
| **Code Graph** | ADOPT (Cognee) | AST parsing is hard; Cognee does it well |
| **Project Memory** | BUILD | This is the moat - reconciliation, lifecycle, truth |
| **Provenance** | BUILD | Core differentiation - who decided what |
| **Contradiction Handling** | BUILD | No one else solves this |
| **Session Capture** | WRAP (agentmemory hooks) | Use hooks, add custom extraction |
| **Context Materialization** | BUILD | Agent-specific injection is the product |

### Architecture Recommendation

```
┌─────────────────────────────────────────────────────┐
│                    BRIDGE PRODUCT                     │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   CAPTURE    │  │  RECONCILE   │  │  MATERIALIZE│ │
│  │  (wrap)      │  │  (build)     │  │  (build)    │ │
│  │             │  │              │  │             │ │
│  │ agentmemory │→ │  lifecycle   │→ │  agent-     │ │
│  │ hooks       │  │  supersession│  │  specific   │ │
│  │ git diff    │  │  conflicts   │  │  context    │ │
│  │ LLM extract │  │  staleness   │  │  injection  │ │
│  └─────────────┘  └──────────────┘  └─────────────┘ │
│         ↑                ↑                ↓          │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  SESSION    │  │  KNOWLEDGE   │  │   AGENT     │ │
│  │  STORE      │  │  GRAPH       │  │   OUTPUT    │ │
│  │  (adopt)    │  │  (adopt)     │  │             │ │
│  │             │  │              │  │             │ │
│  │ Honcho/     │  │ Cognee/      │  │ Claude/     │ │
│  │ Mem0        │  │ Kuzu/Neo4j   │  │ OpenCode/   │ │
│  │             │  │              │  │ Codex       │ │
│  └─────────────┘  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 11. THESIS ATTACK

### Is project memory actually valuable?

**Yes, but not as storage.** The value is in **reconciliation** - knowing what's true now. Storage is commoditized. Truth is not.

### Do modern agents already solve this?

**Partially.** Claude Code has auto-memory. Cursor has rules. But these are **vendor-specific memories** that don't transfer across agents. Bridge's neutrality is the differentiation.

### Does retrieval introduce more noise than value?

**Yes, if retrieval is naive.** Raw retrieval of past conversations introduces speculation and contradiction. Bridge must retrieve **verified intelligence**, not raw history.

### Do developers want another memory layer?

**No, if it's just storage.** Yes, if it saves them from re-explaining their project to every new agent session. The value proposition is **time saved**, not **memory stored**.

### Does project memory become stale?

**Yes, aggressively.** Without staleness detection and supersession, project memory becomes a graveyard of obsolete decisions. This is a critical technical risk.

### Does the system create false institutional knowledge?

**Yes, without verification.** If agent suggestions become "project knowledge" without human confirmation, the system will accumulate falsehoods. **Human confirmation is mandatory for decisions.**

### Could Git + documentation + existing agent memory already solve the problem?

**Partially.** Git shows what was implemented. Documentation shows what was planned. Agent memory shows what was discussed. But **none of these reconcile contradictions** or **track the lifecycle from suggestion → decision → implementation → verification → obsolescence**.

### Is this a company or just infrastructure?

**It's a company IF the reconciliation engine is defensible.** If it's just storage, it's infrastructure (and commoditized). The moat is the **accumulated reconciliation data** - 2 years of project trajectories, human corrections, and validated decisions.

---

## 12. RECOMMENDED NEXT STRATEGIC ACTION

### Immediate (This Week)
1. **Antigravity:** Confirm runtime readiness (Claude quota, OpenCode inference, backend reachability)
2. **Antigravity:** Execute `pnpm experiment:pilot` and observe results
3. **Hermes:** Issue post-pilot assessment based on actual results

### Short-Term (Next 2 Weeks)
1. **Hermes:** If pilot succeeds, design EXP-002 with real project tasks
2. **Antigravity:** Implement minimal capture pipeline (CLI: `bridge capture`)
3. **Research:** Deep-dive into Cognee and Honcho for potential integration

### Medium-Term (Next 2 Months)
1. **Build:** Minimal reconciliation engine (lifecycle states, supersession, staleness)
2. **Validate:** EXP-002 with 10+ developers on real projects
3. **Decide:** Whether to adopt Cognee/Honcho or build custom storage

---

## FINAL QUESTIONS

### 1. What exactly remains unfinished from the interrupted work?

**Nothing.** All missions were completed before the interruption. The only pending action is pilot execution by Antigravity.

### 2. Is EXP-001 still worth running?

**Yes, but with tempered expectations.** EXP-001 tests whether a structured dossier helps Agent B. This is trivially true and not a product insight. However, it validates the harness, the smoke tests, and the failure semantics. It's a necessary systems test even if it doesn't validate the product thesis.

### 3. What should Antigravity do next?

1. Confirm runtime readiness
2. Execute `pnpm experiment:pilot`
3. Share pilot artifacts with Hermes for assessment
4. Begin minimal capture pipeline implementation

### 4. What should Hermes do next?

1. Await pilot results
2. Issue post-pilot assessment
3. If pilot succeeds, refine EXP-002 design
4. If pilot fails, analyze whether failure was harness or thesis

### 5. What is the strongest version of the Project Intelligence thesis?

**"Bridge is the project's institutional memory - not a chat archive, but a verified, queryable representation of what the project has learned, capable of distinguishing suggestion from decision from truth."**

### 6. What existing technology deserves the closest investigation?

**Cognee.** It solves the hardest part (codebase knowledge graph) and is Apache 2.0. Bridge should adopt Cognee for code graph and focus on the reconciliation layer that Cognee doesn't solve.

### 7. What finding would kill the Project Intelligence idea?

**No significant difference between conditions in EXP-002 Sessions 2 and 3.** If persistent intelligence does not improve productivity, the thesis is wrong. Also: if human validation takes longer than the time saved by intelligence.

---

*End of recovery and strategy report.*
