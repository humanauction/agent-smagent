import { getWrapper } from "../../ha_wrap/wrapperRegistry";
import { printSection, printJSON } from "../utils/printer";

import type { WrapperId } from "../../ha_wrap/wrapperRegistry";

export async function providerCommand(wrapperId: string, prompt: string) {
    const wrapperObj = getWrapper(wrapperId as WrapperId);

    const response = await wrapperObj.debugProvider(
        "cli-session",
        [{ role: "user" as const, content: prompt }],
        {},
    );

    printSection("Provider Raw Output");
    printJSON(response);
}
