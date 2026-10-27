# Improvement Proposal: Relevance-Tier Chunking

Status: initial opt-in comparison recorded; policy remains opt-in and is not promoted as the new default.

## Hypothesis

An explicit, reversible policy for how much context to retain from each priority tier may reduce tokens on long histories while retaining required instructions, constraints, and recent intent.

No compression percentage is assumed. Measure the policy on cases where the
baseline actually drops or compresses relevant content; do not treat an
expected reduction as a success criterion by itself.

## Existing implementation

- Relevance scoring exists in `ha_core/transform/relevance.ts`.
- Priority values are assigned in `ha_core/transform/priority.ts`.
- `ha_core/transform/window.ts` groups anchor/high/medium/low messages and applies a token budget.
- Reconstruction reintroduces the anchor spine.

## Experiment contract

`SMAGEOptions.tierPolicy` accepts `"baseline"` or `"relevanceFirst"`.
Omitting the option, selecting `"baseline"`, or enabling `baselineFreeze`
retains the existing behavior. The opt-in `relevanceFirst` mode preserves
anchors and the existing deterministic high/medium/low ordering, but removes
the implicit 70% high-tier and 90% medium-tier phase cutoffs. It fills the
same effective token budget and still restores chronological order.

## Open questions

- Are the numeric tiers documented consistently? The code uses priorities 0–3, while older notes describe tiers 1–3.
- Which classes of messages are mandatory, and how are constraints tested?
- Does the baseline reveal avoidable token use or lost required facts on long-context cases?
- Does filling the budget across all sorted tiers improve retention or token
  use on labeled long-history cases without violating anchor and ordering
  invariants?

## Initial comparison result (2026-10-27)

Command:

```bash
SMAGE_RUN_RELEVANCE_TIER_EXPERIMENT=1 npx vitest --run tests/transform/relevanceTierComparison.test.ts
```

The comparison passed on two hand-labeled cutoff-pressure histories and one
control history. Across the two targeted cases, baseline retained 0/3 required
phrases; `relevanceFirst` retained 3/3. High-priority message coverage rose
from 2/5 to 5/5. Token use was unchanged in both cases (10 vs 10 and 14 vs
14). The control retained its required phrase under both policies and selected
the same messages (19 tokens each).

This is evidence that removing the implicit phase cutoffs can use the budget
for higher-priority facts in these constructed cases. It did not reduce token
use. The fixtures use preassigned priority/relevance and exact phrase checks;
they do not measure semantic quality or prove end-to-end gains on real
conversations. Keep `relevanceFirst` opt-in and broaden the labeled corpus
before changing the default.

Full deterministic output: `docs/benchmarks/relevance_tier_comparison.json`.

## Evaluation plan

Use the fixed freeze corpus as an unchanged control plus labeled long-history
fixtures with `tierPolicy: "relevanceFirst"`. Compare input/output tokens,
exact retained required phrases, dropped messages by role/priority, and
reconstruction results. The initial comparison covers long-history cutoff
pressure and one no-pressure control. Add more labeled histories, including
anchor-bearing and varied-role cases. Keep the change opt-in until broader
correctness and improvement are demonstrated.
