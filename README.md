# agent‑smagent

[![SMAGE Multi-Platform Build (Bun, Node 24)](https://github.com/humanauction/agent-smagent/actions/workflows/smage-build.yml/badge.svg)](https://github.com/humanauction/agent-smagent/actions/workflows/smage-build.yml)

## Intro

i built this because i got murdered on tokens asking stupid questions. i found solutions, started reading code, didnt know why a bunch of it was there. mostly, because i just didnt understand it. and if i don’t understand something i try to build it. so i thought feck it, i'll just write my own compression and context‑management layer. least then i know what it’s doing and what it’s not doing. for now. probably. i mean, it cant be THAT hard, right?

Right?

---

## Current Stage: CCR Upgrade — Stage 1 (MVP‑Critical)

SMAGE is in CCR Upgrade Stage 1, the first hardening pass focused on stabilising the deterministic compression pipeline. This stage is the foundation for the freeze baseline, benchmark runner, delta reporter, and the learning engine that follows.

### Modules Being Stabilised Now (Stage 1)

These CCR components are under active refinement and freeze‑baseline locking:

- anchors
- dedupe
- relevance_scoring
- priority_tiers
- window_shaping
- reconstruction
- payload_compression
- output_reduction

These modules form the deterministic CCR pipeline and are the core of the freeze harness.

### What’s Already Stable

These subsystems are locked, deterministic, and fully freeze‑tested:

- ProviderChainRouter
- Telemetry
- reversible_logging
- proxy
- MCP
- wrappers
- CLI
- multi_agent_routing
- provider_fallback
- response_blending
- memory_routing

These components are already part of the freeze baseline and do not change during Stage 1.

### Roadmap

#### 1. MVP Baseline (current)

The MVP baseline includes:

- deterministic CCR pipeline
- reversible logging
- proxy + MCP
- multi‑agent routing
- provider adapters
- binary builds
- Docker + Compose
- baseline token tests
  This is the foundation for the freeze baseline and approval workflow.

#### 2. Learning Engine

Next milestone introduces adaptive behaviour:

- failure miner
- memory scoring
- auto‑tuning
- CLAUDE.md / AGENTS.md writer

This layer uses freeze baselines to measure improvements.

#### 3. UI Layer

- Interactive visualisation:
- dashboard
- CCR visualiser
- memory visualiser
- provider routing visualiser

These are powered by the proxy dashboard modules.

#### 4. Crush‑Tech Zone (advanced compression)

High‑impact compression research:

- entity dictionary compression
- schema factoring
- AST compression
- provider‑adaptive compression
- semantic anchors
- relevance‑tier chunking

These are Stage 3+ improvements measured against freeze benchmarks.

## Architecture Overview

### ha_core — The Engine

Core SMAGE functionality:

- message model
- CCR pipeline
- token counting
- compression rules
- provider adapters
- reversible logging
- SMAGEAgent
- SMAGEMultiAgent
- SMAGEOrchestrator
- ProviderSelector
- ProviderFallback
- ResponseBlender
- MemoryRouter

### ha_proxy — Drop‑in HTTP Proxy

Implements:

- OpenAI/Anthropic/Google‑style API
- CCR shaping
- provider forwarding
- output reduction
- reversible logging
- HTML dashboards

### ha_mcp — MCP Server

Tools:

- humanAuction_compress
- humanAuction_retrieve
- humanAuction_stats
- JSON‑RPC dispatch
- reversible logging
- dist‑based execution

### ha_wrap — Agent Wrappers

One‑command wrappers for:

- claude
- aider
- cursor
- copilot
- opencode
- Wrappers unify provider behaviour and inject CCR shaping.

### ha_learn — Auto‑Tuning Layer

Includes:

- failure miner
- memory scoring
- session weighting
- CLAUDE.md / AGENTS.md writer

### ha_cli — Unified CLI

```bash
smage proxy
smage anchors
smage ccr
smage agent
smage multi_agent
smage docs
smage learn
```

Everything is explicit.
Everything is logged.
Everything is reversible.

### What’s Working Right Now

- Core message model
- Provider adapters (OpenAI, Anthropic, Google, Local)
- MCP server (compress, retrieve, stats)
- Proxy server
- SMAGEAgent
- Multi‑agent wrapper
- Provider selection logic
- Provider fallback logic
- Response blending logic
- Memory‑influenced routing
- Learning engine skeleton
- CLI commands
- Dist‑based MCP execution
- tsx‑based dev execution
- Reversible logging across core, proxy, MCP, provider, learn
- Tests for proxy, MCP, learn
- Docsite generator

## What’s Being Built Now (Active Milestone)

### Current Stage: CCR Upgrade Stage 1

#### In progress (MVP‑critical)

- relevance.ts
- priority.ts
- window.ts
- reconstruct.ts
- payload.ts
- context.ts

Complete:

- anchor.ts
- dedupe.ts
- basic compressor
- reversible logging
- provider adapters
- proxy server
- MCP server
- wrappers
- CLI
- binary builds
- Docker + Compose
- multi‑platform CI

## Project Structure

```text
agent-smagent/
│
├── ha_core/                                   # [Core Engine]
│   ├── analyze/
│   │   ├── embeddings.ts
│   │   ├── classifier.ts
│   │   └── tokens.ts
│   ├── transform/
│   │   ├── compressors/
│   │   │   └── basic.ts
│   │   ├── anchor.ts
│   │   ├── anchor.test.ts
│   │   ├── ccr.ts
│   │   ├── context.ts
│   │   ├── dedupe.ts
│   │   ├── payload.ts
│   │   ├── priority.ts
│   │   ├── relevance.ts
│   │   ├── relevance.test.ts
│   │   ├── reconstruct.ts
│   │   ├── window.ts
│   │   └── ccr/
│   │       └── pipeline.ts
│   ├── call/
│   │   └── providers/
│   │       ├── anthropic.ts
│   │       ├── chainCache.ts
│   │       ├── chainMemory.ts
│   │       ├── chainRouter.ts
│   │       ├── chainScoreDashboard.ts
│   │       ├── chainScoreUI.ts
│   │       ├── chainTelemetry.ts
│   │       ├── errors.ts
│   │       ├── google.ts
│   │       ├── index.ts
│   │       ├── interface.ts
│   │       ├── local.ts
│   │       ├── openai.ts
│   │       ├── providerNormalize.ts
│   │       ├── roles.ts
│   │       ├── router.ts
│   │       └── utils.ts
│   ├── cache/
│   │   ├── log.ts
│   │   └── store.ts
│   ├── memory/
│   │   └── memory.ts
│   ├── output/
│   │   └── reducer.ts
│   ├── compress.ts
│   ├── compress.py
│   ├── smoke-test.ts
│   ├── providerMetadata.ts
│   └── index.ts
│
├── ha_proxy/                                  # [Proxy Layer]
│   ├── dashboard/
│   │   ├── html/
│   │   │   ├── anchors.ts
│   │   │   ├── ccr.ts
│   │   │   ├── config.ts
│   │   │   ├── health.ts
│   │   │   ├── index.ts
│   │   │   ├── layout.ts
│   │   │   ├── memory.ts
│   │   │   ├── provider.ts
│   │   │   └── types.ts
│   │   ├── utils/
│   │   │   ├── index.ts
│   │   │   └── messages.ts
│   │   └── router.ts
│   ├── routing/
│   │   └── router.ts
│   ├── config.ts
│   ├── index.ts
│   ├── middleware.ts
│   ├── router.ts
│   ├── server.ts
│   ├── test-provider.ts
│   └── test-proxy.ts
│
├── ha_mcp/                                    # [MCP Server]
│   ├── tools/
│   │   ├── compress.ts
│   │   ├── retrieve.ts
│   │   ├── stats.ts
│   │   └── index.ts
│   ├── server.ts
│   └── index.ts
│
├── ha_wrap/                                   # [Agent Wrappers]
│   ├── claude/
│   │   └── claudeWrapper.ts
│   ├── aider/
│   │   └── aiderWrapper.ts
│   ├── cursor/
│   │   └── cursorWrapper.ts
│   ├── copilot/
│   │   └── copilotWrapper.ts
│   ├── opencode/
│   │   └── opencodeWrapper.ts
│   ├── shared/
│   │   ├── baseWrapper.ts
│   │   ├── index.ts
│   │   ├── memoryLoader.ts
│   │   ├── personaLoader.ts
│   │   └── toolBinder.ts
│   ├── agent.ts
│   ├── ccrRouting.ts
│   ├── index.ts
│   ├── memoryRouting.ts
│   ├── mcpClient.ts
│   ├── multiAgent.ts
│   ├── orchestrator.ts
│   ├── providerFallback.ts
│   ├── providerMetadata.ts
│   ├── providerReliability.ts
│   ├── providerSelection.ts
│   ├── responseBlender.ts
│   ├── wrapperRegistry.ts
│   └── types.ts
│
├── ha_learn/                                  # [Learning Engine]
│   ├── engine.ts
│   ├── failMiner.ts
│   ├── index.ts
│   ├── memoryDecay.ts
│   ├── memoryPrune.ts
│   ├── memoryResolve.ts
│   ├── memoryScore.ts
│   ├── memoryStore.ts
│   ├── memoryWeight.ts
│   ├── miner.ts
│   ├── test-learn.ts
│   └── types.ts
│
├── ha_cli/                                    # [CLI]
│   ├── commands/
│   │   ├── agent.ts
│   │   ├── anchors.ts
│   │   ├── ccr.ts
│   │   ├── docs-html.ts
│   │   ├── docs.ts
│   │   ├── index.ts
│   │   ├── learn.ts
│   │   ├── memory.ts
│   │   ├── multi_agent.ts
│   │   ├── provider.ts
│   │   ├── proxy.ts
│   │   └── run.ts
│   ├── utils/
│   │   ├── args.ts
│   │   └── printer.ts
│   ├── mcp_client.ts
│   └── main.ts
│
├── ha_docs/                                   # [Docs Generator]
│   ├── docsite.ts
│   ├── generator.ts
│   ├── index.ts
│   ├── types.ts
│   └── walk.ts
│
├── docs/                                      # [Documentation]
│   ├── tech_debt/
│   │   ├── improvements/
│   │   │   ├── schema_factor.md
│   │   │   ├── provider_adaptive.md
│   │   │   ├── relevance_tiers.md
│   │   │   ├── semantic_anchors.md
│   │   │   ├── entity_dictionary.md
│   │   │   └── ast_compress.md
│   │   ├── baseline/
│   │   │   ├── ccr_stage1.md
│   │   │   ├── baselineStage2.md
│   │   │   ├── hardening_pass_checklist.md
│   │   │   ├── ccr_anchor_design/
│   │   │   ├── baseline_sequence.md
│   │   │   ├── timeout_surfaces.md
│   │   │   └── baselineFreezeTestPlanR1.md
│
├── tests/                                     # [Test Suite]
│   ├── freeze/
│   │   ├── freezeBaseline.ts
│   │   ├── freezeBaseline.test.ts
│   │   ├── freezeBenchmark.ts
│   │   ├── freezeBenchmark.test.ts
│   │   ├── freezeDelta.ts
│   │   ├── freezeDelta.test.ts
│   │   ├── freezeDeltaCandidate.test.ts
│   │   ├── freezeDiff.ts
│   │   └── freezeSnapshot.ts
│   ├── chain/
│   │   ├── chainRouter.test.ts
│   │   ├── chainRouter.freeze.test.ts
│   │   ├── chainTelemetry.test.ts
│   │   ├── chainTelemetryFull.test.ts
│   │   ├── chainScore.test.ts
│   │   ├── chainRetryLoop.test.ts
│   │   ├── chainRetry.test.ts
│   │   ├── chainCache.test.ts
│   │   ├── chainCacheSkip.test.ts
│   │   ├── chainFallback.test.ts
│   │   ├── chainFallbackOrder.test.ts
│   │   └── chainMultiProvider.test.ts
│   ├── orchestrator/
│   │   ├── orchestrator.test.ts
│   │   ├── orchestratorFallback.test.ts
│   │   └── orchestrator.freeze.test.ts
│   ├── transform/
│   │   ├── ccrPipeline.test.ts
│   │   ├── ccrPipeline.freeze.test.ts
│   │   ├── anchorSemanticFusion.freeze.test.ts
│   │   └── relevance.freeze.test.ts
│   ├── providers/
│   │   ├── openai.integration.test.ts
│   │   ├── openai.test.ts
│   │   └── providers.ts
│   ├── utils/
│   │   ├── diffFreeze.ts
│   │   ├── mockMessages.ts
│   │   └── mockConfig.ts
│   ├── _setup/
│   │   └── providerRegistry.ts
│   ├── _mocks/
│   │   └── providers.ts
│   ├── _freeze/
│   │   ├── ccr.json
│   │   └── chainRouter.json
│   ├── _freeze_bench/
│   │   ├── freeze_benchmark.json
│   │   ├── freeze_benchmark_current.json
│   │   └── freeze_benchmark_candidate.json
│   ├── _freeze_delta/
│   │   └── freeze_delta_report.json
│   ├── esm-test.js
│   ├── setup.ts
│   ├── tsconfig.test.json
│   └── vitest.config.js
│
├── smage/                                     # [Binary Output / Python Bindings]
│   ├── smage.ts
│   ├── __init__.py
│   ├── config.ts
│   ├── node/
│   ├── .env
│   └── smage-linux
│
├── scripts/
│   └── treeGen/
│
├── dist/                                      # Bun-compiled JS
├── node_modules/
├── .venv/
│
├── Dockerfile
├── Dockerfile.build
├── compose.yml
├── compose.override.yml
├── Taskfile.yml
├── Taskfile.dev.yml
├── Taskfile.prod.yml
├── tsconfig.json
├── package.json
├── package-lock.json
├── README.md
├── SMAGE_DOCS.md
├── mcp.sh
├── project-tree.txt
└── .gitignore
```

## Current Stage

CCR Upgrade Stage 1 (MVP-critical)

## MVP Definition (testable baseline)

The MVP is not full CCR. The MVP is a testable baseline for token consumption. Includes:

### Core Engine

- anchors
- dedupe
- relevance_scoring
- priority_tiers
- window_shaping
- reconstruction
- payload_shaping
- reversible_logging

### Runtime

- proxy (/v1/chat/completions, /health)
- MCP_server
- CLI_commands
- provider_adapters
- binary builds (Linux/macOS/Windows)
- Docker runtime
- Compose multi‑service runtime

### Testing

- deterministic CCR modules
- provider selection
- provider fallback
- response blending
- memory routing
- multi‑agent routing

## Next Stage

Implement CCR Stage 1 baseline tests:

- before compression
- after compression
- compression ratio
- provider cost delta
- latency delta

## Tech Debt (links to md files)

- entity dictionary compression
- schema factoring
- AST compression
- provider-adaptive compression
- semantic anchors
- relevance-tier chunking

## Module Boundaries

### ha_core — The Library (Engine)

everything depends on this.

It contains:

- message model
- CCR pipeline
- cache alignment
- token crushing
- context manager
- token counting
- content classification
- compression rules
- cross‑agent memory
- output token reduction
- provider adapters
- reversible cache
- SMAGEAgent — single agent wrapper
- SMAGEMultiAgent — RR + fan‑out
- SMAGEOrchestrator — strategy engine
- ProviderSelector — cost/speed/depth/quality selection
- ProviderFallback — retry + fallback logic
- ResponseBlender — multi‑agent output merging
- MemoryRouter — anchor/memory‑influenced routing
- WrapperRegistry — unified wrapper lookup

### ha_proxy — Zero‑code‑change proxy

Drop‑in replacement for any app. A thin wrapper around `ha_core`.

Functions:

- accepts OpenAI / Anthropic / Google‑style requests
- runs `compress()`
- forwards to provider
- applies output reduction
- returns the response
- stores originals
- exposes HTML dashboards

### ha_mcp — MCP server

This lets Claude Desktop, Cursor, and other MCP clients use the compression layer natively. Exposes:

- `humanAuction_compress`
- `humanAuction_retrieve`
- `humanAuction_stats`

### ha_wrap — Agent wrappers

One‑command wrappers for:

- claude
- aider
- cursor
- copilot
- opencode

#### They do

- start the proxy
- inject env vars
- launch the agent

### ha_learn — Self‑improving layer

Auto‑tuning brain. Mines failed sessions → writes corrections to:

- `CLAUDE.md`
- `AGENTS.md`

Includes:

- failure miner
- memory scoring
- session weighting
- auto‑tuning

### Build Order

1. `ha_core`
2. message model
3. cache
4. CCR pipeline
    - anchors (next)
    - dedupe
    - relevance
    - priority
    - window
    - reconstruction
5. `compress()` Python + TS
6. provider adapters
7. reversible logging
8. `ha_proxy`
    - HTTP server
    - provider adapters
    - reversible logging
9. `ha_mcp`
    - compress
    - retrieve
    - stats
10. `ha_wrap`
11. `ha_learn`
12. `ha_cli`
13. docs
14. architecture
15. roadmap
16. usage

## Current Status

### 1. ha_core

- ✔ ProviderChainRouter stable
- ✔ Telemetry stable (Stage 2 complete)
- ⬆ CCR internals in progress (Stage 3 next)

### 2. Message Model

- ✔ Stable (SMAGEMessage, SMAGEOptions, roles, meta)

### 3. Cache

- ✔ store.ts
- ✔ log.ts
- ✔ reversible logging unified
- ⬆ multi‑backend pending

### 4. CCR Pipeline — Current Stage

- Implementing (in order):
- ⬆ anchors
- ⬆ dedupe
- ⬆ relevance scoring
- ⬆ priority tiers
- ⬆ window shaping
- ⬆ reconstruction
- ⬆ payload compression
- ⬆ memory injection
- ⬆ memory mining
- ⬆ output reduction
- ✔ reversible logging at each stage

### 5. compress() Python + TS

- ✔ Implemented (TS + Python entrypoints exist)

### 6. Provider Adapters

- ✔ OpenAI, Anthropic, Google, Local
- ✔ unified
- ✔ logging
- ✔ shape‑correct

### 7. Reversible Logging

- ✔ providers
- ✔ CCR
- ✔ MCP
- ✔ learning engine
- ✔ proxy

### 8. ha_proxy

- ✔ HTTP server
- ✔ provider routing
- ✔ HTML views
- ⬆ CCR integration pending

### 9. Provider adapters (proxy layer)

- ✔ wired

### 10. Reversible logging (proxy layer)

- ✔ wired

### 11. ha_mcp

- ✔ compress
- ✔ retrieve
- ✔ stats
- ✔ reversible logging
- ✔ agent loop
- ✔ heartbeat
- ✔ JSON‑RPC dispatch
- ✔ stable dist execution

### 12. ha_wrap (agent wrappers)

- ✔ SMAGEAgent
- ⬆ Next stage after CCR

### 13. ha_learn

- ✔ failure miner
- ⬆ CLAUDE.md / AGENTS.md writer
- ⬆ signal weighting
- ⬆ session scoring
- ⬆ auto‑tuning

### 14. ha_cli

- ✔ CLI exists
- ⬆ Expansion after wrappers + learning

### 15. docs

Pending:

- ⬆ Architecture diagrams
- ⬆ Roadmap
- ⬆ Usage examples
- ⬆ CCR deep dive
- ⬆ Proxy + MCP docs
- ⬆ Wrapper docs

## Running SMAGE

### CLI

```bash
smage proxy
smage ccr "hello world"
smage run claude "explain CCR"
smage agent
smage learn default
```

### Proxy

```bash
POST /v1/chat/completions
GET  /health
```

### MCP

Claude Desktop / Cursor connect via MCP server.
Docker

```bash
docker build -t smage .
docker run --rm smage proxy
```

### Compose

```bash
docker compose up
```

Services:

- proxy
- agent
- docs
- test

## Quick Commands

### Dev mode (tsx MCP)

```bash
ts dev
```

### Build dist

```bash
ts bd
```

### Run tests

```bash
ts tst
```

### Run learning engine tests

```bash
ts learn
```

### Run proxy

```bash
humanAuction proxy
```

### Run agent wrapper

```bash
humanAuction wrap aider
```

### Generate docs

```bash
humanAuction docs
```

## Useful One‑Liners

Run MCP directly:

```bash
tsx ha_mcp/server.ts
```

Run MCP from dist:

```bash
node dist/ha_mcp/server.js
```

Run provider test:

```bash
node dist/ha_proxy/test-provider.js
```

Run learn test:

```bash
node dist/ha_learn/test-learn.js
```

Rebuild clean:

```bash
rm -rf dist && ts bd
```

Run docker services:

```bash
docker compose up
docker compose run smage-proxy
docker compose run smage-agent
docker compose run smage-docs
```

## Test Suite

```bash
npm test
```

### Tests cover

- CCR modules
- provider selection
- provider fallback
- response blending
- memory routing
- multi‑agent routing
- proxy
- MCP
- learning engine
