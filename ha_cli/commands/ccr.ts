import { getWrapper } from "../../ha_wrap/wrapperRegistry";
import { applyCCR } from "../../ha_core/transform/ccr";
import { printSection, printJSON } from "../utils/printer";

import type { WrapperId } from "../../ha_wrap/wrapperRegistry";
import { SMAGEMessage } from "../../ha_core";

export async function ccrCommand(wrapperId: string, prompt: string) {
    const wrapper = getWrapper(wrapperId as WrapperId);
    const userMessage: SMAGEMessage = { role: "user", content: prompt };
    const anchors = wrapper["prepareWrapperAnchors"]();
    const merged: SMAGEMessage[] = [...anchors, userMessage];

    const shaped = await applyCCR(merged, wrapperId, "cli-session", {});
    printSection("Shaped Output");
    printJSON(shaped);
}
