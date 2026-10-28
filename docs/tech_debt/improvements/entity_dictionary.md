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

The offline comparison report is [`here`](../../benchmarks/entity_dictionary_comparison.json). It contains all eight freeze corpus cases across four paths (control, opt-in, approved-freeze control, and freeze-with-option), plus 16 entity-heavy, project-heavy, ordinary-prose, and edge fixtures.

| Measure                                    |               Result |
| ------------------------------------------ | -------------------: |
| Freeze cases / paths                       |  8 / 4 (32 CCR runs) |
| Factored messages in freeze corpus         |                    0 |
| Required-phrase losses                     |                    0 |
| Freeze output parity failures              |                    0 |
| Exact restore failures                     |                    0 |
| Synthetic fixtures factored                |             13 of 16 |
| Synthetic fixtures left unchanged          |              3 of 16 |
| Project-oriented fixtures                  |                    7 |
| Required phrase losses across fixtures     |                    0 |
| Estimated savings across factored fixtures | 281 heuristic tokens |

The fixture set now covers repeated project identifiers; similar names and prefixes; phase/version labels; requirements, statuses, and decisions; quoted text; one-off names; literal-handle collisions; and mixed project/ordinary prose. Similar names remain separate entries and reconstruct exactly. Three cases fall back because the complete packet does not produce positive estimated savings. Some successful cases save only a few heuristic tokens, so small gains should be treated as inconclusive. The freeze corpus contains no eligible repeated multiword names; it confirms parity but does not establish in-corpus savings. Local runtime observations are included per case and are not an acceptance metric. No provider tokenizer or live model was used.

Decision: retain as opt-in for further evaluation. The implementation demonstrates reversible behavior and positive estimates on project-shaped synthetic inputs, but needs naturally occurring entity-heavy fixtures and provider-tokenizer measurements before any default or baseline promotion.

Rerun and write only this report with:

```bash
SMAGE_ENTITY_DICTIONARY_REPORT=docs/benchmarks/entity_dictionary_comparison.json \
  npx vitest --run tests/transform/entityDictionary.test.ts tests/transform/entityDictionaryComparison.test.ts
```

Without the environment variable, tests do not write a report. This comparison does not update the approved freeze benchmark.
