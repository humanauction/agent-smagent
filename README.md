# agent-smagent

## intro

This is all because i got murdered on tokens asking stupid questions and being naturally paranoid. also recently distrustful of using basically anything since the NPM, Linux, react, GitHub, open source breach, etc...
i found solutions, like headroom, started reading code and then got scared. if i dont understand something i try to build it. so, when i'd stopped being scared, i figured maybe just write it myself and at least then I'll know it isn't also doing "something else" at "some tbc dateTime" by "yes" (probably, shits been WILD recently...).

## Project Structure

```text
agent-smagent/
│
├── ha_core/                 # The beating heart: CCR pipeline + message model
│   ├── analyze/             # Parsers, token counters, classifiers
│   │   ├── classifier.ts
│   │   └── tokens.ts
│   ├── transform/           # CCR: cache alignment, token crushing, context manager
│   │   ├── ccr.ts
│   │   ├── payload.ts
│   │   └── context.ts
│   ├── call/                # Provider adapters (OpenAI, Anthropic, Google)
│   │   └── providers.ts
│   ├── cache/               # Raw reversible storage (FS/SQLite/Redis)
│   │   └── store.ts
│   ├── memory/              # Cross-agent memory layer
│   │   └── memory.ts
│   ├── stats/               # Token metrics, waste detection
│   │   └── stats.ts
│   ├── output/              # Output token reduction
│   │   └── reducer.ts
│   ├── compress.py          # Python entrypoint
│   ├── compress.ts          # TypeScript entrypoint
│   ├── index.ts
│   └── __init__.py
│
├── ha_proxy/                # Zero‑code‑change HTTP proxy
│   ├── server.py
│   ├── router.py
│   ├── middleware.py
│   └── config.py
│
├── ha_mcp/                  # MCP server exposing: compress, retrieve, stats
│   ├── server.py
│   ├── tools/
│   │   ├── compress.py
│   │   ├── retrieve.py
│   │   └── stats.py
│   └── protocol/
│
├── ha_wrap/                 # Agent wrappers (claude, aider, cursor, copilot, etc.)
│   ├── wrap.py
│   ├── agents/
│   │   ├── claude.py
│   │   ├── aider.py
│   │   ├── cursor.py
│   │   └── copilot.py
│   └── env/
│
├── ha_learn/                # Failure mining + CLAUDE.md / AGENTS.md updates
│   ├── miner.py
│   ├── summarizer.py
│   ├── writer.py
│   └── patterns/
│
├── ha_cli/                  # Unified CLI: `humanAuction <command>`
│   ├── main.py
│   ├── commands/
│   │   ├── proxy.py
│   │   ├── wrap.py
│   │   ├── learn.py
│   │   └── stats.py
│   └── utils.py
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CCR.md
│   ├── MEMORY.md
│   ├── PROXY.md
│   ├── MCP.md
│   ├── LEARN.md
│   └── ROADMAP.md
│
├── tests/
│   ├── core/
│   ├── proxy/
│   ├── mcp/
│   ├── wrap/
│   └── learn/
│
├── examples/
│   ├── python/
│   ├── typescript/
│   └── proxy/
│
├── pyproject.toml
├── package.json
└── README.md
```

## Module Boundaries

- ha_core/ — The Library:
  Message model
  CCR pipeline
  cache alignment
  token crushing
  context manager
  Token counting
  Content classification
  Compression rules
  Cross‑agent memory
  Output token reduction
  Provider adapters
  Reversible cache
  This is the engine.

- ha_proxy/ — Zero‑code‑change proxy
  Thin wrapper around ha_core.
  Accepts OpenAI/Anthropic/Google‑style requests
  Runs compress()
  Forwards to provider
  Applies output reduction
  Returns response
  Stores originals
  This is the drop‑in replacement for any app.

- ha_mcp/ — MCP server
  Exposes:
  humanAuction_compress
  humanAuction_retrieve
  humanAuction_stats
  This lets Claude Desktop, Cursor, etc. use your compression layer natively.

- ha_wrap/ — Agent wrappers
  One‑command wrappers for:
  claude
  aider
  cursor
  copilot
  opencode
  They:
  Start proxy
  Inject env vars
  Launch agent

- ha_learn/ — Self‑improving layer
  Mines failed sessions → writes corrections to:
  CLAUDE.md
  AGENTS.md
  This is our auto‑tuning brain.

- ha_cli/ — Unified CLI
  Everything exposed as:

```Code
    humanAuction proxy
    humanAuction wrap aider
    humanAuction learn
    humanAuction stats
```

## Build Order

- ha_core/
  message model
  cache
  CCR pipeline
  compress() Python + TS

- ha_proxy/
  HTTP server
  provider adapters
  reversible logging

- ha_mcp/
  compress
  retrieve
  stats

- ha_wrap/
  agent wrappers

- ha_learn/
  failure miner
  CLAUDE.md / AGENTS.md writer

- ha_cli/
  unify everything
  docs/
  architecture
  roadmap
  usage
