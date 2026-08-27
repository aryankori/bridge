# Bridge - Phase 1A: Red-Team Review Resolution Matrix

**Document ID:** `EXP-001-RED-TEAM-RESOLUTION`  
**Date:** 2026-08-26  
**Auditor / Engineer:** Experimental Systems Engineer (Antigravity)  
**Standard:** ASD-STE100 Simplified Technical English  

---

## 1. Resolution Summary

This document details the exact resolutions applied in response to the six red-team findings raised during the independent Hermes review of the `EXP-001-WORK-TRANSFER` experiment design.

---

## 2. Issue Resolution Matrix

| # | Hermes Red-Team Issue | Change Made | Technical & Scientific Reason | Status |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Overly broad transfer schema**<br>*"Schema includes unneeded fields like task trees, provenance taxonomies, and item classifications that add complexity without testing core hypothesis."* | Replaced `ExperimentalWorkTransfer` v0.1.0 with **v0.2.0-simplified** in [`docs/research/experiment-schema.md`](file:///C:/Users/aryan/Documents/AI%20and%20ML/bridge/docs/research/experiment-schema.md). Retained only: `objective`, `diagnostics` (`id`, `title`, `rootCause`, `locations`), `constraints`, and `verificationCommands`. | Tests whether structured diagnostic state alone provides value without confounding the experiment with speculative metadata. | ✅ **RESOLVED** |
| **2** | **Artificial transcript filtering**<br>*"Condition B manually filtered 'less useful' conversation, creating an unrealistic baseline that masked natural transcript noise."* | Updated Condition B in [`docs/research/experiment-plan.md`](file:///C:/Users/aryan/Documents/AI%20and%20ML/bridge/docs/research/experiment-plan.md) to use **actual unedited chronological stdout transcript** from Agent A with a hard **8 KB limit** and explicit truncation tracking. | Ensures Condition B is a fair, realistic representation of raw transcript forwarding. | ✅ **RESOLVED** |
| **3** | **Information equivalence assumption**<br>*"Plan risked assuming Condition B and C had equal information or attributing differences solely to structure without measuring content."* | Added Section 3 to [`docs/research/experiment-plan.md`](file:///C:/Users/aryan/Documents/AI%20and%20ML/bridge/docs/research/experiment-plan.md) requiring explicit measurement and reporting of payload bytes, estimated tokens, files referenced, diagnostics conveyed, and constraints conveyed. | Enables distinguishing **more information** from **better structured representation**. | ✅ **RESOLVED** |
| **4** | **Security rules were documentation-only**<br>*"Harness lacked concrete enforcement of path confinement, secret scrubbing, and untrusted-data boundaries."* | Implemented path validation, regex secret scrubbing (`nvapi-*`, `sk-*`, `ghp_*`), and untrusted delimiters (`<<<UNTRUSTED_...>>>`) directly in `research/experiments/exp-001/harness.ts`. | Treats transferred agent data as untrusted input at the execution layer. | ✅ **RESOLVED** |
| **5** | **Absence of cost & token tracking**<br>*"Plan lacked token and financial cost accounting across heterogeneous agents."* | Added token metrics (input, output, total, USD cost) to harness and plan, with explicit rule to record `UNKNOWN` if provider does not expose token usage. | Accurately models performance vs. information size vs. token cost. | ✅ **RESOLVED** |
| **6** | **Lack of transfer fidelity check**<br>*"Plan measured code correctness but could not evaluate whether the receiving agent actually understood the transferred work."* | Added post-task 4-part understanding check (bugs identified, root causes, changes made, verification) executed in a separate turn and stored as a secondary metric. | Provides qualitative and conceptual fidelity assessment without altering repo state. | ✅ **RESOLVED** |
| **7** | **Phase 1D Hermes NO-GO: Hardcoded Answer Key & Incomplete Execution Harness**<br>*"Harness contained hardcoded CANONICAL_SIMPLIFIED_TRANSFER answer key with known scheduler bugs, creating experimenter bias. Agent runners were stubs."* | 1. Removed all hardcoded answer key dossiers from harness and artifacts.<br>2. Implemented live Agent A execution (`runClaudeAnalysis`) via non-interactive Claude CLI.<br>3. Implemented dynamic extraction (`extractStructuredTransfer`) deriving work transfer purely from live Agent A output.<br>4. Implemented real ACP v1 stdio client (`runOpenCodeTask`) driving OpenCode.<br>5. Implemented pre-flight validator (`validate.ts`) and unit test suite (`tests/research/harness.test.ts`). | Guarantees scientific integrity with zero experimenter answer leakage and end-to-end executable autonomy. | ✅ **RESOLVED** |

---

## 3. Verification & Compliance Confirmation

1. All seven red-team corrections (Phase 1A design corrections & Phase 1D implementation corrections) have been fully implemented and verified.
2. 14/14 harness unit tests pass cleanly in Vitest (`tests/research/harness.test.ts`).
3. Pre-flight validation (`pnpm experiment:validate`) passes all 5 verification gates.
4. No extraneous architectural changes or production Bridge implementations were introduced.
5. The experiment remains in a **STOPPED / READY FOR PILOT** state awaiting execution authorization.

