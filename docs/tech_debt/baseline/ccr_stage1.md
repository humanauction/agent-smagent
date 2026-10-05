# CCR Stage 1: implementation and verification status

Stage 1's main pipeline is implemented in `ha_core/transform/ccr/pipeline.ts`. This document records the current module roles and the remaining evidence needed before treating the behavior as a stable product contract.

## Pipeline stages

1. **Anchors** — `anchor.ts` retains the last system, user, assistant, and tool messages and derives a short summary hint.
2. **Dedupe** — `dedupe.ts` applies role-aware duplicate handling while preserving message order.
3. **Relevance** — `relevance.ts` combines structural, recency, keyword, continuity, and local semantic-stub signals.
4. **Priority** — `priority.ts` assigns priorities and can apply intent/provider adjustments when given the corresponding options.
5. **Windowing** — `window.ts` selects messages under a token budget using priority and relevance.
6. **Reconstruction** — `reconstruct.ts` merges the window with the anchor spine and removes duplicate role/content pairs.
7. **Semantic fusion** — `anchorSemanticFusion.ts` groups identical normalized anchor content. This is structural grouping, not semantic clustering.
8. **Payload compression** — `payload.ts` removes duplicates and low-priority content and applies deterministic truncation rules.
9. **Output reduction** — `ha_core/output/reducer.ts` reduces the selected final message.

The pipeline also records stage telemetry and returns intermediate outputs, token counts, and message counts.

## Existing test coverage

- Unit coverage: `ha_core/transform/anchor.test.ts`, `ha_core/transform/relevance.test.ts`, and the transform tests under `tests/`.
- Pipeline regression and repeatability: `tests/transform/ccrPipeline.freeze.test.ts`.
- Additional freeze coverage: relevance and semantic-anchor-fusion tests.
- Benchmark comparison: 72 fixed offline cases, three provider-option values, and three intents; see `baselineFreezeTestPlanR1.md`.

## Verification gaps and cautions

- The benchmark's required-phrase check examines reconstructed text only and is not a semantic-equivalence evaluation.
- The benchmark varies a local CCR provider option; it does not make network calls or measure provider quality/cost.
- The pipeline currently calls `assignPriority` and `applyContextWindow` without forwarding `baselineFreeze` options. Do not document freeze mode as disabling every provider- or intent-specific adjustment until this wiring is corrected and tested.
- `scoreRelevance` can mutate message metadata, so callers should pass CCR-local message objects rather than shared input objects.
- The semantic embedding implementation uses deterministic local embeddings and should not be described as production semantic understanding.

Stage 1 should be called complete only after the baseline comparison is reviewed, key correctness properties are tested on the fixed corpus, and the freeze-option behavior is explicitly verified. This is separate from claiming that every future improvement proposal is implemented.
