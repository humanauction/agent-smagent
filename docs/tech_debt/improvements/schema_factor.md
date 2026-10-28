# Schema Factoring

Status: implemented as an opt-in experiment. It is disabled by default and disabled whenever `baselineFreeze` is true. Do not promote the freeze baseline from this experiment without a separate reviewed candidate.

## Hypothesis

Repeated same-shaped structured records may be represented as one field/type definition plus scalar rows. On the deterministic eight-record fixture, the packet estimate is 75 versus 105 for the source (30 fewer heuristic tokens, 28.6%). This is a local lexical estimate, not a provider tokenizer measurement or a general compression claim. See [the comparison report](../../benchmarks/schema_factoring_comparison.json).

## Dependencies and gaps

- Implemented a versioned packet and SHA-256-derived reference with collision checks against literal input.
- Schemas are stored in the durable session record and keyed with a session-derived reference. Decode requires the owning active session. Delete and expiry clear the registry.
- Supported shape is deliberately narrow: a root JSON array of at least three records with identical field order and homogeneous scalar values (string, finite number except negative zero, boolean, or null).
- `payload.ts` applies the transform only when `schemaFactoring: true`, outside `baselineFreeze`, and with a session. `reconstruct.ts` restores only packets carrying the transform metadata and a valid session registry entry.
- Unsupported, nested, malformed, and non-JSON values are left to the existing payload path.

## Evaluation plan

Acceptance checks currently pass for the supported fixture, unsupported/malformed parity, session isolation, literal-reference collision avoidance, session deletion/expiry cleanup, default/baselineFreeze parity, and the existing `structured-config` freeze case. The focused validation command is `npx vitest --run --reporter=dot tests/transform/schemaFactoring.test.ts tests/cache/sessionStore.test.ts tests/transform/ccrPipeline.test.ts tests/transform/ccrPipeline.freeze.test.ts`; TypeScript validation is `npx tsc --noEmit`.

## Expanded evaluation result

The expanded offline comparison is in [the report](../../benchmarks/schema_factoring_expanded_comparison.json). It covers all eight freeze corpus cases across control, opt-in, approved-freeze control, and freeze-with-option paths (32 pipeline runs), plus 21 direct codec fixtures.

| Measure | Result |
| --- | ---: |
| Supported shapes | 7 (6 encoded beneficially; minimum three-row shape rejected for overhead) |
| Unsupported fallback fixtures | 14; all retained the ordinary payload output |
| Successful exact parsed-value round trips | 6 of 6 encoded fixtures |
| Freeze corpus schema-factored messages | 0 of 32 runs |
| Freeze-mode output parity failures | 0 |
| Required-phrase losses in opt-in corpus runs | 0 |
| Supported-fixture estimate | 3,726 → 2,514 (1,212 fewer heuristic tokens across fixture inputs) |
| Freeze corpus windows/reconstructions | 31 / 31 in the control path total |

The 64-row fixture saved 848 estimated tokens; the many-field fixture saved 220. The minimum three-row shape is structurally supported but the packet is not smaller, so factoring is declined and ordinary output is preserved. Runtime for 32 freeze pipeline runs is recorded per case in the report; those measurements are local and nondeterministic, and are not used as an acceptance threshold. Registry storage bytes, packet bytes, and lexical estimates are also recorded per fixture/path. The estimator includes schema and reference packet overhead, but it is not a provider tokenizer.

Lifecycle checks also cover separate durable store roots, cross-session isolation, missing/stale references, repeated use of one schema, distinct schemas in one session, literal-reference collisions, deletion, and expiry. The freeze corpus contains no eligible root-array payloads, so it establishes behavioral parity and phrase-retention control, not an in-corpus token reduction.

Decision: retain the feature as opt-in. Do not promote it or the baseline. The synthetic fixtures show positive estimated savings for larger regular records, but broader production-shaped inputs and real provider tokenization remain unmeasured.

Run the expanded comparison and regenerate only its separate report with:

```bash
SMAGE_SCHEMA_FACTORING_REPORT=docs/benchmarks/schema_factoring_expanded_comparison.json \
  npx vitest --run tests/transform/schemaFactoringComparison.test.ts
```

The test itself does not write a report unless `SMAGE_SCHEMA_FACTORING_REPORT` is set. It never writes the approved freeze benchmark.
