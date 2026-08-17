import { layout } from "./layout.js";
import { escapeHTML } from "../utils/messages.js";

export function renderCCR(data: any): string {
    const metricsRows = data.metrics
        .map(
            (m: any) => `
            <tr>
                <td>${escapeHTML(m.stage)}</td>
                <td>
                    Raw: ${m.tokens?.raw ?? 0}<br>
                    Window: ${m.tokens?.window ?? 0}<br>
                    Compressed: ${m.tokens?.compressed ?? 0}<br>
                    Reduced: ${m.tokens?.reduced ?? 0}
                </td>
                <td>
                    Raw: ${m.counts?.raw ?? 0}<br>
                    Deduped: ${m.counts?.deduped ?? 0}<br>
                    Window: ${m.counts?.window ?? 0}<br>
                    Compressed: ${m.counts?.compressed ?? 0}
                </td>
            </tr>
        `,
        )
        .join("");

    const timelineRows = data.timeline
        .map(
            (t: any) =>
                `<li><strong>${escapeHTML(t.stage)}</strong> — ${escapeHTML(JSON.stringify(t))}</li>`,
        )
        .join("");

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

            <h2>CCR Reduction Metrics</h2>
            <table>
                <tr><th>Stage</th><th>Tokens</th><th>Messages</th></tr>
                ${metricsRows}
            </table>

            <h2>CCR Timeline</h2>
            <ul>
                ${timelineRows}
            </ul>

            <pre>${escapeHTML(JSON.stringify(data, null, 2))}</pre>
        </div>
    </div>
</div>
`;

    return layout("Wrapper CCR", body);
}
