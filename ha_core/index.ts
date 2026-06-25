export interface SMAGEOptions {
    ast?: boolean;
    maxAge?: number; // ms
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
export { compress } from "./compress";
