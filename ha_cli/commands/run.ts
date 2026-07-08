import { getWrapper } from "../../ha_wrap/wrapperRegistry";
import { printSection, printJSON } from "../utils/printer";

export async function runCommand(wrapperId: string, prompt: string) {
    const wrapper = getWrapper(wrapperId);

    const response = await wrapper.run(
        "cli-session",
        [{ role: "user", content: prompt }],
        {},
    );

    printSection("Response");
    printJSON(response);
}
