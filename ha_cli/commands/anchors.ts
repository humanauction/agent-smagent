import { getWrapper } from '../../ha_wrap/wrapperRegistry.js';
import { printSection, printJSON } from '../utils/printer.js';

import type { WrapperId } from '../../ha_wrap/wrapperRegistry.js';

export async function anchorsCommand(wrapperId: string) {
    const wrapper = getWrapper(wrapperId as WrapperId);

    const anchors = wrapper["prepareWrapperAnchors"]();

    printSection("Wrapper Anchors");
    printJSON(anchors);
}
