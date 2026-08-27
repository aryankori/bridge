/**
 * Claude Code Adapter - Agent-specific Types
 *
 * Type definitions for Claude Code's stream-json output format.
 * Reverse-engineered from live CLI output with:
 *   claude -p --output-format stream-json --verbose
 *
 * Evidence: Each line is a complete JSON object with a `type` field.
 * Observed event types from actual CLI output:
 *
 * - { type: "system", subtype: "init", session_id, ... }
 * - { type: "system", subtype: "api_retry", attempt, max_retries, ... }
 * - { type: "assistant", message: { content: [...], ... } }
 * - { type: "content_block_start", index, content_block: { type, ... } }
 * - { type: "content_block_delta", index, delta: { type, text?, ... } }
 * - { type: "content_block_stop", index }
 * - { type: "result", result: "...", session_id, ... }
 */

// ---------------------------------------------------------------------------
// System Events
// ---------------------------------------------------------------------------

export interface ClaudeSystemInit {
  type: 'system';
  subtype: 'init';
  session_id: string;
  uuid: string;
  [key: string]: unknown;
}

export interface ClaudeSystemApiRetry {
  type: 'system';
  subtype: 'api_retry';
  attempt: number;
  max_retries: number;
  retry_delay_ms: number;
  error_status: number | null;
  error: string;
  session_id: string;
  uuid: string;
}

export interface ClaudeSystemOther {
  type: 'system';
  subtype: string;
  session_id?: string;
  [key: string]: unknown;
}

export type ClaudeSystemEvent = ClaudeSystemInit | ClaudeSystemApiRetry | ClaudeSystemOther;

// ---------------------------------------------------------------------------
// Content Events
// ---------------------------------------------------------------------------

export interface ClaudeContentBlockStart {
  type: 'content_block_start';
  index: number;
  content_block: {
    type: 'text' | 'tool_use';
    text?: string;
    id?: string;
    name?: string;
    input?: unknown;
  };
}

export interface ClaudeContentBlockDelta {
  type: 'content_block_delta';
  index: number;
  delta: {
    type: 'text_delta' | 'input_json_delta';
    text?: string;
    partial_json?: string;
  };
}

export interface ClaudeContentBlockStop {
  type: 'content_block_stop';
  index: number;
}

// ---------------------------------------------------------------------------
// Message Events
// ---------------------------------------------------------------------------

export interface ClaudeAssistantMessage {
  type: 'assistant';
  message: {
    id: string;
    type: 'message';
    role: 'assistant';
    content: Array<{
      type: 'text' | 'tool_use';
      text?: string;
      id?: string;
      name?: string;
      input?: unknown;
    }>;
    model: string;
    stop_reason: string | null;
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };
  session_id: string;
}

// ---------------------------------------------------------------------------
// Result Event
// ---------------------------------------------------------------------------

export interface ClaudeResultEvent {
  type: 'result';
  result: string;
  session_id: string;
  subtype: string;
  cost_usd?: number;
  duration_ms?: number;
  duration_api_ms?: number;
  is_error: boolean;
  num_turns: number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Union Type
// ---------------------------------------------------------------------------

export type ClaudeStreamEvent =
  | ClaudeSystemEvent
  | ClaudeContentBlockStart
  | ClaudeContentBlockDelta
  | ClaudeContentBlockStop
  | ClaudeAssistantMessage
  | ClaudeResultEvent
  | { type: string; [key: string]: unknown }; // Catch-all for unknown event types

// ---------------------------------------------------------------------------
// Type Guards
// ---------------------------------------------------------------------------

export function isClaudeSystemEvent(event: ClaudeStreamEvent): event is ClaudeSystemEvent {
  return event.type === 'system';
}

export function isClaudeContentDelta(
  event: ClaudeStreamEvent,
): event is ClaudeContentBlockDelta {
  return event.type === 'content_block_delta';
}

export function isClaudeResult(event: ClaudeStreamEvent): event is ClaudeResultEvent {
  return event.type === 'result';
}

export function isClaudeAssistantMessage(
  event: ClaudeStreamEvent,
): event is ClaudeAssistantMessage {
  return event.type === 'assistant';
}
