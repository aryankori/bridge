/**
 * Bridge Core — Agent Router Primitive
 *
 * Implements intelligent, capability-aware routing for heterogeneous AI agents.
 * Matches work transfer requests and task requirements against discovered
 * agent capabilities.
 *
 * Design:
 * - Deterministic capability matching
 * - Transparent fallback routing when preferred agents are unavailable
 * - Emits routing decision records for provenance and auditing
 */

import type { AgentCapabilities, AgentDescriptor, AgentId, TransportKind } from './types.js';
import type { AgentRegistry } from './registry.js';
import type { WorkTransferPackage } from './work-transfer.js';

export interface RouteRequirement {
  preferredAgentId?: AgentId | string;
  requiredCapabilities?: Partial<Record<keyof AgentCapabilities, boolean>>;
  preferredTransport?: string;
  allowFallback?: boolean;
}

export interface RoutingDecision {
  selectedAgentId: AgentId;
  selectedDescriptor: AgentDescriptor;
  matchedPreferred: boolean;
  score: number;
  rationale: string;
  evaluatedAgentsCount: number;
}

export class AgentRouter {
  constructor(private readonly registry: AgentRegistry) {}

  /**
   * Route a task or work transfer to the most suitable available agent.
   */
  route(requirement: RouteRequirement = {}): RoutingDecision {
    const agents = this.registry.listAgents();
    if (agents.length === 0) {
      throw new Error('Routing failure: No agents registered in Bridge');
    }

    // 1. If preferred agent is specified and available, verify requirements
    if (requirement.preferredAgentId) {
      const preferred = agents.find((a) => a.id === requirement.preferredAgentId);
      if (preferred) {
        const satisfies = this.checkCapabilities(preferred, requirement.requiredCapabilities);
        if (satisfies) {
          return {
            selectedAgentId: preferred.id,
            selectedDescriptor: preferred,
            matchedPreferred: true,
            score: 1.0,
            rationale: `Selected preferred agent "${preferred.name}" meeting all requested capability constraints.`,
            evaluatedAgentsCount: agents.length,
          };
        }
      }

      if (requirement.allowFallback === false) {
        throw new Error(
          `Routing failure: Preferred agent "${requirement.preferredAgentId}" is unavailable or does not meet required capabilities.`
        );
      }
    }

    // 2. Score and rank all registered agents
    let bestAgent: AgentDescriptor | null = null;
    let highestScore = -1;
    let bestRationale = '';

    for (const agent of agents) {
      const satisfies = this.checkCapabilities(agent, requirement.requiredCapabilities);
      if (!satisfies) continue;

      let score = 0.5; // Base score for satisfying required capabilities

      // Bonus for supporting streaming
      if (agent.capabilities.streamOutput) score += 0.2;
      // Bonus for export/import capability
      if (agent.capabilities.exportSession && agent.capabilities.importSession) score += 0.15;
      // Bonus for ACP support
      if (agent.capabilities.acp) score += 0.1;
      // Bonus for matching preferred transport
      if (requirement.preferredTransport && agent.transports.includes(requirement.preferredTransport as TransportKind)) {
        score += 0.05;
      }

      if (score > highestScore) {
        highestScore = score;
        bestAgent = agent;
        bestRationale = `Selected optimal agent "${agent.name}" with highest capability score (${Math.round(score * 100)}%).`;
      }
    }

    if (!bestAgent) {
      throw new Error(
        `Routing failure: No available agent satisfies the required capabilities: ${JSON.stringify(
          requirement.requiredCapabilities
        )}`
      );
    }

    return {
      selectedAgentId: bestAgent.id,
      selectedDescriptor: bestAgent,
      matchedPreferred: false,
      score: highestScore,
      rationale: bestRationale,
      evaluatedAgentsCount: agents.length,
    };
  }

  /**
   * Route a WorkTransferPackage to its intended recipient or a fallback agent.
   */
  routeTransfer(transfer: WorkTransferPackage): RoutingDecision {
    return this.route({
      preferredAgentId: transfer.targetAgentId,
      allowFallback: true,
      requiredCapabilities: {
        sendMessage: true,
      },
    });
  }

  private checkCapabilities(
    agent: AgentDescriptor,
    required?: Partial<Record<keyof AgentCapabilities, boolean>>
  ): boolean {
    if (!required) return true;

    for (const [key, value] of Object.entries(required)) {
      const capKey = key as keyof AgentCapabilities;
      if (value === true && !agent.capabilities[capKey]) {
        return false;
      }
    }
    return true;
  }
}
