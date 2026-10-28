import { createHash } from "node:crypto";
import {
    getSessionSchemaRegistry,
    putSessionSchemaRegistry,
} from "../cache/store.js";
import { tokenCount } from "../analyze/tokens.js";

const PACKET_MARKER = "$smageSchema";
const SCHEMA_VERSION = 1;
const MIN_RECORDS = 3;
const MAX_REFERENCE_ATTEMPTS = 10_000;

export type JsonScalarType = "string" | "number" | "boolean" | "null";

export interface SchemaDefinition {
    version: typeof SCHEMA_VERSION;
    fields: string[];
    types: JsonScalarType[];
}

export interface SchemaRegistryAccess {
    read(session: string): Record<string, unknown>;
    write(session: string, registry: Record<string, unknown>): void;
}

export interface FactoredJson {
    content: string;
    reference: string;
    estimatedTokensBefore: number;
    estimatedTokensAfter: number;
}

const sessionRegistry: SchemaRegistryAccess = {
    read: getSessionSchemaRegistry,
    write: putSessionSchemaRegistry,
};

function scalarType(value: unknown): JsonScalarType | null {
    if (value === null) return "null";
    if (typeof value === "string") return "string";
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "number" && Number.isFinite(value)) {
        return Object.is(value, -0) ? null : "number";
    }
    return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSchemaDefinition(value: unknown): value is SchemaDefinition {
    if (!isRecord(value)) return false;
    if (value.version !== SCHEMA_VERSION) return false;
    if (!Array.isArray(value.fields) || !Array.isArray(value.types)) return false;
    if (value.fields.length === 0 || value.fields.length !== value.types.length) {
        return false;
    }
    if (!value.fields.every((field) => typeof field === "string")) return false;
    const validTypes = new Set(["string", "number", "boolean", "null"]);
    return value.types.every((type) => validTypes.has(String(type)));
}

function sameSchema(left: SchemaDefinition, right: SchemaDefinition) {
    return (
        JSON.stringify(left.fields) === JSON.stringify(right.fields) &&
        JSON.stringify(left.types) === JSON.stringify(right.types)
    );
}

export function estimateSchemaTokens(jsonText: string): number {
    try {
        JSON.parse(jsonText);
    } catch {
        return tokenCount(jsonText);
    }

    const lexemes =
        jsonText.match(
            /"(?:\\.|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}\[\]:,]/g,
        ) ?? [];

    return lexemes.reduce((total, lexeme) => {
        if (!lexeme.startsWith('"')) return total + 1;
        try {
            const value: unknown = JSON.parse(lexeme);
            return total + (typeof value === "string" ? Math.max(1, tokenCount(value)) : 1);
        } catch {
            return total + 1;
        }
    }, 0);
}

function buildDefinition(records: unknown[]): SchemaDefinition | null {
    if (records.length < MIN_RECORDS) return null;
    const first = records[0];
    if (!isRecord(first)) return null;

    const fields = Object.keys(first);
    if (fields.length < 2 || new Set(fields).size !== fields.length) return null;

    const types: JsonScalarType[] = [];
    for (const field of fields) {
        const type = scalarType(first[field]);
        if (!type) return null;
        types.push(type);
    }

    for (const record of records) {
        if (!isRecord(record)) return null;
        const recordFields = Object.keys(record);
        if (JSON.stringify(recordFields) !== JSON.stringify(fields)) return null;
        for (let index = 0; index < fields.length; index++) {
            const field = fields[index];
            const expectedType = types[index];
            if (!field || !expectedType || scalarType(record[field]) !== expectedType) {
                return null;
            }
        }
    }

    return { version: SCHEMA_VERSION, fields, types };
}

function makeReference(
    session: string,
    definition: SchemaDefinition,
    source: string,
    registry: Record<string, unknown>,
): string | null {
    const signature = JSON.stringify(definition);

    for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt++) {
        const digest = createHash("sha256")
            .update(session + "\0" + signature + "\0" + attempt)
            .digest("hex")
            .slice(0, 24);
        const reference = "SMAGE_SCHEMA_" + digest + "_REF";

        // Never emit a handle that already appears literally in this input.
        if (source.includes(reference)) continue;

        const existing = registry[reference];
        if (existing === undefined) return reference;
        if (isSchemaDefinition(existing) && sameSchema(existing, definition)) {
            return reference;
        }
    }

    return null;
}

/**
 * Factor a root JSON array of at least three same-shaped scalar records.
 * Returns null without changing state when input is unsupported or the
 * session-local reference packet does not reduce the JSON token estimate.
 */
export function factorJsonRecords(
    content: string,
    session: string,
    registryAccess: SchemaRegistryAccess = sessionRegistry,
): FactoredJson | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(content) as unknown;
    } catch {
        return null;
    }
    if (!Array.isArray(parsed)) return null;

    const definition = buildDefinition(parsed);
    if (!definition) return null;

    const registry = registryAccess.read(session);
    const reference = makeReference(session, definition, content, registry);
    if (!reference) return null;

    const rows = parsed.map((record) =>
        definition.fields.map((field) => (record as Record<string, unknown>)[field]),
    );
    const output = JSON.stringify({
        [PACKET_MARKER]: SCHEMA_VERSION,
        reference,
        fields: definition.fields,
        types: definition.types,
        rows,
    });

    const estimatedTokensBefore = estimateSchemaTokens(content);
    const estimatedTokensAfter = estimateSchemaTokens(output);
    if (estimatedTokensAfter >= estimatedTokensBefore) return null;

    registry[reference] = definition;
    registryAccess.write(session, registry);
    return {
        content: output,
        reference,
        estimatedTokensBefore,
        estimatedTokensAfter,
    };
}

/** Restore a factored packet only with the matching active session registry. */
export function restoreFactoredJson(
    content: string,
    session: string,
    expectedReference: string,
    registryAccess: SchemaRegistryAccess = sessionRegistry,
): string | null {
    let packet: unknown;
    try {
        packet = JSON.parse(content) as unknown;
    } catch {
        return null;
    }
    if (!isRecord(packet) || packet[PACKET_MARKER] !== SCHEMA_VERSION) {
        return null;
    }
    if (
        packet.reference !== expectedReference ||
        !Array.isArray(packet.fields) ||
        !Array.isArray(packet.types) ||
        !Array.isArray(packet.rows)
    ) {
        return null;
    }

    const definition = registryAccess.read(session)[expectedReference];
    if (!isSchemaDefinition(definition)) return null;

    const packetDefinition: SchemaDefinition = {
        version: SCHEMA_VERSION,
        fields: packet.fields as string[],
        types: packet.types as JsonScalarType[],
    };
    if (!sameSchema(definition, packetDefinition)) return null;

    const records: Record<string, unknown>[] = [];
    for (const row of packet.rows) {
        if (
            !Array.isArray(row) ||
            row.length !== definition.fields.length ||
            row.some((value, index) => scalarType(value) !== definition.types[index])
        ) {
            return null;
        }

        const record: Record<string, unknown> = {};
        definition.fields.forEach((field, index) => {
            Object.defineProperty(record, field, {
                value: row[index],
                enumerable: true,
                configurable: true,
                writable: true,
            });
        });
        records.push(record);
    }

    return JSON.stringify(records);
}
