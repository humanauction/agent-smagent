import type { ProviderAdapter } from "./interface";
import { shapeOutput, logProviderIO } from "./utils";
import { mapProviderRole } from "./roles";
import { reversibleLog } from "../../cache/log";

export const OpenAIAdapter: ProviderAdapter = {
    name: "openai",

    async call(req) {
        // req.messages: SMAGEMessage[]
        const payload = {
            model: req.model,
            messages: req.messages.map((m) => ({
                role: mapProviderRole(m.role),
                content: m.content,
            })),
        };

        // TODO: fill in actual OpenAI request
        const response = shapeOutput("assistant", "[openai placeholder]");

        reversibleLog(req.session, "provider_request", {
            provider: "openai",
            payload,
        });

        reversibleLog(req.session, "provider_response", response);
        return response;
    },
};
