# Phase 0 - Machine Forensics Report

**Date:** 2026-08-25
**Machine:** HP Pavilion Gaming Laptop 15-ec2xxx
**OS:** Windows 11 Pro (Build 26200), 64-bit
**Investigator:** Bridge Foundation

---

## 1. System Architecture

| Component        | Detail                                 |
| ---------------- | -------------------------------------- |
| CPU              | AMD Ryzen 7 5800H (8C/16T @ 3.194 GHz) |
| GPU (discrete)   | NVIDIA GeForce RTX 3050 Laptop         |
| GPU (integrated) | AMD Radeon                             |
| RAM              | 15.35 GiB total, ~85-90% used at idle  |
| Disk             | 475 GiB total, **97% used** (critical) |
| Shell            | PowerShell 7.6.5                       |
| Kernel           | 10.0.26200.0                           |

### Installed Runtimes

| Runtime | Version            | Path                                                        |
| ------- | ------------------ | ----------------------------------------------------------- |
| Node.js | 25.2.1             | `scoop\apps\nodejs\current\`                                |
| npm     | 11.10.0            | (bundled with Node.js)                                      |
| pnpm    | 9.15.3             | `%APPDATA%\npm\`                                            |
| Deno    | 2.8.2              | `scoop\apps\deno\`                                          |
| Python  | 3.14               | `C:\Program Files\Python314\` (pip only, no `python` alias) |
| Ruby    | 4.0.6              | `scoop\apps\ruby\`                                          |
| Git     | (latest via scoop) | `C:\Program Files\Git\`                                     |
| Rust    | ❌ Not installed   | scoop install failed                                        |
| Go      | ❌ Not installed   | scoop install failed                                        |
| .NET    | ❌ Not installed   | -                                                          |

### Package Managers

- **scoop** - 36 packages (primary Windows package manager)
- **chocolatey** - 19 packages (via UniGetUI)
- **npm** / **pnpm** - Node.js packages
- **pip** - Python packages

### Developer Tools

| Tool            | Available                                       |
| --------------- | ----------------------------------------------- |
| VS Code         | ✅ `%LOCALAPPDATA%\Programs\Microsoft VS Code\` |
| Cursor          | ✅ `C:\Program Files\cursor\`                   |
| Git             | ✅                                              |
| GitHub CLI (gh) | ✅ v2.83.1, authenticated as `aryankori`        |
| Docker          | ❌ Not installed                                |
| WSL             | ✅ Available (via WindowsApps)                  |

---

## 2. Discovered AI Agents

### 2.1 Claude Code

| Attribute      | Value                               | Evidence                         |
| -------------- | ----------------------------------- | -------------------------------- |
| **Version**    | 2.1.233                             | [DOCUMENTED] `claude --version`  |
| **Executable** | `~\.local\bin\claude.exe`           | [OBSERVED]                       |
| **Data Dir**   | `~\.claude\`                        | [OBSERVED] filesystem inspection |
| **App Data**   | `%APPDATA%\Claude\`                 | [OBSERVED] Electron app data     |
| **Daemon**     | Supervisor process with named pipes | [OBSERVED] daemon.log            |
| **Named Pipe** | `\\.\pipe\cc-daemon-*-control`      | [OBSERVED] daemon.log            |

**Process Architecture:**

- Claude Code CLI binary (`claude.exe`) - the primary interface
- Daemon supervisor - manages background workers
- Workers - prewarmed instances for faster response
- Named pipe control socket for inter-process communication

**Transport:**

- `--output-format stream-json` - structured streaming via stdout [DOCUMENTED]
- `--output-format json` - single JSON result [DOCUMENTED]
- `--input-format stream-json` - structured streaming input via stdin [DOCUMENTED]
- Named pipe daemon control [OBSERVED]
- `--remote-control` - Remote Control mode with named session [DOCUMENTED]

**Session Storage:**

- `~\.claude\sessions\` - session data [OBSERVED]
- `%APPDATA%\Claude\claude-code-sessions\` - Electron-managed sessions [OBSERVED]
- `~\.claude\history.jsonl` - conversation history index [OBSERVED]
- Resumable via `--resume`, `--continue`, `--session-id` [DOCUMENTED]

**Integration Surfaces:**

- ACP-compatible (stream-json input/output) [DOCUMENTED]
- MCP client and server [DOCUMENTED] `claude mcp`
- Background agents [DOCUMENTED] `claude agents`, `--bg`
- Plugin system [DOCUMENTED] `claude plugin`
- Import from other agents [DOCUMENTED] `claude import`
- Cloud sessions [DOCUMENTED] `--cloud`

**Key Capabilities:**

- ✅ Launch, stop, resume
- ✅ Send input (stdin or stream-json)
- ✅ Receive streaming output
- ✅ Session management
- ✅ MCP server/client
- ✅ Background agents
- ✅ Import context from other agents

---

### 2.2 OpenCode

| Attribute      | Value                                                      | Evidence                          |
| -------------- | ---------------------------------------------------------- | --------------------------------- |
| **Version**    | 1.18.23                                                    | [DOCUMENTED] `opencode --version` |
| **Executable** | `scoop\apps\opencode\current\opencode.exe`                 | [OBSERVED]                        |
| **Desktop**    | `%LOCALAPPDATA%\Programs\@opencode-aidesktop\OpenCode.exe` | [OBSERVED] running process        |
| **Data Dir**   | `~\.config\opencode\` + `~\.codex\`                        | [OBSERVED]                        |

**Process Architecture:**

- CLI (`opencode.exe`) - TUI and headless modes
- Desktop app (`OpenCode.exe`) - Electron-based GUI
- Headless server (`opencode serve`) - HTTP API
- ACP server (`opencode acp`) - JSON-RPC for editor integration

**Transport:**

- `opencode serve` - local HTTP server [DOCUMENTED]
- `opencode acp` - JSON-RPC 2.0 (ACP standard) [DOCUMENTED]
- `opencode attach <url>` - attach to running server [DOCUMENTED]
- `opencode web` - HTTP server + web UI [DOCUMENTED]
- mDNS service discovery (optional) [DOCUMENTED]

**Session Storage:**

- `~\.codex\sessions\` - session directories [OBSERVED]
- `~\.codex\state_5.sqlite` - state database (200KB) [OBSERVED]
- `~\.codex\logs_2.sqlite` - log database (6.2MB) [OBSERVED]
- `~\.codex\memories_1.sqlite` - memory database (40KB) [OBSERVED]
- `~\.codex\goals_1.sqlite` - goals database (32KB) [OBSERVED]
- `~\.codex\session_index.jsonl` - session index [OBSERVED]
- Session export/import via `opencode export`/`opencode import` [DOCUMENTED]

**Integration Surfaces:**

- ACP server [DOCUMENTED]
- MCP client [DOCUMENTED] `opencode mcp`
- Session export/import (JSON) [DOCUMENTED]
- Plugin system [DOCUMENTED] `opencode plugin`
- Agent system [DOCUMENTED] `opencode agent`
- Database tools [DOCUMENTED] `opencode db`

**Key Capabilities:**

- ✅ Launch, stop, resume
- ✅ Send messages
- ✅ Headless server mode
- ✅ ACP standard protocol
- ✅ Session export/import
- ✅ MCP client
- ✅ mDNS discovery

---

### 2.3 Hermes Agent

| Attribute      | Value                                                                             | Evidence                        |
| -------------- | --------------------------------------------------------------------------------- | ------------------------------- |
| **Version**    | 0.20.2                                                                            | [DOCUMENTED] `hermes --version` |
| **Executable** | `%LOCALAPPDATA%\hermes\hermes-agent\venv\Scripts\hermes.exe`                      | [OBSERVED]                      |
| **Desktop**    | `%LOCALAPPDATA%\hermes\hermes-agent\apps\desktop\release\win-unpacked\Hermes.exe` | [OBSERVED]                      |
| **Data Dir**   | `%LOCALAPPDATA%\hermes\`                                                          | [OBSERVED]                      |

**Process Architecture:**

- Python-based CLI (`hermes.exe`) - the primary interface
- Desktop app (Electron) - 5 processes running
- Gateway server on port 9119 - JSON-RPC/WebSocket
- Web UI server

**Transport:**

- `hermes serve` - HTTP/WebSocket server on port 9119 [DOCUMENTED]
- `hermes acp` - ACP mode for editor integration [DOCUMENTED]
- Gateway - JSON-RPC/WebSocket [OBSERVED] gateway_state.json
- Pairing system for remote access [OBSERVED]

**Session Storage:**

- `%LOCALAPPDATA%\hermes\sessions\` - session directories [OBSERVED]
- `%LOCALAPPDATA%\hermes\state.db` - SQLite state database (28MB) [OBSERVED]
- `%LOCALAPPDATA%\hermes\kanban.db` - task database (118KB) [OBSERVED]
- `%LOCALAPPDATA%\hermes\projects.db` - project database (45KB) [OBSERVED]
- `%LOCALAPPDATA%\hermes\memories\` - memory system [OBSERVED]
- `%LOCALAPPDATA%\hermes\config.yaml` - configuration (18KB) [OBSERVED]
- Resumable via `--resume`, `--continue` [DOCUMENTED]

**Integration Surfaces:**

- ACP mode [DOCUMENTED]
- MCP client/server [DOCUMENTED] `hermes mcp`
- Gateway API (WebSocket) [OBSERVED]
- Plugin/skills system [DOCUMENTED]
- Kanban/task system [DOCUMENTED]
- WhatsApp/Slack integrations [DOCUMENTED]
- Cron scheduling [DOCUMENTED]

**Key Capabilities:**

- ✅ Launch, stop, resume
- ✅ Send messages
- ✅ WebSocket server
- ✅ ACP mode
- ✅ MCP client/server
- ✅ Task management (kanban)
- ✅ Scheduled operations (cron)
- ✅ Multi-platform messaging (WhatsApp, Slack)

---

### 2.4 Gemini CLI

| Attribute      | Value                                      | Evidence                        |
| -------------- | ------------------------------------------ | ------------------------------- |
| **Version**    | 0.42.0                                     | [DOCUMENTED] `gemini --version` |
| **Executable** | `scoop\apps\nodejs\current\bin\gemini.ps1` | [OBSERVED]                      |
| **Data Dir**   | `~\.gemini\`                               | [OBSERVED]                      |

**Transport:**

- `--output-format stream-json` - structured streaming [DOCUMENTED]
- `--output-format json` - single JSON result [DOCUMENTED]
- `--acp` - ACP mode [DOCUMENTED]
- Sandbox mode [DOCUMENTED]

**Session Storage:**

- `~\.gemini\history\` - session history [OBSERVED]
- Resumable via `--resume` [DOCUMENTED]

**Key Capabilities:**

- ✅ Launch, resume
- ✅ ACP mode
- ✅ Structured output (stream-json)
- ✅ MCP client [DOCUMENTED]
- ✅ Extension system [DOCUMENTED]
- ✅ Skills system [DOCUMENTED]

---

### 2.5 Antigravity CLI (agy)

| Attribute      | Value                                 | Evidence   |
| -------------- | ------------------------------------- | ---------- |
| **Executable** | `%LOCALAPPDATA%\agy\bin\agy.exe`      | [OBSERVED] |
| **Data Dir**   | `~\.gemini\` (shared with Gemini CLI) | [OBSERVED] |

**Transport:**

- `--output-format stream-json` - structured streaming [DOCUMENTED]
- `--output-format json` - single JSON result [DOCUMENTED]

**Session Storage:**

- Shared with Gemini CLI / Antigravity IDE
- Resumable via `--conversation`, `--continue` [DOCUMENTED]

**Key Capabilities:**

- ✅ Launch, resume
- ✅ Structured output
- ✅ Agent selection [DOCUMENTED]
- ✅ Project management [DOCUMENTED]

---

### 2.6 Antigravity IDE

| Attribute      | Value                                                         | Evidence   |
| -------------- | ------------------------------------------------------------- | ---------- |
| **Executable** | `%LOCALAPPDATA%\Programs\Antigravity IDE\Antigravity IDE.exe` | [OBSERVED] |
| **Data Dir**   | `~\.gemini\antigravity-ide\`                                  | [OBSERVED] |
| **Running**    | ✅ 13 processes                                               | [OBSERVED] |

**Note:** Antigravity IDE is the current execution context. It's an Electron-based IDE with integrated AI agent capabilities. Its internal protocol is proprietary but it shares the `~\.gemini\` data directory with Gemini CLI and agy.

---

### 2.7 Other Discovered Software

| Software       | Status                    | Notes                                            |
| -------------- | ------------------------- | ------------------------------------------------ |
| **Cursor**     | Installed but not running | Electron-based IDE at `C:\Program Files\cursor\` |
| **Ollama**     | Installed but not running | Local LLM server (v0.32.15)                      |
| **ChatBox AI** | Install failed            | scoop install error                              |

---

## 3. Protocol Convergence Analysis

The most critical finding: **every major AI coding agent on this machine supports or is converging toward ACP (Agent Client Protocol).**

| Agent       | ACP | Stream-JSON | HTTP Server | WebSocket | Named Pipes | MCP |
| ----------- | --- | ----------- | ----------- | --------- | ----------- | --- |
| Claude Code | ✅  | ✅          | ❌          | ❌        | ✅          | ✅  |
| OpenCode    | ✅  | ❌          | ✅          | ❌        | ❌          | ✅  |
| Hermes      | ✅  | ❌          | ✅          | ✅        | ❌          | ✅  |
| Gemini CLI  | ✅  | ✅          | ❌          | ❌        | ❌          | ✅  |
| agy         | ❌  | ✅          | ❌          | ❌        | ❌          | ❌  |

**ACP** is the minimum common denominator. Bridge should build on ACP as its primary integration protocol.

---

## 4. Session Architecture Comparison

| Agent       | Primary Storage       | Format        | Resumable | Exportable             |
| ----------- | --------------------- | ------------- | --------- | ---------------------- |
| Claude Code | `~\.claude\sessions\` | JSONL         | ✅        | ❌ (no export cmd)     |
| OpenCode    | `~\.codex\*.sqlite`   | SQLite        | ✅        | ✅ (`export`/`import`) |
| Hermes      | `state.db`            | SQLite (28MB) | ✅        | ❌                     |
| Gemini CLI  | `~\.gemini\history\`  | Unknown       | ✅        | ❌                     |

**Observation:** Session formats are fundamentally different. A Bridge Session abstraction must normalize over JSONL, SQLite, and potentially YAML without losing fidelity.

---

## 5. Running Process Summary (at time of inspection)

| Process            | Count | Parent                       |
| ------------------ | ----- | ---------------------------- |
| Antigravity IDE    | 13    | Electron multi-process       |
| Hermes (desktop)   | 5     | Electron multi-process       |
| OpenCode (desktop) | 6     | Electron multi-process       |
| OpenCode (CLI)     | 2     | Terminal                     |
| Node.js            | 12    | Various (MCP servers, tools) |

**Total AI-related processes:** ~38

---

## 6. Critical Constraints

1. **Disk space:** 97% used. Every dependency must be justified.
2. **Memory:** 85-90% used at idle with 3 desktop AI apps running.
3. **No Docker:** Not installed. Bridge must run natively.
4. **No Rust/Go:** Failed scoop installs. TypeScript/Node.js is the practical choice.
5. **Python alias broken:** Microsoft Store redirect instead of actual Python binary. pip works via `pip` but not `python`.
