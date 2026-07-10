import { layout } from "./layout";
import { escapeHTML } from "../utils/messages";
import type { MemoryView } from "./types";

export function renderMemory(data: MemoryView): string {
    return layout(
        "Memory",
        `
        <pre>${escapeHTML(JSON.stringify(data, null, 2))}</pre>
    `,
    );
}
