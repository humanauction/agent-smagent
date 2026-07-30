# Tech Debt: Provider-Adaptive Compression

## Idea

Different providers tolerate different compression strategies:

- Anthropic → aggressive summarisation
- OpenAI → aggressive dedupe
- Google → aggressive anchor factoring

Adapt CCR parameters per provider.

## Expected Crush

- 10–30% incremental over baseline CCR

## Difficulty

- Medium

## Risk

- Low, if per-provider configs are explicit

## Dependencies

- Provider metadata (`ha_core/providerMetadata.ts`, `ha_wrap/providerMetadata.ts`)
- CCR Stage 1 metrics (tokens before/after)
- Stats module in `ha_core/stats`

## Milestone Placement

- After CCR Stage 1
- After basic stats collection

## Current Blockers

- No per-provider CCR profiles yet
- No feedback loop from `ha_learn` into CCR
