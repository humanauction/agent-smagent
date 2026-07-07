import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface PersonaBundle {
    persona: string;
    rules?: string;
    tools?: string;
}

export function loadPersona(wrapperId: string): PersonaBundle {
    const base = join(process.cwd(), "ha_wrap", wrapperId);

    const persona = readFileSync(join(base, "persona.md"), "utf8");
    let rules = "";
    let tools = "";

    try {
        rules = readFileSync(join(base, "rules.md"), "utf8");
    } catch {}

    try {
        tools = readFileSync(join(base, "tools.md"), "utf8");
    } catch {}

    return { persona, rules, tools };
}
