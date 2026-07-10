import { layout } from "./layout";
import { escapeHTML } from "../utils/messages";

export function renderCCR(data: any): string {
    return layout(
        "Wrapper CCR",
        `
        <pre>${escapeHTML(JSON.stringify(data, null, 2))}</pre>
    `,
    );
}
