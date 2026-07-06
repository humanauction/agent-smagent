# agent‑smagent

## Intro

I built this because I got murdered on tokens asking stupid questions. Being naturally paranoid and now fully suspicious of using anything I don’t understand after recent waves of supply‑chain breaches across NPM, Linux, React, GitHub, and various “open source but actually not” ecosystems.
I found solutions like Headroom, started reading the code, didnt know why a bunch of it was there. not because it was nefarious I just didnt understand it. if i don’t understand something, I build it. So I decided to just try to write my own compression and context‑management layer. At least then I know what it’s doing, and what it’s not doing. For now. Probably.

## Overview

Full CCR (Cache–Crush–Reconstruct) pipeline with:

- deterministic compression
- reversible caching
- priority‑tier context windows
- anchors
- dedupe
- relevance scoring
- cross‑agent memory
- output token reduction
- provider adapters
- zero‑code‑change proxy
- MCP server
- agent wrappers
- failure mining
- Everything is explicit. Nothing is hidden.

## Project Structure

```text
agent-smagent/
│
├── ha_core/ # The beating heart: CCR pipeline + message model
│   ├── analyze/ # Parsers, token counters, classifiers
│   ├── transform/ # CCR: cache alignment, token crushing, context manager
│   │   ├── compressors/
│   │   │   └── basic.ts
│   │   ├── anchor.ts
│   │   ├── ccr.ts
│   │   ├── context.ts
│   │   ├── dedupe.ts
│   │   ├── payload.ts
│   │   ├── priority.ts
│   │   └── relevance.ts
│   │
│   ├── call/ # Provider adapters (OpenAI, Anthropic, Google)
│   │   └── providers/ # OpenAI, Anthropic, Google, Local
│   │       ├── anthropic.ts
│   │       ├── openai.ts
│   │       ├── google.ts
│   │       ├── local.ts
│   │       ├── index.ts
│   │       ├── interface.ts
│   │       ├── roles.ts
│   │       └── utils.ts
│   ├── cache/ # Raw reversible storage (FS/SQLite/Redis)
│   │   ├── store.ts
│   │   └── log.ts
│   ├── memory/ # Cross-agent memory layer
│   ├── stats/ # Token metrics, waste detection
│   ├── output/ # Output token reduction
│   ├── compress.py # Python entrypoint
│   ├── compress.ts # TypeScript entrypoint
│   ├── index.ts
│   └── __init__.py
│
├── ha_proxy/ # Zero‑code‑change HTTP proxy
│   ├── config.ts # Proxy config (port, provider, etc.)
│   ├──middleware.ts
│   ├──router.ts
│   ├──server.ts # Proxy entrypoint
│   ├── test-provider.ts # Test provider adapter
│   └── test-proxy.ts # Test proxy
│
├── ha_mcp/ # MCP server exposing: compress, retrieve, stats
│   │
│   ├── server.ts      # MCP server entrypoint
│   ├── tools/
│   │   ├── compress.ts
│   │   ├── retrieve.ts
│   │   └── stats.ts
│   └── protocol/     # type defs / helpers
│
├── ha_wrap/ # Agent wrappers (claude, aider, cursor, copilot, etc.)
│   │
│   ├── agent.ts          # main wrapper class
│   ├── mcp-client.ts     # JSON-RPC client for MCP server
│   └── types.ts          # shared types
│
├── ha_learn/ # Failure mining + CLAUDE.md / AGENTS.md updates
│   │
│   ├── engine.ts # Main learning cycle
│   ├── miner.ts  # Collect samples, mine signals
│   ├── types.ts  # LearningSample, LearningSignal, LearningUpdate
│   └── test-learn.ts # Test script for learning cycle
│
├── ha_cli/ # Unified CLI
│   │
│   ├── commands/
│   │   ├── learn.ts
│   │   ├── proxy.ts
│   │   ├── agent.ts
│   │   ├── docs.ts
│   │   └── docs-html.ts
│   └── main.ts # CLI entrypoint
│
├── docs/ # Architecture, CCR, Memory, Proxy, MCP, Learn, Roadmap
├── tests/ # Core + proxy + MCP + wrappers + learning
├── examples/ # Python, TypeScript, Proxy usage
└── README.md
```

## Module Boundaries

### ha_core — The Library

This is the engine, everything else in the repo depends on this. It contains:

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

### ha_proxy — Zero‑code‑change proxy

This is the drop‑in replacement for any app. A thin wrapper around `ha_core`,
it:

- accepts OpenAI / Anthropic / Google‑style requests
- runs `compress()`
- forwards to provider
- applies output reduction
- returns the response
- stores originals

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

This is the auto‑tuning brain. Mines failed sessions → writes corrections to:

- `CLAUDE.md`
- `AGENTS.md`

### ha_cli — Unified CLI

Everything exposed through one command.

```Code
humanAuction proxy
humanAuction wrap aider
humanAuction learn
humanAuction stats
```

### Build Order

- `ha_core`
- message model
- cache
- CCR pipeline
- `compress()` Python + TS
- provider adapters
- reversible logging
- `ha_proxy`
- HTTP server
- provider adapters
- reversible logging
- `ha_mcp`
- compress
- retrieve
- stats
- ha_wrap
- agent wrappers
- ha_learn
- failure miner
- `CLAUDE.md` / `AGENTS.md` writer
- ha_cli
- unify everything
- docs
- architecture
- roadmap
- usage

## Current Status

### 1. ha_core

- ✔ Complete enough to support CCR, providers, memory, output, cache

### 2. Message model

- ✔ Stable (SMAGEMessage, SMAGEOptions, roles, meta)

### 3. Cache

- ✔ cache/store.ts
- ✔ cache/log.ts
- ✔ Reversible logging API unified

### 4. CCR pipeline — Current Stage

- Implementing:
- anchors
- dedupe
- relevance
- priority
- window
- reconstruction
- payload compression
- output reduction
- memory mining
- memory injection
- reversible logging at each stage

### 5. compress() Python + TS

- ✔ Already implemented (TS + Python entrypoints exist)

### 6. Provider adapters

- ✔ OpenAI, Anthropic, Google, Local — unified and logging correctly

### 7. Reversible logging

- ✔ Fully integrated across:
- providers
- CCR
- MCP
- learning engine
- proxy

### 8. ha_proxy

- ✔ HTTP server exists
- ✔ Provider routing exists
- ⬆ Will benefit from CCR improvements, but not blocked

### 9. Provider adapters (proxy layer)

- ✔ Already wired

### 10. Reversible logging (proxy layer)

- ✔ Already wired

### 11. ha_mcp

- ✔ compress
- ✔ retrieve
- ✔ stats
- ✔ reversible logging
- ✔ agent loop
- ✔ heartbeat
- ✔ JSON‑RPC dispatch

### 12. ha_wrap (agent wrappers)

- ⬆ Next stage after CCR

### 13. ha_learn

- ✔ failure miner
- ⬆ CLAUDE.md / AGENTS.md writer pending
- ⬆ signal weighting pending
- ⬆ session scoring pending

### 14. ha_cli

- ✔ CLI exists
- ⬆ Will be expanded after wrappers + learning

### 15. docs

- Pending:
- Architecture diagrams
- Roadmap
- Usage examples
- CCR deep dive
- Proxy + MCP docs
- Wrapper docs
