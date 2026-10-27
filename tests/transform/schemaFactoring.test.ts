import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { SMAGEMessage } from "../../ha_core/index.js";
import { defaultSessionStorePath, FileSessionStore } from "../../ha_core/cache/sessionStore.js";
import {
    cacheDelete,
    configureSessionStore,
    getSessionSchemaRegistry,
} from "../../ha_core/cache/store.js";
import { applyPayloadCompression } from "../../ha_core/transform/payload.js";
import { reconstruct } from "../../ha_core/transform/reconstruct.js";
import {
    factorJsonRecords,
    restoreFactoredJson,
} from "../../ha_core/transform/schemaFactoring.js";
import { freezeCorpus } from "../freeze/freezeCorpus.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
    configureSessionStore(defaultSessionStorePath());
    for (const directory of temporaryDirectories.splice(0)) {
        rmSync(directory, { recursive: true, force: true });
    }
});

function configureTemporarySessionStore() {
    const directory = mkdtempSync(join(tmpdir(), "smage-schema-test-"));
    temporaryDirectories.push(directory);
    configureSessionStore(directory);
    return directory;
}

function makeRecords(count = 8) {
    return Array.from({ length: count }, (_, index) => ({
        id: 1000 + index,
        displayName: `Operator ${index + 1}`,
        region: index % 2 === 0 ? "north" : "south",
        status: "active",
        owner: index % 3 === 0 ? "Maya" : "Noah",
        enabled: index % 2 === 0,
    }));
}

function fixtureMessage(content: string): SMAGEMessage {
    return {
        role: "user",
        content,
        meta: { priority: 3, relevance: 0.95 },
    };
}

async function payloadWithSchemaOption(
    content: string,
    session: string,
    schemaFactoring: boolean,
    baselineFreeze = false,
) {
    return applyPayloadCompression(
        [fixtureMessage(content)],
        {
            schemaFactoring,
            baselineFreeze,
            maxPayloadChars: 20_000,
        },
        session,
    );
}

