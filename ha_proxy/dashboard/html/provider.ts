import { layout } from "./layout";

export function renderProvider(anchors: any[]): string {
    const body = `
<div class="section">
    <pre>${JSON.stringify(anchors, null, 2)}</pre>
</div>
`;
    return layout("Wrapper Provider", body);
}
