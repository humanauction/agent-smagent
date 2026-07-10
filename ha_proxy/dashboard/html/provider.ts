import { layout } from "./layout";
import { escapeHTML } from "../utils/messages";

export function renderProvider(data: any): string {
    return layout(
        "Wrapper Provider",
        `
        <pre>${escapeHTML(JSON.stringify(data, null, 2))}</pre>
    `,
    );
}
