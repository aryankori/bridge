# Bridge Kanban Board - Complete State

**Board:** Bridge Research Program 
**Location:** `C:\Users\aryan\AppData\Local\hermes\kanban\boards\bridge\kanban.db` 
**Profiles discovered:** `default`, `gem`

```
STATUS │ ID │ TASK
───────────┼────────────┼───────────────────────────────────────────────────────────────
▶ ready │ t_678d5f38 │ Start Kanban dispatcher/gateway for Bridge board
▶ ready │ t_797f7e1a │ Monitor competitive landscape (OpenAI/Anthropic/Google + A2A/MCP/ACP)
▶ ready │ t_993fb106 │ Enterprise governance pilot: compliance + dashboard + API
▶ ready │ t_ff76e837 │ Project templates + cross-project precedent learning
▶ ready │ t_9c374e32 │ EXP-005: Analyze 60-trial results and write report <- GATING
───────────┼────────────┼───────────────────────────────────────────────────────────────
◻ todo │ t_9d266726 │ EXP-006: Mechanism isolation (BRIDGE vs PLACEBO vs HUMAN) [blocked]
◻ todo │ t_547539d2 │ EXP-007: Resolver generalization (80-100 scenarios) [blocked]
◻ todo │ t_4963e11a │ Developer CLI resolver: npm package with bridge resolve
◻ todo │ t_3b8abc29 │ Authority graph persistence: store + refine per-project graphs
◻ todo │ t_1e256855 │ Precedent database: storage + lookup + learning from resolved conflicts
◻ todo │ t_a47250d9 │ Multi-agent authority serving: Claude Code, OpenCode, Codex, Gemini CLI
───────────┼────────────┼───────────────────────────────────────────────────────────────
```

**Dependency chain:**
```
t_9c374e32 (EXP-005) ──-> t_9d266726 (EXP-006) ──-> t_547539d2 (EXP-007)
 │ │ │
 │ ▼ ▼
 │ t_4963e11a t_993fb106 (Enterprise)
 │ (CLI resolver) ▲
 │ │ │
 ▼ ▼ │
t_3b8abc29 (Auth graph) ──-> t_1e256855 ─────────────┘
 │ (Precedent DB)
 ▼
t_a47250d9 (Multi-agent serving)
```

**Blocked tasks:**
- `t_9d266726` - blocked pending EXP-005 results + EXP-007
- `t_547539d2` - blocked pending EXP-005 results + EXP-006

---

**Notes for next Bridge session:**

1. **TAVILY:** Store Tavily API key in `~/.hermes/.env` as `TAVILY_API_KEY=...`. Future Bridge research sessions should use `web_search` (already enabled) - if Tavily becomes available as a tool, prefer it for Bridge competitive-landscape and literature searches.

2. **Dispatcher:** Start the gateway to auto-claim ready tasks: `hermes gateway start` (dispatch interval defaults to 60s).

3. **EXP-005 is the gating task.** Everything downstream (EXP-006, EXP-007, enterprise governance) is blocked on it.

4. **CLI resolver (t_4963e11a)** is the highest-priority unblocked product task - it's the wedge.

5. The board is at `~/AppData/Local/hermes/kanban/boards/bridge/`. All task state is durable across sessions.
