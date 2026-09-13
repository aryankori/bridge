# Bridge Current Interoperability Map

**Status:** Phase 5 - Original Bridge product assessment 
**Generated:** Competitive landscape research + prior corpus knowledge 
**Sources:** Tavily competitive research (see `docs/research/bridge-tavily-competitive-research.md` for full source list), Bridge prior research corpus, Hermes product knowledge

---

## 1. The Original Question

How far is Bridge from:

> ONE PLACE -> MULTIPLE AI AGENTS -> SHARED PROJECT -> AUTOMATIC WORK TRANSFER -> NO MANUAL COPY/PASTE

This map assesses the current state of each component in that chain, across the relevant tooling ecosystem.

---

## 2. Capability Map

### 2.1 Multi-Agent Project Access (read/write shared project)

| Capability | Status | Notes |
|---|---|---|
| Claude Code reads/edits project files | **ALREADY SOLVED** | Claude Code reads entire repos, edits files, runs shell, manages Git. Works across CLI, VS Code, Desktop, web. |
| Codex CLI reads/edits project files | **ALREADY SOLVED** | Codex CLI has project access, file editing, shell execution. |
| OpenCode reads/edits project files | **ALREADY SOLVED** | OpenCode provides project access and editing. |
| Gemini CLI reads/edits project files | **ALREADY SOLVED** | Gemini CLI provides project access. |
| Multiple agents in same project | **ALREADY SOLVED** | Multiple agents can operate in the same directory. The unsolved part is coordination, not access. |
| Isolation between agent workspaces | **PARTIALLY SOLVED** | Git worktrees provide isolation. Docker/containers provide stronger isolation. Claude Code sessions are not isolated by default. |

**Bridge must build:** Nothing for basic access. The unsolved problem is coordination and transfer, not access.

### 2.2 Work Transfer (agent A's output -> agent B's input)

| Capability | Status | Notes |
|---|---|---|
| Claude Code session transfer between surfaces | **ALREADY SOLVED** | Claude Code supports session transfer between CLI, VS Code, Desktop, and web surfaces. Session memory (CLAUDE.md) persists. |
| Claude Code hooks | **ALREADY SOLVED** | Claude Code supports local plugins with hooks, monitors, and MCP server components. Hooks can run shell commands on events and deliver stdout as notifications. |
| Claude Code `/teleport` and `&` (background execution) | **ALREADY SOLVED** | Long-running remote execution and teleport commands exist. |
| Codex CLI handoff to another Codex session | **PARTIALLY SOLVED** | Codex sessions can be continued, but there is no standardized handoff protocol between different Codex instances or between Codex and other agents. |
| OpenCode agent handoff | **PARTIALLY SOLVED** | OpenCode has some session continuity, but no documented standardized handoff format. |
| Gemini CLI agent handoff | **PARTIALLY SOLVED** | Gemini CLI has session features, but no documented cross-agent handoff protocol. |
| Cursor multi-agent orchestration | **PARTIALLY SOLVED** | Cursor supports multiple AI agents in its IDE, with some orchestration capabilities. Limited to the Cursor environment. |
| GitHub Copilot CLI agent handoff | **PARTIALLY SOLVED** | Copilot CLI has agent capabilities within its ecosystem. Cross-agent handoff is not standardized. |
| Human-readable handoff notes | **ALREADY SOLVED** | Any agent can write a summary file. The unsolved part is structured, machine-readable handoff. |
| Structured work transfer object | **BRIDGE MUST BUILD** | No existing tool provides a standardized, machine-readable WorkTransfer object that captures objective, task, changed files, artifacts, decisions, unresolved questions, git state, and provenance in a transferable format. |
| Automatic transfer without manual intervention | **BRIDGE MUST BUILD** | No existing tool automatically transfers in-progress work from one agent to another without human middleware. |

**Bridge must build:** A standardized WorkTransfer object and the pipeline that creates it from agent A's work and delivers it to agent B.

### 2.3 Context Selection (what to transfer, what to omit)

