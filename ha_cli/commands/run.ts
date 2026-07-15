import { getWrapper } from "../../ha_wrap/wrapperRegistry.js";
import { printSection, printJSON } from "../utils/printer.js";

import type { WrapperId } from "../../ha_wrap/wrapperRegistry.js";
import { SMAGEMessage } from "../../ha_core/index.js";

export async function runCommand(wrapperId: string, prompt: string) {
    const wrapperObj = getWrapper(wrapperId as WrapperId);
    const userMessage: SMAGEMessage = { role: "user", content: prompt };

    const response = await wrapperObj.run("cli-session", [userMessage], {});

    printSection("Response");
    printJSON(response);
}
