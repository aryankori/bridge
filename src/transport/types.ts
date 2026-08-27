/**
 * Bridge Transport Layer - Type Definitions
 *
 * Abstractions for communication channels between Bridge and agents.
 * Every adapter uses a transport under the hood; the transport handles
 * the raw bytes-on-wire while the adapter handles agent-specific semantics.
 *
 * Design:
 * - Transports are async iterables so consumers can `for await` over messages
 * - State machine lifecycle: idle → connecting → connected → closed/error
 * - All transports emit structured events for observability
 */

// ---------------------------------------------------------------------------
// Transport State Machine
// ---------------------------------------------------------------------------

/** Lifecycle state of a transport connection */
export type TransportState = 'idle' | 'connecting' | 'connected' | 'closed' | 'error';

// ---------------------------------------------------------------------------
// Transport Interface
// ---------------------------------------------------------------------------

/**
 * A bidirectional communication channel to an agent process.
 *
 * Transports abstract the underlying mechanism (stdio, HTTP, WebSocket, etc.)
 * and provide a uniform send/receive interface. They are also async iterables
 * so consumers can stream incoming data with `for await`.
 */
export interface Transport extends AsyncIterable<unknown> {
  /** Current connection state */
  readonly state: TransportState;

  /** Open the connection. Resolves when ready to send/receive. */
  connect(): Promise<void>;

  /** Send a JSON-serializable object to the agent. */
  send(data: unknown): Promise<void>;

  /**
   * Gracefully close the connection.
   * After close(), the async iterator will complete and no more data arrives.
   */
  close(): Promise<void>;

  /**
   * Subscribe to transport events.
   * Returns an unsubscribe function.
   */
  onError(handler: (error: Error) => void): () => void;
  onClose(handler: (code: number | null) => void): () => void;
}

// ---------------------------------------------------------------------------
// Stdio Transport Options
// ---------------------------------------------------------------------------

/** Configuration for spawning a child process transport */
export interface StdioTransportOptions {
  /** Command to execute (e.g., 'claude', 'opencode') */
  command: string;
  /** Command-line arguments */
  args?: string[];
  /** Working directory for the child process */
  cwd?: string;
  /** Environment variables (merged with process.env) */
  env?: Record<string, string>;
  /** Timeout in ms for the process to start producing output */
  startupTimeoutMs?: number;
}

// ---------------------------------------------------------------------------
// JSON-RPC 2.0 Types
// ---------------------------------------------------------------------------

/** A JSON-RPC 2.0 request */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: unknown;
}

/** A JSON-RPC 2.0 notification (no id, no response expected) */
export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

/** A JSON-RPC 2.0 success response */
export interface JsonRpcSuccessResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result: unknown;
}

/** A JSON-RPC 2.0 error response */
export interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/** Any JSON-RPC 2.0 response */
export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

/** Any JSON-RPC 2.0 message */
export type JsonRpcMessage = JsonRpcRequest | JsonRpcNotification | JsonRpcResponse;

/** Standard JSON-RPC 2.0 error codes */
export const JSON_RPC_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

// ---------------------------------------------------------------------------
// Type Guards
// ---------------------------------------------------------------------------

export function isJsonRpcRequest(msg: unknown): msg is JsonRpcRequest {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'jsonrpc' in msg &&
    (msg as JsonRpcRequest).jsonrpc === '2.0' &&
    'method' in msg &&
    'id' in msg
  );
}

export function isJsonRpcNotification(msg: unknown): msg is JsonRpcNotification {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'jsonrpc' in msg &&
    (msg as JsonRpcNotification).jsonrpc === '2.0' &&
    'method' in msg &&
    !('id' in msg)
  );
}

export function isJsonRpcResponse(msg: unknown): msg is JsonRpcResponse {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'jsonrpc' in msg &&
    (msg as JsonRpcResponse).jsonrpc === '2.0' &&
    ('result' in msg || 'error' in msg)
  );
}

export function isJsonRpcErrorResponse(msg: unknown): msg is JsonRpcErrorResponse {
  return isJsonRpcResponse(msg) && 'error' in msg;
}
