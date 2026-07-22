# agent‑smagent

## Intro

I built this because I got murdered on tokens asking stupid questions. Being naturally paranoid and now fully suspicious of using anything I don’t understand after recent waves of supply‑chain breaches across NPM, Linux, React, GitHub, and various “open source but actually not” ecosystems.
I found solutions like Headroom, started reading the code, didnt know why a bunch of it was there. not because it was nefarious I just didnt understand it. if i don’t understand something, I build it. So I decided to just try to write my own compression and context‑management layer. At least then I know what it’s doing, and what it’s not doing. For now. Probably.

---

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
- provider selection
- provider fallback
- response blending
- memory‑influenced routing

Everything is explicit. Nothing is hidden.

---

## What’s Working Right Now

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

---

## What’s Being Built Now (current milestone)

CCR pipeline internals:

- anchors
- dedupe
- relevance scoring
- priority tiers
- window shaping
- reconstruction
- payload compression
- memory injection
- memory mining
- output reduction

---

## Project Structure (updated)

```text
agent-smagent/
│
├── ha_core/
│   ├── analyze/
│   ├── transform/
│   │   ├── compressors/
│   │   ├── anchor.ts
│   │   ├── ccr.ts
│   │   ├── context.ts
│   │   ├── dedupe.ts
│   │   ├── payload.ts
│   │   ├── priority.ts
│   │   ├── relevance.ts
│   │   └── anchor.test.ts
│   ├── call/
│   │   └── providers/
│   ├── cache/
│   ├── memory/
│   ├── stats/
│   ├── output/
│   ├── compress.py
│   ├── compress.ts
│   └── index.ts
│
├── ha_proxy/
│   ├── utils/
│   ├── html/
│   ├── config.ts
│   ├── middleware.ts
│   ├── router.ts
│   ├── server.ts
│   ├── test-provider.ts
│   └── test-proxy.ts
│
├── ha_mcp/
│   ├── server.ts
│   ├── tools/
│   └── protocol/
│
├── ha_wrap/
│   ├── claude/
│   ├── aider/
│   ├── cursor/
│   ├── copilot/
│   ├── opencode/
│   ├── shared/
│   ├── agent.ts
│   ├── multi_agent.ts
│   ├── orchestrator.ts
│   ├── providerSelection.ts
│   ├── providerFallback.ts
│   ├── responseBlender.ts
│   ├── memoryRouting.ts
│   ├── wrapperRegistry.ts
│   ├── mcp-client.ts
│   └── types.ts
│
├── ha_learn/
│   ├── engine.ts
│   ├── miner.ts
│   ├── types.ts
│   └── test-learn.ts
│
├── ha_cli/
│   ├── commands/
│   └── main.ts
│
├── docs/
├── tests/
├── examples/
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
- SMAGEAgent — single agent wrapper
- SMAGEMultiAgent — RR + fan‑out
- SMAGEOrchestrator — strategy engine
- ProviderSelector — cost/speed/depth/quality selection
- ProviderFallback — retry + fallback logic
- ResponseBlender — multi‑agent output merging
- MemoryRouter — anchor/memory‑influenced routing
- WrapperRegistry — unified wrapper lookup

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

```bash
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
  anchors (next)
  dedupe
  relevance
  priority
  window
  reconstruction
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
- `ha_wrap`
- agent wrappers
- `ha_learn`
- failure miner
- `CLAUDE.md` / `AGENTS.md` writer
- `ha_cli`
- unify everything
- docs
- architecture
- roadmap
- usage

## Current Status

### 1. ha_core

- ✔ functional
- ⬆ CCR internals in progress

### 2. Message model

- ✔ Stable (SMAGEMessage, SMAGEOptions, roles, meta)

### 3. Cache

- ✔ cache/store.ts
- ✔ cache/log.ts
- ✔ Reversible logging API unified
- ⬆ multi‑backend pending

### 4. CCR pipeline — Current Stage

- Implementing:
- ⬆ anchors
- ⬆ dedupe
- ⬆ relevance
- ⬆ priority
- ⬆ window
- ⬆ reconstruction
- ⬆ payload compression
- ⬆ memory injection
- ⬆ memory mining
- ⬆ output reduction
- ✔ reversible logging at each stage

### 5. compress() Python + TS

- ✔ Implemented (TS + Python entrypoints exist)

### 6. Provider adapters

- ✔ OpenAI, Anthropic, Google, Local
- ✔ unified
- ✔ logging
- ✔ shape‑correct

### 7. Reversible logging

- ✔ Fully integrated
- ✔ providers
- ✔ CCR
- ✔ MCP
- ✔ learning engine
- ✔ proxy

### 8. ha_proxy

- ✔ HTTP server exists
- ✔ Provider routing exists
- ✔ HTML views
- ⬆ CCR improvements pending

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
- ⬆ CLAUDE.md / AGENTS.md writer pending
- ⬆ signal weighting pending
- ⬆ session scoring pending
- ⬆ auto‑tuning pending

### 14. ha_cli

- ✔ CLI exists
- ⬆ Expansion after wrappers + learning

### 15. docs

- Pending:
- ⬆ Architecture diagrams
- ⬆ Roadmap
- ⬆ Usage examples
- ⬆ CCR deep dive
- ⬆ Proxy + MCP docs
- ⬆ Wrapper docs

## Quick Commands

Dev mode (tsx MCP)

```bash
ts dev
```

Build dist

```bash
ts bd
```

Run tests

```bash
ts tst
```

Run learning engine tests

```bash
ts learn
```

Run proxy

```bash
humanAuction proxy
```

Run agent wrapper

```bash
humanAuction wrap aider
```

Generate docs

```bash
humanAuction docs
```

### Useful One‑Liners

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
