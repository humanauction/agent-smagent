# Tech Debt: AST Compression for Code

## Idea

Convert code → AST → compress → send to LLM.

LLM sees structured AST instead of raw source.

## Expected Crush

- 70–90% on large code snippets

## Difficulty

- High

## Risk

- Medium (AST fidelity, language coverage, tooling complexity)

## Dependencies

- Language‑specific parsers (TS/JS first)
- Stable CCR pipeline
- Robust reconstruct step (AST → code)

## Milestone Placement

- After MVP + CCR Stage 1
- After basic UI (to debug AST behaviour)

## Current Blockers

- No AST module in `ha_core/transform`
- No language selection / fallback strategy
