import { layout } from "./layout";

export function renderMemory(anchors: any[]): string {
    const body = `
<div class="section">
    <pre>${JSON.stringify(anchors, null, 2)}</pre>
</div>
`;
    return layout("Wrapper Memory", body);
}
