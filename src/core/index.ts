/**
 * Bridge Core - Public API
 */

export { EventBus } from './events.js';
export { AgentRegistry } from './registry.js';
export { AgentRouter } from './router.js';
export type { RouteRequirement, RoutingDecision } from './router.js';
export {
 createWorkTransferPackage,
 serializeWorkTransfer,
 deserializeWorkTransfer,
 renderTransferPrompt,
 applyWorkTransferToWorkspace,
 scrubTransferSecrets,
 assertPathConfinement,
} from './work-transfer.js';
export type {
 WorkTransferPackage,
 ChangedFile,
 RelevantFile,
 WorkArtifact,
 CommandExecutionRecord,
 TestExecutionRecord,
 DecisionRecord,
 WorkTransferProvenance,
 CreateWorkTransferOptions,
 ApplyTransferResult,
 FileChangeStatus,
} from './work-transfer.js';
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
