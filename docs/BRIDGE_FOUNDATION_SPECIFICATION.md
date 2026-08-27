# BRIDGE FOUNDATION SPECIFICATION

**Document Version:** 1.0.0  
**Date:** 2026-08-25  
**Author:** Founding Principal Engineer  
**Status:** Approved Foundation  

---

## 1. Machine Architecture

```text
Host: HP Pavilion Gaming Laptop 15-ec2xxx
OS: Windows 11 Pro [64-bit] (Build 10.0.26200.0)
CPU: AMD Ryzen 7 5800H (8 Cores, 16 Threads @ 3.194 GHz)
GPU: NVIDIA GeForce RTX 3050 Laptop GPU (4 GB) + AMD Radeon Graphics
RAM: 15.35 GiB (13.7 GiB used / 89% load)
Disk (C:): 475 GiB Total (462 GiB used / 97% load - Critical Constraint)
Shell: PowerShell v7.6.5
Package Managers: Scoop (36 packages), Chocolatey (19 packages), pnpm (v9.15.3)
```

---

## 2. Discovered AI Applications

| Agent | Version | Binary Path | Data Directory | Runtime Status |
| :--- | :--- | :--- | :--- | :--- |
| **Claude Code** | 2.1.233 | `C:\Users\aryan\.local\bin\claude.exe` | `~\.claude\` & `%APPDATA%\Claude\` | Installed (Daemon on named pipe) |
| **OpenCode** | 1.18.23 | `~\scoop\apps\opencode\current\opencode.exe` | `~\.config\opencode\` & `~\.codex\` | Active (Desktop + CLI) |
| **Hermes Agent** | 0.20.2 | `~\AppData\Local\hermes\hermes-agent\venv\Scripts\hermes.exe` | `~\AppData\Local\hermes\` | Active (Desktop UI + Server) |
| **Gemini CLI** | 0.42.0 | `~\scoop\apps\nodejs\current\bin\gemini.ps1` | `~\.gemini\` | Installed |
| **Antigravity CLI (agy)** | 1.0.0 | `~\AppData\Local\agy\bin\agy.exe` | `~\.gemini\` | Installed |
| **Antigravity IDE** | Current | `~\AppData\Local\Programs\Antigravity IDE\Antigravity IDE.exe` | `~\.gemini\antigravity-ide\` | Active (Parent Host) |
| **Ollama** | 0.32.15 | `~\scoop\apps\ollama\current\ollama.exe` | `~\.ollama\` | Installed (Service stopped) |
| **Cursor** | Current | `C:\Program Files\cursor\Cursor.exe` | `%APPDATA%\Cursor\` | Installed |

---

## 3. Process Architecture

```text
[BRIDGE PROCESS ENGINE]
       │
       ├── (1) Subprocess Spawn (stdio pipes)
       │         ├── Claude Code CLI (`claude -p --output-format stream-json`)
       │         ├── Gemini CLI (`gemini -p --output-format stream-json`)
       │         └── agy (`agy -p --output-format stream-json`)
       │
       ├── (2) JSON-RPC 2.0 ACP Server / Client
       │         ├── OpenCode ACP (`opencode acp`)
       │         └── Hermes ACP (`hermes acp`)
       │
       ├── (3) Local Loopback HTTP / WebSocket Gateway
       │         ├── OpenCode HTTP Server (`opencode serve --port 0`)
       │         └── Hermes WebSocket Server (`hermes serve --port 9119`)
       │
       └── (4) Windows Named Pipes (IPC)
                 └── Claude Supervisor (`\\.\pipe\cc-daemon-*-control`)
