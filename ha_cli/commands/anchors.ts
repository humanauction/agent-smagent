import {
    getProviderWrapper,
    ProviderWrapperId,
} from "../../ha_wrap/wrapperRegistry.js";
import { printSection, printJSON } from "../utils/printer.js";

export async function anchorsCommand(wrapperId: string) {
    const wrapper = getProviderWrapper(wrapperId as ProviderWrapperId);

    const anchors = wrapper["prepareWrapperAnchors"]();

    printSection("Wrapper Anchors");
    printJSON(anchors);
}
