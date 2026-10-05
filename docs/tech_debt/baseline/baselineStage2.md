# CCR Stage 2 and later research

This file is a roadmap, not a statement that these capabilities are complete. Several building blocks already exist in the repository, but their presence does not establish production readiness or measured improvement.

## Existing building blocks

- CCR anchors, relevance scoring, priority assignment, window shaping, reconstruction, payload compression, and output reduction are wired through `ha_core/transform/ccr/pipeline.ts`.
- The pipeline includes structural intent/topic hints and a deterministic local embedding stub; these are not equivalent to a validated semantic model.
- `ha_core/memory/memory.ts` and `ha_learn/engine.ts` provide in-memory anchor and learning prototypes. The learning engine does not yet change CCR strategy based on measured outcomes.
- Provider and intent adjustments exist in CCR modules, but there is no benchmark-backed provider profile policy.

## Candidate Stage 2 work

1. Measure current CCR outcomes on the versioned freeze corpus.
2. Audit reconstruction and phrase-retention failures before changing compression rules.
3. Define stable, reversible memory and anchor representations, with explicit persistence and expiry requirements.
4. Add adaptive or semantic behavior only behind an explicit option and compare it with the approved baseline.
5. Measure token reduction, retained required facts, and latency separately. Do not use the proposal percentages in `docs/tech_debt/improvements/` as achieved results.

Potential research areas include learned anchors, persistent anchor memory, anchor fusion with intent, topic continuity, structured compression, context-window heuristics, adaptive token budgets, and per-agent CCR. The baseline results should determine their order.

## Entry criteria for an improvement iteration

- The deterministic baseline comparison is clean.
- A corpus case exposes a measurable opportunity or a documented gap exists.
- The proposal defines expected gains, correctness checks, and failure thresholds before implementation.
- The candidate can be turned off or reversed without changing unrelated stages.