```

---

## 4. Session Architecture

Sessions operate across three distinct storage patterns:

1. **Structured Append Log (JSONL):**
  - *Agents:* Claude Code (`~\.claude\history.jsonl`, `~\.claude\sessions\*.jsonl`), agy.
  - *Format:* Line-delimited JSON events with explicit turn counters, tokens, and ISO timestamps.
  - *Lifecycle:* Append-only per turn; resumed via `--resume <id>` or `--continue`.

2. **Relational Transactional Engine (SQLite with WAL):**
  - *Agents:* OpenCode (`~\.codex\state_5.sqlite`, `logs_2.sqlite`), Hermes (`~\AppData\Local\hermes\state.db`, `kanban.db`).
  - *Format:* ACID relational schema with separate tables for sessions, messages, tool executions, and embeddings.
  - *Lifecycle:* Multi-session state preservation with transactional rollbacks and export/import commands.

3. **Hybrid File System Hierarchies (JSON / YAML / Markdown):**
  - *Agents:* Gemini CLI (`~\.gemini\history\`), Hermes (`~\AppData\Local\hermes\memories\`).
  - *Format:* Directory tree containing discrete conversation state files.

---

## 5. Integration Surfaces

| Agent | Official CLI | Headless Stream | ACP Protocol | MCP Protocol | Web/Socket API |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Claude Code** | `claude` | `--output-format stream-json` | Documented | Client + Server | Named Pipe |
| **OpenCode** | `opencode` | `opencode run` | `opencode acp` | Client | `opencode serve` (HTTP) |
| **Hermes** | `hermes` | Stdio streaming | `hermes acp` | Client + Server | `hermes serve` (Port 9119) |
| **Gemini CLI** | `gemini` | `--output-format stream-json` | `--acp` | Client | CLI only |
| **Antigravity agy** | `agy` | `--output-format stream-json` | ACP Compatible | CLI extensions | Process IPC |

---

## 6. Evidence Matrix

| Finding | Classification | Evidence Source |
| :--- | :--- | :--- |
| Claude Code supports line-delimited streaming JSON | `[DOCUMENTED]` | `claude --help` (`--output-format stream-json`) |
| Claude Supervisor binds to Windows named pipe | `[OBSERVED]` | `~\.claude\daemon.log` (`\\.\pipe\cc-daemon-*-control`) |
| OpenCode exposes Agent Client Protocol JSON-RPC server | `[DOCUMENTED]` | `opencode acp --help` |
| Hermes Agent exposes local WebSocket gateway | `[DOCUMENTED]` | `hermes serve --help` (Default port: 9119) |
| OpenCode session state stored in SQLite WAL database | `[OBSERVED]` | File inspection: `~\.codex\state_5.sqlite-wal` (4.2 MB) |
| Disk space is at 97% saturation | `[OBSERVED]` | Windows Storage Check: 462 GiB / 475 GiB |
| All major installed CLI agents converge on ACP | `[OBSERVED]` | Direct parameter confirmation across Claude, OpenCode, Hermes, Gemini |

---

## 7. Competitive Technical Analysis

```text
┌─────────────────┬──────────────────────┬────────────────────────┬─────────────────────────────┐
│ Project         │ Architecture         │ Transport Substrate    │ Core Limitation             │
├─────────────────┼──────────────────────┼────────────────────────┼─────────────────────────────┤
│ Lori / Capella  │ Cloud Agent Relay    │ Remote WebSockets      │ Requires Cloud; No Local IPC│
│ cdesktop        │ Virtual Display / OS │ Screen Framebuffer / VNC│ High Latency; Fragile Vision│
│ Astrail         │ Multi-CLI Wrapper    │ Unstructured Stdio     │ Regex Parsing; No Protocols │
│ GT Office       │ Desktop Multi-Window │ Electron Webview Tabs  │ Pure UI Shell; No Shared Bus│
│ BRIDGE (Target) │ Native System Layer  │ ACP + Stdio-JSON + IPC │ Local-first; Zero-cloud IPC │
└─────────────────┴──────────────────────┴────────────────────────┴─────────────────────────────┘
```

---

## 8. Fundamental Bridge Abstractions

```text
┌─────────────────────────────────────────────────────────────┐
│                         BRIDGE CORE                         │
├─────────────────────────────────────────────────────────────┤
│  1. AgentDescriptor  ── Static identity, path, capabilities  │
│  2. AgentRegistry    ── Lifecycle, discovery, instance map   │
│  3. EventBus         ── Typed synchronous & async event bus │
│  4. SessionManager   ── Unified session state machine        │
│  5. ContextCarrier   ── Portable snapshot of code & memory   │
│  6. SecurityPolicy   ── Path & command permission sandbox   │
└─────────────────────────────────────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
   ┌───────────────────────────┐ ┌───────────────────────────┐
   │    AcpTransportAdapter    │ │   StdioJsonStreamAdapter  │
   │  (OpenCode / Hermes / IDE)│ │   (Claude Code / Gemini)  │
   └───────────────────────────┘ └───────────────────────────┘
