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

interface CompactEntityPacket {
    $e: 2;
    d: [string, string][];
    t: string;
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
function factorEntities(
    content: string,
    session: string,
    compact: boolean,
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
        let handle = compact ? `§${handleIndex}§` : `SMAGE_ENTITY_${handleIndex}_REF`;
        while (
            content.includes(handle) ||
            entries.some(([existing]) => existing === handle)
        ) {
            handleIndex += 1;
            handle = compact ? `§${handleIndex}§` : `SMAGE_ENTITY_${handleIndex}_REF`;
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
    // The compact candidate shortens repeated handles and JSON keys, and omits
    // the inline reference because the same session-bound reference is already
    // carried in message metadata and verified during reconstruction.
    const packet: EntityPacket | CompactEntityPacket = compact
        ? { $e: 2, d: sortedEntries, t: text }
        : {
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

/** Current production encoding used by the opt-in CCR transform. */
export function factorRepeatedEntities(
    content: string,
    session: string,
): EntityDictionaryPacket | null {
    return factorEntities(content, session, false);
}

/** Compact candidate encoding for evaluation; not selected by the CCR pipeline. */
export function factorRepeatedEntitiesCompact(
    content: string,
    session: string,
): EntityDictionaryPacket | null {
    return factorEntities(content, session, true);
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
    const packet = value as Partial<EntityPacket & CompactEntityPacket>;
    const isCompact = packet.$e === 2;
    const entriesValue = isCompact ? packet.d : packet.entries;
    const text = isCompact ? packet.t : packet.text;
    if (
        (!isCompact &&
            (packet[MARKER] !== VERSION ||
                packet.reference !== expectedReference)) ||
        typeof text !== "string" ||
        !Array.isArray(entriesValue) ||
        !entriesValue.every(
            (entry) =>
                Array.isArray(entry) &&
                entry.length === 2 &&
                typeof entry[0] === "string" &&
                entry[0].length > 0 &&
                typeof entry[1] === "string",
        )
    ) {
        return null;
    }

    const entries = entriesValue as [string, string][];
    if (referenceFor(session, entries) !== expectedReference) return null;
    if (new Set(entries.map(([handle]) => handle)).size !== entries.length) {
        return null;
    }
    let restored = text;
    for (const [handle, entity] of entries) {
        restored = restored.replaceAll(handle, entity);
    }
    return restored;
}
