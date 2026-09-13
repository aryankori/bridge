/**
 * JSON-RPC Client Tests
 *
 * Tests the JSON-RPC 2.0 protocol layer using the mock jsonrpc-server.mjs fixture.
 * Validates request/response correlation, notifications, timeouts, and errors.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StdioJsonTransport } from '../../src/transport/stdio-json.js';
import { JsonRpcClient, JsonRpcError } from '../../src/transport/jsonrpc.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RPC_SERVER = resolve(__dirname, '../fixtures/jsonrpc-server.mjs');

describe('JsonRpcClient', () => {
 let transport: StdioJsonTransport;
 let client: JsonRpcClient;

 async function setup(timeoutMs?: number): Promise<void> {
 transport = new StdioJsonTransport({
 command: process.execPath,
 args: [RPC_SERVER],
 });
 await transport.connect();
 client = new JsonRpcClient(transport, timeoutMs);
 client.start();
 }

 afterEach(async () => {
 if (client) await client.stop();
 if (transport && transport.state === 'connected') await transport.close();
 });

 it('should send a request and receive a response', async () => {
 await setup();

 const result = await client.request<{ sum: number }>('add', { a: 3, b: 4 });
 expect(result.sum).toBe(7);
 });

 it('should echo params back via the echo method', async () => {
 await setup();

 const result = await client.request('echo', { hello: 'Bridge' });
 expect(result).toEqual({ hello: 'Bridge' });
 });

 it('should handle multiple concurrent requests', async () => {
 await setup();

 const [r1, r2, r3] = await Promise.all([
 client.request<{ sum: number }>('add', { a: 1, b: 1 }),
 client.request<{ sum: number }>('add', { a: 2, b: 2 }),
 client.request<{ sum: number }>('add', { a: 3, b: 3 }),
 ]);

 expect(r1.sum).toBe(2);
 expect(r2.sum).toBe(4);
 expect(r3.sum).toBe(6);
 });

 it('should throw JsonRpcError on error responses', async () => {
 await setup();

 try {
 await client.request('fail', { code: -32000, message: 'boom' });
 expect.unreachable('should have thrown');
 } catch (err) {
 expect(err).toBeInstanceOf(JsonRpcError);
 expect((err as JsonRpcError).code).toBe(-32000);
 expect((err as JsonRpcError).message).toContain('boom');
 }
 });

 it('should throw JsonRpcError for method not found', async () => {
 await setup();

 try {
 await client.request('nonexistent_method');
 expect.unreachable('should have thrown');
 } catch (err) {
 expect(err).toBeInstanceOf(JsonRpcError);
 expect((err as JsonRpcError).code).toBe(-32601);
 }
 });

 it('should timeout on slow responses', async () => {
 await setup(500); // 500ms default timeout

 try {
 await client.request('slow', { delayMs: 5000 });
 expect.unreachable('should have thrown');
 } catch (err) {
 expect(err).toBeInstanceOf(Error);
 expect((err as Error).message).toContain('timed out');
 }
 });

 it('should support per-request timeout override', async () => {
 await setup(60000); // long default

 try {
 await client.request('slow', { delayMs: 5000 }, 300); // short per-request
 expect.unreachable('should have thrown');
 } catch (err) {
 expect((err as Error).message).toContain('timed out');
 }
 });

 it('should send notifications without waiting for response', async () => {
 await setup();

 // Notifications don't return anything
 await expect(client.notify('some_notification', { data: 42 })).resolves.toBeUndefined();
 });

 it('should receive server-initiated notifications', async () => {
 await setup();

 const received = new Promise<unknown>((resolve) => {
 client.onNotification('test/event', resolve);
 });

 // Trigger a server notification via our special method
 await client.notify('trigger_notification', {
 notificationMethod: 'test/event',
 notificationData: { message: 'hello from server' },
 });

 const data = await received;
 expect(data).toEqual({ message: 'hello from server' });
 });

 it('should handle the ACP initialize handshake', async () => {
 await setup();

 const result = await client.request<{
 protocolVersion: number;
 agentInfo: { name: string; version: string };
 }>('initialize', {
 protocolVersion: 1,
 clientCapabilities: {},
 clientInfo: { name: 'bridge', version: '0.1.0' },
 });

 expect(result.protocolVersion).toBe(1);
 expect(result.agentInfo.name).toBe('mock-agent');
 });

 it('should track pending requests', async () => {
 await setup();

 expect(client.hasPendingRequests).toBe(false);

 // Start a slow request without awaiting
 const promise = client.request('slow', { delayMs: 100 });
 expect(client.hasPendingRequests).toBe(true);

 await promise;
 expect(client.hasPendingRequests).toBe(false);
 });

 it('should reject pending requests on stop()', async () => {
 await setup();

 const promise = client.request('slow', { delayMs: 10000 });
 await client.stop();

 await expect(promise).rejects.toThrow('stopped');
 });
});
