# agent‑smagent

[![SMAGE Multi-Platform Build (Bun, Node 24)](https://github.com/humanauction/agent-smagent/actions/workflows/smage-build.yml/badge.svg)](https://github.com/humanauction/agent-smagent/actions/workflows/smage-build.yml)
[![SMAGE Freeze Regression](https://github.com/humanauction/agent-smagent/actions/workflows/freeze.yml/badge.svg)](https://github.com/humanauction/agent-smagent/actions/workflows/freeze.yml)

## Intro

i built this because i got murdered on tokens asking stupid questions. i found solutions, started reading code, didnt know why a bunch of it was there. mostly, because i just didnt understand it. and if i don’t understand something i try to build it. so i thought feck it, i'll just write my own compression and context‑management layer. least then i know what it’s doing and what it’s not doing. for now. probably. i mean, it cant be THAT hard, right?

Right?

---

## Current Stage: CCR Baseline and Evaluation

The CCR pipeline and deterministic freeze harness are in place. The approved baseline is the regression reference; schema factoring has been evaluated and remains opt-in, and the current active experiment is entity dictionary compression. AST compression follows next. The learning engine is still a prototype; it does not yet tune CCR from measured results.

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

#### 4. Compression research — entity dictionary active, opt-in

The agreed experiment order is **schema factoring → entity dictionary compression → AST evaluation → priority-threshold experiments → UI and observability**. Schema factoring stays behind `schemaFactoring: true`, disabled by default and under `baselineFreeze`. Its expanded evaluation covered eight freeze cases and 21 varied codec fixtures: six encoded fixtures round-tripped and saved 1,212 heuristic tokens in aggregate; 14 unsupported inputs fell back unchanged, and the minimum-size shape was declined because packet overhead exceeded savings. The freeze corpus had no eligible arrays. See its [proposal](docs/tech_debt/improvements/schema_factor.md) and [expanded report](docs/benchmarks/schema_factoring_expanded_comparison.json).

Entity dictionary compression is the active experiment. It replaces repeated exact title-cased multiword spans only when the complete inline packet shows estimated savings. The map stays inline and its reference is session-bound, with no durable registry. The project-oriented expansion now covers 16 fixtures (7 project-heavy): 13 factored, 3 fell back unchanged, required phrases were retained, and the local estimate saved 281 tokens. In the eight freeze cases, no message factored, phrase loss was zero, and freeze-mode output matched exactly. Some synthetic gains are small; keep it opt-in pending provider-tokenizer evidence and naturally occurring project text. See the [proposal](docs/tech_debt/improvements/entity_dictionary.md) and [report](docs/benchmarks/entity_dictionary_comparison.json).

Both experiment reports are separate from the approved freeze benchmark. Rerun the entity comparison with `SMAGE_ENTITY_DICTIONARY_REPORT=docs/benchmarks/entity_dictionary_comparison.json npx vitest --run tests/transform/entityDictionary.test.ts tests/transform/entityDictionaryComparison.test.ts`.

AST compression remains an evaluation and contract-definition stage. To add later: AST transform to CCR after parser/printer versions, lossless reconstruction, unsupported syntax fallback, and complete-packet token accounting have been assessed. See the [AST proposal](docs/tech_debt/improvements/ast_compress.md).

#### 5. Provider-tokenizer validation — gated

This separate validation stage compares local estimates with OpenAI’s reported input token counts for control and opt-in inputs. It uses the [Responses API input-token endpoint](https://developers.openai.com/api/reference/resources/responses/subresources/input_tokens/methods/count); it generates no model response, so response quality and generation latency are outside this first pass. Each report records model, timestamp, scope, fixture IDs, request count, local and provider token counts, count-request latency, output-token cap (0), and cost estimate/availability. It writes only `docs/benchmarks/openai_provider_validation.json` and never updates the approved freeze benchmark.

The gate fails closed unless `SMAGE_RUN_OPENAI_VALIDATION=1`, a key is supplied through the process environment, the model has a configured price, and the preflight estimate is within budget. The only configured model is `gpt-6-luna`; its current standard input price is $0.05 per million tokens on the [official pricing page](https://developers.openai.com/api/docs/pricing). The default guard is $0.02, with a hard maximum of $0.05. Pricing and model access will change always recheck them before running. The API key is read from the environment only and must never appear in repository files or reports. `.env` and `.env.*` are ignored by git.

Initially starting with a small paired smoke fixture:

```bash
SMAGE_RUN_OPENAI_VALIDATION=1 SMAGE_OPENAI_VALIDATION_SCOPE=smoke \
  node --env-file-if-exists=.env --import tsx scripts/openaiProviderValidation.ts
```

Only after reviewing that report, run the full freeze corpus plus project fixtures:

```bash
SMAGE_RUN_OPENAI_VALIDATION=1 SMAGE_OPENAI_VALIDATION_SCOPE=full \
  node --env-file-if-exists=.env --import tsx scripts/openaiProviderValidation.ts
```

With the gate disabled, the script writes a `skipped` report and sends no request. If the gate is enabled but the API key or required price configuration is missing, it records the reason, sends no request, and exits with an error. Verify the current balance before running. Never write the API key to repository files, reports, or logs.

Next: gather naturally occurring entity-heavy project examples, run the smoke check once the ignored local environment file is configured, review its token-count report, then decide whether the full corpus run is justified. Keep entity dictionary and future AST work opt-in; baseline promotion still requires a separately reviewed candidate.

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
