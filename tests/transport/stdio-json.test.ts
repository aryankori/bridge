/**
 * StdioJsonTransport Tests
 *
 * Tests the foundational transport layer by spawning a real child process
 * (the echo-process.mjs fixture) and verifying NDJSON communication.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { StdioJsonTransport } from '../../src/transport/stdio-json.js';

const ECHO_SCRIPT = resolve(import.meta.dirname, '../fixtures/echo-process.mjs');

describe('StdioJsonTransport', () => {
  let transport: StdioJsonTransport;

  afterEach(async () => {
    if (transport && transport.state === 'connected') {
      await transport.close();
    }
  });

  it('should start in idle state', () => {
    transport = new StdioJsonTransport({
      command: process.execPath,
      args: [ECHO_SCRIPT],
    });
    expect(transport.state).toBe('idle');
  });

  it('should transition to connected state on connect()', async () => {
    transport = new StdioJsonTransport({
      command: process.execPath,
      args: [ECHO_SCRIPT],
    });
    await transport.connect();
    expect(transport.state).toBe('connected');
    expect(transport.pid).toBeTypeOf('number');
  });

  it('should receive the init message from the child process', async () => {
    transport = new StdioJsonTransport({
      command: process.execPath,
      args: [ECHO_SCRIPT],
    });
    await transport.connect();

    const iterator = transport[Symbol.asyncIterator]();
    const { value, done } = await iterator.next();

    expect(done).toBe(false);
    expect(value).toMatchObject({
      type: 'init',
      pid: expect.any(Number),
    });
  });

  it('should send and receive JSON messages', async () => {
    transport = new StdioJsonTransport({
      command: process.execPath,
      args: [ECHO_SCRIPT],
    });
    await transport.connect();

    const iterator = transport[Symbol.asyncIterator]();

    // Skip the init message
    await iterator.next();

    // Send a message
    await transport.send({ hello: 'world', count: 42 });

    const { value } = await iterator.next();
    expect(value).toEqual({
      type: 'echo',
      received: { hello: 'world', count: 42 },
    });
  });

  it('should handle multiple sequential messages', async () => {
    transport = new StdioJsonTransport({
      command: process.execPath,
      args: [ECHO_SCRIPT],
    });
    await transport.connect();

    const iterator = transport[Symbol.asyncIterator]();
    await iterator.next(); // skip init

    await transport.send({ msg: 1 });
    await transport.send({ msg: 2 });
    await transport.send({ msg: 3 });

    const r1 = await iterator.next();
    const r2 = await iterator.next();
    const r3 = await iterator.next();

    expect((r1.value as { received: { msg: number } }).received.msg).toBe(1);
    expect((r2.value as { received: { msg: number } }).received.msg).toBe(2);
    expect((r3.value as { received: { msg: number } }).received.msg).toBe(3);
  });

  it('should handle process exit gracefully', async () => {
    transport = new StdioJsonTransport({
      command: process.execPath,
      args: [ECHO_SCRIPT],
    });
    await transport.connect();

    const closePromise = new Promise<number | null>((resolve) => {
      transport.onClose(resolve);
    });

    const iterator = transport[Symbol.asyncIterator]();
    await iterator.next(); // skip init

    // Tell the process to exit
    await transport.send({ command: 'exit', code: 0 });

    const exitCode = await closePromise;
    expect(exitCode).toBe(0);

    // Iterator should complete
    const { done } = await iterator.next();
    expect(done).toBe(true);
  });

  it('should capture stderr output', async () => {
    transport = new StdioJsonTransport({
      command: process.execPath,
      args: [ECHO_SCRIPT],
    });
    await transport.connect();

    const iterator = transport[Symbol.asyncIterator]();
    await iterator.next(); // skip init

    // Tell the process to write to stderr
    await transport.send({ command: 'error', message: 'test error' });

    // Give it a moment to process
    await new Promise((r) => setTimeout(r, 100));

    expect(transport.stderr.some((line) => line.includes('test error'))).toBe(true);
  });

  it('should reject send() when not connected', async () => {
    transport = new StdioJsonTransport({
      command: process.execPath,
      args: [ECHO_SCRIPT],
    });

    await expect(transport.send({ hello: 'world' })).rejects.toThrow('Cannot send');
  });

  it('should transition to closed state on close()', async () => {
    transport = new StdioJsonTransport({
      command: process.execPath,
      args: [ECHO_SCRIPT],
    });
    await transport.connect();
    await transport.close();
    expect(transport.state).toBe('closed');
  });

  it('should handle crash and emit error', async () => {
    transport = new StdioJsonTransport({
      command: process.execPath,
      args: [ECHO_SCRIPT],
    });
    await transport.connect();

    const closePromise = new Promise<number | null>((resolve) => {
      transport.onClose(resolve);
    });

    const iterator = transport[Symbol.asyncIterator]();
    await iterator.next(); // skip init

    // Tell the process to crash
    await transport.send({ command: 'crash' });

    const exitCode = await closePromise;
    expect(exitCode).toBe(1);
  });

  it('should work with for-await-of pattern', async () => {
    transport = new StdioJsonTransport({
      command: process.execPath,
      args: [ECHO_SCRIPT],
    });
    await transport.connect();

    // Send a couple messages then close
    await transport.send({ msg: 'a' });
    await transport.send({ msg: 'b' });

    // Small delay to let messages flow
    await new Promise((r) => setTimeout(r, 50));

    await transport.send({ command: 'exit', code: 0 });

    const messages: unknown[] = [];
    for await (const msg of transport) {
      messages.push(msg);
    }

    // Should have: init, echo(a), echo(b)
    expect(messages.length).toBeGreaterThanOrEqual(3);
    expect(messages[0]).toMatchObject({ type: 'init' });
  });
});
