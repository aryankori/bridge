# ADR-001: Technology Stack Selection

## Status

**Accepted** - 2026-08-25

## Context

Bridge needs a technology stack suitable for:

- Process management and IPC on Windows
- JSON-RPC 2.0 communication (ACP protocol)
- Named pipe access (Claude Code daemon)
- HTTP/WebSocket client and server
- Fast iteration during reconnaissance phase
- Future desktop application shell
- Long-term maintainability

The development machine runs Windows 11 with Node.js 25.2.1, pnpm 9.15.3, and Deno 2.8.2 installed. Rust and Go are not installed, and disk space is critically low (97% used).

## Decision

**TypeScript on Node.js with pnpm as the package manager.**

### Runtime: Node.js 25.x

Node.js provides battle-tested primitives for the exact operations Bridge needs:

- `child_process` for spawning and managing agent processes
- `net` module for Windows named pipes (e.g., `\\.\pipe\cc-daemon-*-control`)
- `http`/`https` for local HTTP communication
- Native JSON-RPC handling
- Broad compatibility with ACP/MCP libraries (both defined in TypeScript)

### Language: TypeScript

Strong typing is critical for an infrastructure project that defines adapter contracts, event types, and protocol interfaces. TypeScript provides compile-time safety without runtime overhead.

### Package Manager: pnpm

Already installed. Uses symlinks to dramatically reduce disk usage - critical on a machine at 97% disk capacity. Strict dependency resolution prevents phantom dependencies that cause production bugs.

### Build: tsup

Minimal zero-config bundler built on esbuild. Fast, produces clean ESM output with declarations. No configuration overhead.

### Test: Vitest

Native ESM support, TypeScript-first, fast. Compatible with the same test patterns as Jest but without the configuration overhead.

### Dev: tsx

TypeScript execution without a build step during development. Watches for changes.

## Alternatives Considered

### Rust

**Rejected.** Superior performance and safety, but:

- Not installed on the machine, and disk is at 97%
- The Rust toolchain itself requires significant disk space
- No official ACP/MCP SDK in Rust
- Slower iteration velocity during a reconnaissance-heavy phase
- Viable for performance-critical components in a future version

### Deno

**Rejected.** Installed and has zero-install overhead, but:

- npm compatibility layer adds friction with ACP/MCP libraries
- `child_process` equivalent (`Deno.Command`) is less battle-tested on Windows
- Named pipe access requires more boilerplate
- Smaller ecosystem for the specific libraries Bridge needs

### Go

**Rejected.** Good cross-platform process management, but:

- Not installed, disk space is critical
- Weaker TypeScript/JavaScript interop for agent libraries
- No official ACP SDK

### Python

**Rejected.** Great AI ecosystem, but:

- GIL limits concurrent process management
- Packaging is fragile on Windows
- Not appropriate for a systems-level orchestration layer

## Consequences

- All Bridge source code is TypeScript
- The project uses ESM exclusively (no CommonJS)
- Dependencies must be justified - no large frameworks
- The ACP/MCP protocol libraries are natively compatible
- Future desktop shell can use Electron or Tauri with the same codebase
- TypeScript 7.x peer dependency warnings with @typescript-eslint (cosmetic, not functional)
