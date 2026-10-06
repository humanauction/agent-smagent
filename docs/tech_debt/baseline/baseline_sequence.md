# SMAGE Baseline and Improvement Sequence

Use this sequence to establish a repeatable reference and then evaluate one change at a time. The freeze benchmark is an offline CCR benchmark; it does not substitute for wrapper or live-provider validation.

## 1. Establish a known working tree

- Review `git status` and separate unrelated edits from the baseline work.
- Build and run the full test suite.
- Run the focused freeze regression tests and any subsystem tests affected by pending work.
- Record the runtime/toolchain used for measurements.

## 2. Generate and review a candidate baseline

The fixed input corpus currently has eight cases. With three provider options and three intents, the benchmark produces 72 rows.

```bash
task frzbench:candidate
task frzdlta:candidate
```

Review `tests/_freeze_delta/freeze_delta_report.json`, then inspect the candidate in `tests/_freeze_bench/freeze_benchmark_candidate.json`.

Stable fields are exact-comparison inputs. The 20 latency samples and median/p95 summaries are observational performance data.

Promote only the reviewed candidate:

```bash
task frzbench:approve
```

The PR workflow compares a fresh benchmark against the proposed baseline. Baseline updates use a branch and PR to `main` with the `freeze-baseline-approved` GitHub label. A direct push to `main` bypasses this PR workflow.

## 3. Record benchmark results

For each approved run, retain:

- baseline commit/tag and runtime version;
- corpus version and row count;
- token counts and full CCR stage outputs;
- required-phrase reconstruction diagnostic results;
- routing order and telemetry;
- latency samples and their median/p95 summaries.

The phrase check only looks for exact required strings in reconstructed content. It is a useful loss signal, not a complete semantic assessment. The provider names vary local CCR options; no hosted provider requests are made.

## 4. Validate runtime integrations separately

The repository contains adapter, router, orchestrator, wrapper, proxy, and MCP tests. Run the relevant suites when changing those surfaces. A local corpus benchmark does not prove live API behavior, real provider costs, end-to-end wrapper correctness, or production reliability.

For a release-quality baseline, record which wrapper commands and provider integrations were exercised, their configuration, and any failures. Use safe test credentials and avoid recording secrets or personal prompt data in fixtures.

## 5. Select improvements from evidence

For each proposal in `docs/tech_debt/improvements/`:

1. Link it to baseline cases or an observed limitation.
2. State the intended metric movement and correctness constraints.
3. Implement one narrow change behind a reversible option where practical.
4. Run the same corpus and affected tests on the candidate.
5. Compare stable outputs, reconstruction checks, token changes, and performance measurements.
6. Keep or revert based on the recorded evidence; update the proposal with actual results.

The expected compression percentages in proposal documents are hypotheses until measured against this corpus and additional task-specific evaluation.

## 6. Hardening and release tags

After the baseline is established, continue with `hardening_pass_checklist.md`. Create a hardening tag only after its runtime, test, benchmark, and documentation acceptance criteria have actually passed. A baseline tag and a hardening-completion tag represent different checkpoints.
