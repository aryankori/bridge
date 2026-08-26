# Bridge — Experimental Work Transfer Schema Specification

**Schema Identifier:** `ExperimentalWorkTransfer`  
**Version:** `0.1.0-exp`  
**Status:** Working Draft (Experimental Design Phase)  
**Standard:** ASD-STE100 Simplified Technical English  

---

## 1. Design Purpose & Philosophy

`ExperimentalWorkTransfer` is a specialized, intermediate representation for transferring structured cognitive and execution state from an analyzing agent (Agent A) to an implementing agent (Agent B).

### Core Design Rules
1. **Never Dump Full Transcripts:** Raw conversation logs contain prompt bloat, thinking traces, and discursive chatter that confuse receiving models.
2. **Never Ingest Unverified Whole Files:** References to files, symbols, and line ranges must be preferred over embedding whole file texts, preventing context exhaustion.
3. **Explicit Epistemic Classification:** Information must be categorized by its epistemic nature (facts vs. hypotheses vs. decisions).
4. **Strict Provenance & Confidence:** Every claim or item must record who produced it, how it was verified, and its confidence rating.
5. **Untrusted Data Boundary:** All content inside the transfer object is treated as untrusted text to prevent prompt injection or hijacked control flow.

---

## 2. Epistemic Classification Taxonomy

Every item in the transfer payload is categorized under one of the following eight types:

| Type | Definition | Example |
| :--- | :--- | :--- |
| `FACT` | Directly observed, verified code syntax, system state, or file location. | "File `src/scheduler.ts` line 42 contains `this.tokens += addedTokens` without clamping." |
| `DECISION` | Intentional technical or architectural choice made during analysis. | "Clamp token refill using `Math.min(this.capacity, ...)` rather than dropping extra tokens." |
| `INFERENCE` | Model deduction, hypothesis, or diagnostic theory requiring confirmation. | "Negative concurrency count indicates an uncaught error in task execution path." |
| `TASK` | Granular unit of work with explicit acceptance criteria and status. | "Fix double counter decrement in `executeTask` abort handler." |
| `ARTIFACT` | Specific reference to a modified file, test suite, AST node, or log snippet. | `file:///src/scheduler.ts#L80-L115` |
| `ACTION` | Execution step already performed by Agent A (e.g. test invocation). | "Ran `vitest run tests/scheduler.test.ts` (3/10 tests failed)." |
| `RESULT` | Output or measurement produced by an action. | "Test 9 failed with `TimeoutError: queue did not drain in 1000ms`." |
| `CONSTRAINT` | Invariant or requirement that must not be violated during changes. | "Do not modify the public method signatures in `TaskScheduler`." |
| `UNRESOLVED` | Explicitly identified unknown, risk, or ambiguous requirement. | "Whether priority tie-breaking should be FIFO or LIFO under burst load." |

---

## 3. TypeScript Schema Definition

```typescript
/**
 * Epistemic classification of work items
 */
export type EpistemicType =
  | 'FACT'
  | 'DECISION'
  | 'INFERENCE'
  | 'TASK'
  | 'ARTIFACT'
  | 'ACTION'
  | 'RESULT'
  | 'CONSTRAINT'
  | 'UNRESOLVED';

/**
 * Verification status of an item
 */
export type VerificationStatus = 'unverified' | 'empirically_verified' | 'disproven';

/**
 * Task execution lifecycle state
 */
export type TaskState = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'abandoned';

/**
 * Severity level for diagnostic findings
 */
export type DiagnosticSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Provenance metadata identifying source and verification
 */
export interface Provenance {
  /** Identifier of the creating agent/harness */
  sourceAgent: string;
  /** Specific model used if known */
  sourceModel?: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** How the finding was determined: 'test_execution' | 'static_analysis' | 'llm_deduction' */
  verificationMethod: 'test_execution' | 'static_analysis' | 'llm_deduction' | 'manual_assertion';
  /** Confidence score between 0.0 (pure guess) and 1.0 (empirically proven) */
  confidence: number;
}

/**
 * Targeted code reference (avoids dumping whole files)
 */
export interface CodeLocationRef {
  /** Relative or workspace-relative path to the file */
  filePath: string;
  /** Starting line number (1-indexed, inclusive) */
  startLine?: number;
  /** Ending line number (1-indexed, inclusive) */
  endLine?: number;
  /** Target identifier or symbol (function name, class name, method) */
  symbol?: string;
  /** Why this location is relevant */
  relevanceRationale: string;
}

/**
 * Diagnostic finding explaining a defect or observation
 */
export interface DiagnosticFinding {
  /** Unique finding ID (e.g. "DIAG-001") */
  id: string;
  /** High-level summary of the defect */
  title: string;
  /** Technical root cause explanation */
  rootCauseAnalysis: string;
  /** Severity */
  severity: DiagnosticSeverity;
  /** Exact code locations implicated in this finding */
  locations: CodeLocationRef[];
  /** Proposed minimal fix strategy */
  proposedRemediation?: string;
  /** Provenance and verification status */
  provenance: Provenance;
}

/**
 * Discrete atomic work item
 */
export interface WorkItem {
  id: string;
  type: EpistemicType;
  title: string;
  description: string;
  provenance: Provenance;
  relatedLocations?: CodeLocationRef[];
}

/**
 * Actionable task for the implementing agent
 */
export interface TransferTask {
  id: string;
  title: string;
  status: TaskState;
  /** Objective acceptance criteria required for task completion */
  acceptanceCriteria: string;
  /** Priority ordering */
  priority: number;
  /** Findings this task addresses */
  addressesDiagnostics: string[]; // references DiagnosticFinding.id
}

/**
 * Complete Experimental Work Transfer Document
 */
export interface ExperimentalWorkTransfer {
  /** Schema specification version */
  schemaVersion: '0.1.0-exp';
  /** Experiment run identifier */
  experimentId: string;
  /** Overarching objective of the workflow */
  objective: string;
  /** Diagnostic findings discovered during analysis */
  diagnostics: DiagnosticFinding[];
  /** Ordered checklist of tasks remaining or completed */
  tasks: TransferTask[];
  /** Categorized epistemic items (facts, decisions, inferences) */
  items: WorkItem[];
  /** Hard constraints that must be preserved */
  constraints: string[];
  /** Known unknowns and open questions */
  unresolvedIssues: string[];
  /** Reference test commands to evaluate correctness */
  verificationCommands: Array<{
    command: string;
    expectedOutcome: string;
    description: string;
  }>;
}
```

