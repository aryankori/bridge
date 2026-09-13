# BRIDGE - Thesis Dependency Graph & Transition Rationale

**Status:** Research analysis
**Date:** 2026-08-27
**Scope:** Reconstruct WHY the Bridge research program moved through each concept

---

## THE DEPENDENCY GRAPH

```
interoperability
 -> transfer
 -> memory
 -> intelligence
 -> reconciliation
 -> commitment
 -> authority
 -> effective directive
 -> effective standing
```

Each arrow answers: WHY DID WE MOVE HERE? WHAT EVIDENCE CAUSED THE MOVE? WHAT ASSUMPTION WAS REJECTED?

---

## 1. INTEROPERABILITY -> TRANSFER

**Why the move:** You cannot transfer work across agents that cannot see each other.

**Evidence:**
- Hermes cross-audit (2026-08-25) verified 6+ distinct agent runtimes on the machine: Claude Code, OpenCode, Hermes, Gemini CLI, Antigravity, Cursor
- Cross-audit proved each agent spawns as isolated subprocess with no shared state
- A2A specification (Linux Foundation/Google) emerging as inter-agent standard; ACP as editor-to-agent standard; MCP as tool-to-agent standard
- No existing system transfers structured context between agents - only lossy conversation summaries

**Assumption rejected:** "Agents that use the same model can share context." FALSE - model similarity does not create state sharing.

**What remains unproven:**
- Whether developers actually want cross-agent transfer, or whether they prefer each agent to operate independently
- Whether transfer creates net positive value or just propagates errors faster

---

## 2. TRANSFER -> MEMORY

**Why the move:** Transfer without persistence creates a one-time handoff. The receiving agent has context for one session, then loses it.

**Evidence:**
- Cross-audit Context Transfer Audit: Conversation turn history classified as `[LOSSY TRANSFER]` - LLM summaries degrade across hops
- Model hidden reasoning / scratchpads classified as `[IMPOSSIBLE TRANSFER]`
- Developer-wedge-validation research: "approximately 15 to 25 percent of interaction time with the agent is spent re-establishing context" (GitHub issue cited in research corpus)
- Anthropic's Code with Claude 2026 event shipped Claude Managed Agents with built-in memory (April 2026), acknowledging the amnesia problem is real and urgent

**Assumption rejected:** "Transfer is sufficient; the receiving agent will remember what it learned." FALSE - agents lose all context when sessions end.

**What remains unproven:**
- Whether the value is in remembering what the agent did, or in remembering what the project decided
- Whether agent memory (what the model remembers) is the same category as project memory (what the team decided)

---

## 3. MEMORY -> INTELLIGENCE

**Why the move:** Storing memory is not enough. Memory must be retrievable, structured, and actionable. The question shifts from "can agents remember?" to "can agents use what they remember to make better decisions?"

**Evidence:**
- PROJECTMEM paper (arXiv 2606.12329, 2026): "A Local-First, Event-Sourced Memory and Judgment Layer for AI Coding Agents" - argues memory should be immutable, human-legible, offline, and tool-agnostic
- agentmemory project (rohitg00/agentmemory, ~311 GitHub PRs as of Aug 2026): persistent memory for Claude Code, Codex, Copilot, Gemini, OpenCode - MCP-based, "real-world benchmarks"
- Anthropic's "Effective context engineering for AI agents" (Sep 2025): context retrieval, compaction, note-taking strategies
- Mem0 (arXiv April 2025): 91% reduction in response time vs full-context, LOCOMO benchmark
- Galileo AI blog (2025): "Without a tamper-evident audit trail, incidents quickly devolve into blame games"

**Assumption rejected:** "Memory is a context window problem." The research corpus and external literature converge on memory-as-state-management, not memory-as-prompt-injection.

**What remains unproven:**
- Whether structured project memory improves agent outcomes measurably
- What the right unit of memory is: file? decision? task? conversation? policy?

---

## 4. INTELLIGENCE -> RECONCILIATION

**Why the move:** Memory can store conflicting information. When multiple agents with different memories, or multiple document sources, disagree, you need a reconciliation mechanism.

