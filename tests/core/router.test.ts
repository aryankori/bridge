/**
 * Unit Tests - AgentRouter Primitive
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRouter } from '../../src/core/router.js';
import { AgentRegistry } from '../../src/core/registry.js';
import { EventBus } from '../../src/core/events.js';
import { agentId } from '../../src/core/types.js';
import type { AgentAdapter, AgentDescriptor, Message, Session, SessionId } from '../../src/core/types.js';
import { createWorkTransferPackage } from '../../src/core/work-transfer.js';

class MockAdapter implements AgentAdapter {
 constructor(public readonly descriptor: AgentDescriptor) {}
 async discover(): Promise<AgentDescriptor | null> { return this.descriptor; }
 async createSession(): Promise<Session> {
 const now = new Date();
 return { id: 'mock-s1' as SessionId, agentId: this.descriptor.id, state: 'created', createdAt: now, lastActivityAt: now };
 }
 async attachSession(id: SessionId): Promise<Session> {
 const now = new Date();
 return { id, agentId: this.descriptor.id, state: 'active', createdAt: now, lastActivityAt: now };
 }
 async listSessions(): Promise<Session[]> { return []; }
 async sendMessage(): Promise<void> {}
 async *streamOutput(): AsyncIterable<Message> {}
 async closeSession(): Promise<void> {}
 async dispose(): Promise<void> {}
}

describe('AgentRouter', () => {
 let registry: AgentRegistry;
 let router: AgentRouter;
 let eventBus: EventBus;

 const mockClaude: AgentDescriptor = {
 id: agentId('claude-code'),
 name: 'Claude Code',
 version: '1.0.0',
 executablePath: '/bin/claude',
 dataDir: null,
 transports: ['stdio-json'],
 capabilities: {
 launch: true,
 sendMessage: true,
 streamOutput: true,
 listSessions: false,
 resumeSession: true,
 exportSession: true,
 importSession: false,
 mcpClient: true,
 mcpServer: false,
 acp: true,
 },
 evidence: { launch: 'observed' },
 };

 const mockOpenCode: AgentDescriptor = {
 id: agentId('opencode'),
 name: 'OpenCode',
 version: '2.0.0',
 executablePath: '/bin/opencode',
 dataDir: null,
 transports: ['stdio-json', 'http'],
 capabilities: {
 launch: true,
 sendMessage: true,
 streamOutput: true,
 listSessions: true,
 resumeSession: true,
 exportSession: true,
 importSession: true,
 mcpClient: true,
 mcpServer: false,
 acp: true,
 },
 evidence: { launch: 'observed' },
 };

 beforeEach(() => {
 eventBus = new EventBus();
 registry = new AgentRegistry(eventBus);
 registry.register(new MockAdapter(mockClaude));
 registry.register(new MockAdapter(mockOpenCode));
 router = new AgentRouter(registry);
 });

 it('routes to preferred agent when requested and available', () => {
 const decision = router.route({
 preferredAgentId: agentId('claude-code'),
 });

 expect(decision.selectedAgentId).toBe('claude-code');
 expect(decision.matchedPreferred).toBe(true);
 expect(decision.score).toBe(1.0);
 });

 it('falls back to highest scoring agent when preferred agent is missing', () => {
 const decision = router.route({
 preferredAgentId: agentId('nonexistent-agent'),
 allowFallback: true,
 });

 // OpenCode has higher capabilities (importSession, listSessions) -> higher score
 expect(decision.selectedAgentId).toBe('opencode');
 expect(decision.matchedPreferred).toBe(false);
 });

 it('throws when preferred agent is missing and allowFallback is false', () => {
 expect(() =>
 router.route({
 preferredAgentId: agentId('nonexistent-agent'),
 allowFallback: false,
 })
 ).toThrow(/Routing failure/);
 });

 it('filters out agents that do not meet mandatory capability constraints', () => {
 const decision = router.route({
 requiredCapabilities: {
 importSession: true, // Only OpenCode has importSession: true
 },
 });

 expect(decision.selectedAgentId).toBe('opencode');
 });

 it('routes WorkTransferPackage to target agent if specified', () => {
 const transfer = createWorkTransferPackage({
 title: 'Transfer to Claude',
 task: 'Do review',
 objective: 'Review PR',
 sourceAgent: 'opencode',
 targetAgent: 'claude-code',
 });

 const decision = router.routeTransfer(transfer);
 expect(decision.selectedAgentId).toBe('claude-code');
 });
});
