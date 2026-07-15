import type { ProviderAdapter } from "./interface.js";
import { shapeOutput, logProviderIO } from "./utils.js";
import { mapProviderRole } from "./roles.js";

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

        logProviderIO(req.session, "openai", req, response);
        return response;
    },
};
