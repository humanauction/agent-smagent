import { describe, expect, it } from "vitest";
import type { SMAGEMessage } from "../../ha_core/index.js";
import {
    factorRepeatedEntities,
    restoreRepeatedEntities,
} from "../../ha_core/transform/entityDictionary.js";
import { applyPayloadCompression } from "../../ha_core/transform/payload.js";
import { reconstruct } from "../../ha_core/transform/reconstruct.js";
import { entityDictionaryFixtures } from "./entityDictionaryFixtures.js";

// this file tests:
// entity dictionary factoring, restoration logic;
// ensures repeated title-cased multiword names are correctly factored into a dictionary, restored;
// verifies factoring only occurs when results is positive net savings.
describe("opt-in entity dictionary compression", () => {
    it("factors only when the inline dictionary packet has positive net savings", () => {
        for (const fixture of entityDictionaryFixtures) {
            const factored = factorRepeatedEntities(
                fixture.content,
                `fixture-${fixture.id}`,
            );
            expect(factored !== null, fixture.id).toBe(
                fixture.expectedToFactor,
            );
            if (factored) {
                expect(factored.estimatedTokensAfter, fixture.id).toBeLessThan(
                    factored.estimatedTokensBefore,
                );
                expect(factored.entityCount).toBeGreaterThan(0);
                if (fixture.id === "literal-handle-collision") {
                    const packet = JSON.parse(factored.content) as {
                        entries: [string, string][];
                    };
                    expect(packet.entries[0]?.[0]).not.toBe(
                        "SMAGE_ENTITY_0_REF",
                    );
                }
                expect(
                    restoreRepeatedEntities(
                        factored.content,
                        `fixture-${fixture.id}`,
                        factored.reference,
                    ),
                ).toBe(fixture.content);
            }
        }
    });

    it("binds inline maps to the creating session and rejects stale or malformed references", () => {
        const fixture = entityDictionaryFixtures[0];
        if (!fixture) throw new Error("Entity fixture missing");
        const factored = factorRepeatedEntities(
            fixture.content,
            "entity-session-a",
        );
        const otherSession = factorRepeatedEntities(
            fixture.content,
            "entity-session-b",
        );
        expect(factored).not.toBeNull();
        expect(otherSession?.reference).not.toBe(factored?.reference);
        expect(
            restoreRepeatedEntities(
                factored?.content ?? "{}",
                "entity-session-b",
                factored?.reference ?? "",
            ),
        ).toBeNull();
        expect(
            restoreRepeatedEntities(
                factored?.content ?? "{}",
                "entity-session-a",
                "stale-reference",
            ),
        ).toBeNull();
        expect(
            restoreRepeatedEntities(
                "{ malformed",
                "entity-session-a",
                "anything",
            ),
        ).toBeNull();
    });

    it("keeps ordinary/default and baselineFreeze output unchanged and restores opt-in output", async () => {
        const fixture = entityDictionaryFixtures[0];
        if (!fixture) throw new Error("Entity fixture missing");
        const source: SMAGEMessage = {
            role: "user",
            content: fixture.content,
            meta: { priority: 3, relevance: 0.9 },
        };
        const control = await applyPayloadCompression(
            [source],
            { maxPayloadChars: 20_000 },
            "entity-default-session",
        );
        const defaultWithOption = await applyPayloadCompression(
            [source],
            { entityDictionary: false, maxPayloadChars: 20_000 },
            "entity-default-session",
        );
        const frozen = await applyPayloadCompression(
            [source],
            {
                entityDictionary: true,
                baselineFreeze: true,
                maxPayloadChars: 20_000,
            },
            "entity-frozen-session",
        );
        expect(defaultWithOption).toEqual(control);
        expect(frozen).toEqual(control);

        const session = "entity-reconstruction-session";
        const encoded = await applyPayloadCompression(
            [source],
            { entityDictionary: true, maxPayloadChars: 20_000 },
            session,
        );
        expect(encoded[0]?.meta?.entityDictionaryFactored).toBe(true);
        const withoutOwner = reconstruct(encoded, {}, "another-session");
        expect(withoutOwner[0]?.content).toBe(encoded[0]?.content);
        const restored = reconstruct(encoded, {}, session);
        expect(restored[0]?.content).toBe(fixture.content);
        expect(restored[0]?.meta?.entityDictionaryFactored).toBeUndefined();
    });
});
