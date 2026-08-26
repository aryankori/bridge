/**
 * Bridge — Phase 1D: Experiment Security & Sanitization Module
 *
 * Implements:
 * - Strict path confinement checks to prevent directory traversal
 * - Secret scrubbing regex for API keys and bearer tokens
 * - Delimited untrusted-data boundary wrappers
 * - Safe payload truncation (8 KB hard cap)
 */

import * as path from 'path';

const SECRET_PATTERNS = [
  /nvapi-[A-Za-z0-9_-]{30,}/g,
  /sk-ant-[A-Za-z0-9_-]{30,}/g,
  /sk-[A-Za-z0-9_-]{30,}/g,
  /ghp_[A-Za-z0-9]{30,}/g,
  /Bearer\s+[A-Za-z0-9._-]{20,}/gi,
];

/**
 * Scrubs known API keys, tokens, and authorization headers from input text.
 */
export function scrubSecrets(input: string): string {
  if (!input) return '';
  let sanitized = input;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]');
  }
  return sanitized;
}

/**
 * Asserts that a given target path is strictly located within the allowed root directory.
 * Throws an error if path traversal is detected.
 */
export function validatePathConfinement(targetPath: string, allowedRoot: string): void {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedRoot = path.resolve(allowedRoot);
  if (!resolvedTarget.startsWith(resolvedRoot)) {
    throw new Error(`Security Violation: Path '${resolvedTarget}' escapes allowed root '${resolvedRoot}'`);
  }
}

/**
 * Safely truncates a text payload to a maximum byte size without breaking multi-byte characters.
 */
export function truncatePayload(text: string, maxBytes: number = 8192): {
  content: string;
  originalBytes: number;
  deliveredBytes: number;
  wasTruncated: boolean;
} {
  const buffer = Buffer.from(text, 'utf-8');
  const originalBytes = buffer.byteLength;

  if (originalBytes <= maxBytes) {
    return {
      content: text,
      originalBytes,
      deliveredBytes: originalBytes,
      wasTruncated: false,
    };
  }

  // Truncate at maxBytes - space for warning notice
  const notice = '\n[TRANSCRIPT TRUNCATED AT 8KB LIMIT]';
  const noticeBytes = Buffer.byteLength(notice, 'utf-8');
  const sliceLength = Math.max(0, maxBytes - noticeBytes);

  const truncatedBuffer = buffer.subarray(0, sliceLength);
  const truncatedText = truncatedBuffer.toString('utf-8') + notice;
  const deliveredBytes = Buffer.byteLength(truncatedText, 'utf-8');

  return {
    content: truncatedText,
    originalBytes,
    deliveredBytes,
    wasTruncated: true,
  };
}

/**
 * Wraps payload inside explicit untrusted-data boundary delimiters.
 */
export function wrapUntrustedData(content: string, type: 'transcript' | 'transfer'): string {
  if (type === 'transcript') {
    return `<<<UNTRUSTED_AGENT_TRANSCRIPT_START>>>\n${content}\n<<<UNTRUSTED_AGENT_TRANSCRIPT_END>>>`;
  }
  return `<<<UNTRUSTED_BRIDGE_WORK_TRANSFER_START>>>\n${content}\n<<<UNTRUSTED_BRIDGE_WORK_TRANSFER_END>>>`;
}
