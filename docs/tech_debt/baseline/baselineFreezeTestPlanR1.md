# Freeze Baseline Test Plan

Status: the original Round 1 plan has been replaced by the current deterministic benchmark and approval workflow described here. The CCR stage tests remain useful unit and regression coverage; this file is the operating guide for benchmark baselines.

## What the harness measures

`tests/freeze/freezeCorpus.ts` defines eight fixed, offline conversation cases. The benchmark combines them with three CCR provider options (`openai`, `anthropic`, `local`) and three intents (`debug`, `explain`, `summarize`), for 72 rows.

Each row records the full windowed, reconstructed, compressed, and reduced output; token and message counts; routing order and telemetry; reconstruction phrase-retention diagnostics; and 20 local latency samples with median and p95 summaries.

The provider field is an option passed to local CCR code. The benchmark does not call those hosted providers, and it does not measure live provider quality, network latency, or cost. Phrase retention is a lexical diagnostic, not a semantic-quality score.

## Artifacts

- `tests/_freeze_bench/freeze_benchmark.json` — approved stable-behavior reference.
- `tests/_freeze_bench/freeze_benchmark_current.json` — fresh working-tree benchmark.
- `tests/_freeze_bench/freeze_benchmark_candidate.json` — proposed replacement reference.
- `tests/_freeze_delta/freeze_delta_report.json` — comparison output. Latency samples are intentionally excluded from exact delta checks.
- `tests/_freeze/ccr.json` and `tests/_freeze/chainRouter.json` — focused regression snapshots.

## Local workflow

Run the full test suite first. Generate and compare current behavior with:

```bash
task frzbench:current
task frzdlta
```

To prepare a baseline update, generate a candidate and inspect its report:

```bash
task frzbench:candidate
task frzdlta:candidate
```

Candidate reporting is review-only and may contain expected deltas. Review the report and the candidate JSON before promotion. Promote the reviewed candidate with:

```bash
task frzbench:approve
```

Commit the baseline change on a branch and open a PR to `main` with the GitHub label `freeze-baseline-approved`. The freeze workflow compares a fresh run with the proposed baseline. Direct pushes to `main` do not execute this PR approval workflow.

## Deterministic checks

The delta reporter compares case identity, category, input count, token counts, stage outputs, counts, reconstruction diagnostics, routing order, and telemetry. It also reports missing and additional cases and rejects duplicate case identities. Latency is reported as performance data rather than a frozen field.

Focused tests remain in:

- `tests/transform/ccrPipeline.freeze.test.ts`
- `tests/chain/chainRouter.freeze.test.ts`
- `tests/orchestrator/orchestrator.freeze.test.ts`
- `tests/transform/anchorSemanticFusion.freeze.test.ts`
- `tests/transform/relevance.freeze.test.ts`

The harness captures deterministic local pipeline behavior. Wrapper integration, live provider behavior, cost, and end-to-end quality require separate test runs and must not be inferred from these 72 rows.
