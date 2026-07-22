import { getProviderWrapper } from "../../ha_wrap/wrapperRegistry.js";
import { applyCCR } from "../../ha_core/transform/ccr.js";
import { printSection, printJSON } from "../utils/printer.js";

import type { ProviderWrapperId } from "../../ha_wrap/wrapperRegistry.js";
import { SMAGEMessage } from "../../ha_core/index.js";

export async function ccrCommand(wrapperId: string, prompt: string) {
    const wrapper = getProviderWrapper(wrapperId as ProviderWrapperId);
    const userMessage: SMAGEMessage = { role: "user", content: prompt };
    const anchors = wrapper["prepareWrapperAnchors"]();
    const merged: SMAGEMessage[] = [...anchors, userMessage];

    const shaped = await applyCCR(merged, wrapperId, "cli-session", {});
    printSection("Shaped Output");
    printJSON(shaped);
}
