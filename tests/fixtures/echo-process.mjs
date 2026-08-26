/**
 * Mock echo process for transport tests.
 *
 * Reads JSON lines from stdin, echoes them back on stdout with
 * a wrapper. Used by StdioJsonTransport tests.
 *
 * Usage: node tests/fixtures/echo-process.mjs
 */

import { createInterface } from 'node:readline';

const rl = createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

// Emit an init message immediately
process.stdout.write(JSON.stringify({ type: 'init', pid: process.pid }) + '\n');

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const parsed = JSON.parse(trimmed);

    // Special commands
    if (parsed.command === 'exit') {
      process.exit(parsed.code ?? 0);
    }

    if (parsed.command === 'error') {
      process.stderr.write(`Error: ${parsed.message}\n`);
      return;
    }

    if (parsed.command === 'crash') {
      process.exit(1);
    }

    // Default: echo back with wrapper
    const response = { type: 'echo', received: parsed };
    process.stdout.write(JSON.stringify(response) + '\n');
  } catch {
    process.stderr.write(`Parse error: ${trimmed}\n`);
  }
});

rl.on('close', () => {
  process.exit(0);
});
