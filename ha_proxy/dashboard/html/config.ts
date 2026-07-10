import { layout } from "./layout";
import type { WrapperConfig } from "../../../ha_wrap/shared/baseWrapper";
import { escapeHTML } from "../utils/messages";

export function renderConfig(config: WrapperConfig): string {
    const body = `
<div class="tabs">
    <div class="tab active" data-target="config-tab">Config</div>
</div>

<div id="config-tab" class="tab-content active">
    <div class="section">
        <div class="section-header">
            <span class="section-title">Wrapper Config</span>
            <span class="section-toggle">Hide</span>
        </div>
        <div class="section-body" style="display: block;">
            <pre>${escapeHTML(JSON.stringify(config, null, 2))}</pre>
        </div>
    </div>
</div>
`;
    return layout("Wrapper Config", body);
}
