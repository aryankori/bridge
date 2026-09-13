/**
 * Bridge Core Tests
 *
 * Tests for the event bus and agent registry - the two foundational
 * components that everything else builds on.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../../src/core/events.js';
import { AgentRegistry } from '../../src/core/registry.js';
import { agentId, sessionId } from '../../src/core/types.js';
import type { AgentAdapter, AgentDescriptor, Session } from '../../src/core/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockDescriptor(name: string): AgentDescriptor {
 return {
 id: agentId(name.toLowerCase()),
 name,
 version: '1.0.0',
 executablePath: `/usr/local/bin/${name.toLowerCase()}`,
 dataDir: `/home/user/.${name.toLowerCase()}`,
 transports: ['acp'],
 capabilities: {
 launch: true,
 sendMessage: true,
 streamOutput: true,
 listSessions: false,
 resumeSession: false,
 exportSession: false,
 importSession: false,
 mcpClient: true,
 mcpServer: false,
 acp: true,
 },
 evidence: {
 version: 'documented',
 transports: 'observed',
 },
 };
}

function createMockAdapter(descriptor: AgentDescriptor): AgentAdapter {
 return {
 descriptor,
 discover: vi.fn().mockResolvedValue(descriptor),
 createSession: vi.fn().mockResolvedValue({
 id: sessionId('test-session-1'),
 agentId: descriptor.id,
 state: 'created',
 createdAt: new Date(),
 lastActivityAt: new Date(),
 metadata: {},
 } satisfies Session),
 attachSession: vi.fn().mockResolvedValue(null),
 listSessions: vi.fn().mockResolvedValue([]),
 sendMessage: vi.fn().mockResolvedValue(undefined),
 streamOutput: vi.fn().mockReturnValue({
 [Symbol.asyncIterator]: () => ({
 next: vi.fn().mockResolvedValue({ done: true, value: undefined }),
 }),
 }),
 closeSession: vi.fn().mockResolvedValue(undefined),
 dispose: vi.fn().mockResolvedValue(undefined),
 };
}

// ---------------------------------------------------------------------------
// EventBus
// ---------------------------------------------------------------------------

describe('EventBus', () => {
 let bus: EventBus;

 beforeEach(() => {
 bus = new EventBus();
 });

 it('should emit events to listeners', () => {
 const listener = vi.fn();
 bus.on('agent:discovered', listener);

 const descriptor = createMockDescriptor('TestAgent');
 bus.emit('agent:discovered', { descriptor });

 expect(listener).toHaveBeenCalledOnce();
 expect(listener).toHaveBeenCalledWith(
 expect.objectContaining({
 type: 'agent:discovered',
 payload: { descriptor },
 timestamp: expect.any(Date),
 }),
 );
 });

 it('should support multiple listeners for the same event', () => {
 const listener1 = vi.fn();
 const listener2 = vi.fn();
 bus.on('agent:registered', listener1);
 bus.on('agent:registered', listener2);

 const descriptor = createMockDescriptor('TestAgent');
 bus.emit('agent:registered', { descriptor });

 expect(listener1).toHaveBeenCalledOnce();
 expect(listener2).toHaveBeenCalledOnce();
 });

 it('should return an unsubscribe function', () => {
 const listener = vi.fn();
 const unsub = bus.on('agent:discovered', listener);

 unsub();

 bus.emit('agent:discovered', { descriptor: createMockDescriptor('TestAgent') });
 expect(listener).not.toHaveBeenCalled();
 });

 it('should support once() for single-shot listeners', () => {
 const listener = vi.fn();
 bus.once('agent:discovered', listener);

 const descriptor = createMockDescriptor('TestAgent');
 bus.emit('agent:discovered', { descriptor });
 bus.emit('agent:discovered', { descriptor });

 expect(listener).toHaveBeenCalledOnce();
 });

 it('should isolate listener errors', () => {
 const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
 const badListener = vi.fn(() => {
 throw new Error('listener exploded');
 });
 const goodListener = vi.fn();

 bus.on('agent:discovered', badListener);
 bus.on('agent:discovered', goodListener);

 bus.emit('agent:discovered', { descriptor: createMockDescriptor('TestAgent') });

 expect(badListener).toHaveBeenCalledOnce();
 expect(goodListener).toHaveBeenCalledOnce();
 expect(errorSpy).toHaveBeenCalled();

 errorSpy.mockRestore();
 });

 it('should track listener count', () => {
 expect(bus.listenerCount('agent:discovered')).toBe(0);

 const unsub1 = bus.on('agent:discovered', vi.fn());
 const unsub2 = bus.on('agent:discovered', vi.fn());

 expect(bus.listenerCount('agent:discovered')).toBe(2);

 unsub1();
 expect(bus.listenerCount('agent:discovered')).toBe(1);

 unsub2();
 expect(bus.listenerCount('agent:discovered')).toBe(0);
 });

 it('should clear listeners by type', () => {
 bus.on('agent:discovered', vi.fn());
 bus.on('agent:registered', vi.fn());

 bus.clear('agent:discovered');

 expect(bus.listenerCount('agent:discovered')).toBe(0);
 expect(bus.listenerCount('agent:registered')).toBe(1);
 });

 it('should clear all listeners', () => {
 bus.on('agent:discovered', vi.fn());
 bus.on('agent:registered', vi.fn());

 bus.clear();

 expect(bus.listenerCount('agent:discovered')).toBe(0);
 expect(bus.listenerCount('agent:registered')).toBe(0);
 });
});

// ---------------------------------------------------------------------------
// AgentRegistry
// ---------------------------------------------------------------------------

describe('AgentRegistry', () => {
 let bus: EventBus;
 let registry: AgentRegistry;

 beforeEach(() => {
 bus = new EventBus();
 registry = new AgentRegistry(bus);
 });

 it('should register an adapter and emit event', () => {
 const listener = vi.fn();
 bus.on('agent:registered', listener);

 const descriptor = createMockDescriptor('ClaudeCode');
 const adapter = createMockAdapter(descriptor);

 registry.register(adapter);

 expect(registry.has(descriptor.id)).toBe(true);
 expect(registry.size).toBe(1);
 expect(listener).toHaveBeenCalledOnce();
 });

 it('should throw on duplicate registration', () => {
 const descriptor = createMockDescriptor('ClaudeCode');
 registry.register(createMockAdapter(descriptor));

 expect(() => {
 registry.register(createMockAdapter(descriptor));
 }).toThrow('Agent already registered');
 });

 it('should retrieve adapters and descriptors by ID', () => {
 const descriptor = createMockDescriptor('ClaudeCode');
 const adapter = createMockAdapter(descriptor);
 registry.register(adapter);

 expect(registry.getAdapter(descriptor.id)).toBe(adapter);
 expect(registry.getDescriptor(descriptor.id)).toBe(descriptor);
 });

 it('should list all agents', () => {
 const d1 = createMockDescriptor('ClaudeCode');
 const d2 = createMockDescriptor('OpenCode');
 registry.register(createMockAdapter(d1));
 registry.register(createMockAdapter(d2));

 const agents = registry.listAgents();
 expect(agents).toHaveLength(2);
 expect(agents.map((a) => a.name)).toContain('ClaudeCode');
 expect(agents.map((a) => a.name)).toContain('OpenCode');
 });

 it('should remove an agent and dispose its adapter', async () => {
 const descriptor = createMockDescriptor('ClaudeCode');
 const adapter = createMockAdapter(descriptor);
 registry.register(adapter);

 const listener = vi.fn();
 bus.on('agent:removed', listener);

 await registry.remove(descriptor.id);

 expect(registry.has(descriptor.id)).toBe(false);
 expect(registry.size).toBe(0);
 expect(adapter.dispose).toHaveBeenCalledOnce();
 expect(listener).toHaveBeenCalledOnce();
 });

 it('should handle removal of non-existent agent gracefully', async () => {
 await expect(registry.remove(agentId('nonexistent'))).resolves.toBeUndefined();
 });

 it('should dispose all adapters', async () => {
 const d1 = createMockDescriptor('ClaudeCode');
 const d2 = createMockDescriptor('OpenCode');
 const a1 = createMockAdapter(d1);
 const a2 = createMockAdapter(d2);
 registry.register(a1);
 registry.register(a2);

 await registry.disposeAll();

 expect(a1.dispose).toHaveBeenCalledOnce();
 expect(a2.dispose).toHaveBeenCalledOnce();
 expect(registry.size).toBe(0);
 });
});
