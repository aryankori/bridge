# Bridge — Experimental Work Transfer Schema (Simplified)

**Schema Identifier:** `ExperimentalWorkTransfer`  
**Version:** `0.2.0-simplified`  
**Status:** Red-Team Corrected Specification  
**Standard:** ASD-STE100 Simplified Technical English  

---

## 1. Design Philosophy

Per Hermes Red-Team Correction 1, all speculative, unverified metadata fields (such as general task graphs, complex provenance trees, and epistemic item taxonomies) are removed.

The simplified schema focuses exclusively on the minimum viable data points required to test whether structured representation itself provides value over raw transcripts:
1. **Objective:** What global task must be solved.
2. **Diagnostics:** Specific verified defect mechanisms and code anchors.
3. **Constraints:** Non-negotiable architectural or functional invariants.
4. **Verification Commands:** Automated assertions to confirm correctness.

---

## 2. Minimal TypeScript Definition

```typescript
/**
 * Exact code location anchor
 */
export interface CodeAnchor {
  filePath: string;
  startLine?: number;
  endLine?: number;
  symbol?: string;
}

/**
 * Atomic diagnostic finding
 */
export interface DiagnosticItem {
  id: string;
  title: string;
  rootCause: string;
  locations: CodeAnchor[];
}

/**
 * Automated verification command
 */
export interface VerificationCommand {
  command: string;
  description: string;
}

/**
 * Minimal Experimental Work Transfer Document
 */
export interface ExperimentalWorkTransfer {
  schemaVersion: '0.2.0-simplified';
  objective: string;
  diagnostics: DiagnosticItem[];
  constraints: string[];
  verificationCommands: VerificationCommand[];
}
```

---

## 3. JSON Example Instance

```json
{
  "schemaVersion": "0.2.0-simplified",
  "objective": "Resolve all defects in src/scheduler.ts so that tests in tests/scheduler.test.ts pass.",
  "diagnostics": [
    {
      "id": "DIAG-001",
      "title": "Unclamped token refill allows burst overflow",
      "rootCause": "refillTokens() adds calculated tokens without clamping to this.capacity, allowing token counts to grow unbounded during idle intervals.",
      "locations": [
        {
          "filePath": "src/scheduler.ts",
          "startLine": 42,
          "endLine": 47,
          "symbol": "refillTokens"
        }
      ]
    },
    {
      "id": "DIAG-002",
      "title": "Active concurrency counter double decrement on abort",
      "rootCause": "executeTask decrements this.activeCount once in the abort signal listener and again in the finally block, causing activeCount to drop below zero.",
      "locations": [
        {
          "filePath": "src/scheduler.ts",
          "startLine": 88,
          "endLine": 96,
          "symbol": "executeTask"
        }
      ]
    },
    {
      "id": "DIAG-003",
      "title": "Queue starvation on token depletion",
      "rootCause": "pump() terminates synchronously when available tokens are insufficient for the next task without arming a delayed refill timer.",
      "locations": [
        {
          "filePath": "src/scheduler.ts",
          "startLine": 65,
          "endLine": 75,
          "symbol": "pump"
        }
      ]
    }
  ],
  "constraints": [
    "Do not modify public method signatures in TaskScheduler.",
    "Preserve FIFO sequence ordering for tasks of identical priority."
  ],
  "verificationCommands": [
    {
      "command": "pnpm test",
      "description": "Executes Vitest suite in tests/scheduler.test.ts (10/10 assertions must pass)."
    }
  ]
}
```

---

## 4. Markdown Injection Format (Agent B Rendering)

When passed to Agent B via ACP or CLI, the object is wrapped inside untrusted data boundaries:

```markdown
<<<UNTRUSTED_BRIDGE_WORK_TRANSFER_START>>>
# Structured Work Transfer Dossier (Schema v0.2.0-simplified)

## Objective
Resolve all defects in src/scheduler.ts so that tests in tests/scheduler.test.ts pass.

## Diagnostics
- **[DIAG-001] Unclamped token refill allows burst overflow**
  - *Location:* `src/scheduler.ts#L42-L47` (`refillTokens`)
  - *Root Cause:* `refillTokens()` adds calculated tokens without clamping to `this.capacity`, allowing token counts to grow unbounded during idle intervals.
- **[DIAG-002] Active concurrency counter double decrement on abort**
  - *Location:* `src/scheduler.ts#L88-L96` (`executeTask`)
  - *Root Cause:* `executeTask` decrements `this.activeCount` once in the abort signal listener and again in the `finally` block, causing `activeCount` to drop below zero.
- **[DIAG-003] Queue starvation on token depletion**
  - *Location:* `src/scheduler.ts#L65-L75` (`pump`)
  - *Root Cause:* `pump()` terminates synchronously when available tokens are insufficient for the next task without arming a delayed refill timer.

## Constraints
- Do not modify public method signatures in TaskScheduler.
- Preserve FIFO sequence ordering for tasks of identical priority.

## Verification Commands
- `pnpm test`: Executes Vitest suite in tests/scheduler.test.ts (10/10 assertions must pass).
<<<UNTRUSTED_BRIDGE_WORK_TRANSFER_END>>>
```
