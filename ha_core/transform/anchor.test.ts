import { extractAnchor, applyAnchor } from "./anchor.js";
import type { SMAGEMessage } from "../index.js";

// tiny assertion helper
function assert(cond: boolean, msg: string) {
    if (!cond) throw new Error("Assertion failed: " + msg);
}

function test(name: string, fn: () => void) {
    try {
        fn();
        console.log("✓", name);
    } catch (err) {
        console.error("✗", name);
        throw err;
    }
}

test("extractAnchor returns correct last-role anchors", () => {
    const messages: SMAGEMessage[] = [
        { role: "system", content: "sys" },
        { role: "user", content: "u1" },
        { role: "assistant", content: "a1" },
        { role: "user", content: "u2" },
        { role: "assistant", content: "a2" },
        { role: "tool", content: "t1" },
    ];

    const anchor = extractAnchor(messages);

    assert(anchor.system.length === 1, "system anchor missing");
    assert(anchor.lastUser?.content === "u2", "lastUser incorrect");
    assert(anchor.lastAssistant?.content === "a2", "lastAssistant incorrect");
    assert(anchor.lastTool?.content === "t1", "lastTool incorrect");
});

test("applyAnchor reconstructs anchor messages", () => {
    const messages: SMAGEMessage[] = [
        { role: "system", content: "sys" },
        { role: "user", content: "u1" },
        { role: "assistant", content: "a1" },
    ];

    const anchor = extractAnchor(messages);

    const crushed: SMAGEMessage[] = [
        { role: "system", content: "[crushed]" },
        { role: "user", content: "[crushed]" },
        { role: "assistant", content: "[crushed]" },
    ];

    const reconstructed = applyAnchor(crushed, anchor);

    assert(reconstructed[0].content === "sys", "system not restored");
    assert(reconstructed[1].content === "u1", "user not restored");
    assert(reconstructed[2].content === "a1", "assistant not restored");
});
