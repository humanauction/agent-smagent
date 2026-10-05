# Improvement Proposal: Relevance-Tier Chunking

Status: partially implemented. `relevance.ts`, `priority.ts`, and `window.ts` already compute relevance/priority and select a token-bounded window. The remaining proposal is to define and evaluate a more explicit tier policy; this is not a greenfield implementation.

## Hypothesis

An explicit, reversible policy for how much context to retain from each priority tier may reduce tokens on long histories while retaining required instructions, constraints, and recent intent.

The earlier estimate of 40–70% token reduction is an unvalidated hypothesis. Measure it on cases where the baseline actually drops or compresses relevant content; do not treat it as an expected result.

## Existing implementation

- Relevance scoring exists in `ha_core/transform/relevance.ts`.
- Priority values are assigned in `ha_core/transform/priority.ts`.
- `ha_core/transform/window.ts` groups anchor/high/medium/low messages and applies a token budget.
- Reconstruction reintroduces the anchor spine.

## Open questions

- Are the numeric tiers documented consistently? The code uses priorities 0–3, while older notes describe tiers 1–3.
- Which classes of messages are mandatory, and how are constraints tested?
- Does the baseline reveal avoidable token use or lost required facts on long-context cases?
- How should freeze-mode options reach priority assignment and window shaping?

## Evaluation plan

Use the fixed freeze corpus plus labeled long-history cases. Compare input/output tokens, exact retained required phrases, dropped messages by role/priority, and reconstruction results. Add targeted tests before changing thresholds. Keep the change behind an option until correctness and improvement are demonstrated.