**Evidence:**
- EXP-004 design doc: "conflicting instructions arise (outdated README mandating npm while active configuration mandates pnpm, or prompt requesting hotfix that contradicts lint rule)"
- 40 scenarios across 8 categories: package managers, branch protection, style, runtime versions, security vetoes, adversarial injections, task exceptions, unresolvable ambiguities
- The reconciliation problem is not hypothetical - it is the daily experience of developers working with multiple instruction sources

**Assumption rejected:** "The latest instruction wins." FALSE - stales docs, stale ADRs, and stale READMEs are common. Recency is not authority.

**What remains unproven:**
- Whether reconciliation should be automated (resolver) or human-mediated
- Whether reconciliation at the instruction level is the right granularity

---

## 5. RECONCILIATION -> COMMITMENT

**Why the move:** Reconciliation produces a decision, but decisions that aren't recorded as commitments are not durable. The project needs to know what was decided and why.

**Evidence:**
- Hermes recovery & strategy doc (2026-08-27): commits to canonical commit graph; commits as anchor for memory, reconciliation, authority - "all other Bridge concepts are projections of the commit graph"
- Standing falsification research: "Bridge Core begins by committing a record of what decision was made and why, before reasoning about whether the decision was correct"
- EU AI Act August 2026 deadline: Article 12 requires tamper-evident logs; audit trail tools like MakerChecker (AGPL-3.0, 2026) hash-chain every action
- "Decision Provenance: Harnessing Data Flow for Accountable Systems" (IEEE Access 2019) - lineage exposes inputs, decisions, downstream effects

**Assumption rejected:** "Decisions are implicit in the code." FALSE - code is the output of decisions, not the decision record. The decision *why* is lost without explicit commitment.

**What remains unproven:**
- Whether developers will adopt explicit decision commitment, or whether informal practices (chat logs, PR descriptions) suffice
- Whether commitment at the action level is the right granularity vs commitment at the decision level

---

## 6. COMMITMENT -> AUTHORITY

**Why the move:** Once you record commitments, you face the question: whose commitment governs? When two agents or two humans make conflicting commitments, which one is authoritative?

**Evidence:**
- Standing breakthrough research: "authority graph - node for every instruction source, edge for precedence"
- Standing falsification: tiers - Explicit Human Developer Prompt (100) > Task Specification/Issue (80) > Repository Agent Rules (60) > Project Documentation (40) > Environment/Git State (30) > Default Conventions (10)
- "Many-Tier Instruction Hierarchy in LLM Agents" (arXiv 2604.09443, 2026): OpenAI's Model Spec hardcodes 5 authority levels; academic work shows models are "brittle at fine-grained instruction conflict resolution"
- OpenAI instruction hierarchy blog (March 2026): "When these instructions conflict, the model has to decide which ones to prioritize"

**Assumption rejected:** "All instruction sources are equal." FALSE - a human developer prompt should override a stale README. But the hierarchy is not obvious to the model.

**What remains unproven:**
- Whether a universal authority hierarchy exists, or whether it is organization/team/project specific
- Whether authority should be static (configured tiers) or dynamic (computed from context, recency, explicit override)

---

## 7. AUTHORITY -> EFFECTIVE DIRECTIVE

**Why the move:** Authority is abstract. The agent needs a concrete answer: "what should I do right now, given all the conflicting authorities?" The effective directive is the resolution of authority into a single actionable output.

**Evidence:**
- EXP-004 benchmark: 76.0% exact resolution accuracy on 25 held-out scenarios; 0% false allow; 8% false block; 88% citation recall
- Effective directive prototype: deterministic graph traversal + conflict detection + anomaly detectors (direct contradiction, staleness, missing authorization gate, ambiguity)
- EXP-005 methodology: 10 scenarios × 3 conditions (RAW / HUMAN-RESOLVED / BRIDGE-RESOLVED), 2 replications = 60 trials, model nvidia/nemotron-3-super-120b-a12b via OpenCode
- The developer wedge: "Given conflicting instructions, policies, project rules, human requests, stale documentation, CI constraints, and other sources, compute the effective directive that should govern a specific agent action."

