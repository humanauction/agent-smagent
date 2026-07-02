import fs from "node:fs";
import path from "node:path";

const ROOTS = [
    "ha_core",
    "ha_proxy",
    "ha_mcp",
    "ha_wrap",
    "ha_learn",
    "ha_cli",
];

export function walkSourceFiles(): string[] {
    const files: string[] = [];

    for (const root of ROOTS) {
        const base = path.join(process.cwd(), root);
        if (!fs.existsSync(base)) continue;

        walkDir(base, files);
    }

    return files;
}

function walkDir(dir: string, files: string[]) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkDir(full, files);
        } else if (
            entry.isFile() &&
            (full.endsWith(".ts") || full.endsWith(".tsx"))
        ) {
            files.push(full);
        }
    }
}
