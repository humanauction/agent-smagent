import { layout } from './layout.js';
import { escapeHTML } from '../utils/messages.js';

export function renderProvider(data: any): string {
    const body = `
    <div class="tabs">
    <div class="tab active" data-target="provider-tab">Provider</div>
</div>

<div id="provider-tab" class="tab-content active">
    <div class="section">
        <div class="section-header">
            <span class="section-title">Wrapper Provider</span>
            <span class="section-toggle">Hide</span>
        </div>
        <div class="section-body" style="display: block;">
            <pre>${escapeHTML(JSON.stringify(data, null, 2))}</pre>
        </div>
    </div>
</div>
`;
    return layout("Wrapper Provider", body);
}