---

## 4. Field Rationale Matrix

Every field in the schema exists for a specific experimental and operational reason:

| Field Path | Structural Type | Justification / Experimental Purpose |
| :--- | :--- | :--- |
| `schemaVersion` | `string` | Enforces version alignment and prevents deserialization drift between harness revisions. |
| `experimentId` | `string` | Guarantees traceability of telemetry back to specific test runs. |
| `objective` | `string` | Provides high-level grounding so Agent B understands the global goal before inspecting localized fixes. |
| `diagnostics[]` | `DiagnosticFinding[]` | Core knowledge transfer unit: communicates root cause, failure mode, and affected locations without guessing. |
| `diagnostics[].locations` | `CodeLocationRef[]` | Anchors Agent B directly to relevant line ranges; eliminates costly file scanning and hallucinations. |
| `diagnostics[].provenance` | `Provenance` | Allows Agent B to distinguish empirically verified facts (e.g. test failures) from speculative inferences. |
| `tasks[]` | `TransferTask[]` | Decomposes complex fixes into ordered atomic steps with explicit acceptance criteria. |
| `constraints[]` | `string[]` | Prevents regression or unauthorized refactoring of stable APIs and configurations. |
| `unresolvedIssues[]` | `string[]` | Flags edge cases and ambiguities so Agent B does not make silent erroneous assumptions. |
| `verificationCommands[]` | `Array<{...}>` | Supplies unambiguous, automated verification instructions to confirm task success. |

---

## 5. Markdown Injection Formatting (Agent B Rendering)

When presented to Agent B over ACP or CLI, the schema is formatted into a clean, structured Markdown dossier:

```markdown
# [BRIDGE WORK TRANSFER DOSSIER]
**Source:** Claude Code (Analysis Phase) | **Target:** OpenCode ox alpha (Implementation Phase)
**Objective:** Resolve 3 concurrency and rate-limiting defects in TaskScheduler.

## 1. Verified Diagnostic Findings
- **[DIAG-001] (Critical):** Token bucket overflow on idle burst refills (`src/scheduler.ts#L42-L46`).
  - *Root Cause:* `refillTokens()` adds tokens without clamping to `this.capacity`.
  - *Remediation:* Enforce `this.tokens = Math.min(this.capacity, this.tokens + addedTokens);`.
- **[DIAG-002] (High):** Active counter double decrement on abort signal (`src/scheduler.ts#L88-L96`).
  - *Root Cause:* Abort handler decrements `this.activeCount` while `finally` block also decrements it.
  - *Remediation:* Decrement only once inside the completion `finally` handler.
- **[DIAG-003] (High):** Queue stall on token exhaustion (`src/scheduler.ts#L65-L75`).
  - *Root Cause:* `pump()` exits when `this.tokens < task.weight` without scheduling a delayed pump on next refill.
  - *Remediation:* Calculate remaining delay and set `setTimeout(() => this.pump(), refillDelay)`.

## 2. Hard Invariants & Constraints
- Do NOT modify method signatures or test fixtures.
- Preserve FIFO ordering for equal priority queue items.

## 3. Verification Criteria
- Run `pnpm test` -> 10/10 tests in `tests/scheduler.test.ts` must pass.
```
