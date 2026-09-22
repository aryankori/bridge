/**
 * JSON-RPC 2.0 Client
 *
 * A thin client that layers on top of any Transport to speak JSON-RPC 2.0.
 * This is what Bridge uses to communicate with ACP-compliant agents like OpenCode.
 *
 * Features:
 * - Request/response correlation via auto-incrementing IDs
 * - Fire-and-forget notifications
 * - Server-initiated notification subscriptions
 * - Configurable per-request timeouts
 * - Typed error responses
 *
 * ACP evidence:
 * - "ACP uses JSON-RPC to encode messages. JSON-RPC messages MUST be UTF-8 encoded."
 * - "Messages are delimited by newlines and MUST NOT contain embedded newlines."
 * - All requests have { jsonrpc: "2.0", id, method, params }
 * - Notifications have no `id` field
 */

import type { Transport } from './types.js';
import type { Logger } from '../core/types.js';
import {
 isJsonRpcResponse,
 isJsonRpcErrorResponse,
 isJsonRpcNotification,
 type JsonRpcRequest,
 type JsonRpcNotification,
 type JsonRpcResponse,
} from './types.js';

/** Thrown when a JSON-RPC error response is received */
export class JsonRpcError extends Error {
 constructor(
 public readonly code: number,
 message: string,
 public readonly data?: unknown,
 ) {
 super(`JSON-RPC error ${code}: ${message}`);
 this.name = 'JsonRpcError';
 }
}

/** Default request timeout: 60 seconds */
const DEFAULT_TIMEOUT_MS = 60_000;

type NotificationHandler = (params: unknown) => void;

interface PendingRequest {
 resolve: (result: unknown) => void;
 reject: (error: Error) => void;
 timer: ReturnType<typeof setTimeout>;
}

export class JsonRpcClient {
 private nextId = 1;
 private pending = new Map<number | string, PendingRequest>();
 private notificationHandlers = new Map<string, Set<NotificationHandler>>();
 private messageLoopRunning = false;
 private messageLoopPromise: Promise<void> | null = null;
 private maxPendingRequests: number;

 constructor(
 private readonly transport: Transport,
 private readonly defaultTimeoutMs = DEFAULT_TIMEOUT_MS,
 maxPendingRequests = 1000,
 private readonly logger?: Logger
 ) {
   this.maxPendingRequests = maxPendingRequests;
 }

 /**
 * Start consuming messages from the transport.
 * Call this after transport.connect() to begin routing responses.
 */
 start(): void {
 if (this.messageLoopRunning) return;
 this.messageLoopRunning = true;
 this.messageLoopPromise = this.runMessageLoop();
 }

 /**
 * Stop the message loop and reject all pending requests.
 */
 async stop(): Promise<void> {
 this.messageLoopRunning = false;

 // Reject all pending requests
 for (const [id, pending] of this.pending) {
 clearTimeout(pending.timer);
 pending.reject(new Error('JSON-RPC client stopped'));
 this.pending.delete(id);
 }
 }

 /**
 * Send a JSON-RPC request and wait for the response.
 */
 async request<T = unknown>(
 method: string,
 params?: unknown,
 timeoutMs?: number,
 ): Promise<T> {
 if (this.pending.size >= this.maxPendingRequests) {
   throw new Error(`Cannot send request: exceeded max pending requests limit of ${this.maxPendingRequests}`);
 }

 const id = this.nextId++;
 if (this.nextId > Number.MAX_SAFE_INTEGER) {
   this.nextId = 1;
 }

 const msg: JsonRpcRequest = {
 jsonrpc: '2.0',
 id,
 method,
 ...(params !== undefined && { params }),
 };

 const timeout = timeoutMs ?? this.defaultTimeoutMs;

 return new Promise<T>((resolve, reject) => {
 const timer = setTimeout(() => {
 this.pending.delete(id);
 reject(new Error(`JSON-RPC request '${method}' timed out after ${timeout}ms`));
 }, timeout);

 this.pending.set(id, {
 resolve: resolve as (result: unknown) => void,
 reject,
 timer,
 });

 this.transport.send(msg).catch((err) => {
 clearTimeout(timer);
 this.pending.delete(id);
 reject(err);
 });
 });
 }

 /**
 * Send a JSON-RPC notification (fire-and-forget, no response expected).
 */
 async notify(method: string, params?: unknown): Promise<void> {
 const msg: JsonRpcNotification = {
 jsonrpc: '2.0',
 method,
 ...(params !== undefined && { params }),
 };

 await this.transport.send(msg);
 }

 /**
 * Subscribe to server-initiated notifications by method name.
 * Returns an unsubscribe function.
 */
 onNotification(method: string, handler: NotificationHandler): () => void {
 let handlers = this.notificationHandlers.get(method);
 if (!handlers) {
 handlers = new Set();
 this.notificationHandlers.set(method, handlers);
 }
 handlers.add(handler);

 return () => {
 handlers?.delete(handler);
 if (handlers?.size === 0) {
 this.notificationHandlers.delete(method);
 }
 };
 }

 /**
 * Whether there are pending requests awaiting responses.
 */
 get hasPendingRequests(): boolean {
 return this.pending.size > 0;
 }

 // ---------------------------------------------------------------------------
 // Internal
 // ---------------------------------------------------------------------------

 private async runMessageLoop(): Promise<void> {
 try {
 for await (const raw of this.transport) {
 if (!this.messageLoopRunning) break;
 this.handleMessage(raw);
 }
 } catch (err) {
 // Transport error - reject all pending
 const error = err instanceof Error ? err : new Error(String(err));
 for (const [id, pending] of this.pending) {
 clearTimeout(pending.timer);
 pending.reject(error);
 this.pending.delete(id);
 }
 }
 }

 private handleMessage(raw: unknown): void {
 // Is it a response to one of our requests?
 if (isJsonRpcResponse(raw)) {
 this.handleResponse(raw);
 return;
 }

 // Is it a server-initiated notification?
 if (isJsonRpcNotification(raw)) {
 this.handleNotification(raw.method, raw.params);
 return;
 }

 // Could also be a server-initiated request (JSON-RPC allows this).
 // For now we just ignore those - Bridge doesn't implement any server methods yet.
 }

 private handleResponse(response: JsonRpcResponse): void {
 const id = response.id;
 if (id === null) return; // Can't correlate

 const pending = this.pending.get(id);
 if (!pending) return; // Unexpected response

 clearTimeout(pending.timer);
 this.pending.delete(id);

 if (isJsonRpcErrorResponse(response)) {
 pending.reject(
 new JsonRpcError(response.error.code, response.error.message, response.error.data),
 );
 } else {
 pending.resolve(response.result);
 }
 }

 private handleNotification(method: string, params: unknown): void {
 const handlers = this.notificationHandlers.get(method);
 if (!handlers) return;

 for (const handler of handlers) {
 try {
 handler(params);
 } catch (err) {
 if (this.logger) {
   this.logger.error(`Error in JSON-RPC notification handler for method '${method}'`, err);
 }
 }
 }
 }
}
