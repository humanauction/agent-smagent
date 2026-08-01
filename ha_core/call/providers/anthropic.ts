import type { ProviderAdapter } from "./interface.js";
import { logProviderIO } from "./utils.js";
import { mapProviderRole } from "./roles.js";
import { normalizeProviderResponse } from "./providerNormalize.js";

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
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify(payload),
        });

        const json = (await res.json()) as any;

        const raw = json?.content?.[0]?.text ?? "[empty response]";

        const response = normalizeProviderResponse(raw, "assistant");

        logProviderIO(req.session, "anthropic", req, response);
        return response;
    },
};
