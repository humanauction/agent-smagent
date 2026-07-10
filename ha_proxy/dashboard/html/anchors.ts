import { layout } from "./layout";

export function renderAnchors(anchors: any[]): string {
    const body = `
<div class="section">
    <pre>${JSON.stringify(anchors, null, 2)}</pre>
</div>
`;
    return layout("Wrapper Anchors", body);
}
