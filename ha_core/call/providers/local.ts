import type { ProviderAdapter } from "./interface";
import { shapeOutput, logProviderIO } from "./utils";
import { mapProviderRole } from "./roles";

export const LocalAdapter: ProviderAdapter = {
    name: "local",

    async call(req) {
        // req.messages: SMAGEMessage[]
        const payload = {
            model: req.model,
            messages: req.messages.map((m) => ({
                role: mapProviderRole(m.role),
                content: m.content,
            })),
        };

        // TODO: integrate local model / llama.cpp / python bridge
        const response = shapeOutput("assistant", "[local placeholder]");

        logProviderIO(req.session, "local", req, response);
        return response;
    },
};