**Assumption rejected:** "The model can resolve conflicts on its own." Evidence from EXP-004 shows 24% of conflicts are mishandled by baseline approaches. The model needs structured resolution.

**What remains unproven (EXP-005 is testing this):**
- Whether effective directive resolution actually improves agent behavior in live execution
- Whether the 76% resolver accuracy is good enough - does the agent act on the directive or ignore it?
- Whether the gap between resolver accuracy and agent outcome is bridgeable

---

## 8. EFFECTIVE DIRECTIVE -> EFFECTIVE STANDING

**Why the move:** A single directive is a point solution. Real projects have many actions, many agents, many authorities. The concept expands from "what directive governs this one action?" to "what is the effective standing of each authority across all actions, and how does standing change over time?"

**Evidence:**
- Standing falsification research: "effective standing - for a given action, under current project conditions, what authority governs and why?" - extends beyond single directives to standing across project state
- Standing breakthrough: "The fundamental primitive is not 'who wins' but 'who stands effective for this action at this time under these conditions'"
- Effective standing product falsification: enterprise hypothesis - "compute effective standing / authority across fragmented systems when multiple legitimate authorities can influence the same action"
- Commitment control: standing is not static - it changes with project evolution, policy updates, explicit overrides, and temporal conditions

**Assumption rejected:** "Standing is a property of the authority." The breakthrough insight: standing is a property of the *action-authority-state* triple. It is situational and temporal.

**What remains unproven:**
- Whether effective standing generalizes beyond coding agents to enterprise systems
- Whether standing can be computed deterministically at scale, or whether it requires human adjudication for edge cases
- Whether standing is a feature (one of many) or the core product primitive

---

## THE THESIS CHAIN - SUMMARY

| Transition | Move Driven By | Key Evidence | Rejecting Assumption | Unproven |
|---|---|---|---|---|
| Interop -> Transfer | Agents can't see each other | 6+ runtimes verified; no cross-agent context sharing | "Same model = shared context" | Do developers want transfer? |
| Transfer -> Memory | One-time handoff isn't enough | Anthropic shipped memory; agentmemory project; PROJECTMEM paper | "Transfer is sufficient" | Agent memory vs project memory? |
| Memory -> Intelligence | Storing isn't using | Context engineering literature; Mem0 benchmark | "Memory is a context problem" | Does structured memory improve outcomes? |
| Intelligence -> Reconciliation | Conflicting memory/sources | EXP-004: 40 scenarios, 8 conflict categories | "Latest instruction wins" | Automated vs human reconciliation? |
| Reconciliation -> Commitment | Decisions must be recorded | EU AI Act Article 12; commit graph as anchor | "Decisions are in the code" | Will developers adopt explicit commitment? |
| Commitment -> Authority | Whose commitment governs? | Standing tiers; Many-Tier Instruction Hierarchy paper | "All sources are equal" | Universal vs team-specific hierarchy? |
| Authority -> Effective Directive | Authority is abstract; agent needs concrete answer | EXP-004: 76% accuracy, 0% false allow; EXP-005 live test | "Model can resolve conflicts alone" | Does directive improve agent behavior? |
| Effective Directive -> Effective Standing | Point solution -> system | Standing as action-authority-state triple; temporal | "Standing is a property of authority" | Enterprise generalization? Deterministic at scale? |

---

## THE CRITICAL OBSERVATION

The dependency chain is NOT a refinement chain where each concept supersedes the previous one.

It is a **layering chain**: each layer solves a problem that the previous layer cannot solve alone, but does not make the previous layer obsolete.

- You still need interoperability to enable transfer
- You still need transfer to enable memory
- You still need memory to enable intelligence
- You still need intelligence to enable reconciliation
- You still need reconciliation to enable commitment
- You still need commitment to enable authority
- You still need authority to enable effective directive
- You still need effective directive to enable effective standing

The question for category discovery is: **which layer is the product?** Or are they all projections of a single underlying primitive?

---

*End of dependency graph.*
