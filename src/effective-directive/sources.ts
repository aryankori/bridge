import {
  type DirectivePolarity,
  type ExtractedDirective,
  type InstructionSource,
} from './types.js';
import { TIER_PRECEDENCE } from './precedence.js';

/**
 * Extract structured directives from raw text instruction sources.
 */
export function extractDirectivesFromSource(source: InstructionSource): ExtractedDirective[] {
  const directives: ExtractedDirective[] = [];
  const lines = source.content.split('\n');
  const timestamp = source.lastModified
    ? new Date(source.lastModified).getTime()
    : undefined;

  let lineNum = 0;
  for (const rawLine of lines) {
    lineNum++;
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) {
      continue;
    }

    const lower = line.toLowerCase();
    const sourceLoc = source.path ? `${source.path}:L${lineNum}` : `${source.title}:L${lineNum}`;

    // 1. Package manager directives
    if (lower.includes('pnpm') || lower.includes('npm') || lower.includes('yarn') || lower.includes('bun')) {
      let subject = 'unknown';
      if (lower.includes('pnpm')) subject = 'pnpm';
      else if (lower.includes('yarn')) subject = 'yarn';
      else if (lower.includes('bun')) subject = 'bun';
      else if (lower.includes('npm')) subject = 'npm';

      const polarity: DirectivePolarity =
        lower.includes('do not') || lower.includes('never') || lower.includes('avoid')
          ? 'DENY'
          : lower.includes('must') || lower.includes('always') || lower.includes('use') || lower.includes('require')
          ? 'REQUIRE'
          : 'PREFER';

      directives.push({
        id: `dir-pkg-${source.id}-${lineNum}`,
        sourceId: source.id,
        sourceTier: source.tier,
        sourceLocation: sourceLoc,
        category: 'PACKAGE_MANAGER',
        polarity,
        statement: line,
        subject,
        rawText: line,
        precedence: TIER_PRECEDENCE[source.tier],
        timestamp,
      });
    }

    // 2. Test command directives
    if (lower.includes('test') || lower.includes('vitest') || lower.includes('jest') || lower.includes('pytest')) {
      const polarity: DirectivePolarity =
        lower.includes('do not') || lower.includes('never')
          ? 'DENY'
          : lower.includes('must') || lower.includes('always') || lower.includes('run')
          ? 'REQUIRE'
          : 'PREFER';

      directives.push({
        id: `dir-test-${source.id}-${lineNum}`,
        sourceId: source.id,
        sourceTier: source.tier,
        sourceLocation: sourceLoc,
        category: 'TEST_COMMAND',
        polarity,
        statement: line,
        subject: lower.includes('vitest') ? 'vitest' : lower.includes('jest') ? 'jest' : 'test',
        rawText: line,
        precedence: TIER_PRECEDENCE[source.tier],
        timestamp,
      });
    }

    // 3. Branch policy directives
    if (lower.includes('main') || lower.includes('master') || lower.includes('branch') || lower.includes('push') || lower.includes('pr') || lower.includes('pull request')) {
      const isDeny = lower.includes('never') || lower.includes('do not') || lower.includes('prohibit') || lower.includes('cannot');
      directives.push({
        id: `dir-branch-${source.id}-${lineNum}`,
        sourceId: source.id,
        sourceTier: source.tier,
        sourceLocation: sourceLoc,
        category: 'BRANCH_POLICY',
        polarity: isDeny ? 'DENY' : 'REQUIRE',
        statement: line,
        subject: lower.includes('main') ? 'main' : 'branch',
        rawText: line,
        precedence: TIER_PRECEDENCE[source.tier],
        timestamp,
      });
    }

    // 4. Code style & naming conventions
    if (lower.includes('camelcase') || lower.includes('kebab-case') || lower.includes('snake_case') || lower.includes('pascalcase') || lower.includes('naming')) {
      let subject = 'naming';
      if (lower.includes('camelcase')) subject = 'camelCase';
      else if (lower.includes('kebab-case')) subject = 'kebab-case';
      else if (lower.includes('snake_case')) subject = 'snake_case';

      directives.push({
        id: `dir-style-${source.id}-${lineNum}`,
        sourceId: source.id,
        sourceTier: source.tier,
        sourceLocation: sourceLoc,
        category: 'CODE_STYLE',
        polarity: 'REQUIRE',
        statement: line,
        subject,
        rawText: line,
        precedence: TIER_PRECEDENCE[source.tier],
        timestamp,
      });
    }

    // 5. File deletion & destructive action directives
    if (lower.includes('delete') || lower.includes('rm ') || lower.includes('remove') || lower.includes('destructive') || lower.includes('clean')) {
      directives.push({
        id: `dir-del-${source.id}-${lineNum}`,
        sourceId: source.id,
        sourceTier: source.tier,
        sourceLocation: sourceLoc,
        category: 'FILE_DELETION',
        polarity: lower.includes('never') || lower.includes('prohibit') || lower.includes('do not') ? 'DENY' : 'REQUIRE',
        statement: line,
        subject: 'file-deletion',
        rawText: line,
        precedence: TIER_PRECEDENCE[source.tier],
        timestamp,
      });
    }
  }

  // Fallback if entire content acts as a single directive
  if (directives.length === 0 && source.content.trim()) {
    directives.push({
      id: `dir-gen-${source.id}-1`,
      sourceId: source.id,
      sourceTier: source.tier,
      sourceLocation: source.path ? `${source.path}:1` : `${source.title}:1`,
      category: 'GENERAL_CONSTRAINT',
      polarity: 'REQUIRE',
      statement: source.content.trim(),
      subject: 'general',
      rawText: source.content.trim(),
      precedence: TIER_PRECEDENCE[source.tier],
      timestamp,
    });
  }

  return directives;
}

/**
 * Extract directives across an array of instruction sources.
 */
export function extractAllDirectives(sources: InstructionSource[]): ExtractedDirective[] {
  const all: ExtractedDirective[] = [];
  for (const src of sources) {
    all.push(...extractDirectivesFromSource(src));
  }
  return all;
}
