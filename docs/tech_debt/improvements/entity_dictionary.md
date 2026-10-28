# Entity Dictionary Compression

Status: implemented as an opt-in experiment. The initial policy is deliberately narrow and heuristic; it is not a general named-entity recognizer.

## Current policy

- Runs only with `entityDictionary: true`, an active session ID, and `baselineFreeze !== true`.
- Finds repeated exact title-cased spans of two to five words. It does not resolve aliases, infer identity, or merge different spellings.
- Replaces candidate spans with collision-checked handles only when the complete inline packet has fewer estimated tokens than the source.
- Carries the mapping inline with the rewritten text. No durable entity registry is created, so there is no map persistence or cleanup lifecycle. A SHA-256-derived packet reference includes the session ID, and reconstruction requires that same session.
- A rejected or unsupported input follows the ordinary payload path. The option is off by default.

The inline map makes the meaning available to the model and to local reconstruction. It costs more than a session-only handle would, but avoids relying on hidden state being available to the model. This experiment preserves the exact source text on reconstruction.

## Expanded evaluation result

The offline comparison report is [here](../../benchmarks/entity_dictionary_comparison.json). It contains all eight freeze corpus cases across four paths (control, opt-in, approved-freeze control, and freeze-with-option) and seven entity-heavy, ordinary-prose, and edge fixtures.

| Measure | Result |
| --- | ---: |
| Freeze cases / paths | 8 / 4 (32 CCR runs) |
| Factored messages in freeze corpus | 0 |
| Required-phrase losses | 0 |
| Freeze output parity failures | 0 |
| Exact restore failures | 0 |
| Synthetic fixtures factored | 5 of 7 |
| Synthetic fixtures left unchanged | 2 of 7 |
| Estimated savings across factored fixtures | 88 heuristic tokens |

Two of the five positive cases save only two heuristic tokens each, so those small gains should be treated as inconclusive. The freeze corpus contains no eligible repeated multiword names; it confirms parity but does not establish in-corpus savings. Local runtime observations are included per case and are not an acceptance metric. No provider tokenizer or live model was used.

Decision: retain as opt-in for further evaluation. The implementation demonstrates reversible behavior and positive estimates on some synthetic inputs, but needs naturally occurring entity-heavy fixtures and provider-tokenizer measurements before any default or baseline promotion.

Rerun and write only this report with:

```bash
SMAGE_ENTITY_DICTIONARY_REPORT=docs/benchmarks/entity_dictionary_comparison.json \
  npx vitest --run tests/transform/entityDictionary.test.ts tests/transform/entityDictionaryComparison.test.ts
```

Without the environment variable, tests do not write a report. This comparison does not update the approved freeze benchmark.
