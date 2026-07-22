import { getProviderWrapper } from "../../ha_wrap/wrapperRegistry.js";
import { printSection, printJSON } from "../utils/printer.js";

import type { ProviderWrapperId } from "../../ha_wrap/wrapperRegistry.js";
import { SMAGEMessage } from "../../ha_core/index.js";

export async function runCommand(wrapperId: string, prompt: string) {
    const wrapperObj = getProviderWrapper(wrapperId as ProviderWrapperId);
    const userMessage: SMAGEMessage = { role: "user", content: prompt };

    const response = await wrapperObj.run("cli-session", [userMessage], {});

    printSection("Response");
    printJSON(response);
}