```

---

## 9. Adapter Contract

Every agent integration implements the following contract in TypeScript:

```typescript
export interface AgentAdapter {
  readonly descriptor: AgentDescriptor;
  discover(): Promise<AgentDescriptor | null>;
  createSession(options?: Record<string, unknown>): Promise<Session>;
  attachSession(sessionId: SessionId): Promise<Session>;
  listSessions(): Promise<Session[]>;
  sendMessage(sessionId: SessionId, content: string): Promise<void>;
  streamOutput(sessionId: SessionId): AsyncIterable<Message>;
  closeSession(sessionId: SessionId): Promise<void>;
  dispose(): Promise<void>;
}
```

---

## 10. Event Model

Bridge implements a typed event bus (`EventBus`) with the following core taxonomy:

- `agent:discovered` - Agent detected during filesystem/PATH scan.
- `agent:registered` - Agent adapter activated and ready for dispatch.
- `agent:removed` - Agent adapter torn down and resources released.
- `session:created` - New conversation/task context initialized.
- `session:active` - Agent currently executing model turn or tool call.
- `session:idle` - Agent waiting for input.
- `session:closed` - Session terminated.
- `session:error` - Unhandled failure emitted by agent runtime.
- `message:sent` - Outbound message successfully transmitted to agent.
- `message:received` - Complete turn message received from agent.
- `message:stream-chunk` - Partial token or tool update in real time.
- `transport:connected` / `transport:disconnected` / `transport:error` - Connection lifecycle.

---

## 11. Context Model

Bridge defines a structured `ContextCarrier` format for moving state between heterogeneous agents:

```typescript
export interface ContextCarrier {
  version: '1.0';
  sourceAgentId: AgentId;
  targetAgentId?: AgentId;
  createdAt: Date;
  summary: string;
  files: Array<{
    path: string;
    content: string;
    language: string;
    cursorPosition?: { line: number; column: number };
  }>;
  decisions: Array<{
    topic: string;
    outcome: string;
    rationale: string;
  }>;
  conversationSummary: string;
  activeTask?: {
    goal: string;
    completedSteps: string[];
    nextSteps: string[];
  };
}
```

---

## 12. Security Model

1. **Executable Whitelist:** Bridge only launches binaries matching cryptographic hashes or verified local paths (`~\.local\bin\claude.exe`, `~\scoop\apps\...`).
2. **Path Containment Sandbox:** Working directories are restricted to user-approved roots (`C:\Users\aryan\Documents\AI and ML`).
3. **Loopback Isolation:** All network-based transports (`opencode serve`, `hermes serve`) bind strictly to `127.0.0.1`. Non-loopback binding is rejected.
4. **Secret Sanitization Engine:** Output streams are filtered in real-time to prevent transmission of API keys, bearer tokens, or environment credentials across the event bus.
5. **Human Approval Gateway:** Dangerous capabilities (destructive file writes, arbitrary shell execution) require an explicit confirmation event before dispatch.

---

## 13. Persistence Model

- **Metadata Database:** Embedded SQLite with Write-Ahead Logging (`.bridge/bridge.db`).
- **Storage Tables:** `agents`, `sessions`, `messages`, `context_transfers`, `audit_log`.
- **Lock Management:** Mutex locks per active session to prevent race conditions during concurrent turn dispatches.

---

## 14. Recommended Technology Stack

- **Runtime:** Node.js v25.2.1 + TypeScript v5.7.3 (Strict Mode, ESM output).
- **Package Manager:** `pnpm` v9.15.3 (Hard-link store saves disk space at 97% capacity).
- **Build System:** `tsup` (esbuild core with automated `.d.ts` generation).
- **Test Harness:** `vitest` v4.1.11 (Native ESM, TypeScript execution, in-memory isolation).
- **Linter & Formatter:** ESLint v10 + Prettier v3.

---

## 15. Repository Structure

```text
bridge/
├── .env.example
├── .eslintrc.json
├── .gitignore
├── .prettierrc
├── README.md
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── docs/
│   ├── BRIDGE_FOUNDATION_SPECIFICATION.md
│   ├── adapters/
│   ├── architecture/
│   │   └── 001-initial-stack.md
│   ├── decisions/
│   ├── development/
│   ├── research/
│   │   └── machine-forensics.md
│   └── security/
├── src/
│   ├── index.ts
│   ├── adapters/
│   │   └── index.ts
│   ├── core/
│   │   ├── events.ts
│   │   ├── index.ts
│   │   ├── registry.ts
│   │   └── types.ts
│   └── transport/
│       └── index.ts
└── tests/
    └── core/
        └── core.test.ts
