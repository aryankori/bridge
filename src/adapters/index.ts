/**
 * Bridge Adapters - Agent-specific integrations
 *
 * Each adapter encapsulates all knowledge about one agent.
 * The Bridge core imports adapters through this barrel;
 * it never references agent-specific code directly.
 *
 * Planned adapters (based on machine forensics):
 * - Claude Code (ACP + stream-json + named pipes)
 * - OpenCode (ACP + serve HTTP)
 * - Hermes Agent (ACP + serve WebSocket)
 * - Gemini CLI (ACP + stream-json)
 * - Antigravity CLI/agy (ACP + stream-json)
 */

// Adapters will be registered here as they are implemented.
// Example:
// export { ClaudeCodeAdapter } from './claude-code/index.js';
// export { OpenCodeAdapter } from './opencode/index.js';
