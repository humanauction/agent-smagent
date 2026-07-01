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
│   ├── call/ # Provider adapters (OpenAI, Anthropic, Google)
│   ├── cache/ # Raw reversible storage (FS/SQLite/Redis)
│   ├── memory/ # Cross-agent memory layer
│   ├── stats/ # Token metrics, waste detection
│   ├── output/ # Output token reduction
│   ├── compress.py # Python entrypoint
│   ├── compress.ts # TypeScript entrypoint
│   ├── index.ts
│   └── **init**.py
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
├── ha_learn/ # Failure mining + CLAUDE.md / AGENTS.md updates
├── ha_cli/ # Unified CLI
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

This lets Claude Desktop, Cursor, and other MCP clients use your compression layer natively. Exposes:

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
