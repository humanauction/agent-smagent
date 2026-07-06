import type { ProviderAdapter } from "./interface";
import { shapeOutput } from "./utils";
import { mapProviderRole } from "./roles";
import { reversibleLog } from "../../cache/log";

export const GoogleAdapter: ProviderAdapter = {
    name: "google",

    async call(req) {
        const payload = {
            model: req.model,
            messages: req.messages.map((m) => ({
                role: mapProviderRole(m.role),
                content: m.content,
            })),
        };

        // TODO: fill in actual Google request
        const response = shapeOutput("assistant", "[google placeholder]");

        reversibleLog(req.session, "provider_request", {
            provider: "google",
            payload,
        });

        reversibleLog(req.session, "provider_response", response);
        return response;
    },
};
