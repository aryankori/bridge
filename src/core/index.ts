/**
 * Bridge Core - Public API
 */

export { EventBus } from './events.js';
export { AgentRegistry } from './registry.js';
export type {
  AgentAdapter,
  AgentCapabilities,
  AgentDescriptor,
  AgentId,
  BridgeEvent,
  BridgeEventMap,
  BridgeEventType,
  EvidenceLevel,
  Message,
  MessageContentType,
  MessageDirection,
  Session,
  SessionId,
  SessionState,
  TransportKind,
} from './types.js';
export { agentId, sessionId } from './types.js';
