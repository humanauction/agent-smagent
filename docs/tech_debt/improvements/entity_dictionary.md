# Improvement Proposal: Entity Dictionary Compression

Status: proposed. The current transform pipeline has no entity extraction, dictionary lifecycle, or reference encoder.

## Hypothesis

Repeated named entities in suitable reports or long conversations may be replaced by short handles plus a reversible mapping. The earlier estimate of 30–60% reduction is an unvalidated hypothesis and is likely workload-dependent.

## Dependencies and design questions

- Define entity detection scope and a deterministic mapping format.
- Prevent handle collisions with literal user text and with other references.
- Scope maps to a request/session; do not leak mappings between users or agents.
- Specify reconstruction, logging, expiry, and deletion behavior.
- Decide how to handle ambiguous names, aliases, and low-frequency entities.

## Evaluation plan

Use entity-heavy and ordinary prose fixtures. Require exact round-trip reconstruction, verify no cross-session mapping reuse, and measure net token savings after including the dictionary itself. Reject the strategy for cases where the dictionary costs more than it saves.
