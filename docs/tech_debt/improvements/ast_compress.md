# Improvement Proposal: AST Compression for Code

Status: proposed. No AST parser/encoder or source reconstruction module currently exists in the CCR transforms.

## Hypothesis

For selected code tasks, a syntax-aware representation may reduce repeated syntax while retaining code semantics. The earlier 70–90% estimate is unvalidated and should not be used for planning until measured on representative code.

## Dependencies and risks

- Choose supported languages and parser versions, beginning with TypeScript/JavaScript only if justified.
- Preserve comments, formatting-sensitive constructs, directives, and source locations where needed.
- Define a lossless representation and exact reconstruction contract before attempting semantic compression.
- Fall back to original source on parse errors or unsupported syntax.
- Measure parser/runtime overhead as well as token reduction.

## Evaluation plan

Start with fixed code fixtures covering ordinary syntax, comments, generics, decorators, malformed input, and large files. Require parse/print or round-trip correctness checks, compilation of reconstructed examples, and no regressions on non-code corpus cases. Expand language support only after the first language has evidence of safe net benefit.
