# BRIDGE - Minimum Viable Developer Product: 5 Candidates Ranked

**Status:** Research analysis
**Date:** 2026-08-27
**Scope:** Find the smallest thing a developer could install today and understand in under 10 minutes. Real problem, immediate value, no enterprise procurement, no huge configuration, no new protocol, works locally if possible. Give 5 alternatives, rank them.

---

## CANDIDATE 1: Pre-Commit Standing Checker

**What it is:** A CLI command (`bridge check --action "implement format_user_name in packages/data/src/formatter.ts"`) that reads the project's instruction sources, evaluates standing, and prints the effective directive with citations. Run it before committing to see what the project's rules say.

**Problem:** Developers are unsure whether their planned action violates project rules. They guess, and sometimes they're wrong.

**Immediate value:** Run one command, get one answer with citations. No agent, no workflow change, no integration.

**Installation:** `npm install -g bridge-resolver`, `bridge init` (scans repo for instruction sources), `bridge check --action "..."`. Under 10 minutes.

**Configuration:** Minimal. Bridge scans the repo for known instruction files (AGENTS.md, CLAUDE.md, .cursorrules, package.json, SECURITY.md, docs/). Developer can add custom sources. Authority framework is auto-configured from common conventions (root AGENTS.md > nested AGENTS.md > docs > manifests > prompts).

**Works locally:** Yes. Reads local files, runs locally, no network.

**Verdict:** **STRONG CANDIDATE.** Solves a real, frequent pain. Minimal setup. No agent required. Deterministic output. Citations make it trustworthy.

---

## CANDIDATE 2: Agent Pre-Flight Directive Injector

**What it is:** A wrapper that injects the effective directive into the agent's prompt before the agent starts. `bridge prep --agent claude --task "implement format_user_name"` reads instruction sources, computes standing, and launches Claude Code with the directive appended.

**Problem:** Agents receive conflicting instructions and sometimes follow the wrong one. Pre-injecting the effective directive guides the agent toward the correct action.

**Immediate value:** The agent starts with the right directive. Fewer errors, fewer violations, fewer reworks.

**Installation:** `npm install -g bridge-agent`, `bridge prep --agent claude --task "..."`. Under 10 minutes for a single agent. More setup for multiple agents.

**Configuration:** Agent-specific adapters (Claude Code, OpenCode, Codex, Gemini CLI). Each adapter knows how to inject the directive into the agent's prompt format.

**Works locally:** Yes. Spawns the agent locally, injects directive, agent runs.

**Verdict:** **STRONG CANDIDATE.** Directly improves agent behavior. Leverages EXP-005's finding (if positive). But requires agent adapter maintenance. The value depends on whether the agent actually follows the directive (EXP-005 is testing this).

---

## CANDIDATE 3: Standing Records Viewer

**What it is:** A CLI or web UI that shows the standing records for a project - what has been determined for which actions, with what authority, when, and why. `bridge records --project /path/to/repo` lists all standing determinations. `bridge records --action "format_user_name"` shows the specific standing for that action.

**Problem:** Developers don't know what the project has decided. Standing records provide institutional memory of what was determined and why.

**Immediate value:** Query the project's decision history. Understand why certain rules apply. See what conflicts were resolved and how.

**Installation:** `npm install -g bridge-records`, `bridge records --project /path/to/repo`. Under 10 minutes.

**Configuration:** Reads standing records from the project's Bridge data directory. No additional configuration.

**Works locally:** Yes. Reads local standing records.

**Verdict:** **MODERATE CANDIDATE.** Valuable as part of the platform (standing records are essential for audit, precedent, memory). But as a standalone product, it's a viewer of data that doesn't yet exist until the resolver has been used. It's a second-order product - valuable after the resolver has created records, not as an initial install.

---

## CANDIDATE 4: Instruction Conflict Detector (Lint-like)

**What it is:** A lint-like tool that scans a project for instruction conflicts and reports them. `bridge lint` checks all instruction sources for contradictions, staleness, missing authorization, and ambiguity. Reports conflicts with severity and suggested resolution.

**Problem:** Projects accumulate conflicting instructions over time. Developers don't notice until an agent acts on the wrong one.

**Immediate value:** Run `bridge lint` and see all conflicts in the project. Fix them before they cause agent errors.

**Installation:** `npm install -g bridge-lint`, `bridge lint`. Under 10 minutes.

**Configuration:** Scans known instruction files. Configurable source list. Configurable conflict severity thresholds.

**Works locally:** Yes. Scans local files.

**Verdict:** **MODERATE CANDIDATE.** Useful for project hygiene. Catches conflicts before they cause problems. But it's a diagnostic tool, not a resolution tool. It tells you there's a conflict; it doesn't tell you what to do about it (that's the resolver's job). It's a complement to the resolver, not a replacement.

---

## CANDIDATE 5: Project Instruction Source Explorer

**What it is:** A tool that indexes and visualizes all instruction sources in a project - what files, what prompts, what policies, what manifests - with their authority tiers, timestamps, and scopes. `bridge explore` shows the project's instruction landscape.

**Problem:** Developers don't have a clear picture of what instruction sources exist in their project, where they are, what they say, and which ones are current.

**Immediate value:** See the project's full instruction landscape. Understand the source of authority for any rule. Identify stale or missing sources.

**Installation:** `npm install -g bridge-explore`, `bridge explore`. Under 10 minutes.

**Configuration:** Scans known instruction file patterns. Configurable patterns for custom sources.

**Works locally:** Yes. Scans and indexes local files.

**Verdict:** **WEAK CANDIDATE.** Exploratory and educational, but doesn't solve an immediate action-blocking problem. It's a "nice to have" that helps developers understand their project, but it doesn't tell them what to do. It's a feature, not a product.

---

## RANKING

| Rank | Candidate | Problem Pain | Immediate Value | Setup Complexity | Local-First | Standalone Viability |
|---|---|---|---|---|---|---|
| **1** | Pre-Commit Standing Checker | High (uncertainty about what's allowed) | High (one command, one answer) | Low (scan + init) | Yes | **Strong** |
| **2** | Agent Pre-Flight Directive Injector | High (agents follow wrong instructions) | High (agent starts with right directive) | Medium (agent adapters) | Yes | **Strong** |
| **3** | Instruction Conflict Detector (lint) | Medium (conflicts go unnoticed) | Medium (diagnostic, not resolution) | Low (scan) | Yes | **Moderate** |
| **4** | Standing Records Viewer | Medium (don't know past decisions) | Medium (query history, not action-guiding) | Low (read records) | Yes | **Moderate** (needs records first) |
| **5** | Instruction Source Explorer | Low (understanding, not action) | Low (exploratory, not decision-guiding) | Low (scan) | Yes | **Weak** |

**Top recommendation:** Candidate 1 (Pre-Commit Standing Checker) is the smallest, simplest, most immediately useful product. It solves a real problem (what should I do?), requires minimal setup, works locally, and produces deterministic, citation-backed output. It's the natural entry point for the broader platform.

**Runner-up:** Candidate 2 (Agent Pre-Flight Directive Injector) is the most impactful if agent behavior improvement is confirmed (EXP-005). It directly improves agent outcomes. But it requires agent adapter maintenance and depends on agents following the directive.

**Bridge's MVP strategy:** Ship Candidate 1 first. Prove that developers find it useful. Add Candidate 2 if agent behavior improvement is confirmed. Add Candidate 3 and 4 as the platform accumulates standing records. Candidate 5 is a feature, not a product.

---

*End of MVP analysis.*
