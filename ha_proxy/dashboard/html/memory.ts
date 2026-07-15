import { layout } from './layout.js';
import { escapeHTML } from '../utils/messages.js';
import type { MemoryView } from './types.js';

export function renderMemory(data: MemoryView): string {
    const body = `
<div class="tabs">
    <div class="tab active" data-target="memory-tab">Memory</div>
</div>

<div id="memory-tab" class="tab-content active">
    ${renderSection("Raw Memory", data.raw)}
    ${renderSection("Scored / Weighted / Decayed", data.scored)}
    ${renderSection("Pruned Memory (>0.2 weight)", data.pruned)}
    ${renderSection("Conflict-Resolved Memory", data.resolved)}
    ${renderSection("Sorted by Weight", data.sorted)}
</div>
`;
    return layout("Memory", body);
}

function renderSection(title: string, value: unknown): string {
    return `
<div class="section">
    <div class="section-header">
        <span class="section-title">${title}</span>
        <span class="section-toggle">Hide</span>
    </div>
    <div class="section-body" style="display: block;">
        <pre>${escapeHTML(JSON.stringify(value, null, 2))}</pre>
    </div>
</div>
`;
}
