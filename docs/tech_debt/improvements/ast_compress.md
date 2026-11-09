# Improvement Proposal: AST Compression for Code

Status: fixture corpus and parser/printer selection are complete; lossless contract definition and evaluation remain. No AST parser/encoder or source reconstruction module exists in the CCR transforms. Do not integrate an AST transform into CCR until the evaluation contract below is satisfied.

## Hypothesis

For selected code tasks, a syntax-aware representation may reduce repeated syntax while retaining code semantics. The earlier 70–90% estimate is unvalidated and should not be used for planning until measured on representative code.

## Dependencies and risks

- Choose supported languages and parser versions, beginning with TypeScript/JavaScript only if justified.
- Preserve comments, formatting-sensitive constructs, directives, and source locations where needed.
- Define a lossless representation and exact reconstruction contract before attempting semantic compression.
- Fall back to original source on parse errors or unsupported syntax.
- Measure parser/runtime overhead as well as token reduction.

## Evaluation plan

### Stage 1: fixture corpus

The initial corpus is in `tests/transform/astCompressionFixtures.ts`. It covers ordinary functions, imports/exports, interfaces and generics, decorators, comments/directives, strings containing code-like syntax, malformed source, and syntax outside the initial `.ts`/`.js` scope. Each fixture records a stable ID, category, source filename, source text, expected parser diagnostic status, and an evaluation note. Add cases when the declared language/syntax scope changes; do not mix generated reports into the approved freeze benchmark.

### Stage 2: parser/printer selection

Use the TypeScript compiler API parser and printer from the repository's existing `typescript` dependency, pinned exactly to **6.0.3** in `package.json` and `package-lock.json`. The parser entry point will be `createSourceFile`; the corresponding printer is `createPrinter`. This keeps parsing and printing on one grammar/version, supports the initial TypeScript/JavaScript scope, and avoids adding another parser dependency before the experiment demonstrates a need. The printer is not assumed to reproduce original formatting: exact source reconstruction remains a measured acceptance criterion, and if this pair cannot satisfy it, record that result before considering another pair. JSX/TSX and pipeline-operator syntax are explicitly outside the first pass.

The selected pair is for evaluation only. No AST transform or parser dependency is wired into CCR.

### Later evaluation stages

Define the lossless reconstruction contract before attempting compression. Then evaluate each fixture for source token estimate, complete serialized packet including schema and reference metadata, reconstructed source equality, TypeScript compilation result where applicable, parser/printer runtime, and fallback behavior. Do not use abstract AST node count as a compression result. Require exact reconstruction, unchanged fallback for unsupported/malformed input, `baselineFreeze` parity, and positive net savings after packet overhead. Keep this experiment separate from the approved freeze benchmark and opt-in if implementation follows.

Entity Dictionary was retired from CCR after provider-token comparisons showed no net savings; its reports remain historical. AST evaluation still requires its own gated, task-specific provider check after lossless reconstruction and fallback behavior pass locally. Live validation must not change the deterministic freeze gate.
