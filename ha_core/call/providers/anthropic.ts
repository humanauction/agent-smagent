import type { ProviderAdapter } from "./interface";
import { shapeOutput } from "./utils";
import { mapProviderRole } from "./roles";
import { reversibleLog } from "../../cache/log";

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

        reversibleLog(req.session, "provider_request", {
            provider: "anthropic",
            payload,
        });

        reversibleLog(req.session, "provider_response", response);
        return response;
    },
};
