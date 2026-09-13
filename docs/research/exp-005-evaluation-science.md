# EXP-005 Evaluation Science Application

**Status:** Forensic reconstruction complete 
**Generated:** Phase 3 - evaluation science 
**Related documents:** `docs/research/exp-005-forensic-truth.md`, `docs/research/exp-005-root-cause-analysis.md` 
**Methodological grounding:** EXP-004 methodology (effective directive design, resolver evaluation), EXP-005 methodology (agent behavior under different resolution conditions)

---

## 1. Purpose

Apply evaluation science to EXP-005 - both the experiment that was designed and the failure to execute it. Separate what we know about experimental validity, evaluator validity, agent behavior, infrastructure behavior, and measurement validity. Identify what would be required for a defensible result.

---

## 2. FACT / OBSERVATION / INFERENCE / HYPOTHESIS / RESULT / LIMITATION Separation

### 2.1 Facts (directly established from on-disk evidence)

1. The EXP-005 experiment was designed as 10 scenarios × 3 conditions × 2 replications = 60 trials
2. Randomization used seed 42 with Mulberry32 + Fisher-Yates
3. The harness source code (`run-pilot.ts`, `harness.ts`) implements worktree creation, trial execution, and manifest checkpointing
4. `exp005-manifest.json` does not exist on disk
5. Only 1 worktree directory survives (`trial-exp005-scn-006-B-rep2-1787827019225`), and it is empty
6. No runner stdout/stderr captures are available
7. No telemetry logs are available
8. C: drive was at 97% capacity at time of investigation
9. The methodology passed correction gates in prior sessions (10 checkpoints verified)
10. The resolver was pre-validated at 10/10 exact matches (100%) in a corrected 코드 dry-run

### 2.2 Observations (what we can see but not necessarily establish as ground truth)

1. The harness code appears correctly implemented - there is no obvious code bug in the checkpointing logic
2. Environmental factors (disk capacity, shell mismatch, missing dependencies) are present and consistent with infrastructure failure
3. Prior session reports claimed 25 manifest entries, 24 worktrees, and 44-45/60 completed - but none of these can be verified from on-disk artifacts
4. The surviving worktree directory name follows the expected naming convention, suggesting the runner's worktree creation logic was at least partially executed
5. Git history shows the experiment harness was committed at commit 5f53d12
6. Git reflog shows normal branch activity, no detached HEAD, single worktree at the main repo path

### 2.3 Inferences (plausible conclusions, not established facts)

1. The runner executed at least partially - the empty worktree directory suggests worktree creation logic ran
2. The manifest write path failed at some point - otherwise the file would exist
3. Environmental factors contributed to the failure - disk capacity, shell mismatch, and missing dependencies are all present
4. The "25 manifest entries" report may have been accurate at the time it was made, but the file was subsequently lost
5. The "24 worktrees" report may have been accurate at the time, but 23 were subsequently cleaned up or lost
6. The failure was likely a combination of infrastructure issues rather than a single cause

### 2.4 Hypotheses (untested explanations that would require evidence to confirm)

1. **H1:** Disk capacity caused write failures - the manifest write failed when the disk was full, and worktree creation also failed or was rolled back
2. **H2:** Process crash - the runner process was killed or crashed mid-execution, losing in-flight writes
3. **H3:** Checkpointing bug - the manifest write path threw an unhandled exception that stopped persistence but allowed worktree creation to continue (then worktrees were cleaned up)
4. **H4:** Shell mismatch - git worktree operations failed because of path resolution differences between bash and PowerShell, leaving incomplete worktrees
5. **H5:** Manual or automated cleanup - worktrees and manifest were created but later deleted by a cleanup process or manual action
6. **H6:** The runner never actually executed - the worktree directory was created manually or by a different process, and no trials ran at all

### 2.5 Results (conclusions that require valid experimental data)

**None.** There are no valid results from EXP-005 because no trial data survives. Any statement about agent behavior, condition effectiveness, or resolver quality from EXP-005 is an inference or hypothesis, not a result.

### 2.6 Limitations (known constraints on what can be concluded)

