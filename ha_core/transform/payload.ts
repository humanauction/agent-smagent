import type { SMAGEMessage, SMAGEOptions } from "../index";
import { tokenCount } from "../analyze/tokens";
import { classifyMessage } from "../analyze/classifier";
import { compressContent } from "./compressors/basic";

export async function applyPayloadCompression(
    messages: SMAGEMessage[],
    options: SMAGEOptions,
): Promise<SMAGEMessage[]> {
    return messages.map((msg) => {
        const kind = classifyMessage(msg);
        const tokens = tokenCount(msg.content);

        // invariants
        if (kind === "user" || kind === "system") return msg;
        if (kind === "code" && !options.ast) return msg;
        if (tokens < 200) return msg;

        if (kind === "tool_output" || kind === "rag" || kind === "log") {
            return {
                ...msg,
                content: compressContent(msg.content),
                meta: { ...(msg.meta ?? {}), compressed: true },
            };
        }

        return msg;
    });
}