| Capability | Status | Notes |
|---|---|---|
| CLAUDE.md (Claude Code project memory) | **ALREADY SOLVED** | Claude Code supports persistent project memory via CLAUDE.md files. |
| Repository-wide context | **ALREADY SOLVED** | Agents can read entire repos. The unsolved part is selecting what's relevant. |
| Git history as context | **ALREADY SOLVED** | Git log, diff, blame are available to any agent with repo access. |
| Automatic relevance detection | **PARTIALLY SOLVED** | Some tools provide file filtering, search, and indexing. No tool provides a fully automatic "what does agent B need from agent A's work" selector. |
| Effective Directive concept (context selection + conflict elimination) | **BRIDGE SHOULD BUILD (research-validated)** | Bridge's research discovered the Effective Directive concept. If validated by experiment, it provides a structured approach to context selection and conflict elimination. Not yet built as a product feature. |

**Bridge must build:** Nothing if context selection is solved by CLAUDE.md + git + agent search. The Effective Directive concept could be a differentiator if validated.

### 2.4 Agent Coordination (who does what, when, in what order)

| Capability | Status | Notes |
|---|---|---|
| Human-in-the-loop coordination | **ALREADY SOLVED** | Humans can direct agents sequentially. This is the current default. |
| Subagent delegation within one agent | **ALREADY SOLVED** | Claude Code, Codex, and others support subagent/spawn patterns within a single agent session. |
| Multi-agent orchestration across different agent types | **BRIDGE MUST BUILD** | No tool coordinates heterogeneous agents (Claude -> Codex -> Gemini) in a shared project with automatic work transfer. |
| Dependency-aware scheduling | **BRIDGE MUST BUILD** | If agent B depends on agent A's output, the system should know this and sequence accordingly. No existing tool does this across heterogeneous agents. |
| Conflict detection/resolution between agents | **BRIDGE MUST BUILD** | If two agents edit the same file, who wins? No cross-agent conflict resolution exists. |

**Bridge must build:** Cross-agent coordination, dependency-aware sequencing, and conflict resolution.

### 2.5 Protocol/Interoperability Layer

