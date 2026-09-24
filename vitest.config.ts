import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globals: false,
    environment: 'node',
    // Real-repository tests (worktrees, signing keys) take several seconds each.
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts'],
      thresholds: {
        // `bridge resolve` modules must keep full coverage.
        'src/{bin/bridge,effective-directive/{arbitration,cli,codeowners,git}}.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
    },
  },
});
