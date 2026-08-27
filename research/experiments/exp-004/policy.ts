/**
 * BRIDGE — EXP-004: Configurable Authority Policy Abstraction
 *
 * Distinguishes the core RESOLUTION ENGINE from the AUTHORITY POLICY.
 * Enables testing different organizational governance models (e.g. Developer-First,
 * Security-Veto-First, Standard Tiering).
 */

import { SourceTier } from '../../../src/effective-directive/types.js';

export interface AuthorityPolicy {
  id: string;
  name: string;
  description: string;
  tierWeights: Record<SourceTier, number>;
  securityVetoOverridesAll: boolean;
  destructiveActionRequiresHuman: boolean;
  tieBreakerStrategy: 'MOST_RECENT' | 'SPECIFICITY' | 'NONE';
}

/**
 * Standard Default Authority Policy (Current Experimental Baseline)
 */
export const DEFAULT_AUTHORITY_POLICY: AuthorityPolicy = {
  id: 'standard-hierarchical-policy',
  name: 'Standard Hierarchical Precedence Policy',
  description: 'EXPLICIT_HUMAN (100) > TASK_SPEC (80) > AGENT_RULES (60) > PROJECT_DOCS (40) > GIT_STATE (30) > DEFAULT_CONVENTION (10)',
  tierWeights: {
    [SourceTier.EXPLICIT_HUMAN]: 100,
    [SourceTier.TASK_SPEC]: 80,
    [SourceTier.AGENT_RULES]: 60,
    [SourceTier.PROJECT_DOCS]: 40,
    [SourceTier.GIT_STATE]: 30,
    [SourceTier.DEFAULT_CONVENTION]: 10,
  },
  securityVetoOverridesAll: false,
  destructiveActionRequiresHuman: true,
  tieBreakerStrategy: 'MOST_RECENT',
};

/**
 * Security-First Authority Policy (Example Alternative Policy)
 */
export const SECURITY_FIRST_AUTHORITY_POLICY: AuthorityPolicy = {
  id: 'security-first-policy',
  name: 'Security-First Governance Policy',
  description: 'Security rules override all general human prompts unless signed authorization is presented',
  tierWeights: {
    [SourceTier.EXPLICIT_HUMAN]: 90,
    [SourceTier.TASK_SPEC]: 70,
    [SourceTier.AGENT_RULES]: 100,
    [SourceTier.PROJECT_DOCS]: 40,
    [SourceTier.GIT_STATE]: 30,
    [SourceTier.DEFAULT_CONVENTION]: 10,
  },
  securityVetoOverridesAll: true,
  destructiveActionRequiresHuman: true,
  tieBreakerStrategy: 'SPECIFICITY',
};
