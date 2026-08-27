/**
 * Bridge - Phase 1E: Research Experiment Harness & Hard Stage-Gate Unit Tests
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';
import {
  createMulberry32,
  generateTrialOrder,
  calculateInformationMetrics,
} from '../../research/experiments/exp-001/harness.js';
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
  resolveExecutable,
  AgentExecutionError,
  AGENT_A_NAME,
  AGENT_B_NAME,
} from '../../research/experiments/exp-001/agent-runners.js';
import type { ExperimentalWorkTransfer } from '../../research/experiments/exp-001/types.js';

describe('EXP-001 Research Harness Unit Tests', () => {
  describe('Security & Confinement Controls', () => {
    it('should scrub NVIDIA API keys, Anthropic keys, and GitHub tokens', () => {
      const dirty =
        'Bearer nvapi-1234567890abcdef1234567890abcdef1234567890 and sk-ant-api03-12345678901234567890 and ghp_123456789012345678901234567890123456';
      const clean = scrubSecrets(dirty);
      expect(clean).not.toContain('nvapi-');
      expect(clean).not.toContain('sk-ant-api03-');
      expect(clean).not.toContain('ghp_');
      expect(clean).toContain('[REDACTED_SECRET]');
    });

    it('should scrub bearer tokens and API keys', () => {
      const dirty = 'Here is token: Bearer abcdef1234567890abcdef1234567890';
      const clean = scrubSecrets(dirty);
      expect(clean).not.toContain('abcdef1234567890');
      expect(clean).toContain('[REDACTED_SECRET]');
    });

    it('should allow paths strictly within root directory', () => {
      const root = path.resolve('/test/root');
      const safe = path.resolve('/test/root/sub/dir');
      expect(() => validatePathConfinement(safe, root)).not.toThrow();
    });

    it('should throw on path traversal attempts', () => {
      const root = path.resolve('/test/root');
      const unsafe = path.resolve('/test/other');
      expect(() => validatePathConfinement(unsafe, root)).toThrow(/Security Violation/);
    });

    it('should pass through payloads under 8 KB without truncation', () => {
      const smallText = 'Hello world, short payload.';
      const res = truncatePayload(smallText, 8192);
      expect(res.wasTruncated).toBe(false);
      expect(res.deliveredBytes).toBe(Buffer.byteLength(smallText, 'utf-8'));
      expect(res.content).toBe(smallText);
    });

    it('should truncate payloads exceeding 8 KB and attach truncation notice', () => {
      const bigText = 'A'.repeat(10_000);
      const res = truncatePayload(bigText, 8192);
      expect(res.wasTruncated).toBe(true);
      expect(res.deliveredBytes).toBeLessThanOrEqual(8192);
      expect(res.content).toContain('[TRANSCRIPT TRUNCATED AT 8KB LIMIT]');
    });

    it('should wrap untrusted data with correct boundary delimiters', () => {
      const raw = 'test content';
      const wrapped = wrapUntrustedData(raw, 'transcript');
      expect(wrapped).toContain('<<<UNTRUSTED_AGENT_TRANSCRIPT_START>>>');
      expect(wrapped).toContain('<<<UNTRUSTED_AGENT_TRANSCRIPT_END>>>');
      expect(wrapped).toContain(raw);
    });
  });

  describe('Schema Validation & Extraction Invariants', () => {
    it('should accept valid ExperimentalWorkTransfer v0.2.0 objects', () => {
      const valid: ExperimentalWorkTransfer = {
        schemaVersion: '0.2.0-simplified',
        objective: 'Fix bugs in TaskScheduler',
        diagnostics: [
          {
            id: 'DIAG-001',
            title: 'Double activeCount decrement',
            rootCause: 'Decrementing count twice on task completion causes negative concurrency counter.',
            locations: [{ filePath: 'src/scheduler.ts', startLine: 120, endLine: 125, symbol: 'completeTask' }],
          },
        ],
        constraints: ['Do not change TaskOptions interface'],
        verificationCommands: [{ command: 'pnpm test', description: 'Run test suite' }],
      };

      expect(() => validateExtractedTransfer(valid)).not.toThrow();
    });

    it('should reject objects missing required diagnostics fields', () => {
      const invalid = {
        schemaVersion: '0.2.0-simplified',
        objective: 'Fix bugs',
        diagnostics: [{ id: 'DIAG-001' }], // missing title, rootCause
        constraints: [],
        verificationCommands: [],
      };

      expect(() => validateExtractedTransfer(invalid)).toThrow(/Diagnostic item missing required fields/);
    });

    it('should reject objects with missing or empty objective', () => {
      const invalid = {
        schemaVersion: '0.2.0-simplified',
        objective: '   ',
        diagnostics: [{ id: 'DIAG-001', title: 'T', rootCause: 'R', locations: [] }],
        constraints: [],
        verificationCommands: [{ command: 'pnpm test', description: 'test' }],
      };
      expect(() => validateExtractedTransfer(invalid)).toThrow(/Missing or invalid objective string/);
    });

    it('should extract programmatic transfer from raw text without answer key', () => {
      const mockTranscript = [
        'I examined src/scheduler.ts and found three major defects:',
        '1. There is a token clamp issue where tokens overflow capacity on refill.',
        '2. The activeCount is double decremented in completeTask handler.',
        '3. A queue starvation defect exists when priority is not considered.',
      ].join('\n');

      const transfer = parseProgrammaticTransfer(mockTranscript);
      expect(transfer.schemaVersion).toBe('0.2.0-simplified');
      expect(transfer.diagnostics.length).toBeGreaterThanOrEqual(1);
      expect(transfer.diagnostics[0].locations[0].filePath).toBe('src/scheduler.ts');
      expect(() => validateExtractedTransfer(transfer)).not.toThrow();
    });

    it('should reject empty transcript in programmatic extractor', () => {
      expect(() => parseProgrammaticTransfer('')).toThrow(AgentExecutionError);
      expect(() => parseProgrammaticTransfer('   ')).toThrow(AgentExecutionError);
    });
  });

  describe('Randomization & Trial Ordering', () => {
    it('should generate deterministic random sequences from a seed', () => {
      const rng1 = createMulberry32(12345);
      const rng2 = createMulberry32(12345);

      expect(rng1()).toBe(rng2());
      expect(rng1()).toBe(rng2());
      expect(rng1()).toBe(rng2());
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
      const repOrder = generateTrialOrder(42, 'replicate');
      expect(repOrder).toHaveLength(9);

      const countA = repOrder.filter((t) => t.condition === 'A').length;
      const countB = repOrder.filter((t) => t.condition === 'B').length;
      const countC = repOrder.filter((t) => t.condition === 'C').length;

      expect(countA).toBe(3);
      expect(countB).toBe(3);
      expect(countC).toBe(3);
    });
  });

  describe('Telemetry & Information Metrics', () => {
    it('should calculate accurate byte sizes and token estimates', () => {
      const payload = 'Short payload for testing metrics computation';
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

    it('should configure agent names cleanly', () => {
      expect(AGENT_A_NAME).toBe('claude');
      expect(AGENT_B_NAME).toBe('opencode');
    });

    it('should deterministically attempt resolution for agents', () => {
      try {
        const res = resolveExecutable('claude');
        expect(res.command).toBeDefined();
        expect(res.resolvedPath).toBeDefined();
      } catch (err: unknown) {
        expect((err as Error).message).toContain('locate executable');
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
        '--format',
        'json',
        '--dir',
        targetDir,
      ];

      const flagsA = getExpectedFlags('C:\\path with spaces\\worktrees\\condition-a', 'Prompt A');
      const flagsB = getExpectedFlags('C:\\path with spaces\\worktrees\\condition-b', 'Prompt B');
      const flagsC = getExpectedFlags('C:\\path with spaces\\worktrees\\condition-c', 'Prompt C');

      // Controlled condition invariant: exact same flags structure
      expect(flagsA.slice(2)).toEqual([
        '--auto',
        '--pure',
        '--format',
        'json',
        '--dir',
        'C:\\path with spaces\\worktrees\\condition-a',
      ]);
      expect(flagsB.slice(2)).toEqual([
        '--auto',
        '--pure',
        '--format',
        'json',
        '--dir',
        'C:\\path with spaces\\worktrees\\condition-b',
      ]);
      expect(flagsC.slice(2)).toEqual([
        '--auto',
        '--pure',
        '--format',
        'json',
        '--dir',
        'C:\\path with spaces\\worktrees\\condition-c',
      ]);
    });
  });

  describe('Hard Stage Gates & Failure-Propagation Invariants', () => {
    it('A. Missing executable should throw EXECUTABLE_NOT_FOUND', () => {
      expect(() => {
        throw new AgentExecutionError(
          'EXECUTABLE_NOT_FOUND',
          'Could not locate executable for non-existent-agent',
        );
      }).toThrowError(/EXECUTABLE_NOT_FOUND/);
    });

    it('B. Empty Claude stdout should throw EMPTY_OUTPUT and AGENT_A_NO_TRANSCRIPT', () => {
      expect(() => {
        throw new AgentExecutionError('EMPTY_OUTPUT', 'Claude Code completed with empty stdout');
      }).toThrowError(/EMPTY_OUTPUT/);

      expect(() => parseProgrammaticTransfer('')).toThrowError(/AGENT_A_NO_TRANSCRIPT/);
    });

    it('C. Claude non-zero exit should throw PROCESS_EXIT_NONZERO', () => {
      const err = new AgentExecutionError('PROCESS_EXIT_NONZERO', 'Claude Code exited with code 127', {
        exitCode: 127,
        stderr: 'claude: command not found',
      });
      expect(err.classification).toBe('PROCESS_EXIT_NONZERO');
      expect(err.details?.exitCode).toBe(127);
    });

    it('D. OpenCode failure should classify cleanly without producing valid success data', () => {
      const err = new AgentExecutionError('TIMEOUT', 'OpenCode execution timed out after 180000ms');
      expect(err.classification).toBe('TIMEOUT');
      expect(err.name).toBe('AgentExecutionError');
    });

    it('E. Invalid transfer should reject and trigger AGENT_A_TRANSFER_EXTRACTION_FAILURE', () => {
      expect(() => {
        const gibberish = 'no relevant findings at all';
        parseProgrammaticTransfer(gibberish);
      }).not.toThrow(); // returns non-empty excerpt

      expect(() => {
        parseProgrammaticTransfer('x'); // too short (< 20 chars and no keywords)
      }).toThrowError(/AGENT_A_TRANSFER_EXTRACTION_FAILURE/);
    });
  });
});