describe("opt-in schema factoring", () => {
    it("round-trips supported repeated scalar records and includes reference overhead in its estimate", () => {
        configureTemporarySessionStore();
        const original = JSON.stringify(makeRecords(), null, 2);
        const factored = factorJsonRecords(original, "round-trip-session");

        expect(factored).not.toBeNull();
        expect(factored?.estimatedTokensAfter).toBeLessThan(
            factored?.estimatedTokensBefore ?? 0,
        );

        const restored = restoreFactoredJson(
            factored?.content ?? "",
            "round-trip-session",
            factored?.reference ?? "",
        );
        expect(restored).not.toBeNull();
        expect(JSON.parse(restored ?? "null")).toEqual(JSON.parse(original));
    });

    it("decodes during reconstruction only for the owning active session", async () => {
        configureTemporarySessionStore();
        const original = JSON.stringify(makeRecords(), null, 2);
        const [encoded] = await payloadWithSchemaOption(
            original,
            "reconstruct-owner",
            true,
        );
        expect(encoded?.meta?.schemaFactored).toBe(true);

        const withoutSession = reconstruct([encoded as SMAGEMessage], {}, "other-session");
        expect(withoutSession[0]?.content).toBe(encoded?.content);

        const restored = reconstruct([encoded as SMAGEMessage], {}, "reconstruct-owner");
        expect(JSON.parse(String(restored[0]?.content))).toEqual(
            JSON.parse(original),
        );
        expect(restored[0]?.meta?.schemaFactored).toBeUndefined();
    });

    it("keeps unsupported and malformed content identical to the ordinary payload path", async () => {
        configureTemporarySessionStore();
        const inputs = [
            "{ malformed json",
            JSON.stringify({ rows: makeRecords() }, null, 2),
            JSON.stringify([
                ...makeRecords().slice(0, 2),
                { id: 3, displayName: "nested", region: "north", status: "active", owner: "Maya", enabled: true, extra: { value: 1 } },
            ]),
        ];

        for (const [index, input] of inputs.entries()) {
            const ordinary = await payloadWithSchemaOption(
                input,
                `unsupported-${index}`,
                false,
            );
            const optIn = await payloadWithSchemaOption(
                input,
                `unsupported-${index}`,
                true,
            );
            expect(optIn).toEqual(ordinary);
        }
    });

    it("does not reuse references or schemas across sessions", () => {
        configureTemporarySessionStore();
        const input = JSON.stringify(makeRecords(), null, 2);
        const first = factorJsonRecords(input, "session-alpha");
        const second = factorJsonRecords(input, "session-beta");

        expect(first).not.toBeNull();
        expect(second).not.toBeNull();
        expect(first?.reference).not.toBe(second?.reference);
        expect(
            restoreFactoredJson(
                first?.content ?? "",
                "session-beta",
                first?.reference ?? "",
            ),
        ).toBeNull();
        expect(Object.keys(getSessionSchemaRegistry("session-beta"))).toEqual([
            second?.reference,
        ]);
    });

    it("avoids a generated reference that occurs literally in the source", () => {
        configureTemporarySessionStore();
        const first = factorJsonRecords(
            JSON.stringify(makeRecords(), null, 2),
            "collision-session",
        );
        expect(first).not.toBeNull();

        const collisionRecords = makeRecords();
        const firstRecord = collisionRecords[0];
        if (!firstRecord) throw new Error("Expected schema fixture row");
        firstRecord.owner = first?.reference ?? "";
        const collisionSource = JSON.stringify(collisionRecords, null, 2);
        const second = factorJsonRecords(collisionSource, "collision-session");

        expect(second).not.toBeNull();
        expect(collisionSource).toContain(first?.reference ?? "");
        expect(second?.reference).not.toBe(first?.reference);
        expect(JSON.parse(
            restoreFactoredJson(
                second?.content ?? "",
                "collision-session",
                second?.reference ?? "",
            ) ?? "null",
        )).toEqual(JSON.parse(collisionSource));
    });

    it("clears registry entries when a session is deleted or expires", () => {
        const directory = configureTemporarySessionStore();
        const input = JSON.stringify(makeRecords(), null, 2);

        factorJsonRecords(input, "deleted-schema-session");
        expect(Object.keys(getSessionSchemaRegistry("deleted-schema-session"))).toHaveLength(1);
        expect(cacheDelete("deleted-schema-session")).toBe(true);
        expect(getSessionSchemaRegistry("deleted-schema-session")).toEqual({});

        factorJsonRecords(input, "expired-schema-session");
        const store = new FileSessionStore(directory);
        const record = store.inspect("expired-schema-session");
        if (!record) throw new Error("Expected active schema session");
        writeFileSync(
            join(directory, "expired-schema-session.json"),
            `${JSON.stringify({ ...record, expiresAt: Date.now() - 1 })}\n`,
        );

        expect(store.get("expired-schema-session")).toBeNull();
        expect(store.inspect("expired-schema-session")?.schemaRegistry).toEqual({});
        expect(
            JSON.parse(
                readFileSync(
                    join(directory, "expired-schema-session.json.bak"),
                    "utf8",
                ),
            ).schemaRegistry,
        ).toEqual({});
    });

    it("leaves default and baselineFreeze output unchanged, including the structured-config freeze fixture", async () => {
        configureTemporarySessionStore();
        const original = JSON.stringify(makeRecords(), null, 2);
        const baseline = await payloadWithSchemaOption(
            original,
            "default-parity",
            false,
        );
        const freezeWithOptInRequested = await payloadWithSchemaOption(
            original,
            "default-parity",
            true,
            true,
        );
        expect(freezeWithOptInRequested).toEqual(baseline);

        const structuredCase = freezeCorpus.find(
            (entry) => entry.id === "structured-config",
        );
        if (!structuredCase) throw new Error("Structured freeze fixture missing");
        const frozenDefault = await applyPayloadCompression(
            structuredCase.messages,
            { baselineFreeze: true },
        );
        const frozenWithSchemaEnabled = await applyPayloadCompression(
            structuredCase.messages,
            { baselineFreeze: true, schemaFactoring: true },
            "structured-freeze-session",
        );
        expect(frozenWithSchemaEnabled).toEqual(frozenDefault);
    });
});
