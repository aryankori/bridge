import { describe, it, expect } from 'vitest';
import {
  CODEOWNERS_LOCATIONS,
  findOwners,
  parseCodeowners,
  patternToRegExp,
} from '../../src/effective-directive/codeowners.js';

describe('CODEOWNERS parsing', () => {
  it('lists the GitHub search locations in priority order', () => {
    expect(CODEOWNERS_LOCATIONS).toEqual(['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS']);
  });

  it('ignores blank lines and comments, and keeps line numbers', () => {
    const rules = parseCodeowners(
      [
        '# Global owners',
        '',
        '*       @default-owner',
        '/src/    @alice bob@example.com  # inline note',
        '/docs/',
      ].join('\r\n'),
    );

    expect(rules).toHaveLength(3);
    expect(rules[0]).toMatchObject({ pattern: '*', owners: ['@default-owner'], line: 3 });
    expect(rules[1]).toMatchObject({
      pattern: '/src/',
      owners: ['@alice', 'bob@example.com'],
      line: 4,
    });
    expect(rules[2]).toMatchObject({ pattern: '/docs/', owners: [], line: 5 });
  });
});

describe('CODEOWNERS pattern matching', () => {
  const cases: Array<[pattern: string, matches: string[], rejects: string[]]> = [
    ['*', ['a.ts', 'src/deep/b.ts'], []],
    ['*.js', ['app.js', 'src/lib/app.js'], ['app.ts', 'app.jsx']],
    [
      '/build/logs/',
      ['build/logs/a.log', 'build/logs/x/y.log'],
      ['build/logs', 'src/build/logs/a.log'],
    ],
    ['apps/', ['apps/a.ts', 'packages/apps/b/c.ts'], ['apps', 'myapps/a.ts']],
    ['docs/*', ['docs/getting-started.md'], ['docs/build-app/troubleshooting.md', 'x/docs/a.md']],
    ['**/logs', ['logs/a.log', 'build/logs/a.log', 'deeply/nested/logs/b.log'], ['logsx/a.log']],
    ['/scripts/**', ['scripts/a.sh', 'scripts/x/b.sh'], ['src/scripts/a.sh']],
    ['docs/**/guide.md', ['docs/guide.md', 'docs/a/b/guide.md'], ['other/docs/guide.md']],
    ['src/lib', ['src/lib', 'src/lib/util.ts'], ['src/library.ts', 'x/src/lib/util.ts']],
    ['file?.txt', ['file1.txt', 'a/fileA.txt'], ['file10.txt', 'file/.txt']],
    ['config.(prod).json', ['config.(prod).json'], ['configX(prod)Xjson']],
    ['README.md', ['README.md', 'pkg/README.md'], ['readme.md']],
    ['/lib/**.js', ['lib/a.js', 'lib/x/y.js'], ['src/lib/a.js', 'lib/a.ts']],
  ];

  for (const [pattern, matches, rejects] of cases) {
    it(`matches "${pattern}" with gitignore semantics`, () => {
      const re = patternToRegExp(pattern);
      for (const p of matches) expect(re.test(p), `${pattern} should match ${p}`).toBe(true);
      for (const p of rejects) expect(re.test(p), `${pattern} should not match ${p}`).toBe(false);
    });
  }
});

describe('CODEOWNERS owner lookup', () => {
  const rules = parseCodeowners(
    [
      '*           @org/everyone',
      '/src/       @alice',
      '/src/ui/    @bob',
      '/src/ui/generated/',
    ].join('\n'),
  );

  it('applies the last matching rule', () => {
    const lookup = findOwners(rules, 'src/ui/view.ts');
    expect(lookup.owners).toEqual(['@bob']);
    expect(lookup.rule?.line).toBe(3);
  });

  it('treats a matching rule without owners as unowned', () => {
    const lookup = findOwners(rules, 'src/ui/generated/schema.ts');
    expect(lookup.owners).toEqual([]);
    expect(lookup.rule?.pattern).toBe('/src/ui/generated/');
  });

  it('normalizes Windows separators and leading slashes', () => {
    expect(findOwners(rules, '\\src\\core.ts').owners).toEqual(['@alice']);
  });

  it('returns no owners and no rule when nothing matches', () => {
    const lookup = findOwners(parseCodeowners('/src/ @alice'), 'README.md');
    expect(lookup).toEqual({ owners: [] });
  });

  it('returns a copy of the owner list', () => {
    const lookup = findOwners(rules, 'src/core.ts');
    lookup.owners.push('@mallory');
    expect(findOwners(rules, 'src/core.ts').owners).toEqual(['@alice']);
  });
});
