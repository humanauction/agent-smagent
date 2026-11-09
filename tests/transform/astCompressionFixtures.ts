/**
 * Evaluation corpus for the AST compression experiment.
 * These fixtures are data only: they are not passed through CCR.
 */
export type AstCompressionFixtureCategory =
    | "ordinary"
    | "modules"
    | "types"
    | "decorators"
    | "comments-and-directives"
    | "code-like-strings"
    | "malformed"
    | "unsupported";

export interface AstCompressionFixture {
    id: string;
    category: AstCompressionFixtureCategory;
    fileName: string;
    content: string;
    expectedParse: "clean" | "diagnostics";
    evaluationNote: string;
}

export const astCompressionFixtures: AstCompressionFixture[] = [
    {
        id: "ordinary-function",
        category: "ordinary",
        fileName: "ordinary-function.ts",
        content: `export function clamp(value: number, min: number, max: number): number {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}
`,
        expectedParse: "clean",
        evaluationNote: "Basic declarations, control flow, and formatting.",
    },
    {
        id: "ordinary-javascript-module",
        category: "ordinary",
        fileName: "ordinary-javascript-module.js",
        content: `export function formatLabel(name, count = 0) {
    const label = name.trim();
    return count > 0 ? label + " (" + count + ")" : label;
}
`,
        expectedParse: "clean",
        evaluationNote: "JavaScript module syntax, defaults, and conditional expression.",
    },
    {
        id: "imports-exports",
        category: "modules",
        fileName: "imports-exports.ts",
        content: `import type { UserId } from "./types.js";
import { normalizeName as normalize } from "./names.js";

export { normalize };
export const describeUser = (id: UserId): string => normalize(String(id));
`,
        expectedParse: "clean",
        evaluationNote: "Import forms, aliases, type-only imports, and exports.",
    },
    {
        id: "interfaces-generics",
        category: "types",
        fileName: "interfaces-generics.ts",
        content: `export interface Page<T> {
    items: readonly T[];
    next?: string;
}

export function first<T extends { id: string }>(page: Page<T>): T | undefined {
    return page.items[0];
}
`,
        expectedParse: "clean",
        evaluationNote: "Interfaces, generic constraints, readonly arrays, and optional fields.",
    },
    {
        id: "decorators",
        category: "decorators",
        fileName: "decorators.ts",
        content: `function sealed<T extends Function>(target: T): T {
    Object.seal(target);
    Object.seal(target.prototype);
    return target;
}

@sealed
export class Service {
    run(): string { return "ready"; }
}
`,
        expectedParse: "clean",
        evaluationNote: "Legacy TypeScript decorator syntax; compiler options affect semantic checks.",
    },
    {
        id: "comments-and-directives",
        category: "comments-and-directives",
        fileName: "comments-and-directives.ts",
        content: `#!/usr/bin/env node
// @ts-nocheck
/** Keep this documentation comment and its line breaks. */
export const answer = 42; // trailing comment
`,
        expectedParse: "clean",
        evaluationNote: "Shebang, compiler directive, documentation and trailing comments.",
    },
    {
        id: "code-like-strings",
        category: "code-like-strings",
        fileName: "code-like-strings.ts",
        content: `export const sample = String.raw\`function fake() { return "not syntax"; }\`;
export const markup = "<Widget value={x} /> // still a string";
export const escaped = "quote: \\\"; brace: }; template: ${"${notAnExpression}"}";
`,
        expectedParse: "clean",
        evaluationNote: "Strings and template text containing code-like fragments.",
    },
    {
        id: "malformed-source",
        category: "malformed",
        fileName: "malformed.ts",
        content: `export function broken(value: number {\n    return value;\n}\n`,
        expectedParse: "diagnostics",
        evaluationNote: "Malformed syntax must be detected and preserved unchanged by any future transform.",
    },
    {
        id: "unsupported-jsx-mode",
        category: "unsupported",
        fileName: "unsupported.ts",
        content: `export const view = <section>{"not enabled in the selected .ts mode"}</section>;\n`,
        expectedParse: "diagnostics",
        evaluationNote: "JSX is intentionally out of the initial .ts/.js evaluation scope.",
    },
    {
        id: "unsupported-pipeline-operator",
        category: "unsupported",
        fileName: "unsupported-pipeline.ts",
        content: `const result = input |> normalize |> validate;\n`,
        expectedParse: "diagnostics",
        evaluationNote: "Pipeline operator is outside the selected TypeScript grammar.",
    },
];