1. **No data limitation:** Without trial data, no conclusions about agent behavior under different conditions are possible from EXP-005
2. **Survivorship bias:** The one surviving worktree directory (empty) is not representative of any execution - it tells us nothing about trial outcomes
3. **Retrospective reconstruction limit:** We can infer that the runner executed partially, but we cannot reconstruct what it did trial-by-trial
4. **Conflicting reports:** Prior session reports cannot be verified and must be treated as unverified claims
5. **Infrastructure confound:** Any future rerun must control for the infrastructure issues that caused the original failure, or the results will be confounded

---

## 3. Experimental Validity

### 3.1 Design validity (INTACT)

The experimental design is valid:

- **Factorial design:** 10 scenarios × 3 conditions × 2 replications - appropriate for detecting condition effects across diverse scenarios
- **Randomization:** Seed 42, Mulberry32 + Fisher-Yates - properly implemented per source code
- **Replication:** 2 per combination - allows estimation of within-condition variance
- **Condition isolation:** A/B/C differ only in the resolution method (SPADE vs HUMAN vs AMBIGUITY) - correct treatment isolation
- **Scenario diversity:** 10 scenarios covering different types of directive ambiguity - appropriate for generalization claims

**Conclusion:** If the experiment had executed and persisted data, the design would support valid conclusions about condition effects.

### 3.2 Execution validity (FAILED)

The experiment did not execute validly:

- **No persisted records:** Without a manifest, there is no record of which trials ran, in what order, with what outcomes
- **No worktree persistence:** Without worktrees, there is no independent verification that trials executed in isolated environments
- **No output capture:** Without stdout/stderr logs, there is no record of what the agents actually did

**Conclusion:** The execution validity is entirely absent. No conclusions about agent behavior can be drawn from EXP-005 in its current state.

### 3.3 What would be required for execution validity

1. **Manifest persistence:** Every trial must be recorded in a durable, verifiable manifest
2. **Worktree persistence:** Every trial's worktree must survive (or be archived) so outputs can be inspected
3. **Output logging:** Every trial must produce logged outputs (agent responses, evaluator scores, timestamps)
4. **Integrity verification:** The manifest must be verifiable (valid JSON, consistent with worktree contents)
5. **Reproducibility:** The randomization seed, scenario definitions, and condition definitions must be frozen and documented

---

## 4. Evaluator Validity

### 4.1 Evaluator design (from `evaluator.ts` and methodology)

The evaluator is designed to assess agent outputs against gold-standard resolutions. Key design questions:

- **What is being measured?** Agent ability to resolve directives under different conditions (SPADE, HUMAN, AMBIGUITY)
- **What is the source of truth?** Gold-standard resolutions, presumably created by humans or by a trusted resolver
- **How is the evaluator itself validated?** This is a critical question - if the evaluator has systematic biases, the experiment measures the evaluator's biases, not agent behavior

### 4.2 Evaluator validity questions

1. **Gold standard quality:** Are the gold-standard resolutions correct? Who created them? How were they validated?
2. **Evaluator-blind condition:** Does the evaluator know which condition produced the agent output? If so, is there a risk of condition-label bias?
3. **Metric validity:** What metric is used (exact match, semantic similarity, human judgment)? Is it sensitive to the differences we care about?
4. **Evaluator consistency:** If the same output is evaluated twice, does it get the same score?
5. **Condition leakage:** Does the evaluator inadvertently use information from the condition label to score the output?

### 4.3 Prior validation (from memory)

Per prior session memory:
- The resolver was pre-validated at 10/10 exact matches (100%) in a dry-run against pre-validated scenarios
- The methodology correction gates included "resolver input isolation" and "gold-standard independence" - suggesting these were identified as risks and addressed
- The correction gate also included "condition-label stripping" - suggesting condition-label bias was a recognized risk

**Conclusion:** The evaluator validity challenges were identified and addressed in the correction gates. If the experiment executes correctly, the evaluator validity should be adequate. But without execution data, this is an inference, not a result.

---

## 5. Agent Behavior vs Infrastructure Behavior

### 5.1 The central confound

In EXP-005, the measured outcome is agent behavior (how well agents resolve directives under different conditions). But the infrastructure is what executes the agents, captures their outputs, and persists the results.

**If the infrastructure fails, we cannot measure agent behavior.** This is not a subtle point - it is the entire problem. A failed infrastructure does not produce evidence about agent behavior one way or the other.

### 5.2 What we CANNOT conclude about agent behavior

