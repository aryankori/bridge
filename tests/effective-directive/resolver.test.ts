import { describe, it, expect } from 'vitest';
import { resolveEffectiveDirective } from '../../src/effective-directive/resolver.js';
import { SourceTier } from '../../src/effective-directive/precedence.js';
import type {
 IntendedAction,
 InstructionSource,
 ConflictRecord,
} from '../../src/effective-directive/types.js';

describe('Effective Directive Resolver', () => {
 it('resolves action with clear human override above repo rules', () => {
 const action: IntendedAction = {
 id: 'act-1',
 description: 'Run vitest directly on single file',
 category: 'TEST_COMMAND',
 command: 'vitest run tests/core/core.test.ts',
 };

 const sources: InstructionSource[] = [
 {
 id: 'agents-md',
 tier: SourceTier.AGENT_RULES,
 path: 'AGENTS.md',
 title: 'Agent Rules',
 content: 'Always run full test suite with pnpm test',
 },
 {
 id: 'human-prompt',
 tier: SourceTier.EXPLICIT_HUMAN,
 title: 'Developer Prompt',
 content: 'Run only tests/core/core.test.ts for fast verification',
 },
 ];

 const result = resolveEffectiveDirective({ action, sources });

 expect(result.status).toBe('PERMITTED_WITH_OVERRIDE');
 expect(result.isObjectiveTruthClaim).toBe(false);
 expect(result.evidenceTrail.length).toBeGreaterThan(0);
 expect(result.governingDirective?.sourceTier).toBe(SourceTier.EXPLICIT_HUMAN);
 expect(result.overriddenDirectives.length).toBe(1);
 expect(result.explanation).toContain('EXPLICIT_HUMAN');
 });

 it('blocks action when blocked by authoritative standing rule and no override exists', () => {
 const action: IntendedAction = {
 id: 'act-disallowed-tool',
 description: 'Install dependencies with prohibited tool',
 category: 'PACKAGE_MANAGER',
 command: 'yarn install',
 };

 const sources: InstructionSource[] = [
 {
 id: 'agents-md',
 tier: SourceTier.AGENT_RULES,
 path: 'AGENTS.md',
 title: 'Agent Rules',
 content: 'Never use yarn in this repository. yarn is prohibited entirely.',
 },
 ];

 const result = resolveEffectiveDirective({ action, sources });

 expect(result.status).toBe('BLOCKED_CONFLICT');
 expect(result.isObjectiveTruthClaim).toBe(false);
 expect(result.governingDirective?.polarity).toBe('DENY');
 });

 it('flags ambiguity when conflicting directives exist at the same tier without a tie breaker', () => {
 const action: IntendedAction = {
 id: 'act-format',
 description: 'Format filenames in kebab-case',
 category: 'CODE_STYLE',
 targetPath: 'src/my-new-file.ts',
 };

 const sources: InstructionSource[] = [
 {
 id: 'agents-md',
 tier: SourceTier.AGENT_RULES,
 path: 'AGENTS.md',
 title: 'Agent Rules',
 content: 'All source files MUST use camelCase naming convention',
 },
 {
 id: 'claude-md',
 tier: SourceTier.AGENT_RULES,
 path: 'CLAUDE.md',
 title: 'Claude Rules',
 content: 'All source files MUST use kebab-case naming convention',
 },
 ];

 const result = resolveEffectiveDirective({ action, sources });

 expect(result.status).toBe('AMBIGUOUS');
 expect(result.isObjectiveTruthClaim).toBe(false);
 expect(result.conflicts.some((c: ConflictRecord) => c.type === 'PRECEDENCE_AMBIGUITY')).toBe(true);
 });

 it('returns valid latency in milliseconds', () => {
 const action: IntendedAction = {
 id: 'act-simple',
 description: 'Read a file',
 category: 'GENERAL_CONSTRAINT',
 };

 const result = resolveEffectiveDirective({ action, sources: [] });
 expect(typeof result.latencyMs).toBe('number');
 expect(result.latencyMs).toBeGreaterThanOrEqual(0);
 });
});
