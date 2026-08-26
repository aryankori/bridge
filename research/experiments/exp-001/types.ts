/**
 * Bridge — Phase 1A: Experimental Work Transfer Schema (v0.2.0-simplified)
 */

export interface CodeAnchor {
  filePath: string;
  startLine?: number;
  endLine?: number;
  symbol?: string;
}

export interface DiagnosticItem {
  id: string;
  title: string;
  rootCause: string;
  locations: CodeAnchor[];
}

export interface VerificationCommand {
  command: string;
  description: string;
}

export interface ExperimentalWorkTransfer {
  schemaVersion: '0.2.0-simplified';
  objective: string;
  diagnostics: DiagnosticItem[];
  constraints: string[];
  verificationCommands: VerificationCommand[];
}
