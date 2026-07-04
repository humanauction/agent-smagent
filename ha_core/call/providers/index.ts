import type { ProviderAdapter } from "./interface";
import { OpenAIAdapter } from "./openai";
import { AnthropicAdapter } from "./anthropic";
import { GoogleAdapter } from "./google";
import { LocalAdapter } from "./local";

// this file defines available provider adapters

export const providers: Record<string, ProviderAdapter> = {
    openai: OpenAIAdapter,
    anthropic: AnthropicAdapter,
    google: GoogleAdapter,
    local: LocalAdapter,
};
// function gets a provider adapter by name
export function getProvider(name: string): ProviderAdapter {
    const p = providers[name];
    if (!p) throw new Error(`Unknown provider: ${name}`);
    return p;
}
