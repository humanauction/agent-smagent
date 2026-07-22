import { BaseWrapper } from "./shared/baseWrapper.js";

import { ClaudeWrapper } from "./claude/claudeWrapper.js";
import { AiderWrapper } from "./aider/aiderWrapper.js";
import { CursorWrapper } from "./cursor/cursorWrapper.js";
import { CopilotWrapper } from "./copilot/copilotWrapper.js";
import { OpencodeWrapper } from "./opencode/opencodeWrapper.js";

import { SMAGEAgent } from "./agent.js";
import { SMAGEMultiAgent } from "./multi_agent.js";
import { SMAGEOrchestrator } from "./orchestrator.js";

// ---------------- PROVIDER WRAPPERS ----------------

export type ProviderWrapperId =
    | "claude"
    | "aider"
    | "cursor"
    | "copilot"
    | "opencode";

export const PROVIDER_WRAPPERS: Record<ProviderWrapperId, BaseWrapper> = {
    claude: new ClaudeWrapper(),
    aider: new AiderWrapper(),
    cursor: new CursorWrapper(),
    copilot: new CopilotWrapper(),
    opencode: new OpencodeWrapper(),
};

export function getProviderWrapper(id: ProviderWrapperId): BaseWrapper {
    return PROVIDER_WRAPPERS[id];
}

// ---------------- SMAGE WRAPPERS ----------------

export type SMAGEWrapperId = "agent" | "multi" | "orchestrator";

export interface WrapperRegistryEntry {
    id: SMAGEWrapperId;
    instance: SMAGEAgent | SMAGEMultiAgent | SMAGEOrchestrator;
}

export class WrapperRegistry {
    private registry = new Map<SMAGEWrapperId, WrapperRegistryEntry>();

    register(id: SMAGEWrapperId, instance: WrapperRegistryEntry["instance"]) {
        this.registry.set(id, { id, instance });
    }

    get(id: SMAGEWrapperId): WrapperRegistryEntry["instance"] {
        const entry = this.registry.get(id);
        if (!entry) {
            throw new Error(`Wrapper not found: ${id}`);
        }
        return entry.instance;
    }

    list(): WrapperRegistryEntry[] {
        return [...this.registry.values()];
    }
}

export const wrapperRegistry = new WrapperRegistry();

// 1. Single agent wrapper
wrapperRegistry.register("agent", new SMAGEAgent());

// 2. Multi-agent wrapper
wrapperRegistry.register(
    "multi",
    new SMAGEMultiAgent([
        { id: "openai-fast", provider: "openai", model: "gpt-4o-mini" },
        { id: "anthropic-deep", provider: "anthropic", model: "claude-3-opus" },
    ]),
);

// 3. Orchestrator
wrapperRegistry.register(
    "orchestrator",
    new SMAGEOrchestrator({
        session: "default-session",
        strategy: "auto",
        agents: [
            { id: "openai-fast", provider: "openai", model: "gpt-4o-mini" },
            {
                id: "anthropic-deep",
                provider: "anthropic",
                model: "claude-3-opus",
            },
        ],
    }),
);
