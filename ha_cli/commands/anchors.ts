import { getWrapper } from "../../ha_wrap/wrapperRegistry";
import { printSection, printJSON } from "../utils/printer";

export async function anchorsCommand(wrapperId: string) {
    const wrapper = getWrapper(wrapperId);

    const anchors = wrapper["prepareWrapperAnchors"]();

    printSection("Wrapper Anchors");
    printJSON(anchors);
}
