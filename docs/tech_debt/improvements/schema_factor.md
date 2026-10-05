# Improvement Proposal: Schema Factoring

Status: proposed. No canonical schema registry or reversible schema-reference format is present in the CCR pipeline.

## Hypothesis

Repeated structured payloads may be represented once and referenced compactly, reducing tokens while preserving exact values and reconstructability. The earlier estimate of 20–40% reduction on structured payloads is an unvalidated hypothesis.

## Dependencies and gaps

- Define a versioned schema format and a collision-safe reference encoding.
- Specify how schemas are scoped to a request/session and removed.
- Preserve field names, types, ordering requirements, and literal values.
- Integrate with `payload.ts` and `reconstruct.ts` without silently changing arbitrary prose.
- Add structured fixtures for JSON, configuration, and form-like payloads.

## Evaluation plan

Measure raw, encoded, and reconstructed token counts. Require round-trip equality for supported structured formats and unchanged behavior for unsupported input. Compare both typical structured examples and malformed/ambiguous inputs. Promote only if measured reductions exceed the encoding overhead and all round-trip checks pass.
