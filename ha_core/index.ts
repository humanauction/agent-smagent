export * from "./providerMetadata.js";
export interface SMAGEOptions {
    ast?: boolean;
    maxAge?: number; // ms
    maxPayloadChars?: number;
    maxTokens?: number;
    model?: string;
    strategy?: "auto" | "single" | "round_robin" | "fan_out";
}

export interface SMAGEMessage {
    role: "system" | "user" | "assistant" | "tool" | "summary";
    content: string | any;
    name?: string;
    meta?: Record<string, any>;
}

export interface SMAGECompressParams {
    messages: SMAGEMessage[];
    agent: string;
    session: string;
    options?: SMAGEOptions;
}

export function msg(m: SMAGEMessage): SMAGEMessage {
    return m;
}

export { compress } from "./compress.js";
