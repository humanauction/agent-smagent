# Tech Debt: Entity Dictionary Compression

## Idea

Replace repeated entities with symbolic handles:

@E1 = "United Nations"  
@E2 = "Water Quality Index"

Then compress text:

@E1 reported @E2 anomalies in region 4.

## Expected Crush

- 30–60% on entity‑heavy domains
- Best for reports, logs, long conversations

## Difficulty

- Medium

## Risk

- Low, if mapping is reversible and logged

## Dependencies

- Stable message model (SMAGEMessage)
- CCR Stage 1 (relevance, priority, window, reconstruct)
- Memory store for entity dictionary

## Milestone Placement

- After MVP + CCR Stage 1
- Before UI visualisation (so UI can show entity maps)

## Current Blockers

- No stable entity extraction pipeline yet
- No agreed dictionary format in `ha_core/memory`
