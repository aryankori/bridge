/**
 * StdioJsonTransport
 *
 * Manages a child process and provides NDJSON streaming over stdin/stdout.
 * This is the foundational transport for Bridge - both Claude Code's
 * stream-json format and OpenCode's ACP protocol communicate this way.
 *
 * Architecture:
 * - Spawns the agent as a child process
 * - Reads stdout line-by-line, parses each line as JSON
 * - Writes JSON objects to stdin (serialized + newline)
 * - Captures stderr for debugging
 * - Implements AsyncIterable<unknown> for streaming consumption
 *
 * Protocol evidence:
 * - ACP spec: "Messages are delimited by newlines, MUST NOT contain embedded newlines"
 * - Claude Code: Each line of --output-format stream-json is a complete JSON object
 * - OpenCode: `opencode acp` speaks JSON-RPC 2.0 over stdio (newline-delimited)
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface, type Interface as ReadlineInterface } from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Logger } from '../core/types.js';
import type { Transport, TransportState, StdioTransportOptions } from './types.js';

export class StdioJsonTransport implements Transport {
 private process: ChildProcess | null = null;
 private readline: ReadlineInterface | null = null;
 private messageQueue: unknown[] = [];
 private waitingResolvers: Array<(value: IteratorResult<unknown>) => void> = [];
 private errorHandlers = new Set<(error: Error) => void>();
 private closeHandlers = new Set<(code: number | null) => void>();
 private stderrLines: string[] = [];
 private _state: TransportState = 'idle';
 private iteratorDone = false;

 constructor(private readonly options: StdioTransportOptions, private readonly logger?: Logger) {}

 get state(): TransportState {
 return this._state;
 }

 /** Last N lines captured from stderr (for debugging) */
 get stderr(): readonly string[] {
 return this.stderrLines;
 }

 /** The underlying child process PID, if running */
 get pid(): number | undefined {
 return this.process?.pid;
 }

 async connect(): Promise<void> {
 if (this._state === 'connected') return;
 if (this._state === 'connecting') {
 throw new Error('Transport is already connecting');
 }

 // Validate command
 if (!path.isAbsolute(this.options.command)) {
   throw new Error(`Command must be an absolute path: ${this.options.command}`);
 }
 if (!fs.existsSync(this.options.command)) {
   throw new Error(`Command executable not found: ${this.options.command}`);
 }
 if (/[&|;`$]/.test(this.options.command)) {
   throw new Error(`Command contains shell metacharacters: ${this.options.command}`);
 }

 this._state = 'connecting';

 try {
 const safeEnvKeys = ['PATH', 'HOME', 'NODE_ENV', 'TERM'];
 const safeEnv: Record<string, string | undefined> = {};
 for (const key of safeEnvKeys) {
   safeEnv[key] = process.env[key];
 }

 const child = spawn(this.options.command, this.options.args ?? [], {
 cwd: this.options.cwd,
 env: { ...safeEnv, ...this.options.env },
 stdio: ['pipe', 'pipe', 'pipe'],
 // Don't let the child keep the parent alive
 detached: false,
 shell: false,
 });

 this.process = child;

 // Guard against spawn failure
 if (!child.stdout || !child.stdin || !child.stderr) {
 throw new Error('Failed to establish stdio pipes with child process');
 }

 // Read stdout line-by-line
 this.readline = createInterface({
 input: child.stdout,
 crlfDelay: Infinity,
 });

 this.readline.on('line', (line: string) => {
 const trimmed = line.trim();
 if (!trimmed) return; // Skip empty lines

 try {
 const parsed = JSON.parse(trimmed);
 this.enqueue(parsed);
 } catch (err) {
 // Non-JSON line - some agents emit preamble text before JSON.
 // Capture it but don't crash.
 this.stderrLines.push(`[non-json stdout] ${trimmed}`);
 if (this.logger) {
   this.logger.warn(`Non-JSON output on stdout: ${trimmed}`);
 }
 }
 });

 // Capture stderr for debugging (keep last 100 lines)
 const stderrRl = createInterface({
 input: child.stderr,
 crlfDelay: Infinity,
 });

 stderrRl.on('line', (line: string) => {
 this.stderrLines.push(line);
 if (this.stderrLines.length > 100) {
 this.stderrLines.shift();
 }
 });

 // Handle process errors
 child.on('error', (err: Error) => {
 this._state = 'error';
 this.notifyError(err);
 this.finishIterator();
 });

 // Handle process exit
 child.on('close', (code: number | null) => {
 if (this._state !== 'error') {
 this._state = 'closed';
 }
 this.notifyClose(code);
 this.finishIterator();
 });

 this._state = 'connected';
 } catch (err) {
 this._state = 'error';
 throw err;
 }
 }

 async send(data: unknown): Promise<void> {
 if (this._state !== 'connected') {
 throw new Error(`Cannot send: transport is ${this._state}`);
 }

 const stdin = this.process?.stdin;
 if (!stdin || stdin.destroyed) {
 throw new Error('Cannot send: stdin is not available');
 }

 const serialized = JSON.stringify(data) + '\n';

 return new Promise((resolve, reject) => {
 stdin.write(serialized, 'utf-8', (err) => {
 if (err) reject(err);
 else resolve();
 });
 });
 }

 async close(): Promise<void> {
 if (this._state === 'closed' || this._state === 'idle') return;

 this._state = 'closed';

 // Close stdin to signal EOF to the child
 if (this.process?.stdin && !this.process.stdin.destroyed) {
 this.process.stdin.end();
 }

 // Give the process a moment to exit gracefully, then force kill
 const child = this.process;
 if (child && !child.killed) {
 await new Promise<void>((resolve) => {
 const timeout = setTimeout(() => {
 if (!child.killed) {
 child.kill('SIGKILL');
 }
 resolve();
 }, process.platform === 'win32' ? 300 : 3000);

 child.once('close', () => {
 clearTimeout(timeout);
 resolve();
 });

 // Try graceful first
 child.kill(process.platform === 'win32' ? undefined : 'SIGTERM');
 });
 }

 this.readline?.close();
 this.finishIterator();
 }

 onError(handler: (error: Error) => void): () => void {
 this.errorHandlers.add(handler);
 return () => this.errorHandlers.delete(handler);
 }

 onClose(handler: (code: number | null) => void): () => void {
 this.closeHandlers.add(handler);
 return () => this.closeHandlers.delete(handler);
 }

 // ---------------------------------------------------------------------------
 // AsyncIterable implementation
 // ---------------------------------------------------------------------------

 [Symbol.asyncIterator](): AsyncIterator<unknown> {
 return {
 next: () => this.nextMessage(),
 };
 }

 // ---------------------------------------------------------------------------
 // Internal
 // ---------------------------------------------------------------------------

 private nextMessage(): Promise<IteratorResult<unknown>> {
 // If there are queued messages, return one immediately
 if (this.messageQueue.length > 0) {
 return Promise.resolve({ value: this.messageQueue.shift()!, done: false });
 }

 // If the iterator is done, signal completion
 if (this.iteratorDone) {
 return Promise.resolve({ value: undefined, done: true });
 }

 // Otherwise, wait for the next message
 return new Promise((resolve) => {
 this.waitingResolvers.push(resolve);
 });
 }

 private enqueue(data: unknown): void {
 if (this.waitingResolvers.length > 0) {
 // Someone is waiting - give it to them directly
 const resolve = this.waitingResolvers.shift()!;
 resolve({ value: data, done: false });
 } else {
 // No one waiting - buffer it
 const maxSize = this.options.maxQueueSize ?? 10000;
 if (this.messageQueue.length >= maxSize) {
   this.messageQueue.shift(); // Drop the oldest message
   this.notifyError(new Error(`StdioJsonTransport queue limit exceeded (${maxSize}), dropped oldest message.`));
 }
 this.messageQueue.push(data);
 }
 }

 private finishIterator(): void {
 if (this.iteratorDone) return;
 this.iteratorDone = true;

 // Resolve all waiting consumers with done
 for (const resolve of this.waitingResolvers) {
 resolve({ value: undefined, done: true });
 }
 this.waitingResolvers.length = 0;
 }

 private notifyError(err: Error): void {
 for (const handler of this.errorHandlers) {
 try {
 handler(err);
 } catch (handlerErr) {
 if (this.logger) {
   this.logger.error(`Error in StdioJsonTransport error handler`, handlerErr);
 }
 }
 }
 }

 private notifyClose(code: number | null): void {
 for (const handler of this.closeHandlers) {
 try {
 handler(code);
 } catch (handlerErr) {
 if (this.logger) {
   this.logger.error(`Error in StdioJsonTransport close handler`, handlerErr);
 }
 }
 }
 }
}
