/**
 * Bridge Adapter - OpenCode
 *
 * Integration adapter for OpenCode agent CLI.
 * Implements the AgentAdapter interface supporting:
 * - Discovery via executable path resolution (Scoop / npm / PATH)
 * - JSON event streaming over stdio
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

export class OpenCodeAdapter implements AgentAdapter {
 private readonly _descriptor: AgentDescriptor;
 private activeSessions = new Map<SessionId, { session: Session; transport?: StdioJsonTransport }>();

 constructor(customExecutablePath?: string) {
 const defaultPath = customExecutablePath || OpenCodeAdapter.resolveExecutablePath();
 this._descriptor = {
 id: agentId('opencode'),
 name: 'OpenCode',
 version: null,
 executablePath: defaultPath,
 dataDir: null,
 transports: ['stdio-json', 'http', 'acp'],
 capabilities: {
 launch: true,
 sendMessage: true,
 streamOutput: true,
 listSessions: true,
 resumeSession: true,
 exportSession: true,
 importSession: true,
 mcpClient: true,
 mcpServer: false,
 acp: true,
 },
 evidence: {
 launch: 'observed',
 streamOutput: 'observed',
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
 path.join(userProfile, 'scoop', 'shims', 'opencode.exe'),
 path.join(userProfile, 'scoop', 'shims', 'opencode.cmd'),
 path.join(userProfile, 'AppData', 'Roaming', 'npm', 'opencode.cmd'),
 ]
 : [
 path.join(process.env['HOME'] ?? '', '.local', 'bin', 'opencode'),
 '/usr/local/bin/opencode',
 '/usr/bin/opencode',
 ];

 for (const cand of candidates) {
 if (cand && fs.existsSync(cand)) return cand;
 }

 try {
 const query = isWindows ? 'where.exe opencode.exe || where.exe opencode.cmd' : 'which opencode';
 const out = execSync(query, { stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf-8' });
 const first = out.split(/\r?\n/)[0]?.trim();
 if (first && fs.existsSync(first)) return first;
 } catch {
 // Fallback
 }

 return 'opencode';
 }

 async discover(): Promise<AgentDescriptor | null> {
 const exe = OpenCodeAdapter.resolveExecutablePath();
 if (fs.existsSync(exe) || exe === 'opencode') {
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
 const id = sessionId(`opencode-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
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
 const model = typeof options['model'] === 'string' ? options['model'] : 'nvidia/nvidia/nemotron-3-super-120b-a12b';
 const transport = new StdioJsonTransport({
 command: this._descriptor.executablePath,
 args: ['run', '--auto', '--pure', '--format', 'json', '--model', model, '--dir', cwd],
 cwd,
 });

 this.activeSessions.set(id, { session, transport });
 return session;
 }

 async attachSession(id: SessionId): Promise<Session> {
 const entry = this.activeSessions.get(id);
 if (!entry) {
 throw new Error(`Session ${id} not found in OpenCodeAdapter`);
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
 await entry.transport.send({ type: 'prompt', content });
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
 const eventType = typeof event['type'] === 'string' ? event['type'] : '';

 if (eventType === 'message' || eventType === 'text') {
 const text = typeof event['content'] === 'string' ? event['content'] : typeof event['text'] === 'string' ? event['text'] : '';
 yield {
 id: `msg-${Date.now()}`,
 sessionId: id,
 direction: 'inbound',
 contentType: 'text',
 content: text,
 timestamp: now,
 raw: event,
 };
 } else if (eventType === 'tool_use' || eventType === 'tool_call') {
 yield {
 id: `tool-${Date.now()}`,
 sessionId: id,
 direction: 'inbound',
 contentType: 'tool-call',
 content: JSON.stringify(event),
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