1. Whether agents perform differently under SPADE vs HUMAN vs AMBIGUITY conditions
2. Whether the resolver improves agent performance
3. Whether agents are more accurate, more confident, or more consistent under any condition
4. Whether any condition causes agent failures or timeouts

### 5.3 What we CAN conclude about infrastructure behavior

1. The infrastructure (runner + checkpointing + worktree management + disk) failed to persist results
2. The failure was severe enough that no trial data survives
3. The infrastructure has multiple identified weaknesses (disk capacity, shell mismatch, missing dependencies, checkpointing granularity)

---

## 6. Measurement Validity

### 6.1 What is being measured

The experiment measures **agent directive resolution accuracy** - the degree to which agents correctly resolve ambiguous directives under different resolution conditions.

### 6.2 Measurement chain

```
Agent receives prompt -> Agent produces output -> Evaluator scores output -> Score recorded in manifest -> Analysis
```

Each link in this chain must be valid for the measurement to be valid:

1. **Prompt delivery:** Did the agent receive the intended prompt? (Condition A vs B vs C must be faithfully represented)
2. **Agent output:** Did the agent produce an output? (Timeout, crash, empty output are all measurement failures)
3. **Evaluator scoring:** Did the evaluator score the output correctly? (Evaluator validity)
4. **Manifest recording:** Was the score correctly recorded? (Checkpointing validity)
5. **Analysis:** Is the analysis of the scores correct? (Statistical validity)

### 6.3 Where measurement validity broke

The measurement chain broke at step 4 (manifest recording). Even if steps 1-3 worked perfectly, the scores were not persisted, so step 5 (analysis) has no data to analyze.

**This means the measurement is entirely invalid for EXP-005 as executed.** Not because the metric is wrong, but because the measurement was not completed.

---

## 7. Counterfactual Analysis

### 7.1 What would valid data have shown?

We cannot know. This is the hard truth. Without data, any claim about what the experiment "would have" shown is speculation.

However, we can frame the relevant questions:

1. **If the resolver works:** Agents under condition A (SPADE) should perform better than under condition B (HUMAN) or C (AMBIGUITY) on directive resolution tasks, because the resolver provides structured, correct resolutions
2. **If the resolver doesn't work:** There should be no significant difference between conditions, or condition B (HUMAN) might perform better if human resolution is superior to the resolver
3. **If infrastructure confounds:** Random variation or systematic biases in the execution environment could produce apparent condition effects that are actually infrastructure artifacts

### 7.2 Why we can't test these counterfactuals

Testing these counterfactuals requires running the experiment and observing the results. The data from the failed run is gone. The only way to test is to repair the infrastructure and rerun.

---

## 8. Missingness Bias

### 8.1 Nature of the missingness

The missingness in EXP-005 is **not random**. It is systematic:

- All trials are missing (or 59/60 are missing, with 1 partial)
- The missingness is caused by infrastructure failure
- The infrastructure failure may be correlated with specific trials (e.g., later trials more likely to be missing if the disk filled over time)

### 8.2 Implications of non-random missingness

If the missingness were random (e.g., each trial had an independent 50% chance of being lost), we could potentially use the surviving data to estimate the full distribution. But with 59/60 trials missing due to a systematic infrastructure failure, we cannot:

- Estimate the mean outcome
- Estimate condition effects
- Estimate variance
- Test any hypothesis about agent behavior

The data is not "missing at random" - it is "missing because the infrastructure failed." This is a structural missingness, not a statistical one.

### 8.3 What would be required to address missingness

1. **Recover the data:** If the manifest or worktrees can be recovered from backups, shadow copies, or git history, the missingness can be reduced
2. **Rerun the experiment:** If recovery is not possible, the experiment must be rerun with improved infrastructure
3. **Document the missingness:** Any report must clearly state that the data is missing due to infrastructure failure, not due to random chance or experimental exclusion criteria

---

## 9. Timeout Interpretation

### 9.1 How timeouts would be classified

Per the methodology, timeouts are a valid trial outcome - not a failure, but a bounded result indicating that the agent did not complete within the allotted time. Timeouts are informative: they tell us that the task was too hard, the agent was too slow, or the condition made the task harder.

### 9.2 Why timeouts matter for interpretation

If a trial times out, the agent's output is incomplete. The evaluator may still score the partial output, or it may score it as a failure. Either way, the timeout is a measurement of agent behavior under time constraints.

