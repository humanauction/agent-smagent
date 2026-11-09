# agent‑smagent

[![SMAGE Multi-Platform Build (Bun, Node 24)](https://github.com/humanauction/agent-smagent/actions/workflows/smage-build.yml/badge.svg)](https://github.com/humanauction/agent-smagent/actions/workflows/smage-build.yml)
[![SMAGE Freeze Regression](https://github.com/humanauction/agent-smagent/actions/workflows/freeze.yml/badge.svg)](https://github.com/humanauction/agent-smagent/actions/workflows/freeze.yml)

## Intro

i built this because i got murdered on tokens asking stupid questions. i found solutions, started reading code, didnt know why a bunch of it was there. mostly, because i just didnt understand it. and if i don’t understand something i try to build it. so i thought feck it, i'll just write my own compression and context‑management layer. least then i know what it’s doing and what it’s not doing. for now. probably. i mean, it cant be THAT hard, right?

Right?

---

## Current Stage: CCR Baseline and Evaluation

The CCR pipeline and deterministic freeze harness are in place. The approved baseline is the regression reference; schema factoring has been evaluated and remains opt-in. Entity Dictionary compression was rejected for CCR after provider-token comparisons showed no net input savings, and its runtime option has been removed. AST compression evaluation is next. The learning engine is still a prototype; it does not yet tune CCR from measured results.

### Current freeze benchmark

The fixed offline corpus in `tests/freeze/freezeCorpus.ts` has eight cases covering minimal turns, instructions, repetition, long context, structured data, code, constraints, and cross-turn recall. Three CCR provider options and three intents produce 72 benchmark rows.

Each row records full CCR stage outputs, token/message counts, routing telemetry, required-phrase retention in reconstructed text, and 20 local runtime samples with median and p95. The provider option is passed to local CCR code; the benchmark does not call hosted providers or measure API quality, cost, or network latency. The phrase-retention check is lexical, not a semantic-quality score.

### Baseline files and commands

- `tests/_freeze_bench/freeze_benchmark.json` — approved reference.
- `tests/_freeze_bench/freeze_benchmark_current.json` — current working-tree result.
- `tests/_freeze_bench/freeze_benchmark_candidate.json` — proposed reference.
- `tests/_freeze_delta/freeze_delta_report.json` — stable-field comparison report.
- `tests/_freeze/` — focused CCR and chain-router snapshots.

Run the regular validation and current comparison:

```bash
npx tsc --noEmit
npx vitest --run
task frzbench:current
task frzdlta
```

Prepare an intentional baseline update:

```bash
task frzbench:candidate
task frzdlta:candidate
# Review candidate JSON and the delta report.
task frzbench:approve
```

The freeze workflow runs on PRs targeting `main`. For a baseline update, create a branch, commit the promoted benchmark, open a PR, and apply the GitHub label `freeze-baseline-approved`. The workflow compares a fresh benchmark with the proposed baseline. A direct push to `main` does not run this PR approval workflow.

### Roadmap

This roadmap is the durable handoff for future work. Update the status and next action here when a milestone changes; do not rely on an AI session remembering work that is not recorded in the repository.

#### 1. MVP baseline and project continuity — current

**In place:** CCR pipeline stages, reversible logging, provider adapters, routing/orchestration, proxy and MCP entry points, wrappers, offline freeze harness with a fixed 72-row benchmark matrix.

**Next:** keep the approved baseline and current benchmark separate; maintain the regression gate; use corpus results to identify correctness gaps and prioritize the next improvement. The first bounded CCR adjustment (forwarding existing options into priority and window shaping) was evaluated against the corpus with 100% required-phrase retention and no stable-field delta; it was not promoted as a quality improvement.

**Latest relevance-tier experiment:** on two synthetic long histories with phase-cutoff pressure, opt-in `relevanceFirst` retained 3/3 required phrases versus 0/3 for baseline, with equal token use in both cases (10 vs 10 and 14 vs 14). A no-pressure control was unchanged (same selected messages, 19 tokens, and required phrase retained by both). This shows a retention improvement in these fixtures, not token savings or general semantic quality. The policy remains opt-in. See [the proposal result](docs/tech_debt/improvements/relevance_tiers.md) and [the full report](docs/benchmarks/relevance_tier_comparison.json). The baseline harness does not establish live provider quality, API cost, or wrapper behavior by itself.

**Resume after a session or context change:** check `git status`, read this roadmap and `docs/tech_debt/baseline/baseline_sequence.md`, then inspect the current freeze report and the files named by the active task. Record the new state, decisions, and next command in the relevant README/doc before switching tasks.

#### 2. COMPLETE - Learning engine and durable session memory: persistence and signal foundation

The first persistence slice is implemented in `ha_core/cache/sessionStore.ts` and is used by the existing cache and reversible-log APIs. Sessions are stored as versioned JSON envelopes under `SMAGE_CACHE_DIR` (or the system temporary directory), with atomic replacement and a recovery snapshot. Session IDs are validated, sessions have explicit `active`, `expired`, or `deleted` status, expiry is checked on access, and deletion leaves a tombstone so a deleted ID cannot be silently recreated. Corrupt primary data is recovered from the last valid snapshot when available; unrecoverable data raises an explicit store error.

Logged timeline entries are normalized by `ha_learn/miner.ts` into typed samples with session/stage/timestamp provenance, outcome status, and optional token or retention metrics. Signals are bounded and reviewable observations; they do not automatically tune CCR or modify project instruction files. The bounded CCR adjustment and separate adaptive fixtures are complete;
The `relevance-tier experiment` is evaluated and retained as opt-in. It improved required-phrase retention in two synthetic cutoff-pressure histories without reducing token use, and matched the baseline on a no-pressure control. `Not promoted as the default policy`.
Automatic edits to `CLAUDE.md`, `AGENTS.md`, or project rules require a separate, explicit design and review step; they are not current capabilities.

#### 3. UI and observability — partial foundation exists

Proxy dashboards and HTML rendering modules exist. A cohesive CCR visualizer, memory/session inspector, and provider-routing view remain future work. Build stage: after the metrics and event fields are stable enough to explain what the UI displays.

#### 4. Compression research — Entity Dictionary rejected; AST evaluation next

The planned sequence was **schema factoring → entity dictionary compression → AST evaluation → priority-threshold experiments → UI and observability**. Schema factoring stays behind `schemaFactoring: true`, disabled by default and under `baselineFreeze`. Its expanded evaluation covered eight freeze cases and 21 varied codec fixtures: six encoded fixtures round-tripped and saved 1,212 heuristic tokens in aggregate; 14 unsupported inputs fell back unchanged, and the minimum-size shape was declined because packet overhead exceeded savings. The freeze corpus had no eligible arrays. See its [proposal](docs/tech_debt/improvements/schema_factor.md) and [expanded report](docs/benchmarks/schema_factoring_expanded_comparison.json).

Entity Dictionary was evaluated on 16 synthetic fixtures and the eight-case freeze corpus. Its local heuristic estimated 281 tokens saved across eligible fixtures, but OpenAI counts showed the current full packet used 17 more tokens than the source on the smoke fixture. The compact v2 packet alone saved 54 tokens there; once its shorter decoder instruction was included in paired OpenAI responses, compact inputs used 0, 36, and 17 more prompt tokens across three tasks (53 extra total). Both original and compact inputs returned correct answers on all three. The efficiency gate failed, so the `entityDictionary` CCR option, transform/reconstruction branches, and live evaluation runners have been removed. The codec tests, fixtures, proposal, and [offline](docs/benchmarks/entity_dictionary_comparison.json), [tokenizer](docs/benchmarks/openai_provider_validation.json), and [response](docs/benchmarks/entity_dictionary_response_evaluation.json) reports remain as historical evidence; none changed the approved freeze baseline.

AST compression is the next compression evaluation stage. The initial TypeScript/JavaScript fixtures are in place, and the TypeScript 6.0.3 compiler API parser/printer is pinned for evaluation. Next, define the lossless reconstruction contract before measuring complete-packet token cost, compilation, and unsupported-syntax fallback. No AST transform should enter CCR until those checks pass. See the [AST proposal](docs/tech_debt/improvements/ast_compress.md).

#### 5. Hosted-provider validation — task-specific and gated

The Entity Dictionary-specific live runners have been retired with that experiment. Future hosted-provider evaluations must remain separate from the deterministic freeze benchmark, use synthetic or approved data, fail closed without an explicit feature gate, and enforce a small budget before sending requests. Never store API keys in source, fixtures, reports, or logs; `.env` files are git-ignored.

## CCR pipeline

`ha_core/transform/ccr/pipeline.ts` runs these stages:

1. Extract role-based anchors.
2. Deduplicate messages.
3. Score relevance and attach metadata.
4. Assign priorities and select a token-bounded window.
5. Reconstruct the anchor spine and selected window.
6. Fuse identical normalized anchor text and compress the payload.
7. Reduce the final message and return stage outputs, counts, and token estimates.

The relevance, priority, window, reconstruction, and payload modules are implemented. Their measured behavior is still being established. The pipeline now forwards its options object to priority assignment and window shaping; adaptive policy movement is measured separately in `tests/transform/adaptiveCcr.test.ts`, while the approved freeze corpus continues to run with `baselineFreeze`.

## Architecture

- `ha_core/` — message handling, CCR transforms, provider adapters, routing, telemetry, memory, and output reduction.
- `ha_proxy/` — HTTP proxy and dashboard.
- `ha_mcp/` — MCP server and compression/retrieval/statistics tools.
- `ha_wrap/` — agent wrappers, orchestration, fallback, and response blending.
- `ha_learn/` — in-memory anchor and failure-signal learning prototypes.
- `ha_cli/` — CLI commands.
- `ha_docs/` — source documentation and HTML documentation generation.
- `tests/` — unit, integration, regression, and freeze coverage.
- `docs/tech_debt/` — baseline plans and improvement proposals.

## Development commands

```bash
npm ci
npx tsc --noEmit
npx vitest --run
```

Taskfile shortcuts include `task tst:ts`, `task frztst`, `task frzbench:current`, `task frzdlta`, `task frzbench:candidate`, and `task frzdlta:candidate`. The repository Taskfile currently prefixes several commands with `arch -arm64`; adjust invocation to match your host if needed.

Run the opt-in relevance-tier comparison separately from the approved freeze benchmark:

```bash
SMAGE_RUN_RELEVANCE_TIER_EXPERIMENT=1 npx vitest --run tests/transform/relevanceTierComparison.test.ts
```

It writes `docs/benchmarks/relevance_tier_comparison.json`; the test is skipped unless the environment flag is set.

To regenerate the API reference and HTML docsite:

```bash
task bd
task docs
task docsite
```

`SMAGE_DOCS.md` is generated from JSDoc comments. Add or correct source comments before regenerating it.

## Runtime entry points

The package exposes CLI, proxy, and MCP entry points through `ha_cli/`, `ha_proxy/`, and `ha_mcp/`. Typical local invocations are:

```bash
npx tsx ha_cli/main.ts
npx tsx ha_proxy/server.ts
npx tsx ha_mcp/server.ts
```

Provider-backed calls require the relevant provider configuration and credentials. The offline freeze benchmark does not need them.
