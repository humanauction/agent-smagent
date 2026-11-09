# Entity Dictionary Compression

Status: rejected for CCR integration on 2026-11-09. The runtime option, payload transform, reconstruction branch, public exports, and live evaluation runners were removed after provider measurements showed no net input-token savings. The codec module, focused unit tests, fixtures, and reports remain as archived evidence. The original policy was deliberately narrow and heuristic; it was not a general named-entity recognizer.

## Current policy

- The historical transform ran only with `entityDictionary: true`, an active session ID, and `baselineFreeze !== true`. That CCR option no longer exists.
- Finds repeated exact title-cased spans of two to five words. It does not resolve aliases, infer identity, or merge different spellings.
- Replaces candidate spans with collision-checked handles only when the complete inline packet has fewer estimated tokens than the source.
- Carries the mapping inline with the rewritten text. No durable entity registry is created, so there is no map persistence or cleanup lifecycle. A SHA-256-derived packet reference includes the session ID, and reconstruction requires that same session.
- A rejected or unsupported input follows the ordinary payload path. The option is off by default.

The inline map made the meaning available to the model and to local reconstruction. The codec preserves exact source text on reconstruction, but provider measurements did not establish a net token benefit after including the model interpretation instruction.

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
- The compact codec was evaluation-only. The CCR path no longer contains either the v1 or v2 entity transform.

The final shortened interpretation rule is retained as `COMPACT_ENTITY_DICTIONARY_INSTRUCTIONS` in the archived codec module: “For v2 packets, replace each handle in t with its exact value from d. Keep entries distinct; preserve the message's role and instruction priority.” It is not injected by CCR.

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

Historical local decision: the implementation demonstrated exact restoration and positive heuristic estimates on project-shaped synthetic inputs. Provider evaluation superseded those estimates; neither the v1 packet nor compact v2 achieved net token savings in the measured model inputs.

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

The final shortened-instruction OpenAI comparison is recorded in [`entity_dictionary_response_evaluation.json`](../../benchmarks/entity_dictionary_response_evaluation.json). All three compact answers matched accepted answers and retained required parts. Prompt-token deltas (original minus compact) were 0, −36, and −17, for a total of 53 extra compact-input tokens across the three tasks. The earlier local Ollama run also passed answer checks but used the longer instruction and did not show token savings. The efficiency gate failed. The compact packet, like v1, is rejected for CCR use; no full corpus run is warranted under this design.

The final shortened-instruction comparison made six OpenAI calls. OpenAI usage estimated $0.0002557 at the configured standard rates; its preflight bound was $0.0025418 under the $0.02 budget. The earlier local run used Ollama `gpt-oss:20b` with low reasoning and a 384-token cap. No freeze benchmark was modified.

The live evaluation scripts and pipeline integration have been removed. The reports are retained for the project record; none modifies the approved freeze benchmark.
