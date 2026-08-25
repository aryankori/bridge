/**
 * Bridge Agent Registry
 *
 * Manages the lifecycle of discovered agents and their adapters.
 * The registry is the single source of truth for what agents Bridge
 * knows about and can communicate with.
 *
 * Design:
 * - Agents are registered via adapters
 * - The registry owns the adapter lifecycle
 * - All mutations emit events on the bus
 * - Thread-safe (single-threaded Node.js, but reentrant-safe)
 */

import type { AgentAdapter, AgentDescriptor, AgentId } from './types.js';
import type { EventBus } from './events.js';

export class AgentRegistry {
  private adapters = new Map<AgentId, AgentAdapter>();
  private descriptors = new Map<AgentId, AgentDescriptor>();

  constructor(private readonly eventBus: EventBus) {}

  /**
   * Register an adapter and its agent descriptor.
   * Emits 'agent:registered' on success.
   * Throws if an agent with the same ID is already registered.
   */
  register(adapter: AgentAdapter): void {
    const descriptor = adapter.descriptor;
    if (this.adapters.has(descriptor.id)) {
      throw new Error(`Agent already registered: ${descriptor.name} (${descriptor.id})`);
    }
    this.adapters.set(descriptor.id, adapter);
    this.descriptors.set(descriptor.id, descriptor);
    this.eventBus.emit('agent:registered', { descriptor });
  }

  /**
   * Remove an agent and dispose its adapter.
   * Emits 'agent:removed' on success.
   */
  async remove(agentId: AgentId): Promise<void> {
    const adapter = this.adapters.get(agentId);
    if (!adapter) return;

    await adapter.dispose();
    this.adapters.delete(agentId);
    this.descriptors.delete(agentId);
    this.eventBus.emit('agent:removed', { agentId });
  }

  /**
   * Get an adapter by agent ID.
   */
  getAdapter(agentId: AgentId): AgentAdapter | undefined {
    return this.adapters.get(agentId);
  }

  /**
   * Get a descriptor by agent ID.
   */
  getDescriptor(agentId: AgentId): AgentDescriptor | undefined {
    return this.descriptors.get(agentId);
  }

  /**
   * List all registered agent descriptors.
   */
  listAgents(): AgentDescriptor[] {
    return [...this.descriptors.values()];
  }

  /**
   * Check if an agent is registered.
   */
  has(agentId: AgentId): boolean {
    return this.adapters.has(agentId);
  }

  /**
   * Get the number of registered agents.
   */
  get size(): number {
    return this.adapters.size;
  }

  /**
   * Dispose all adapters and clear the registry.
   */
  async disposeAll(): Promise<void> {
    const disposals = [...this.adapters.values()].map((a) => a.dispose());
    await Promise.allSettled(disposals);
    this.adapters.clear();
    this.descriptors.clear();
  }
}
