# Improvement Proposal: AST Compression for Code

Status: evaluation and contract definition only. No AST parser/encoder or source reconstruction module currently exists in the CCR transforms. Do not integrate an AST transform into CCR until the evaluation contract below is satisfied.

## Hypothesis

For selected code tasks, a syntax-aware representation may reduce repeated syntax while retaining code semantics. The earlier 70–90% estimate is unvalidated and should not be used for planning until measured on representative code.

## Dependencies and risks

- Choose supported languages and parser versions, beginning with TypeScript/JavaScript only if justified.
- Preserve comments, formatting-sensitive constructs, directives, and source locations where needed.
- Define a lossless representation and exact reconstruction contract before attempting semantic compression.
- Fall back to original source on parse errors or unsupported syntax.
- Measure parser/runtime overhead as well as token reduction.

## Evaluation plan

Start with TypeScript and JavaScript fixtures covering ordinary functions, imports/exports, interfaces and generics, decorators, comments/directives, strings containing code-like syntax, malformed source, and unsupported syntax. Select and pin one parser/printer pair before measuring. Define lossless reconstruction requirements before attempting compression.

For each fixture, record source token estimate, complete serialized packet including schema and reference metadata, reconstructed source equality, TypeScript compilation result, parser/printer runtime, and fallback behavior. Do not use abstract AST node count as a compression result. Require exact reconstruction and compilation where applicable, unchanged fallback for unsupported/malformed input, `baselineFreeze` parity, and positive net savings after packet overhead. Keep this experiment separate from the approved freeze benchmark and opt-in if implementation follows.

The entity dictionary work and provider-tokenizer validation are separate experiments. Do not use live provider output as a substitute for AST reconstruction checks, and do not let live validation change the deterministic freeze gate.
