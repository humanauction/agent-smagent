# Tech Debt: Schema Factoring

## Idea

Factor repeated structure into a schema block:

<schema name="default">
  field: value
  field: value
</schema>

Then reference it:

<use schema="default">

## Expected Crush

- 20–40% on structured payloads (JSON, config, forms)

## Difficulty

- Medium

## Risk

- Low, if schema definitions are versioned and logged

## Dependencies

- CCR Stage 1 (window + reconstruct)
- Stable payload model in `ha_core/transform/payload.ts`
- Token classifier in `ha_core/analyze/tokens.ts`

## Milestone Placement

- After CCR Stage 1
- After basic payload shaping

## Current Blockers

- No canonical schema representation yet
- No schema registry in `ha_core/cache` or `ha_core/memory`
