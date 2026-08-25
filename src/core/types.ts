/**
 * Bridge Core Types
 *
 * Fundamental type definitions for the Bridge interoperability layer.
 * These types represent the minimum common substrate discovered from
 * inspecting real AI agents on the development machine.
 *
 * Evidence basis:
 * - Claude Code 2.1.233 (ACP, stream-json, named pipes)
 * - OpenCode 1.18.23 (ACP, serve, HTTP)
 * - Hermes Agent 0.20.2 (ACP, serve, WebSocket)
 * - Gemini CLI 0.42.0 (ACP, stream-json)
 * - Antigravity CLI/agy (ACP, stream-json)
 *
 * Design principle: These types are agent-agnostic. Agent-specific
 * behavior belongs in adapters, not here.
 */

// ---------------------------------------------------------------------------
// Agent Identity
// ---------------------------------------------------------------------------

/** How a capability or fact was determined */
export type EvidenceLevel = 'documented' | 'observed' | 'inferred' | 'unknown';

/** Unique identifier for an agent instance */
export type AgentId = string & { readonly __brand: unique symbol };

/** Create a typed AgentId from a string */
export function agentId(id: string): AgentId {
  return id as AgentId;
}

/** Transport mechanism used to communicate with an agent */
export type TransportKind = 'acp' | 'stdio-json' | 'http' | 'websocket' | 'named-pipe';

/** An agent's declared or discovered capabilities */
export interface AgentCapabilities {
  /** Can Bridge launch this agent programmatically? */
  launch: boolean;
  /** Can Bridge send messages to an existing session? */
  sendMessage: boolean;
  /** Can Bridge receive streaming output? */
  streamOutput: boolean;
  /** Can Bridge list existing sessions? */
  listSessions: boolean;
  /** Can Bridge resume a previous session? */
  resumeSession: boolean;
  /** Can Bridge export session data? */
  exportSession: boolean;
  /** Can Bridge import session data? */
  importSession: boolean;
  /** Does the agent support MCP as a client? */
  mcpClient: boolean;
  /** Does the agent support MCP as a server? */
  mcpServer: boolean;
  /** Does the agent support ACP? */
  acp: boolean;
}

/** Static identity and metadata for a discovered agent */
export interface AgentDescriptor {
  /** Unique identifier */
  id: AgentId;
  /** Human-readable name */
  name: string;
  /** Version string if known */
  version: string | null;
  /** Path to the executable */
  executablePath: string;
  /** Primary data/config directory */
  dataDir: string | null;
  /** Available transport mechanisms */
  transports: TransportKind[];
  /** Discovered capabilities */
  capabilities: AgentCapabilities;
  /** How each fact was determined */
  evidence: Record<string, EvidenceLevel>;
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

/** Unique identifier for a session */
export type SessionId = string & { readonly __brand: unique symbol };

export function sessionId(id: string): SessionId {
  return id as SessionId;
}

/** Current lifecycle state of a session */
export type SessionState = 'created' | 'active' | 'idle' | 'closed' | 'error';

/** A session represents a single conversation/task context with an agent */
export interface Session {
  id: SessionId;
  agentId: AgentId;
  state: SessionState;
  createdAt: Date;
  lastActivityAt: Date;
  /** Opaque metadata the adapter may attach */
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/** Direction of a message relative to Bridge */
export type MessageDirection = 'outbound' | 'inbound';

/** Content type of a message */
export type MessageContentType = 'text' | 'tool-call' | 'tool-result' | 'error' | 'system';

/** A message exchanged between Bridge and an agent */
export interface Message {
  /** Unique message identifier */
  id: string;
  /** Which session this message belongs to */
  sessionId: SessionId;
  /** Direction relative to Bridge */
  direction: MessageDirection;
  /** Content type */
  contentType: MessageContentType;
  /** The message content */
  content: string;
  /** Timestamp */
  timestamp: Date;
  /** Raw data from the agent transport, for debugging/passthrough */
  raw?: unknown;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** All event types that the Bridge event bus can emit */
export type BridgeEventType =
  | 'agent:discovered'
  | 'agent:registered'
  | 'agent:removed'
  | 'session:created'
  | 'session:active'
  | 'session:idle'
  | 'session:closed'
  | 'session:error'
  | 'message:sent'
  | 'message:received'
  | 'message:stream-chunk'
  | 'transport:connected'
  | 'transport:disconnected'
  | 'transport:error';

/** Payload map for typed event handling */
export interface BridgeEventMap {
  'agent:discovered': { descriptor: AgentDescriptor };
  'agent:registered': { descriptor: AgentDescriptor };
  'agent:removed': { agentId: AgentId };
  'session:created': { session: Session };
  'session:active': { session: Session };
  'session:idle': { session: Session };
  'session:closed': { session: Session };
  'session:error': { session: Session; error: Error };
  'message:sent': { message: Message };
  'message:received': { message: Message };
  'message:stream-chunk': { sessionId: SessionId; chunk: string; done: boolean };
  'transport:connected': { agentId: AgentId; transport: TransportKind };
  'transport:disconnected': { agentId: AgentId; transport: TransportKind };
  'transport:error': { agentId: AgentId; transport: TransportKind; error: Error };
}

/** A single event on the Bridge event bus */
export interface BridgeEvent<T extends BridgeEventType = BridgeEventType> {
  type: T;
  payload: BridgeEventMap[T];
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Adapter Contract
// ---------------------------------------------------------------------------

/**
 * The adapter contract defines what Bridge expects from each agent integration.
 *
 * This is the central abstraction that keeps agent-specific logic isolated.
 * Each agent gets its own adapter implementation. The Bridge core never
 * imports agent-specific code directly.
 *
 * Design evidence:
 * - All discovered agents support some form of launch + message + stream
 * - Session management varies significantly (JSONL vs SQLite vs YAML)
 * - Transport varies (ACP vs stdio-json vs HTTP vs named-pipe)
 * - Capabilities vary (export/import only on Claude Code + OpenCode)
 */
export interface AgentAdapter {
  /** The agent this adapter handles */
  readonly descriptor: AgentDescriptor;

  /** Discover if the agent is available on this machine */
  discover(): Promise<AgentDescriptor | null>;

  /** Launch a new session with the agent */
  createSession(options?: Record<string, unknown>): Promise<Session>;

  /** Attach to an existing session */
  attachSession(sessionId: SessionId): Promise<Session>;

  /** List known sessions */
  listSessions(): Promise<Session[]>;

  /** Send a message to an active session */
  sendMessage(sessionId: SessionId, content: string): Promise<void>;

  /**
   * Subscribe to streaming output from a session.
   * Returns an async iterable of message chunks.
   */
  streamOutput(sessionId: SessionId): AsyncIterable<Message>;

  /** Gracefully close a session */
  closeSession(sessionId: SessionId): Promise<void>;

  /** Clean up all resources held by this adapter */
  dispose(): Promise<void>;
}
