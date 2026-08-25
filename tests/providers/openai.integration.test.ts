import { providers } from "../../ha_core/call/providers/index.js";

// this file tests connection to OpenAI API, provider adapter integration.
// verifies message send, response receive success.

describe("OpenAI Integration", () => {
    it("connects to real OpenAI API", async () => {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY not set");
        }

        const adapter = providers["openai"];
        if (!adapter) {
            throw new Error("OpenAI provider adapter is not defined");
        }

        const res = await adapter.call({
            session: "integration-test",
            model: "gpt-4o-mini",
            provider: "openai",
            messages: [{ role: "user", content: "hello" }],
            options: {},
        });

        expect(res.role).toBe("assistant");
    });
});
