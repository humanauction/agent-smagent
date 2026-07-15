import type {
    ProviderAdapter,
    ProviderRequest,
    ProviderResponse,
} from "./interface.js";
import { OpenAIAdapter } from "./openai.js";
import { AnthropicAdapter } from "./anthropic.js";
import { GoogleAdapter } from "./google.js";
import { LocalAdapter } from "./local.js";

export * from "./anthropic.js";
export * from "./google.js";
export * from "./interface.js";
export * from "./local.js";
export * from "./openai.js";
export * from "./roles.js";
export * from "./utils.js";

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

// unified call entrypoint for proxy / MCP / wrappers
export async function callProvider(
    req: ProviderRequest,
): Promise<ProviderResponse> {
    const provider = getProvider(req.options?.provider ?? "openai");
    return provider.call(req);
}
