import { layout } from './layout.js';
import { escapeHTML } from '../utils/messages.js';

export function renderAnchors(anchors: any[]): string {
    const body = `
<div class="tabs">
    <div class="tab active" data-target="anchors-tab">Anchors</div>
</div>

<div id="anchors-tab" class="tab-content active">
    <div class="section">
        <div class="section-header">
            <span class="section-title">Wrapper Anchors</span>
            <span class="section-toggle">Hide</span>
        </div>
        <div class="section-body" style="display: block;">
            <pre>${escapeHTML(JSON.stringify(anchors, null, 2))}</pre>
        </div>
    </div>
</div>
`;
    return layout("Wrapper Anchors", body);
}
