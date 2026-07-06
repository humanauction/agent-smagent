import type { ProviderAdapter } from "./interface";
import { shapeOutput } from "./utils";
import { mapProviderRole } from "./roles";
import { reversibleLog } from "../../cache/log";

export const LocalAdapter: ProviderAdapter = {
    name: "local",

    async call(req) {
        const payload = {
            model: req.model,
            messages: req.messages.map((m) => ({
                role: mapProviderRole(m.role),
                content: m.content,
            })),
        };

        // TODO: integrate local model / llama.cpp / python bridge
        const response = shapeOutput("assistant", "[local placeholder]");

        reversibleLog(req.session, "provider_request", {
            provider: "local",
            payload,
        });

        reversibleLog(req.session, "provider_response", response);
        return response;
    },
};
