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

Next: broaden the fixture matrix (including larger and less regular records), compare against the project's approved CCR corpus, and verify real provider tokenization before making a promotion decision. Current estimates only establish that this packet is smaller under the project's deterministic lexical estimator. Keep this opt-in until those checks are reviewed.
