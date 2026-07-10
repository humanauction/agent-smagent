import { layout } from "./layout";
import { escapeHTML } from "../utils/messages";

export function renderHealth(data: any): string {
    return layout(
        "Wrapper Health",
        `
        <pre>${escapeHTML(JSON.stringify(data, null, 2))}</pre>
    `,
    );
}
