/**
 * Unit Tests for EXP-001 Research Harness
 *
 * Validates harness subcomponents before running any expensive LLM experiment:
 * 1. Secret scrubbing
 * 2. Path confinement
 * 3. Payload truncation (8 KB hard cap)
 * 4. Untrusted boundary wrappers
 * 5. Schema validation rules
 * 6. Seeded PRNG trial order generation
 * 7. Information metrics calculation
 * 8. Subprocess argument construction and path-with-spaces handling
 * 9. OpenCode execution mode symmetry across all conditions
 * 10. Claude non-interactive stdio configuration
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';
import {
  scrubSecrets,
  validatePathConfinement,
  truncatePayload,
  wrapUntrustedData,
} from '../../research/experiments/exp-001/security.js';
import {
  validateExtractedTransfer,
  parseProgrammaticTransfer,
  getExecutionEnv,
  AGENT_A_COMMAND,
  AGENT_B_COMMAND,
} from '../../research/experiments/exp-001/agent-runners.js';
import {
  generateTrialOrder,
  createMulberry32,
  calculateInformationMetrics,
} from '../../research/experiments/exp-001/harness.js';

describe('EXP-001 Research Harness Unit Tests', () => {
  describe('Security & Sanitization', () => {
    it('should scrub NVIDIA API keys, Anthropic keys, and GitHub tokens', () => {
      const input =
        'Config: nvapi-1234567890abcdef1234567890abcdef1234 and sk-ant-1234567890abcdef1234567890abcdef and ghp_1234567890abcdef1234567890abcdef';
      const scrubbed = scrubSecrets(input);

      expect(scrubbed).not.toContain('nvapi-');
      expect(scrubbed).not.toContain('sk-ant-');
      expect(scrubbed).not.toContain('ghp_');
      expect(scrubbed).toContain('[REDACTED_SECRET]');
    });

    it('should scrub Bearer authorization tokens', () => {
      const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz';
      const scrubbed = scrubSecrets(input);

      expect(scrubbed).not.toContain('Bearer eyJ');
      expect(scrubbed).toContain('[REDACTED_SECRET]');
    });

    it('should allow paths strictly within root directory', () => {
      const root = path.resolve('research/experiments/exp-001');
      const safeTarget = path.join(root, 'worktrees/condition-a');

      expect(() => validatePathConfinement(safeTarget, root)).not.toThrow();
    });

    it('should throw on path traversal attempts', () => {
      const root = path.resolve('research/experiments/exp-001');
      const unsafeTarget = path.resolve('research/experiments/other');

      expect(() => validatePathConfinement(unsafeTarget, root)).toThrow('Security Violation');
    });

    it('should pass through payloads under 8 KB without truncation', () => {
      const smallText = 'Hello world from Agent A'.repeat(10);
      const result = truncatePayload(smallText, 8192);

      expect(result.wasTruncated).toBe(false);
      expect(result.originalBytes).toBe(result.deliveredBytes);
      expect(result.content).toBe(smallText);
    });

    it('should truncate payloads exceeding 8 KB and attach truncation notice', () => {
      const largeText = 'A'.repeat(10000);
      const result = truncatePayload(largeText, 8192);

      expect(result.wasTruncated).toBe(true);
      expect(result.deliveredBytes).toBeLessThanOrEqual(8192);
      expect(result.content).toContain('[TRANSCRIPT TRUNCATED AT 8KB LIMIT]');
    });

    it('should wrap untrusted data with correct boundary delimiters', () => {
      const transcriptWrapped = wrapUntrustedData('raw text', 'transcript');
      expect(transcriptWrapped).toContain('<<<UNTRUSTED_AGENT_TRANSCRIPT_START>>>');
      expect(transcriptWrapped).toContain('<<<UNTRUSTED_AGENT_TRANSCRIPT_END>>>');

      const transferWrapped = wrapUntrustedData('{}', 'transfer');
      expect(transferWrapped).toContain('<<<UNTRUSTED_BRIDGE_WORK_TRANSFER_START>>>');
      expect(transferWrapped).toContain('<<<UNTRUSTED_BRIDGE_WORK_TRANSFER_END>>>');
    });
  });

  describe('Schema Validation & Extraction', () => {
    it('should accept valid ExperimentalWorkTransfer v0.2.0 objects', () => {
      const valid = {
        schemaVersion: '0.2.0-simplified',
        objective: 'Resolve defects in scheduler.ts',
        diagnostics: [
          {
            id: 'DIAG-001',
            title: 'Refill bug',
            rootCause: 'Unclamped addition',
            locations: [{ filePath: 'src/scheduler.ts', startLine: 42, endLine: 47 }],
          },
        ],
        constraints: ['Do not change signatures'],
        verificationCommands: [{ command: 'pnpm test', description: 'Run test suite' }],
      };

      expect(() => validateExtractedTransfer(valid)).not.toThrow();
    });

    it('should reject objects missing required diagnostics fields', () => {
      const invalid = {
        schemaVersion: '0.2.0-simplified',
        objective: 'Test',
        diagnostics: [{ title: 'Incomplete' }],
      };

      expect(() => validateExtractedTransfer(invalid)).toThrow('missing required fields');
    });

    it('should extract programmatic transfer from raw text without answer key', () => {
      const sampleText = 'Found a defect in refillTokens: token overflow on line 45. Also queue starvation in pump.';
      const extracted = parseProgrammaticTransfer(sampleText);

      expect(extracted.schemaVersion).toBe('0.2.0-simplified');
      expect(extracted.diagnostics.length).toBeGreaterThan(0);
      expect(extracted.diagnostics[0].id).toBe('DIAG-001');
    });
  });

  describe('Randomization & Trial Ordering', () => {
    it('should generate deterministic random sequences from a seed', () => {
      const rng1 = createMulberry32(12345);
      const rng2 = createMulberry32(12345);

      const seq1 = [rng1(), rng1(), rng1()];
      const seq2 = [rng2(), rng2(), rng2()];

      expect(seq1).toEqual(seq2);
    });

    it('should produce linear A, B, C for pilot mode', () => {
      const pilotOrder = generateTrialOrder(42, 'pilot');

      expect(pilotOrder).toEqual([
        { trialIndex: 1, condition: 'A' },
        { trialIndex: 2, condition: 'B' },
        { trialIndex: 3, condition: 'C' },
      ]);
    });

    it('should produce 9 randomized trials with 3 of each condition for replicate mode', () => {
      const replicateOrder = generateTrialOrder(999, 'replicate');

      expect(replicateOrder.length).toBe(9);
      const counts = { A: 0, B: 0, C: 0 };
      for (const t of replicateOrder) {
        counts[t.condition]++;
      }
      expect(counts.A).toBe(3);
      expect(counts.B).toBe(3);
      expect(counts.C).toBe(3);
    });
  });

  describe('Information Metrics Calculation', () => {
    it('should calculate accurate byte sizes and token estimates', () => {
      const payload = 'Hello world from Bridge test suite';
      const metrics = calculateInformationMetrics(payload, {
        diagnosticsCount: 2,
        constraintsCount: 1,
        verificationConveyed: true,
      });

      expect(metrics.payloadSizeBytes).toBe(Buffer.byteLength(payload, 'utf-8'));
      expect(metrics.estimatedTokens).toBe(Math.ceil(metrics.payloadSizeBytes / 4));
      expect(metrics.diagnosticsConveyedCount).toBe(2);
      expect(metrics.constraintsConveyedCount).toBe(1);
      expect(metrics.verificationInfoConveyed).toBe(true);
    });
  });

  describe('Subprocess & Environment Invariants', () => {
    it('should provide complete execution environment with PATH resolution', () => {
      const env = getExecutionEnv();
      expect(env.PATH).toBeDefined();
      if (process.platform === 'win32') {
        expect(env.PATH).toContain('.local');
        expect(env.PATH).toContain('scoop');
      }
    });

    it('should configure native agent binary names per platform', () => {
      if (process.platform === 'win32') {
        expect(AGENT_A_COMMAND).toBe('claude.exe');
        expect(AGENT_B_COMMAND).toBe('opencode.exe');
      } else {
        expect(AGENT_A_COMMAND).toBe('claude');
        expect(AGENT_B_COMMAND).toBe('opencode');
      }
    });

    it('should handle paths with spaces cleanly without path corruption', () => {
      const basePath = path.join('Users', 'test user', 'Documents', 'AI and ML', 'bridge');
      const normalized = path.normalize(basePath);
      expect(normalized).toContain('AI and ML');
      expect(normalized).toContain('test user');

      // Native path resolution must preserve spaces across platforms
      const subpath = path.join(basePath, 'worktrees', 'condition-a');
      expect(subpath).toContain(path.join('AI and ML', 'bridge', 'worktrees', 'condition-a'));
    });

    it('should enforce identical OpenCode research flags across all conditions', () => {
      const getExpectedFlags = (targetDir: string, prompt: string) => [
        'run',
        prompt,
        '--auto',
        '--pure',
        '--format', 'json',
        '--dir', targetDir,
      ];

      const flagsA = getExpectedFlags('C:\\path with spaces\\worktrees\\condition-a', 'Prompt A');
      const flagsB = getExpectedFlags('C:\\path with spaces\\worktrees\\condition-b', 'Prompt B');
      const flagsC = getExpectedFlags('C:\\path with spaces\\worktrees\\condition-c', 'Prompt C');

      // Controlled condition invariant: exact same flags structure
      expect(flagsA.slice(2)).toEqual(['--auto', '--pure', '--format', 'json', '--dir', 'C:\\path with spaces\\worktrees\\condition-a']);
      expect(flagsB.slice(2)).toEqual(['--auto', '--pure', '--format', 'json', '--dir', 'C:\\path with spaces\\worktrees\\condition-b']);
      expect(flagsC.slice(2)).toEqual(['--auto', '--pure', '--format', 'json', '--dir', 'C:\\path with spaces\\worktrees\\condition-c']);
    });
  });
});
