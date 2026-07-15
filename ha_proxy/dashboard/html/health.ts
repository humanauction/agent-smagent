import { layout } from './layout.js';
import { escapeHTML } from '../utils/messages.js';
import type { HealthView } from './types.js';

export function renderHealth(data: HealthView): string {
    const body = `
<div class="tabs">
    <div class="tab active" data-target="health-tab">Health</div>
</div>

<div id="health-tab" class="tab-content active">
    <div class="section">
        <div class="section-header">
            <span class="section-title">Wrapper Health</span>
            <span class="section-toggle">Hide</span>
        </div>
        <div class="section-body" style="display: block;">
            <pre>${escapeHTML(JSON.stringify(data, null, 2))}</pre>
        </div>
    </div>
</div>
`;
    return layout("Wrapper Health", body);
}
