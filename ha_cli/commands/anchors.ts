import { getWrapper } from "../../ha_wrap/wrapperRegistry";
import { printSection, printJSON } from "../utils/printer";

import type { WrapperId } from "../../ha_wrap/wrapperRegistry";

export async function anchorsCommand(wrapperId: string) {
    const wrapper = getWrapper(wrapperId as WrapperId);

    const anchors = wrapper["prepareWrapperAnchors"]();

    printSection("Wrapper Anchors");
    printJSON(anchors);
}
