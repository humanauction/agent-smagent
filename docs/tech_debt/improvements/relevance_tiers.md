# Improvement Proposal: Relevance-Tier Chunking

Status: experiment implemented behind an opt-in policy; evaluation pending.

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

## Evaluation plan

Use the fixed freeze corpus as an unchanged control plus labeled long-history
fixtures with `tierPolicy: "relevanceFirst"`. Compare input/output tokens,
exact retained required phrases, dropped messages by role/priority, and
reconstruction results. Add targeted tests for default parity, anchor
preservation, token bounds, deterministic output, and chronological ordering.
Keep the change opt-in until correctness and improvement are demonstrated.
