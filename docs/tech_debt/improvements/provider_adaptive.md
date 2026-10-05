# Improvement Proposal: Provider-Adaptive Compression

Status: partial provider-dependent behavior exists, but it is not a measured or centrally configured provider profile system.

## Hypothesis

Provider-specific CCR profiles may improve the trade-off between prompt size and retained information. The earlier estimate of 10–30% incremental token reduction is unvalidated and should be treated as a hypothesis.

## Existing implementation

`priority.ts`, `window.ts`, and `payload.ts` contain provider/model metric adjustments. The benchmark's provider dimension passes provider names into local CCR options, but it makes no hosted API calls and does not measure provider quality, cost, or latency.

## Current gaps

- No single explicit profile table defines the behavior for each provider.
- Provider and intent options are not consistently forwarded through every pipeline stage. In particular, pipeline priority/window calls currently omit the options argument.
- There is no feedback loop from `ha_learn` that safely tunes CCR profiles.
- Current corpus results are local pipeline measurements, not evidence that a provider tolerates a compression strategy.

## Evaluation plan

First audit and document current provider-specific branches. Define a neutral profile and one narrow variation at a time. Evaluate stable CCR outputs, token counts, retained required facts, and local runtime. Any provider-quality or provider-cost claim requires separate integration tests against that provider, with the exact model and configuration recorded.
