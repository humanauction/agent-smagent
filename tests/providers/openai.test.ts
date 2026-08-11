import { providers } from "../../ha_core/call/providers/index.js";
import type {
    ProviderRequest,
    ProviderResponse,
} from "../../ha_core/call/providers/interface.js";

// Mock the OpenAI provider for testing
providers["openai"] = {
    name: "openai",
    async call(req: ProviderRequest): Promise<ProviderResponse> {
        return {
            role: "assistant",
            content: "mocked openai response",
        };
    },
};

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
            throw new Error("OpenAI provider adapter is not defined");
        }
        const res = await adapter.call(req);

        expect(res.role).toBe("assistant");
        expect(typeof res.content).toBe("string");
    });
});
