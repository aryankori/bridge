/**
 * Bridge — Phase 1D: Experiment Configuration & Environment Validator
 *
 * Validates:
 * 1. Schema validity and TypeScript definitions
 * 2. Required directories and fixture files
 * 3. Executable availability (claude, opencode) on PATH
 * 4. Security functions (path confinement, secret scrubbing, 8KB truncation)
 * 5. Package scripts alignment
 *
 * Does NOT launch AI agents or invoke external LLMs.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { scrubSecrets, validatePathConfinement, truncatePayload } from './security.js';
import { validateExtractedTransfer, getExecutionEnv } from './agent-runners.js';

interface ValidationResult {
  check: string;
  passed: boolean;
  details: string;
}

export function runValidation(): { allPassed: boolean; results: ValidationResult[] } {
  const results: ValidationResult[] = [];
  const rootDir = process.cwd();
  const expDir = path.resolve(rootDir, 'research/experiments/exp-001');
  const fixtureDir = path.join(expDir, 'fixture');

  // Check 1: Fixture directory and files
  const requiredFixtureFiles = [
    'src/scheduler.ts',
    'src/types.ts',
    'src/index.ts',
    'tests/scheduler.test.ts',
    'vitest.config.ts',
  ];
  let fixtureFilesMissing: string[] = [];
  for (const file of requiredFixtureFiles) {
    if (!fs.existsSync(path.join(fixtureDir, file))) {
      fixtureFilesMissing.push(file);
    }
  }
  results.push({
    check: 'Fixture Files Integrity',
    passed: fixtureFilesMissing.length === 0,
    details:
      fixtureFilesMissing.length === 0
        ? `All ${requiredFixtureFiles.length} fixture files verified in ${fixtureDir}`
        : `Missing fixture files: ${fixtureFilesMissing.join(', ')}`,
  });

  // Check 2: Schema validation logic
  try {
    const validSample = {
      schemaVersion: '0.2.0-simplified',
      objective: 'Fix scheduler defects',
      diagnostics: [
        {
          id: 'DIAG-001',
          title: 'Test bug',
          rootCause: 'Test cause',
          locations: [{ filePath: 'src/scheduler.ts' }],
        },
      ],
      constraints: ['Preserve contracts'],
      verificationCommands: [{ command: 'pnpm test', description: 'Run tests' }],
    };
    validateExtractedTransfer(validSample);

    let caughtInvalid = false;
    try {
      validateExtractedTransfer({ invalid: true });
    } catch {
      caughtInvalid = true;
    }

    results.push({
      check: 'Schema Validator Rigor',
      passed: caughtInvalid,
      details: 'Schema validator accepts conforming objects and rejects non-conforming objects',
    });
  } catch (err: unknown) {
    results.push({
      check: 'Schema Validator Rigor',
      passed: false,
      details: `Schema validation failed: ${(err as Error).message}`,
    });
  }

  // Check 3: Security Helper Functions
  try {
    const secretText = 'Secret: nvapi-abcdef1234567890abcdef1234567890 and Bearer 1234567890123456789012';
    const scrubbed = scrubSecrets(secretText);
    const scrubPassed = !scrubbed.includes('nvapi-') && !scrubbed.includes('Bearer ');

    let confinementPassed = false;
    try {
      validatePathConfinement(path.join(expDir, 'worktrees/test'), expDir);
      try {
        validatePathConfinement('C:\\Windows\\System32', expDir);
      } catch {
        confinementPassed = true;
      }
    } catch {}

    const truncation = truncatePayload('A'.repeat(10000), 8192);
    const truncationPassed = truncation.wasTruncated && truncation.deliveredBytes <= 8192;

    results.push({
      check: 'Security Controls Implementation',
      passed: scrubPassed && confinementPassed && truncationPassed,
      details: `Secret scrubbing: ${scrubPassed ? 'PASS' : 'FAIL'}, Path confinement: ${confinementPassed ? 'PASS' : 'FAIL'}, 8KB Truncation: ${truncationPassed ? 'PASS' : 'FAIL'}`,
    });
  } catch (err: unknown) {
    results.push({
      check: 'Security Controls Implementation',
      passed: false,
      details: `Security helper test failed: ${(err as Error).message}`,
    });
  }

  // Check 4: Executable binary presence
  let claudeFound = false;
  let opencodeFound = false;
  try {
    const claudeCheck = execSync('where.exe claude 2>nul || where.exe claude.cmd 2>nul || which claude 2>/dev/null', {
      env: getExecutionEnv(),
      encoding: 'utf-8',
    });
    claudeFound = Boolean(claudeCheck.trim());
  } catch {}

  try {
    const opencodeCheck = execSync('where.exe opencode 2>nul || where.exe opencode.exe 2>nul || which opencode 2>/dev/null', {
      env: getExecutionEnv(),
      encoding: 'utf-8',
    });
    opencodeFound = Boolean(opencodeCheck.trim());
  } catch {}

  results.push({
    check: 'Agent Executables on PATH',
    passed: claudeFound && opencodeFound,
    details: `Claude CLI: ${claudeFound ? 'AVAILABLE' : 'MISSING'}, OpenCode CLI: ${opencodeFound ? 'AVAILABLE' : 'MISSING'}`,
  });

  // Check 5: Package.json scripts
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
  const hasPilot = Boolean(packageJson.scripts?.['experiment:pilot']);
  const hasReplicate = Boolean(packageJson.scripts?.['experiment:replicate']);
  const hasValidate = Boolean(packageJson.scripts?.['experiment:validate']);

  results.push({
    check: 'Package.json Experiment Scripts',
    passed: hasPilot && hasReplicate && hasValidate,
    details: `experiment:pilot: ${hasPilot ? 'YES' : 'NO'}, experiment:replicate: ${hasReplicate ? 'YES' : 'NO'}, experiment:validate: ${hasValidate ? 'YES' : 'NO'}`,
  });

  const allPassed = results.every((r) => r.passed);
  return { allPassed, results };
}

// ---------------------------------------------------------------------------
// CLI Execution
// ---------------------------------------------------------------------------

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  console.log(`\n=============================================================`);
  console.log(`  BRIDGE EXP-001 ENVIRONMENT & HARNESS VALIDATION`);
  console.log(`=============================================================\n`);

  const { allPassed, results } = runValidation();

  for (const res of results) {
    const statusTag = res.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${statusTag} ${res.check}`);
    console.log(`   ${res.details}\n`);
  }

  if (allPassed) {
    console.log(`=============================================================`);
    console.log(`  VALIDATION SUMMARY: ALL CHECKS PASSED. READY FOR PILOT.`);
    console.log(`=============================================================\n`);
    process.exit(0);
  } else {
    console.error(`=============================================================`);
    console.error(`  VALIDATION SUMMARY: ONE OR MORE CHECKS FAILED.`);
    console.error(`=============================================================\n`);
    process.exit(1);
  }
}
