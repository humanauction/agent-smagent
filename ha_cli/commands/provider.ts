import { getWrapper } from "../../ha_wrap/wrapperRegistry";
import { printSection, printJSON } from "../utils/printer";

export async function providerCommand(wrapperId: string, prompt: string) {
    const wrapper = getWrapper(wrapperId);

    const response = await wrapper["callProvider"](
        "cli-session",
        [{ role: "user", content: prompt }],
        {},
    );

    printSection("Provider Raw Output");
    printJSON(response);
}
