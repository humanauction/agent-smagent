# Entity Dictionary Compression

Status: implemented as an opt-in experiment. The initial policy is deliberately narrow and heuristic; it is not a general named-entity recognizer.

## Current policy

- Runs only with `entityDictionary: true`, an active session ID, and `baselineFreeze !== true`.
- Finds repeated exact title-cased spans of two to five words. It does not resolve aliases, infer identity, or merge different spellings.
- Replaces candidate spans with collision-checked handles only when the complete inline packet has fewer estimated tokens than the source.
- Carries the mapping inline with the rewritten text. No durable entity registry is created, so there is no map persistence or cleanup lifecycle. A SHA-256-derived packet reference includes the session ID, and reconstruction requires that same session.
- A rejected or unsupported input follows the ordinary payload path. The option is off by default.

The inline map makes the meaning available to the model and to local reconstruction. It costs more than a session-only handle would, but avoids relying on hidden state being available to the model. This experiment preserves the exact source text on reconstruction.

## Compact v2 packet contract — evaluation only

The compact candidate is a versioned JSON object with exactly these fields:

```json
{"$e":2,"d":[["§0§","Exact original name"]],"t":"Message text using §0§"}
```

- `$e` is the format version and must equal `2`.
- `d` is a non-empty array of `[handle, exact original string]` pairs. Handles match `§<non-negative integer>§`; handles and original strings are unique. Each handle must occur in `t`.
- `t` is the source content with each repeated exact string replaced by its handle. Handle allocation skips any handle already present in the source.
- The session-bound SHA-256 reference is carried in local message metadata, not in the model-visible packet. Reconstruction recomputes and checks it against the session and dictionary entries.
- Unknown versions, malformed shapes, duplicate handles or values, missing/stale references, and cross-session restores fail closed. Reconstruction leaves the encoded content unchanged when restoration fails.
- The compact codec is evaluation-only. The existing CCR path continues to use the v1 encoding and its existing default and `baselineFreeze` behavior.

The model interpretation rule is exported as `COMPACT_ENTITY_DICTIONARY_INSTRUCTIONS` from `ha_core/transform/entityDictionary.ts`. It defines `$e`, `d`, and `t`; instructs the model to expand exact handles without alias inference; and keeps decoded content at its original message role. Dictionary values do not acquire higher instruction priority. This instruction is not currently injected by CCR; any response evaluation or future integration must include it in the measured prompt overhead.

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

Decision: retain as opt-in for further evaluation. The implementation demonstrates reversible behavior and positive local estimates on project-shaped synthetic inputs. Before any default or baseline promotion, it needs naturally occurring entity-heavy fixtures and provider-tokenizer measurements across representative inputs; the single compact-v2 smoke is preliminary evidence only.

## Provider-tokenizer packet diagnostic

On 2026-10-30, a gated count-only smoke compared the original fixture, current transformed text without its envelope, the current full packet, and the same two variants using an experimental compact encoding. The complete request inputs were measured with the OpenAI input-token count endpoint; no responses were generated. See [`openai_provider_validation.json`](../../benchmarks/openai_provider_validation.json).

| Variant | Provider input tokens | Change from original |
| --- | ---: | ---: |
| Original text | 305 | — |
| Current transformed text only | 273 | −32 |
| Current full packet | 322 | +17 |
| Compact transformed text only | 225 | −80 |
| Compact full packet | 251 | −54 |

The current envelope added 49 tokens over its transformed text; the compact envelope added 26. The compact candidate uses collision-checked `§n§` handles and shorter JSON keys, and omits the inline reference already carried in message metadata. Its reference remains session-bound and verified during local restoration. A focused test confirms exact restoration and avoids a literal `§0§` collision. Five count requests were made; the conservative cost estimate was $0.000802.

This is one synthetic fixture and one tokenizer measurement. Stages 1–3 are now complete: the packet contract is documented, its decoding instruction is defined, and focused codec checks cover exact restoration, distinct names, literal collisions, malformed data, stale references, and cross-session rejection. Count-only validation does not test whether a model interprets or uses the compact packet correctly. Keep it out of the CCR path. Next, use a local response evaluation with the decoding instruction included, add naturally occurring non-sensitive project examples, and repeat token counts with the instruction overhead. Run the full comparison only if those checks support it.

Rerun and write only this report with:

```bash
SMAGE_ENTITY_DICTIONARY_REPORT=docs/benchmarks/entity_dictionary_comparison.json \
  npx vitest --run tests/transform/entityDictionary.test.ts tests/transform/entityDictionaryComparison.test.ts
```

Without the environment variable, tests do not write a report. This comparison does not update the approved freeze benchmark.
