/**
 * BRIDGE - EXP-005: Security, Secret Scrubbing, and Worktree Confinement
 *
 * Enforces strict containment so experimental trials run only within
 * designated ephemeral worktrees and never leak credentials or pollute the repository.
 */

import * as path from 'node:path';

/**
 * Secret scrubbing regexes.
 */
const SECRET_PATTERNS = [
 /AIza[0-9A-Za-z-_]{35}/g,
 /sk-[a-zA-Z0-9_-]{20,}/g,
 /ghp_[a-zA-Z0-9]{36}/g,
 /github_pat_[a-zA-Z0-9_]{40,}/g,
 /Bearer\s+[A-Za-z0-9\-_.]+/gi,
 /DEV_TOKEN_SECRET_[0-9]+/g,
];

/**
 * Scrub API keys and tokens from strings.
 */
export function scrubSecrets(input: string): string {
 if (!input) return '';
 let output = input;
 for (const pat of SECRET_PATTERNS) {
 output = output.replace(pat, '[REDACTED_SECRET]');
 }
 return output;
}

/**
 * Validates that targetPath is strictly inside allowedParent.
 */
export function validatePathConfinement(targetPath: string, allowedParent: string): void {
 const resolvedTarget = path.resolve(targetPath);
 const resolvedParent = path.resolve(allowedParent);

 if (!resolvedTarget.startsWith(resolvedParent)) {
 throw new Error(
 `Security Confinement Violation: Path "${resolvedTarget}" is not contained within "${resolvedParent}"`
 );
 }
}