### 9.3 Timeout data is also missing

Since no manifest exists, we don't know which trials timed out, which completed, and which failed. All of this data is lost.

---

## 10. How the Benchmark Could Be Gamed

### 10.1 Benchmark gaming risks (identified in methodology)

The EXP-005 methodology identified several gaming risks:

1. **Condition-label leakage:** If the agent can infer the condition from the prompt, it may behave differently not because of the resolution quality but because of the label
2. **Scenario memorization:** If the scenarios are public or were used in training, the agent may have memorized the correct answers
3. **Evaluator exploitation:** If the agent knows how the evaluator scores, it may optimize for the evaluator rather than for correct resolution
4. **Gold-standard leakage:** If the gold-standard resolutions are visible to the agent, the agent may simply reproduce them

### 10.2 Safeguards (from correction gates)

The correction gates addressed several of these:

- **Resolver input isolation:** The resolver's output is the only thing that differs between conditions; the agent does not see the condition label
- **Gold-standard independence:** The gold standards were created independently of the resolver
- **Prompt hash logging:** Each prompt is hashed and logged, so the exact prompt can be verified

### 10.3 Residual gaming risks

1. **Scenario contamination:** If the scenarios overlap with the agent's training data, the agent may perform well by memorization rather than by resolution
2. **Evaluator specificity:** If the evaluator is too specific (e.g., exact match), agents may learn to produce outputs that match the evaluator's format without actually resolving the directive correctly
3. **Scenario difficulty distribution:** If the 10 scenarios are not representative of the distribution of directives the agent will face in practice, the results may not generalize

---

## 11. Stochasticity and Signal Dominance

### 11.1 Sources of stochasticity

1. **Agent sampling:** LLM agents are stochastic - the same prompt can produce different outputs on different runs
2. **Randomization:** The trial order is randomized, which is good for controlling order effects but adds variance
3. **Infrastructure variation:** Disk speed, network latency, process scheduling - all introduce variance in execution time and potentially in outcomes

### 11.2 Signal-to-noise considerations

With 10 scenarios × 3 conditions × 2 replications = 60 trials, the design has:

- 10 observations per condition (across all scenarios and replications)
- 2 observations per scenario-condition combination
- Limited power to detect small effects

If agent stochasticity is high (outputs vary a lot across replications), 2 replications may not be enough to reliably estimate the condition effect. The design assumes that the condition effect is large enough to be detected with 10 observations per condition.

### 11.3 What would be required to separate signal from noise

1. **More replications:** 5-10 replications per condition-scenario combination would provide more reliable estimates of within-condition variance
2. **Controlled execution environment:** Minimizing infrastructure variation reduces noise
3. **Multiple evaluators:** If human evaluation is used, multiple evaluators with inter-rater reliability checks reduce evaluator noise
4. **Pre-registered analysis:** Pre-specifying the analysis prevents p-hacking and data-dependent analysis choices

---

## 12. Evaluation Science Verdict

### 12.1 What the experiment design validly tests

If executed correctly with valid data, EXP-005 tests whether the SPADE resolver (condition A) improves agent directive resolution accuracy compared to human resolution (condition B) or unresolved ambiguity (condition C), across 10 diverse scenarios, with 2 replications per combination.

### 12.2 What the experiment cannot test (without redesign)

1. Whether the resolver generalizes to scenarios beyond the 10 tested
2. Whether the resolver works for directives not covered by the scenario design
3. Whether the resolver's benefit depends on agent type, agent version, or agent instructions
4. Whether the resolver's benefit persists over longer or more complex tasks
5. Whether the resolver is cost-effective compared to alternatives

### 12.3 What the failed execution means for the evaluation

The failed execution means that **no evaluation results exist**. The experiment design may be valid, the evaluator may be valid, the methodology may be sound - but without executed trials and persisted data, there is nothing to evaluate.

### 12.4 What must happen next

1. **Repair the infrastructure** (disk, dependencies, shell, checkpointing)
2. **Rerun the experiment** with the same design (10 × 3 × 2, seed 42) or a validated subset
3. **Ensure data persistence** (manifest + worktrees + logs survive)
4. **Analyze the results** only after data validity is established
5. **Report the infrastructure failure transparently** in any resulting paper or report - it is part of the scientific record

---

*End of evaluation science application. Proceed to product inspection.*
