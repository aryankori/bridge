import { describe, it, expect } from 'vitest';
import {
  detectConflicts,
  detectStaleness,
  detectMissingAuthorization,
} from '../../src/effective-directive/detector.js';
import { SourceTier, TIER_PRECEDENCE } from '../../src/effective-directive/precedence.js';
import type {
  ExtractedDirective,
  IntendedAction,
  InstructionSource,
} from '../../src/effective-directive/types.js';

describe('Conflict & Constraint Detector', () => {
  it('detects direct contradictions between directives in the same category', () => {
    const d1: ExtractedDirective = {
      id: 'd1',
      sourceId: 'agents',
      sourceTier: SourceTier.AGENT_RULES,
      sourceLocation: 'AGENTS.md:5',
      category: 'PACKAGE_MANAGER',
      polarity: 'REQUIRE',
      statement: 'Use pnpm',
      subject: 'pnpm',
      rawText: 'use pnpm',
      precedence: TIER_PRECEDENCE[SourceTier.AGENT_RULES],
    };

    const d2: ExtractedDirective = {
      id: 'd2',
      sourceId: 'task',
      sourceTier: SourceTier.TASK_SPEC,
      sourceLocation: 'issue #42',
      category: 'PACKAGE_MANAGER',
      polarity: 'REQUIRE',
      statement: 'Use npm',
      subject: 'npm',
      rawText: 'use npm',
      precedence: TIER_PRECEDENCE[SourceTier.TASK_SPEC],
    };

    const conflicts = detectConflicts([d1, d2]);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].type).toBe('CONTRADICTION');
    expect(conflicts[0].winningDirective?.id).toBe('d2');
  });

  it('detects stale instructions when newer sources or package configurations supersede old documentation', () => {
    const oldDoc: InstructionSource = {
      id: 'old-readme',
      tier: SourceTier.PROJECT_DOCS,
      path: 'README.md',
      title: 'Old Readme',
      content: 'Supported Node version is 16.0.0',
      lastModified: '2023-01-01T00:00:00Z',
    };

    const currentRule: InstructionSource = {
      id: 'package-json',
      tier: SourceTier.AGENT_RULES,
      path: 'package.json',
      title: 'Package Manifest',
      content: '"engines": { "node": ">=20.0.0" }',
      lastModified: '2026-08-01T00:00:00Z',
    };

    const staleRecords = detectStaleness([oldDoc, currentRule]);
    expect(staleRecords.length).toBeGreaterThan(0);
    expect(staleRecords[0].type).toBe('STALE_INSTRUCTION');
    expect(staleRecords[0].description).toContain('Node');
  });

  it('detects missing authorization for destructive actions without human approval', () => {
    const destructiveAction: IntendedAction = {
      id: 'act-delete-dist',
      description: 'Delete entire dist directory and force push to main',
      category: 'FILE_DELETION',
      command: 'rm -rf dist/',
      gitOperation: { isDestructive: true, force: true, branch: 'main' },
    };

    const directives: ExtractedDirective[] = [
      {
        id: 'd-protect-main',
        sourceId: 'repo-policy',
        sourceTier: SourceTier.AGENT_RULES,
        sourceLocation: 'AGENTS.md:20',
        category: 'BRANCH_POLICY',
        polarity: 'DENY',
        statement: 'Never push directly to main without PR review',
        subject: 'main',
        rawText: 'never push to main',
        precedence: TIER_PRECEDENCE[SourceTier.AGENT_RULES],
      },
    ];

    const authCheck = detectMissingAuthorization(destructiveAction, directives);
    expect(authCheck.isAuthorized).toBe(false);
    expect(authCheck.missingAuthorizationReason).toBeDefined();
    expect(authCheck.conflict?.type).toBe('MISSING_AUTHORIZATION');
  });
});
