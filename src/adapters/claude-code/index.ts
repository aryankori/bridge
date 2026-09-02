/**
 * Bridge Adapter — Claude Code
 *
 * Integration adapter for Anthropic's Claude Code CLI tool.
 * Implements the AgentAdapter interface supporting:
 * - Discovery via executable path resolution
 * - Stream-json communication over stdio
 * - Structured event parsing and message emission
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import type {
  AgentAdapter,
  AgentDescriptor,
  Message,
  Session,
  SessionId,
} from '../../core/types.js';
import { agentId, sessionId } from '../../core/types.js';
import { StdioJsonTransport } from '../../transport/stdio-json.js';
import type { ClaudeStreamEvent } from './types.js';
import { isClaudeAssistantMessage, isClaudeContentDelta, isClaudeResult } from './types.js';

export class ClaudeCodeAdapter implements AgentAdapter {
  private readonly _descriptor: AgentDescriptor;
  private activeSessions = new Map<SessionId, { session: Session; transport?: StdioJsonTransport }>();

  constructor(customExecutablePath?: string) {
    const defaultPath = customExecutablePath || ClaudeCodeAdapter.resolveExecutablePath();
    this._descriptor = {
      id: agentId('claude-code'),
      name: 'Claude Code',
      version: null,
      executablePath: defaultPath,
      dataDir: null,
      transports: ['stdio-json', 'acp'],
      capabilities: {
        launch: true,
        sendMessage: true,
        streamOutput: true,
        listSessions: false,
        resumeSession: true,
        exportSession: true,
        importSession: false,
        mcpClient: true,
        mcpServer: false,
        acp: true,
      },
      evidence: {
        launch: 'observed',
        streamOutput: 'documented',
        exportSession: 'observed',
      },
    };
  }

  get descriptor(): AgentDescriptor {
    return this._descriptor;
  }

  static resolveExecutablePath(): string {
    const isWindows = process.platform === 'win32';
    const userProfile = process.env['USERPROFILE'] ?? (isWindows ? 'C:\\Users\\aryan' : '');

    const candidates: string[] = isWindows
      ? [
          path.join(userProfile, '.local', 'bin', 'claude.exe'),
          path.join(userProfile, '.local', 'bin', 'claude.cmd'),
          path.join(userProfile, 'AppData', 'Roaming', 'npm', 'claude.cmd'),
          path.join(userProfile, 'scoop', 'shims', 'claude.exe'),
        ]
      : [
          path.join(process.env['HOME'] ?? '', '.local', 'bin', 'claude'),
          '/usr/local/bin/claude',
          '/usr/bin/claude',
        ];

    for (const cand of candidates) {
      if (cand && fs.existsSync(cand)) return cand;
    }

    try {
      const query = isWindows ? 'where.exe claude.cmd || where.exe claude.exe' : 'which claude';
      const out = execSync(query, { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8' });
      const first = out.split(/\r?\n/)[0]?.trim();
      if (first && fs.existsSync(first)) return first;
    } catch {
      // Fallback
    }

    return 'claude';
  }

  async discover(): Promise<AgentDescriptor | null> {
    const exe = ClaudeCodeAdapter.resolveExecutablePath();
    if (fs.existsSync(exe) || exe === 'claude') {
      try {
        const verOutput = execSync(`${exe} --version`, {
          stdio: ['pipe', 'pipe', 'pipe'],
          encoding: 'utf-8',
          timeout: 5000,
        }).trim();
        this._descriptor.version = verOutput || null;
      } catch {
        // Version check non-fatal
      }
      return this._descriptor;
    }
    return null;
  }

  async createSession(options: Record<string, unknown> = {}): Promise<Session> {
    const id = sessionId(`claude-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    const now = new Date();
    const session: Session = {
      id,
      agentId: this._descriptor.id,
      state: 'created',
      createdAt: now,
      lastActivityAt: now,
      metadata: options,
    };

    const cwd = typeof options['cwd'] === 'string' ? options['cwd'] : process.cwd();
    const transport = new StdioJsonTransport({
      command: this._descriptor.executablePath,
      args: ['-p', '--output-format', 'stream-json', '--verbose'],
      cwd,
    });

    this.activeSessions.set(id, { session, transport });
    return session;
  }

  async attachSession(id: SessionId): Promise<Session> {
    const entry = this.activeSessions.get(id);
    if (!entry) {
      throw new Error(`Session ${id} not found in ClaudeCodeAdapter`);
    }
    return entry.session;
  }

  async listSessions(): Promise<Session[]> {
    return Array.from(this.activeSessions.values()).map((e) => e.session);
  }

  async sendMessage(id: SessionId, content: string): Promise<void> {
    const entry = this.activeSessions.get(id);
    if (!entry) throw new Error(`Session ${id} not found`);

    if (entry.transport) {
      if (entry.transport.state === 'idle') {
        await entry.transport.connect();
      }
      await entry.transport.send({ type: 'user_message', content });
      entry.session.lastActivityAt = new Date();
      entry.session.state = 'active';
    }
  }

  async *streamOutput(id: SessionId): AsyncIterable<Message> {
    const entry = this.activeSessions.get(id);
    if (!entry || !entry.transport) return;

    if (entry.transport.state === 'idle') {
      await entry.transport.connect();
    }

    for await (const rawEvent of entry.transport) {
      const event = rawEvent as ClaudeStreamEvent;
      const now = new Date();

      if (isClaudeAssistantMessage(event)) {
        const textContent = event.message.content
          .filter((c: { type: string; text?: string }) => c.type === 'text')
          .map((c: { type: string; text?: string }) => c.text ?? '')
          .join('\n');

        yield {
          id: `msg-${Date.now()}`,
          sessionId: id,
          direction: 'inbound',
          contentType: 'text',
          content: textContent,
          timestamp: now,
          raw: event,
        };
      } else if (isClaudeContentDelta(event) && event.delta.text) {
        yield {
          id: `delta-${Date.now()}`,
          sessionId: id,
          direction: 'inbound',
          contentType: 'text',
          content: event.delta.text,
          timestamp: now,
          raw: event,
        };
      } else if (isClaudeResult(event)) {
        yield {
          id: `res-${Date.now()}`,
          sessionId: id,
          direction: 'inbound',
          contentType: 'text',
          content: String(event.result),
          timestamp: now,
          raw: event,
        };
      }
    }
  }

  async closeSession(id: SessionId): Promise<void> {
    const entry = this.activeSessions.get(id);
    if (entry) {
      if (entry.transport) {
        await entry.transport.close();
      }
      entry.session.state = 'closed';
      this.activeSessions.delete(id);
    }
  }

  async dispose(): Promise<void> {
    const closes = Array.from(this.activeSessions.keys()).map((id) => this.closeSession(id));
    await Promise.allSettled(closes);
    this.activeSessions.clear();
  }
}
