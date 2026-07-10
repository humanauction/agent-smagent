import { layout } from "./layout";
import { escapeHTML } from "../utils/messages";

export function renderMemory(data: any): string {
    return layout(
        "Memory",
        `
        <pre>${escapeHTML(JSON.stringify(data, null, 2))}</pre>
    `,
    );
}
