import { layout } from "./layout";
import { escapeHTML } from "../utils/messages";

export function renderAnchors(anchors: any[]): string {
    const body = `
<div class="section">
    <pre>${escapeHTML(JSON.stringify(anchors, null, 2))}</pre>
</div>
`;
    return layout("Wrapper Anchors", body);
}
