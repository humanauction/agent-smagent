export interface SMAGEOptions {
    ast?: boolean;
    maxAge?: number; // ms
    maxTokens?: number;
    model?: string;
}

export interface SMAGEMessage {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
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

export { compress } from './compress.js';