```

---

## 16. Major Risks & Mitigations

1. **Risk:** Machine disk capacity saturation (97% full).  
   *Mitigation:* Use `pnpm` hardlinks, reject heavy browser binaries, clean `dist/` on build.
2. **Risk:** Upstream CLI parameter breaking changes.  
   *Mitigation:* Prefer standard ACP (Agent Client Protocol) over raw CLI flag scraping.
3. **Risk:** Agent deadlocks during bidirectional stdio piping.  
   *Mitigation:* Non-blocking asynchronous streams with timeout alarms and process watchdogs.

---

## 17. Architecture Decisions (Summary)

- **ADR-001:** TypeScript on Node.js selected for native JSON-RPC, ACP compatibility, and Windows named pipe support.
- **ADR-002:** ACP adopted as primary protocol; raw stdio-json streaming adopted as secondary fallback.
- **ADR-003:** In-process event bus with synchronous listener guarantees used for core coordination.

---

## 18. Rejected Alternatives

- **Rust:** Rejected due to 0% installed toolchain state and disk constraint.
- **Python:** Rejected due to broken system `python` alias and GIL process limitations.
- **Generic Terminal Emulator (PTY Scraping):** Rejected because ANSI escape code parsing is fragile compared to structured ACP/stream-json protocols.

---

## 19. First Vertical Slice Design

```text
[BRIDGE ORCHESTRATOR]
        │
        ├── 1. Discovers Claude Code & OpenCode via PATH
        ├── 2. Spawns Claude Code with `--output-format stream-json`
        ├── 3. Collects structured task analysis
        ├── 4. Normalizes output into `ContextCarrier`
        └── 5. Dispatches `ContextCarrier` payload into OpenCode ACP Server
```

---

## 20. Exact Implementation Order

1. **Step 1:** Implement `StdioJsonTransport` with line-delimited JSON parser.
2. **Step 2:** Implement `AcpTransport` client using JSON-RPC 2.0.
3. **Step 3:** Build `ClaudeCodeAdapter` on top of `StdioJsonTransport`.
4. **Step 4:** Build `OpenCodeAdapter` on top of `AcpTransport`.
5. **Step 5:** Create `ContextTransferPipeline` to transfer task state from Claude Code to OpenCode.
6. **Step 6:** Write end-to-end integration test verifying two-agent cross-talk.

---

## Explicit Foundational Answers

### A. What is the lowest-level thing Bridge actually needs to control?
**Answer:** The process lifecycle (`spawn`, `kill`, `stdin` write pipe, `stdout` read pipe) and the local IPC endpoint (Windows named pipe or loopback TCP socket).

### B. What is the minimum common interface across the first two agents?
**Answer:** The **Agent Client Protocol (ACP)** over JSON-RPC 2.0 / `stream-json`. Both Claude Code and OpenCode can accept structured prompts and return structured JSON event streams.

### C. What must remain agent-specific?
**Answer:**
1. Authentication handling (OAuth tokens vs environment keys vs keychain).
2. Internal tool invocation format and permissions.
3. On-disk database schemas (SQLite WAL tables vs JSONL history files).
4. Custom CLI argument variations and model flags.

### D. What is the first piece of code we should write?
**Answer:** The `StdioJsonTransport` and `AcpTransport` modules in `src/transport/` that establish a resilient, line-delimited JSON parser over Node.js readable streams.

### E. What technical assumption about Bridge is currently the biggest risk?
**Answer:** The assumption that agents will reliably maintain execution state across non-interactive headless invocations without dropping context memory.

### F. What should Bridge absolutely NOT attempt to standardize?
**Answer:** Bridge must not standardize prompt engineering formats, model reasoning styles, internal tokenizers, or specific tool call schemas.

### G. What can realistically be made universal across heterogeneous AI applications?
**Answer:**
1. Agent discovery and health probing.
2. Turn-based message dispatch and streaming token reception.
3. Session lifecycle (create, attach, list, terminate).
4. Normalized file and decision context transfer packages (`ContextCarrier`).
