/**
 * Mock JSON-RPC 2.0 server for transport tests.
 *
 * Reads JSON-RPC requests from stdin, responds on stdout.
 * Implements a few test methods for the JsonRpcClient tests.
 *
 * Usage: node tests/fixtures/jsonrpc-server.mjs
 */

import { createInterface } from 'node:readline';

const rl = createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const msg = JSON.parse(trimmed);

    // Notification (no id) - just acknowledge silently
    if (!('id' in msg)) {
      // For 'emit_notification' notifications, echo back as a server notification
      if (msg.method === 'trigger_notification') {
        const notification = {
          jsonrpc: '2.0',
          method: msg.params?.notificationMethod ?? 'test/event',
          params: msg.params?.notificationData ?? { triggered: true },
        };
        process.stdout.write(JSON.stringify(notification) + '\n');
      }
      return;
    }

    const { id, method, params } = msg;

    switch (method) {
      case 'echo':
        respond(id, params);
        break;

      case 'add':
        respond(id, { sum: (params?.a ?? 0) + (params?.b ?? 0) });
        break;

      case 'slow':
        // Respond after a delay
        setTimeout(() => {
          respond(id, { delayed: true });
        }, params?.delayMs ?? 2000);
        break;

      case 'fail':
        respondError(id, params?.code ?? -32000, params?.message ?? 'Intentional error');
        break;

      case 'initialize':
        // Mock ACP initialize response
        respond(id, {
          protocolVersion: 1,
          agentCapabilities: { loadSession: true },
          agentInfo: { name: 'mock-agent', version: '0.0.1' },
          authMethods: [],
        });
        break;

      default:
        respondError(id, -32601, `Method not found: ${method}`);
        break;
    }
  } catch {
    process.stderr.write(`Parse error: ${trimmed}\n`);
  }
});

function respond(id, result) {
  const response = { jsonrpc: '2.0', id, result };
  process.stdout.write(JSON.stringify(response) + '\n');
}

function respondError(id, code, message) {
  const response = { jsonrpc: '2.0', id, error: { code, message } };
  process.stdout.write(JSON.stringify(response) + '\n');
}

rl.on('close', () => {
  process.exit(0);
});
