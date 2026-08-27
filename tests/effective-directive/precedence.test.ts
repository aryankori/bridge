import { describe, it, expect } from 'vitest';
import {
  SourceTier,
  TIER_PRECEDENCE,
  compareDirectives,
  resolveTieBreaker,
} from '../../src/effective-directive/precedence.js';
import type { ExtractedDirective } from '../../src/effective-directive/types.js';

describe('Precedence Hierarchy & Standing Graph', () => {
  it('strictly orders tiers according to authority hierarchy', () => {
    expect(TIER_PRECEDENCE[SourceTier.EXPLICIT_HUMAN]).toBeGreaterThan(
      TIER_PRECEDENCE[SourceTier.TASK_SPEC]
    );
    expect(TIER_PRECEDENCE[SourceTier.TASK_SPEC]).toBeGreaterThan(
      TIER_PRECEDENCE[SourceTier.AGENT_RULES]
    );
    expect(TIER_PRECEDENCE[SourceTier.AGENT_RULES]).toBeGreaterThan(
      TIER_PRECEDENCE[SourceTier.PROJECT_DOCS]
    );
    expect(TIER_PRECEDENCE[SourceTier.PROJECT_DOCS]).toBeGreaterThan(
      TIER_PRECEDENCE[SourceTier.GIT_STATE]
    );
    expect(TIER_PRECEDENCE[SourceTier.GIT_STATE]).toBeGreaterThan(
      TIER_PRECEDENCE[SourceTier.DEFAULT_CONVENTION]
    );
  });

  it('determines higher precedence directive as winner between different tiers', () => {
    const d1: ExtractedDirective = {
      id: 'dir-1',
      sourceId: 'src-human',
      sourceTier: SourceTier.EXPLICIT_HUMAN,
      sourceLocation: 'prompt:1',
      category: 'PACKAGE_MANAGER',
      polarity: 'REQUIRE',
      statement: 'Use pnpm for all installations',
      subject: 'pnpm',
      rawText: 'use pnpm',
      precedence: TIER_PRECEDENCE[SourceTier.EXPLICIT_HUMAN],
    };

    const d2: ExtractedDirective = {
      id: 'dir-2',
      sourceId: 'src-readme',
      sourceTier: SourceTier.PROJECT_DOCS,
      sourceLocation: 'README.md:15',
      category: 'PACKAGE_MANAGER',
      polarity: 'REQUIRE',
      statement: 'Run npm install',
      subject: 'npm',
      rawText: 'run npm install',
      precedence: TIER_PRECEDENCE[SourceTier.PROJECT_DOCS],
    };

    const comparison = compareDirectives(d1, d2);
    expect(comparison.winner).toBe(d1);
    expect(comparison.loser).toBe(d2);
    expect(comparison.isAmbiguous).toBe(false);
  });

  it('detects ambiguity when equal-precedence directives conflict without tie breaker', () => {
    const d1: ExtractedDirective = {
      id: 'dir-agents',
      sourceId: 'src-agents-md',
      sourceTier: SourceTier.AGENT_RULES,
      sourceLocation: 'AGENTS.md:10',
      category: 'CODE_STYLE',
      polarity: 'REQUIRE',
      statement: 'Use camelCase for all filenames',
      subject: 'naming',
      rawText: 'camelCase',
      precedence: TIER_PRECEDENCE[SourceTier.AGENT_RULES],
    };

    const d2: ExtractedDirective = {
      id: 'dir-claude',
      sourceId: 'src-claude-md',
      sourceTier: SourceTier.AGENT_RULES,
      sourceLocation: 'CLAUDE.md:12',
      category: 'CODE_STYLE',
      polarity: 'REQUIRE',
      statement: 'Use kebab-case for all filenames',
      subject: 'naming',
      rawText: 'kebab-case',
      precedence: TIER_PRECEDENCE[SourceTier.AGENT_RULES],
    };

    const comparison = compareDirectives(d1, d2);
    expect(comparison.isAmbiguous).toBe(true);
    expect(comparison.winner).toBeUndefined();
  });

  it('resolves tie breaker when explicit tie breaker metadata or timestamps are present', () => {
    const d1: ExtractedDirective = {
      id: 'dir-agents',
      sourceId: 'src-agents-md',
      sourceTier: SourceTier.AGENT_RULES,
      sourceLocation: 'AGENTS.md:10',
      category: 'CODE_STYLE',
      polarity: 'REQUIRE',
      statement: 'Use camelCase for all filenames',
      subject: 'naming',
      rawText: 'camelCase',
      precedence: TIER_PRECEDENCE[SourceTier.AGENT_RULES],
      timestamp: 1000,
    };

    const d2: ExtractedDirective = {
      id: 'dir-claude',
      sourceId: 'src-claude-md',
      sourceTier: SourceTier.AGENT_RULES,
      sourceLocation: 'CLAUDE.md:12',
      category: 'CODE_STYLE',
      polarity: 'REQUIRE',
      statement: 'Use kebab-case for all filenames',
      subject: 'naming',
      rawText: 'kebab-case',
      precedence: TIER_PRECEDENCE[SourceTier.AGENT_RULES],
      timestamp: 2000,
    };

    const result = resolveTieBreaker(d1, d2, 'MOST_RECENT');
    expect(result.winner).toBe(d2);
    expect(result.reason).toContain('timestamp');
  });
});
