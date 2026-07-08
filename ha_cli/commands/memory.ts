import { loadWrapperMemory } from "../../ha_wrap/shared/memoryLoader";
import { printSection, printJSON } from "../utils/printer";

export async function memoryCommand(wrapperId: string) {
    const memory = loadWrapperMemory(wrapperId);

    printSection("Wrapper Memory");
    printJSON(memory);
}
