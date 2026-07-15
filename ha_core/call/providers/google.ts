import type { ProviderAdapter } from "./interface.js";
import { shapeOutput, logProviderIO } from "./utils.js";
import { mapProviderRole } from "./roles.js";

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

        logProviderIO(req.session, "google", req, response);
        return response;
    },
};
