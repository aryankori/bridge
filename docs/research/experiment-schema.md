# Bridge — Experimental Work Transfer Schema

**Schema Identifier:** `ExperimentalWorkTransfer` (v0.1.0-exp)  
**Standard:** ASD-STE100 Simplified Technical English  

---

## 1. Schema Overview

`ExperimentalWorkTransfer` captures structured work state between heterogeneous AI agents without transferring raw unparsed conversation transcripts.

The schema explicitly divides work state into typed items with provenance and confidence scores:
- **FACT:** Directly observed or verified code/system state.
- **DECISION:** Intentional architectural or technical choice made during analysis.
- **INFERENCE:** Model deduction or hypothesis that requires testing.
- **TASK:** Unit of work with goal, status, and acceptance criteria.
- **ARTIFACT:** Specific file, line range, diff patch, or log output.
- **ACTION:** Step executed or proposed for execution.
- **RESULT:** Outcome of an executed action or test.
- **UNKNOWN:** Explicitly identified uncertainty or missing information.

---

## 2. TypeScript Definition

```typescript
export type ItemClassification =
  | 'FACT'
  | 'DECISION'
  | 'INFERENCE'
  | 'TASK'
  | 'ARTIFACT'
  | 'ACTION'
  | 'RESULT'
  | 'UNKNOWN';

export interface WorkItem {
  id: string;
  type: ItemClassification;
  summary: string;
  details?: string;
  source: string; // e.g. "agent-a:claude-code", "test-runner"
  confidence: number; // 0.0 to 1.0
  timestamp: string; // ISO 8601
}

export interface CodeLocation {
  file: string;
  startLine?: number;
  endLine?: number;
  symbol?: string;
  rationale: string;
}

export interface DiagnosticFinding {
  id: string;
  title: string;
  rootCause: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  locations: CodeLocation[];
  suggestedFix?: string;
}

export interface ExperimentalWorkTransfer {
  version: '0.1.0-exp';
  experimentId: string;
  objective: string;
  sourceAgent: {
    name: string;
    version: string;
    model?: string;
  };
  createdAt: string;
  diagnostics: DiagnosticFinding[];
  items: WorkItem[];
  relevantFiles: Array<{
    path: string;
    purpose: string;
    criticalLines?: string;
  }>;
  activeTasks: Array<{
    id: string;
    title: string;
    status: 'pending' | 'in_progress' | 'completed' | 'blocked';
    acceptanceCriteria: string;
  }>;
  knownConstraints: string[];
  unresolvedQuestions: string[];
}
```

---

## 3. Serialization Protocol

- **Transport Format:** Formatted JSON with strict type validation.
- **Agent Injection Prompt:** When presented to Agent B, the package is rendered into an unambiguous, structured Markdown work dossier prefixed with:
  `[BRIDGE WORK TRANSFER DOSSIER: DO NOT RE-DIAGNOSE ALREADY VERIFIED FACTS]`.
