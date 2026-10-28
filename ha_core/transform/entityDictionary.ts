import { createHash } from "node:crypto";
import { estimateSchemaTokens } from "./schemaFactoring.js";

// this file implements entity dictionary compression for repeated title-cased multiword names.
const MARKER = "$smageEntityDict";
const VERSION = 1;
const CANDIDATE =
    /\p{Lu}[\p{L}\p{M}\p{N}'’.-]*(?:[ \t]+\p{Lu}[\p{L}\p{M}\p{N}'’.-]*){1,4}/gu;

export interface EntityDictionaryPacket {
    content: string;
    reference: string;
    estimatedTokensBefore: number;
    estimatedTokensAfter: number;
    entityCount: number;
}

interface EntityPacket {
    [MARKER]: typeof VERSION;
    reference: string;
    entries: [string, string][];
    text: string;
}

function referenceFor(session: string, entries: [string, string][]): string {
    return createHash("sha256")
        .update(`${session}\0${JSON.stringify(entries)}`)
        .digest("hex")
        .slice(0, 24);
}

function candidatesIn(text: string): Map<string, number> {
    const counts = new Map<string, number>();
    const pattern = new RegExp(CANDIDATE.source, CANDIDATE.flags);
    for (const match of text.matchAll(pattern)) {
        const value = match[0];
        counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return counts;
}

/**
 * Replace repeated exact title-cased multiword names with handles.
 * The dictionary is carried inline and included in the token estimate.
 */
export function factorRepeatedEntities(
    content: string,
    session: string,
): EntityDictionaryPacket | null {
    if (!session.trim()) return null;
    const counts = candidatesIn(content);
    const entities = [...counts.entries()]
        .filter(([, count]) => count >= 2)
        .map(([value]) => value)
        .sort(
            (left, right) =>
                right.length - left.length ||
                (left < right ? -1 : left > right ? 1 : 0),
        );
    if (entities.length === 0) return null;

    const entries: [string, string][] = [];
    for (const entity of entities) {
        let handleIndex = entries.length;
        let handle = `SMAGE_ENTITY_${handleIndex}_REF`;
        while (
            content.includes(handle) ||
            entries.some(([existing]) => existing === handle)
        ) {
            handleIndex += 1;
            handle = `SMAGE_ENTITY_${handleIndex}_REF`;
        }
        entries.push([handle, entity]);
    }

    const sortedEntries = entries.sort(
        (left, right) =>
            right[1].length - left[1].length ||
            (left[1] < right[1] ? -1 : left[1] > right[1] ? 1 : 0),
    );
    const text = sortedEntries.reduce(
        (result, [handle, entity]) => result.replaceAll(entity, handle),
        content,
    );
    const reference = referenceFor(session, sortedEntries);
    const packet: EntityPacket = {
        [MARKER]: VERSION,
        reference,
        entries: sortedEntries,
        text,
    };
    const encoded = JSON.stringify(packet);
    const estimatedTokensBefore = estimateSchemaTokens(content);
    const estimatedTokensAfter = estimateSchemaTokens(encoded);
    if (estimatedTokensAfter >= estimatedTokensBefore) return null;

    return {
        content: encoded,
        reference,
        estimatedTokensBefore,
        estimatedTokensAfter,
        entityCount: sortedEntries.length,
    };
}

/** Restore an inline entity dictionary only for the session that encoded it. */
export function restoreRepeatedEntities(
    content: string,
    session: string,
    expectedReference: string,
): string | null {
    let value: unknown;
    try {
        value = JSON.parse(content) as unknown;
    } catch {
        return null;
    }
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return null;
    }
    const packet = value as Partial<EntityPacket>;
    if (
        packet[MARKER] !== VERSION ||
        packet.reference !== expectedReference ||
        typeof packet.text !== "string" ||
        !Array.isArray(packet.entries) ||
        !packet.entries.every(
            (entry) =>
                Array.isArray(entry) &&
                entry.length === 2 &&
                typeof entry[0] === "string" &&
                typeof entry[1] === "string",
        )
    ) {
        return null;
    }

    const entries = packet.entries as [string, string][];
    if (referenceFor(session, entries) !== expectedReference) return null;
    let restored = packet.text;
    for (const [handle, entity] of entries) {
        restored = restored.replaceAll(handle, entity);
    }
    return restored;
}
