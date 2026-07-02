import fs from "fs";
import path from "path";
import { walkSourceFiles } from "./walk";
import type { DocModule, DocSymbol } from "./types";

// this file generates project documentation. walks through source files, extracts symbols and related JSDoc comments

function extractSymbols(file: string): DocSymbol[] {
    const src = fs.readFileSync(file, "utf8");
    const symbols: DocSymbol[] = [];

    const jsdocRegex =
        /\/\*\*([\s\S]*?)\*\/\s*(export\s+(?:const|function|class|interface|type)\s+([A-Za-z0-9_]+))/g;
    let match: RegExpExecArray | null;

    while ((match = jsdocRegex.exec(src))) {
        const jsdocRaw = match[1];
        const decl = match[2];
        const name = match[3];

        // Strict-mode safety
        if (!jsdocRaw || !decl || !name) {
            continue;
        }

        const jsdoc = jsdocRaw
            .split("\n")
            .map((l) => l.replace(/^\s*\*\s?/, "").trim())
            .join("\n")
            .trim();

        let kind: DocSymbol["kind"] = "const";
        if (decl.includes("function")) kind = "function";
        else if (decl.includes("class")) kind = "class";
        else if (decl.includes("interface")) kind = "interface";
        else if (decl.includes("type")) kind = "type";

        symbols.push({
            file,
            name,
            kind,
            jsdoc,
            signature: decl.replace(/^export\s+/, "").trim(),
        });
    }

    return symbols;
}

export function generateDocs(): DocModule[] {
    const files = walkSourceFiles();
    const modules: DocModule[] = [];

    for (const file of files) {
        const symbols = extractSymbols(file);
        if (symbols.length === 0) continue;

        modules.push({
            path: path.relative(process.cwd(), file),
            symbols,
        });
    }

    return modules;
}

export function writeMarkdown(outputFile = "SMAGE_DOCS.md") {
    const modules = generateDocs();
    const lines: string[] = [];

    lines.push("# SMAGE Documentation");
    lines.push("");

    for (const mod of modules) {
        lines.push(`## \`${mod.path}\``);
        lines.push("");

        for (const sym of mod.symbols) {
            lines.push(`### ${sym.kind} \`${sym.name}\``);
            if (sym.signature) {
                lines.push("");
                lines.push("```ts");
                lines.push(sym.signature);
                lines.push("```");
            }
            if (sym.jsdoc) {
                lines.push("");
                lines.push(sym.jsdoc);
            }
            lines.push("");
        }
    }

    fs.writeFileSync(outputFile, lines.join("\n"), "utf8");
    console.log(`Wrote docs to ${outputFile}`);
}
