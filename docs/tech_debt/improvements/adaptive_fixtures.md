# Adaptive CCR Fixture Evaluation

## Purpose

The fixed freeze corpus intentionally runs with `baselineFreeze: true`, so it
cannot demonstrate provider- or intent-specific shaping. These fixtures are a
separate deterministic evaluation of the existing adaptive policy.

The fixtures provide the metadata the stage rules consume:

- provider/depth metadata is attached to messages;
- intent is attached to the extracted anchor;
- frozen and adaptive runs use the same messages and token budget.

## Run

Run the focused evaluation:

```bash
npx vitest --run tests/transform/adaptiveCcr.test.ts
```

Write an optional reviewable report:

```bash
SMAGE_ADAPTIVE_OUTPUT=tests/_adaptive/adaptive_ccr_report.json \
  npx vitest --run tests/transform/adaptiveCcr.test.ts
```

## Current coverage

- Debug intent promotes diagnostic tool output.
- Testing intent promotes test-related context.
- Explain intent promotes assistant explanations.
- Deep provider metadata increases the adaptive window budget.

This is not a provider-quality benchmark and does not change the approved
freeze reference. It measures policy movement only: tier changes, window
counts, and token counts.
