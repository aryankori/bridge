/**
 * Unit Tests — Production Agent Adapters
 */

import { describe, it, expect } from 'vitest';
import { ClaudeCodeAdapter } from '../../src/adapters/claude-code/index.js';
import { OpenCodeAdapter } from '../../src/adapters/opencode/index.js';
import { CodexAdapter } from '../../src/adapters/codex/index.js';
import { GeminiCliAdapter } from '../../src/adapters/gemini-cli/index.js';

describe('Bridge Agent Adapters', () => {
  describe('ClaudeCodeAdapter', () => {
    it('initializes with accurate descriptor and capability metadata', () => {
      const adapter = new ClaudeCodeAdapter();
      expect(adapter.descriptor.id).toBe('claude-code');
      expect(adapter.descriptor.name).toBe('Claude Code');
      expect(adapter.descriptor.capabilities.launch).toBe(true);
      expect(adapter.descriptor.capabilities.streamOutput).toBe(true);
      expect(adapter.descriptor.capabilities.acp).toBe(true);
      expect(adapter.descriptor.transports).toContain('stdio-json');
    });

    it('creates and manages session lifecycles', async () => {
      const adapter = new ClaudeCodeAdapter();
      const session = await adapter.createSession({ cwd: process.cwd() });
      expect(session.id).toBeDefined();
      expect(session.agentId).toBe('claude-code');
      expect(session.state).toBe('created');

      const retrieved = await adapter.attachSession(session.id);
      expect(retrieved.id).toBe(session.id);

      const all = await adapter.listSessions();
      expect(all).toHaveLength(1);

      await adapter.closeSession(session.id);
      const afterClose = await adapter.listSessions();
      expect(afterClose).toHaveLength(0);
    });
  });

  describe('OpenCodeAdapter', () => {
    it('initializes with accurate descriptor and capability metadata', () => {
      const adapter = new OpenCodeAdapter();
      expect(adapter.descriptor.id).toBe('opencode');
      expect(adapter.descriptor.name).toBe('OpenCode');
      expect(adapter.descriptor.capabilities.launch).toBe(true);
      expect(adapter.descriptor.capabilities.streamOutput).toBe(true);
      expect(adapter.descriptor.capabilities.importSession).toBe(true);
      expect(adapter.descriptor.capabilities.exportSession).toBe(true);
      expect(adapter.descriptor.transports).toContain('stdio-json');
    });

    it('creates and manages session lifecycles', async () => {
      const adapter = new OpenCodeAdapter();
      const session = await adapter.createSession({ cwd: process.cwd() });
      expect(session.id).toBeDefined();
      expect(session.agentId).toBe('opencode');

      const all = await adapter.listSessions();
      expect(all.length).toBeGreaterThanOrEqual(1);

      await adapter.dispose();
      const afterDispose = await adapter.listSessions();
      expect(afterDispose).toHaveLength(0);
    });
  });

  describe('CodexAdapter', () => {
    it('initializes with accurate descriptor and capability metadata', () => {
      const adapter = new CodexAdapter();
      expect(adapter.descriptor.id).toBe('codex');
      expect(adapter.descriptor.name).toBe('OpenAI Codex');
      expect(adapter.descriptor.capabilities.launch).toBe(true);
      expect(adapter.descriptor.capabilities.streamOutput).toBe(true);
    });
  });

  describe('GeminiCliAdapter', () => {
    it('initializes with accurate descriptor and capability metadata', () => {
      const adapter = new GeminiCliAdapter();
      expect(adapter.descriptor.id).toBe('gemini-cli');
      expect(adapter.descriptor.name).toBe('Gemini CLI');
      expect(adapter.descriptor.capabilities.launch).toBe(true);
      expect(adapter.descriptor.capabilities.streamOutput).toBe(true);
    });
  });
});
