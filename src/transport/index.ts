/**
 * Bridge Transport Layer
 *
 * Abstractions over the communication mechanisms between Bridge and agents.
 * Based on reconnaissance findings:
 *
 * - ACP (Agent Client Protocol): JSON-RPC 2.0 - primary for all agents
 * - stdio-json: stream-json format via stdin/stdout - Claude Code, OpenCode, Gemini, agy
 * - HTTP: local server - OpenCode serve, Hermes serve
 * - WebSocket: real-time bidirectional - Hermes gateway
 * - Named Pipes: Windows IPC - Claude Code daemon
 *
 * Currently implemented:
 * - StdioJsonTransport: NDJSON over child process stdin/stdout
 * - JsonRpcClient: JSON-RPC 2.0 protocol layer over any transport
 */

export type {
  Transport,
  TransportState,
  StdioTransportOptions,
  JsonRpcRequest,
  JsonRpcNotification,
  JsonRpcSuccessResponse,
  JsonRpcErrorResponse,
  JsonRpcResponse,
  JsonRpcMessage,
} from './types.js';

export {
  JSON_RPC_ERROR_CODES,
  isJsonRpcRequest,
  isJsonRpcNotification,
  isJsonRpcResponse,
  isJsonRpcErrorResponse,
} from './types.js';

export { StdioJsonTransport } from './stdio-json.js';
export { JsonRpcClient, JsonRpcError } from './jsonrpc.js';
