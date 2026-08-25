/**
 * Bridge Transport Layer
 *
 * Abstractions over the communication mechanisms between Bridge and agents.
 * Based on reconnaissance findings:
 *
 * - ACP (Agent Client Protocol): JSON-RPC 2.0 — primary for all agents
 * - stdio-json: stream-json format via stdin/stdout — Claude Code, OpenCode, Gemini, agy
 * - HTTP: local server — OpenCode serve, Hermes serve
 * - WebSocket: real-time bidirectional — Hermes gateway
 * - Named Pipes: Windows IPC — Claude Code daemon
 *
 * Transport implementations will be added as adapters need them.
 */

// Transport implementations will be registered here.
// Example:
// export { AcpTransport } from './acp.js';
// export { StdioJsonTransport } from './stdio-json.js';
