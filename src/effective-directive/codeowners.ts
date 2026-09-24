/**
 * CODEOWNERS parsing and path matching.
 *
 * Follows the GitHub CODEOWNERS rules: gitignore-style patterns, case-sensitive
 * paths, and "last matching rule wins". A rule with a pattern and no owners
 * removes ownership from the matching paths. Negation (`!`) and character
 * ranges (`[ ]`) are not supported by GitHub, so this parser does not support them.
 */

/** Locations that GitHub searches for a CODEOWNERS file, in priority order. */
export const CODEOWNERS_LOCATIONS = [
  '.github/CODEOWNERS',
  'CODEOWNERS',
  'docs/CODEOWNERS',
] as const;

export interface CodeownersRule {
  pattern: string;
  owners: string[];
  line: number;
  matcher: RegExp;
}

export interface OwnerLookup {
  owners: string[];
  rule?: CodeownersRule;
}

/**
 * Parse the content of a CODEOWNERS file into ordered rules.
 */
export function parseCodeowners(content: string): CodeownersRule[] {
  const rules: CodeownersRule[] = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((rawLine, index) => {
    const withoutComment = rawLine.replace(/(^|\s)#.*$/, '');
    const tokens = withoutComment
      .trim()
      .split(/\s+/)
      .filter((t) => t.length > 0);
    const pattern = tokens[0];
    if (!pattern) return;

    rules.push({
      pattern,
      owners: tokens.slice(1),
      line: index + 1,
      matcher: patternToRegExp(pattern),
    });
  });

  return rules;
}

/**
 * Convert one CODEOWNERS pattern into a regular expression over
 * repository-relative paths that use `/` as the separator.
 */
export function patternToRegExp(pattern: string): RegExp {
  let body = pattern;

  // A slash at the start or in the middle anchors the pattern to the repository root.
  const anchored = body.startsWith('/') || body.slice(0, -1).includes('/');
  if (body.startsWith('/')) body = body.slice(1);

  let suffix: string;
  if (body.endsWith('/**')) {
    body = body.slice(0, -3);
    suffix = '/.*';
  } else if (body.endsWith('/')) {
    body = body.slice(0, -1);
    suffix = '/.*';
  } else if (body.endsWith('/*')) {
    // GitHub: "docs/*" matches direct children only, not nested files.
    body = body.slice(0, -2);
    suffix = '/[^/]+';
  } else {
    // Match the path itself, or everything below it when it is a directory.
    suffix = '(?:/.*)?';
  }

  const prefix = anchored ? '^' : '^(?:.*/)?';
  return new RegExp(`${prefix}${globToRegExpSource(body)}${suffix}$`);
}

function globToRegExpSource(pattern: string): string {
  // Collapse runs such as "**/**/" (same meaning), so the regex has no chain of
  // optional groups that backtracks exponentially on a path that does not match.
  const glob = pattern.replace(/(?:\*\*\/)+/g, '**/').replace(/\*{3,}/g, '**');
  let out = '';
  let i = 0;
  while (i < glob.length) {
    const ch = glob.charAt(i);
    if (ch === '*' && glob.charAt(i + 1) === '*') {
      if (glob.charAt(i + 2) === '/') {
        // "**/" matches zero or more directories.
        out += '(?:.*/)?';
        i += 3;
      } else {
        out += '.*';
        i += 2;
      }
    } else if (ch === '*') {
      out += '[^/]*';
      i += 1;
    } else if (ch === '?') {
      out += '[^/]';
      i += 1;
    } else {
      out += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
      i += 1;
    }
  }
  return out;
}

/**
 * Find the owners of a repository-relative path. The last matching rule wins.
 * Returns an empty owner list when no rule matches or the matching rule has no owners.
 */
export function findOwners(rules: readonly CodeownersRule[], filePath: string): OwnerLookup {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
  for (let i = rules.length - 1; i >= 0; i--) {
    const rule = rules[i];
    if (rule && rule.matcher.test(normalized)) {
      return { owners: [...rule.owners], rule };
    }
  }
  return { owners: [] };
}
