import type { ProviderAdapter } from "./interface.js";
import { shapeOutput, logProviderIO } from "./utils.js";
import { mapProviderRole } from "./roles.js";
import { normalizeProviderResponse } from "./providerNormalize.js";

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
        const response = normalizeProviderResponse("[local placeholder]");

        logProviderIO(req.session, "local", req, response);
        return response;
    },
};
