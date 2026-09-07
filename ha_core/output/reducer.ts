import type { SMAGEMessage, SMAGEOptions } from "../index.js";
import { reduceOutputProviderAware } from "./providerReducer.js";

export function reduceOutput(
    msg: SMAGEMessage,
    options?: SMAGEOptions,
): SMAGEMessage {
    return reduceOutputProviderAware(msg, options);
}

export function applyOutputReduction(
    messages: SMAGEMessage[],
    options?: SMAGEOptions,
): SMAGEMessage[] {
    return messages.map((m) => reduceOutput(m, options));
}
