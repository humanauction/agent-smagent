import { getWrapper } from "../../ha_wrap/wrapperRegistry";
import { applyCCR } from "../../ha_core/transform/ccr";
import { printSection, printJSON } from "../utils/printer";

export async function ccrCommand(wrapperId: string, prompt: string) {
    const wrapper = getWrapper(wrapperId);

    const anchors = wrapper["prepareWrapperAnchors"]();
    const merged = [...anchors, { role: "user", content: prompt }];

    const shaped = await applyCCR(merged, wrapperId, "cli-session", {});
    printSection("Shaped Output");
    printJSON(shaped);
}
