import type { ProviderAdapter } from "./interface";
import { shapeOutput, logProviderIO } from "./utils";
import { mapProviderRole } from "./roles";

export const AnthropicAdapter: ProviderAdapter = {
    name: "anthropic",

    async call(req) {
        const payload = {
            model: req.model,
            messages: req.messages.map((m) => ({
                role: mapProviderRole(m.role),
                content: m.content,
            })),
        };

        // TODO: fill in actual Anthropic request
        const response = shapeOutput("assistant", "[anthropic placeholder]");

        logProviderIO(req.session, "anthropic", req, response);
        return response;
    },
};
