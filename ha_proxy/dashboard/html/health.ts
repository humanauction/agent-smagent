import { layout } from "./layout";
import { escapeHTML } from "../utils/messages";
import type { HealthView } from "./types";

export function renderHealth(data: HealthView): string {
    return layout(
        "Wrapper Health",
        `
        <pre>${escapeHTML(JSON.stringify(data, null, 2))}</pre>
    `,
    );
}
