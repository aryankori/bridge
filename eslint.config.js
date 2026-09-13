import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
 {
 ignores: ['dist/**', 'node_modules/**', '*.config.ts', 'research/**', 'scratch/**', 'worktrees/**'],
 },
 {
 files: ['src/**/*.ts', 'tests/**/*.ts'],
 languageOptions: {
 parser: tsParser,
 parserOptions: {
 ecmaVersion: 2022,
 sourceType: 'module',
 },
 },
 plugins: {
 '@typescript-eslint': tseslint,
 },
 rules: {
 ...tseslint.configs.recommended.rules,
 ...prettier.rules,
 '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
 '@typescript-eslint/explicit-function-return-type': 'off',
 '@typescript-eslint/no-explicit-any': 'warn',
 'no-console': ['warn', { allow: ['warn', 'error'] }],
 'no-undef': 'off',
 },
 },
];
