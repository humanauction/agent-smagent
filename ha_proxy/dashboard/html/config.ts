import { layout } from "./layout";
import type { WrapperConfig } from "../../../ha_wrap/shared/baseWrapper";
import { escapeHTML } from "../utils/messages";

export function renderConfig(config: WrapperConfig): string {
    return layout(
        "Wrapper Config",
        `
        <pre>${escapeHTML(JSON.stringify(config, null, 2))}</pre>
    `,
    );
}