| Capability | Status | Notes |
|---|---|---|
| MCP (Model Context Protocol) | **ALREADY SOLVED** | MCP is an established protocol for connecting AI agents to external tools and data sources. Provides a standard way for agents to access context. |
| ACP (Agent Client Protocol) | **ALREADY SOLVED** | ACP is an emerging standard for AI agent integration with IDEs and clients. Provides a protocol layer for agent-client communication. |
| A2A (Agent-to-Agent) protocol | **PARTIALLY SOLVED** | A2A standards are emerging (e.g., Google's A2A initiative). No widely adopted standard for agent-to-agent work transfer exists yet. The research from Tavily indicates that existing protocols provide pieces but not a complete handoff solution. |
| Open standard for work transfer | **BRIDGE SHOULD BUILD** | If Bridge defines a work transfer standard, it could become the interoperability layer. This is a strategic opportunity, but only if the standard is actually needed (see §4). |
| Git as universal interchange | **ALREADY SOLVED** | Git is the universal version control system. All agents can read/write Git repos. Git is a strong candidate for the underlying interchange format. |

**Bridge must build:** Nothing if existing protocols (MCP, ACP, Git) are sufficient. A work-transfer-specific protocol extension could be a differentiator.

### 2.6 Agent Memory / Project Intelligence

| Capability | Status | Notes |
|---|---|---|
| CLAUDE.md (Claude Code memory) | **ALREADY SOLVED** | Persistent project memory exists for Claude Code. |
| Agent session memory | **PARTIALLY SOLVED** | Individual agents have session memory. Cross-agent shared memory does not exist. |
| Project-level knowledge graph | **BRIDGE SHOULD NOT BUILD (yet)** | A full knowledge graph is over-engineered for the current problem. Git history + CLAUDE.md + selective context extraction is sufficient for v1. |
| Decision log / audit trail | **BRIDGE MUST BUILD** | A record of what was decided, by whom (which agent), and why. This is part of the WorkTransfer object (decisions, unresolved questions fields). |
| Precedent tracking | **BRIDGE SHOULD BUILD (research-validated)** | If the Precedent concept from Bridge research is validated, it provides a way to track prior resolutions and apply them to new situations. Not yet built. |

### 2.7 Reconciliation / Commitment / Standing

These are Bridge research discoveries. Their product relevance depends on experimental validation:

| Concept | Status | Product relevance |
|---|---|---|
| Reconciliation (resolving conflicts between agent outputs) | **HYPOTHESIS** | If validated, could be a core Bridge capability. Not yet tested. |
| Commitment (agents committing to decisions) | **HYPOTHESIS** | May be useful for audit trails and accountability. Not yet tested. |
| Standing (agent reputation/rigor tracking) | **HYPOTHESIS** | May be useful for agent selection and trust. Not yet tested. |
| Effective Directive (structured context + conflict elimination) | **HYPOTHESIS (partially tested)** | EXP-004 validated the resolver at 76% accuracy / 0% false-allow. EXP-005 was designed to test agent behavior under different resolution conditions but failed. The resolver itself has evidence; the agent-behavior claims do not. |

---

## 3. What Existing Tools Already Do

### 3.1 Claude Code

Claude Code is the most complete individual tool in the ecosystem:

- **Project access:** Full read/write/edit across CLI, VS Code, Desktop, web
- **Session transfer:** Between surfaces (CLI <-> VS Code <-> Desktop <-> web)
- **Memory:** CLAUDE.md for project-level persistent memory
- **Hooks/plugins:** Local plugins with hooks, monitors, MCP server components
- **Background execution:** `&` and `/teleport` for long-running tasks
- **Git integration:** Read/write Git operations
- **Limitations:** Single-agent focused. No standardized handoff to other agent types. No cross-agent work transfer protocol.

### 3.2 Codex CLI

- **Project access:** Full file system access, editing, shell execution
- **Session continuity:** Can continue sessions
- **Limitations:** No standardized cross-agent handoff. OpenAI ecosystem focus.

### 3.3 OpenCode

- **Project access:** File system access, editing
- **Session features:** Some continuity
- **Limitations:** No documented cross-agent handoff protocol.

### 3.4 Gemini CLI

- **Project access:** File system access
- **Session features:** Some continuity
- **Limitations:** Google ecosystem focus. No cross-agent handoff.

### 3.5 Cursor

- **Multi-agent:** Supports multiple AI agents in IDE
- **Orchestration:** Some built-in orchestration
- **Limitations:** Tied to Cursor IDE. Not a general multi-agent coordination platform.

### 3.6 GitHub Copilot CLI

- **Agent capabilities:** Within Copilot ecosystem
- **Limitations:** GitHub/Microsoft ecosystem. Security-focused. No cross-agent handoff.

---

## 4. What Makes Bridge Unnecessary (Competitive Falsification)

### 4.1 The strongest "Bridge is unnecessary" argument

If Claude Code adds native multi-agent handoff, or if A2A standards mature to cover work transfer, Bridge's core value proposition could be subsumed.

**Current state:** Claude Code does NOT have native multi-agent handoff. A2A standards are emerging but do NOT cover structured work transfer. The gap exists today.

### 4.2 What would make Bridge unnecessary

| Development | Impact on Bridge | Likelihood |
|---|---|---|
| Claude Code adds native cross-agent work transfer | High - eliminates need for Bridge as intermediary | Medium-term (Claude Code is rapidly evolving) |
| A2A standard covers structured work transfer | High - makes Bridge a protocol implementer, not a unique product | Medium-term (standards are emerging but incomplete) |
| Git + CLAUDE.md + hooks become sufficient for multi-agent work | Medium - simplifies the problem but doesn't solve coordination | Already partially true |
| All agents converge on a single platform (e.g., everyone uses Claude Code) | High - eliminates heterogeneous agent problem | Low (market is fragmented) |
| AI IDEs (Cursor, Copilot, etc.) add cross-agent orchestration | Medium-High - competes with Bridge's coordination value prop | Medium-term |

### 4.3 What Bridge still needs to do (even if above happen)

Even if Claude Code adds handoff, or A2A matures, Bridge may still need to:

1. **Coordinate heterogeneous agents** - Claude Code handoff to Codex is not the same as Claude Code handoff to Claude Code
2. **Define a work transfer standard** - if no standard exists, someone needs to define one; Bridge can be that someone
3. **Provide project-level coordination** - beyond pairwise handoff, agents need to know about each other's work, dependencies, conflicts
4. **Track decisions and provenance** - for auditability, accountability, and reproducibility
5. **Handle conflict resolution** - when agents disagree, who resolves it?

---

## 5. Bridge's Actual Differentiation

### 5.1 What is genuinely unique about Bridge

1. **Heterogeneous agent work transfer:** No existing tool transfers structured work between different agent types (Claude -> Codex -> Gemini) automatically
2. **Project-level coordination:** No existing tool provides project-level orchestration across multiple agents from different providers
3. **WorkTransfer object:** A standardized, machine-readable handoff format does not exist in any tool today
4. **Conflict resolution across agents:** No tool resolves conflicts between agents from different providers

### 5.2 What is NOT unique (already solved or being solved)

1. **Single-agent project access:** Solved by every major CLI agent
2. **Session persistence:** Solved by Claude Code (CLAUDE.md), partially by others
3. ** Hooks/event systems:** Solved by Claude Code plugins, MCP
4. **Git-based version control:** Universal
5. **Multi-agent within one ecosystem:** Cursor, Copilot, Claude Code subagents all do this within their ecosystem

### 5.3 The wedge

Bridge's wedge is **heterogeneous agent coordination** - the problem that arises when you use Claude for one task, Codex for another, and Gemini for a third, and they all need to work on the same project without manual copy/paste between them.

This is a real problem today. It is not solved by any existing tool. It is not obviously going to be solved by any single vendor (because it requires cross-vendor interoperability).

---

## 6. ALREADY SOLVED / PARTIALLY SOLVED / BRIDGE MUST BUILD / BRIDGE SHOULD NOT BUILD

### 6.1 ALREADY SOLVED (do not build)

- Project file read/write access (all major CLIs)
- Git version control (universal)
- Single-agent session persistence (CLAUDE.md, similar in other tools)
- Hooks and plugin systems (Claude Code plugins, MCP)
- Background/long-running execution (Claude Code `&`, `/teleport`)
- Session transfer between surfaces (Claude Code)
- Repository search and navigation (all major CLIs + git)
- Basic context via CLAUDE.md and similar

### 6.2 PARTIALLY SOLVED (bridge may add value)

- Multi-agent orchestration within a single ecosystem (Cursor, Copilot) - Bridge adds cross-ecosystem
- Session continuity within one agent type - Bridge adds cross-agent-type
- Context selection via CLAUDE.md - Bridge adds automatic relevance detection + Effective Directive
- Protocol layers (MCP, ACP) - Bridge adds work-transfer-specific semantics
- Agent memory - Bridge adds shared, cross-agent project memory

### 6.3 BRIDGE MUST BUILD (no existing solution)

- **WorkTransfer object:** Standardized, machine-readable handoff format capturing objective, task, changedFiles, relevantFiles, artifacts, commands, tests, results, failures, decisions, unresolvedQuestions, gitState, provenance
- **Work transfer pipeline:** Agent A -> Bridge -> WorkTransfer -> Agent B, automatic, no manual copy/paste
- **Cross-agent coordination:** Dependency-aware sequencing, conflict detection, agent status tracking
- **Heterogeneous agent support:** Claude <-> Codex <-> Gemini <-> OpenCode <-> any MCP-compatible agent
- **Decision log / provenance tracking:** What was decided, by whom, why, with what evidence

### 6.4 BRIDGE SHOULD NOT BUILD (over-engineered or not justified)

- Enterprise governance platform (not justified by evidence)
- Cloud control plane (local-first is preferred)
- Billing/subscription infrastructure (not relevant to v1)
- Custom protocol from scratch (use MCP/ACP/Git as base)
- Vector database (not needed for v1)
- Giant ontology (not needed; git + CLAUDE.md + selective context is enough)
- Full knowledge graph (over-engineered; use git history + selective extraction)

---

## 7. Distance from Original Product

### 7.1 What exists today

- **One place:** Partially - a Git repo can be the "one place," but there's no unified UI or coordination layer
- **Multiple AI agents:** Yes - Claude Code, Codex, Gemini, OpenCode, Cursor, Copilot all exist and can operate on the same project
- **Shared project:** Yes - a Git repo is shared; agents can all read/write to it
- **Automatic work transfer:** NO - this is the gap. No tool automatically transfers structured work from one agent to another
- **No manual copy/paste:** NO - today, the human is the middleware, copying context between agents manually

### 7.2 What Bridge needs to build to close the gap

**Minimum viable:**

1. A WorkTransfer object (schema + serialization)
2. A mechanism for Agent A to produce a WorkTransfer (capture relevant state at the end of its work)
3. A mechanism for Agent B to consume a WorkTransfer (receive the structured handoff and continue)
4. A simple orchestrator that connects A -> Bridge -> B

**Not required for MVP:**

1. UI (CLI-first is acceptable)
2. Persistence layer beyond Git + files
3. Multi-agent dashboard
4. Agent reputation/standing system
5. Full project intelligence / knowledge graph
6. Enterprise features

### 7.3 How the research concepts fit

| Research concept | Product relevance | Build now or wait? |
|---|---|---|
| Work Transfer | Core - this IS the product | BUILD NOW |
| Context Selection | Important - affects continuation quality | BUILD NOW (simple version), research Effective Directive for advanced version |
| Project Continuity | Important - the goal of the product | BUILD NOW (emergent from work transfer + coordination) |
| Effective Directive | Potentially important - could improve context selection and conflict elimination | WAIT FOR EVIDENCE (EXP-005 needed to validate agent-behavior claims; resolver has evidence from EXP-004) |
| Authority / Precedent | Possibly important - for conflict resolution and decision tracking | WAIT FOR EVIDENCE |
| Reconciliation | Possibly important - for conflict resolution | WAIT FOR EVIDENCE |
| Commitment / Standing | Nice-to-have - for auditability and trust | WAIT FOR EVIDENCE (low priority for MVP) |

---

## 8. Product Verdict

**Bridge is NOT made unnecessary by existing tools.** The core gap - automatic, structured work transfer between heterogeneous AI agents in a shared project - is not solved by Claude Code, Codex, OpenCode, Gemini CLI, Cursor, Copilot, MCP, ACP, or emerging A2A standards.

**Bridge's minimum viable product is well-scoped:** a WorkTransfer object + pipeline that connects Agent A to Agent B without manual copy/paste. This is buildable now with existing infrastructure (Git, file system, MCP, CLAUDE.md).

**Bridge's research directions (Effective Directive, Authority, Precedent, Reconciliation) are potential differentiators, not core requirements.** They should be validated by experiment before being built into the product. EXP-005 was designed to provide that validation for the agent-behavior claims, but the data is lost. A repaired and rerun EXP-005 is needed before these concepts can be productized with confidence.

**The largest product risk is not competition - it's scope creep.** The research corpus has produced many concepts (Work Transfer, Context Selection, Project Continuity, Effective Directive, Authority, Precedent, Reconciliation, Commitment, Standing). Not all of these belong in the MVP. The original product idea - ONE PLACE -> MULTIPLE AGENTS -> SHARED PROJECT -> AUTOMATIC WORK TRANSFER - is focused and buildable. The research concepts should strengthen it, not replace it.

---

*End of interoperability map. Proceed to final Phase-2 report.*
