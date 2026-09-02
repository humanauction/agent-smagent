# Tech Debt: Relevance-Tier Chunking

## Idea

Split messages into:

- Tier 1: high relevance
- Tier 2: medium relevance
- Tier 3: low relevance

Send only Tier 1 unless deeper context is needed.

## Expected Crush

- 40–70% on long histories

## Difficulty

- Medium

## Risk

- Low, if tiering is reversible and logged

## Dependencies

- `relevance.ts` (CCR Stage 1)
- `priority.ts` (tier assignment)
- `window.ts` (selection logic)
- `reconstruct.ts` (tier rehydration)

## Milestone Placement

- Immediately after CCR Stage 1
- Before advanced crush‑tech

## Current Blockers

- Relevance scoring not yet implemented
- No tier model in `ha_core/transform/priority.ts`
