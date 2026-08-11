import { providers } from "../../ha_core/call/providers/index.js";
import type { ProviderRequest } from "../../ha_core/call/providers/interface.js";

describe("OpenAI Provider Connectivity", () => {
    it("returns a valid ProviderResponse", async () => {
        const adapter = providers["openai"];
        expect(adapter).toBeDefined();

        const req: ProviderRequest = {
            session: "test-session",
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "hello" }],
            options: {},
        };

        if (!adapter) {
            throw new Error("OpenAI provider adapter not found");
        }

        const res = await adapter.call(req);

        expect(res.role).toBe("assistant");
        expect(typeof res.content).toBe("string");
    });
});
