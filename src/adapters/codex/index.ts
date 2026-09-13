/**
 * Bridge Adapter - OpenAI Codex
 *
 * Integration adapter for OpenAI Codex / Codex CLI tools.
 * Implements the AgentAdapter interface supporting:
 * - Executable resolution
 * - JSON streaming protocol
 * - Capability inspection
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

export class CodexAdapter implements AgentAdapter {
 private readonly _descriptor: AgentDescriptor;
 private activeSessions = new Map<SessionId, { session: Session; transport?: StdioJsonTransport }>();

 constructor(customExecutablePath?: string) {
 const defaultPath = customExecutablePath || CodexAdapter.resolveExecutablePath();
 this._descriptor = {
 id: agentId('codex'),
 name: 'OpenAI Codex',
 version: null,
 executablePath: defaultPath,
 dataDir: null,
 transports: ['stdio-json', 'acp'],
 capabilities: {
 launch: true,
 sendMessage: true,
 streamOutput: true,
 listSessions: false,
 resumeSession: false,
 exportSession: true,
 importSession: false,
 mcpClient: true,
 mcpServer: false,
 acp: true,
 },
 evidence: {
 launch: 'documented',
 streamOutput: 'documented',
 exportSession: 'documented',
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
 path.join(userProfile, 'AppData', 'Roaming', 'npm', 'codex.cmd'),
 path.join(userProfile, 'scoop', 'shims', 'codex.exe'),
 path.join(userProfile, '.local', 'bin', 'codex.exe'),
 ]
 : [
 path.join(process.env['HOME'] ?? '', '.local', 'bin', 'codex'),
 '/usr/local/bin/codex',
 '/usr/bin/codex',
 ];

 for (const cand of candidates) {
 if (cand && fs.existsSync(cand)) return cand;
 }

 try {
 const query = isWindows ? 'where.exe codex.cmd || where.exe codex.exe' : 'which codex';
 const out = execSync(query, { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8' });
 const first = out.split(/\r?\n/)[0]?.trim();
 if (first && fs.existsSync(first)) return first;
 } catch {
 // Fallback
 }

 return 'codex';
 }

 async discover(): Promise<AgentDescriptor | null> {
 const exe = CodexAdapter.resolveExecutablePath();
 if (fs.existsSync(exe) || exe === 'codex') {
 try {
 const verOutput = execSync(`${exe} --version`, {
 stdio: ['pipe', 'pipe', 'pipe'],
 encoding: 'utf-8',
 timeout: 5000,
 }).trim();
 this._descriptor.version = verOutput || null;
 } catch {
 // Version non-fatal
 }
 return this._descriptor;
 }
 return null;
 }

 async createSession(options: Record<string, unknown> = {}): Promise<Session> {
 const id = sessionId(`codex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
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
 args: ['exec', '--format', 'json'],
 cwd,
 });

 this.activeSessions.set(id, { session, transport });
 return session;
 }

 async attachSession(id: SessionId): Promise<Session> {
 const entry = this.activeSessions.get(id);
 if (!entry) throw new Error(`Session ${id} not found in CodexAdapter`);
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
 await entry.transport.send({ prompt: content });
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
 const event = rawEvent as Record<string, unknown>;
 const now = new Date();
 const content =
 typeof event['content'] === 'string'
 ? event['content']
 : typeof event['text'] === 'string'
 ? event['text']
 : JSON.stringify(event);

 yield {
 id: `msg-${Date.now()}`,
 sessionId: id,
 direction: 'inbound',
 contentType: 'text',
 content,
 timestamp: now,
 raw: event,
 };
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
