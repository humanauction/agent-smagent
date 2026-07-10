import { layout } from "./layout";
import { escapeHTML } from "../utils/messages";

export function renderCCR(data: any): string {
    const body = `
<div class="tabs">
    <div class="tab active" data-target="ccr-tab">CCR</div>
</div>

<div id="ccr-tab" class="tab-content active">
    <div class="section">
        <div class="section-header">
            <span class="section-title">Wrapper CCR</span>
            <span class="section-toggle">Hide</span>
        </div>
        <div class="section-body" style="display: block;">
            <pre>${escapeHTML(JSON.stringify(data, null, 2))}</pre>
        </div>
    </div>
</div>
`;
    return layout("Wrapper CCR", body);
}
