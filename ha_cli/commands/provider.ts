import { getProviderWrapper } from '../../ha_wrap/wrapperRegistry.js';
import { printSection, printJSON } from '../utils/printer.js';

import type { ProviderWrapperId } from '../../ha_wrap/wrapperRegistry.js';

export async function providerCommand(wrapperId: string, prompt: string) {
    const wrapperObj = getProviderWrapper(wrapperId as ProviderWrapperId);

    const response = await wrapperObj.debugProvider(
        "cli-session",
        [{ role: "user" as const, content: prompt }],
        {},
    );

    printSection("Provider Raw Output");
    printJSON(response);
}
