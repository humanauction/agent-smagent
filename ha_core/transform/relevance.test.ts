import { describe, it, expect } from "vitest";
import { scoreRelevance } from "./relevance";
import type { SMAGEMessage } from "../index";

describe("scoreRelevance", () => {
    it("scores messages based on role, recency, markers, and token density", async () => {
        const messages: SMAGEMessage[] = [
            { role: "system", content: "System boot", meta: {} },
            {
                role: "user",
                content: "IMPORTANT: please explain quantum tunnelling",
                meta: {},
            },
            { role: "assistant", content: "Sure, here's a summary.", meta: {} },
            { role: "user", content: "ok thanks", meta: {} },
        ];

        const scored: number[] = await Promise.all(
            messages.map((m, i) => scoreRelevance(m, i, messages.length, null)),
        );

        scored.forEach((s) => {
            expect(typeof s).toBe("number");
        });

        expect((scored[0] ?? 0) > (scored[2] ?? 0)).toBe(true); // system > assistant
        expect((scored[1] ?? 0) > (scored[3] ?? 0)).toBe(true); // IMPORTANT user > normal user
        expect((scored[3] ?? 0) > 0).toBe(true); // recency gives non-zero
        expect((scored[1] ?? 0) > (scored[2] ?? 0)).toBe(true); // user > assistant
    });
});
