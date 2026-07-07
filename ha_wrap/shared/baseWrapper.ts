import type { SMAGEMessage, SMAGEOptions } from "../../ha_core/index";
import { applyCCR } from "../../ha_core/transform/ccr";
import { reversibleLog } from "../../ha_core/cache/log";

// this file defines the base wrapper class that all wrappers extend.

export interface WrapperConfig {
    id: string; // "claude", "aider", "cursor", etc.
    persona: string; // persona.md content
    rules?: string; // rules.md content
    tools?: SMAGEMessage[]; // tool schema anchors
    memory?: SMAGEMessage[]; // wrapper-specific memory anchors
}

export abstract class BaseWrapper {
    protected config: WrapperConfig;

    constructor(config: WrapperConfig) {
        this.config = config;
    }

    /**
     * Prepare wrapper-specific anchors:
     * - persona anchor
     * - rules anchor
     * - tool schema anchors
     * - wrapper memory anchors
     */
    protected prepareWrapperAnchors(): SMAGEMessage[] {
        const anchors: SMAGEMessage[] = [];

        // Persona anchor
        anchors.push({
            role: "system",
            content: this.config.persona,
            meta: { anchor: true, wrapper: this.config.id },
        });

        // Rules anchor
        if (this.config.rules) {
            anchors.push({
                role: "system",
                content: this.config.rules,
                meta: { anchor: true, wrapper: this.config.id },
            });
        }

        // Tool schema anchors
        if (this.config.tools) {
            for (const tool of this.config.tools) {
                anchors.push({
                    ...tool,
                    meta: {
                        ...tool.meta,
                        anchor: true,
                        wrapper: this.config.id,
                    },
                });
            }
        }

        // Wrapper memory anchors
        if (this.config.memory) {
            for (const mem of this.config.memory) {
                anchors.push({
                    ...mem,
                    meta: {
                        ...mem.meta,
                        anchor: true,
                        wrapper: this.config.id,
                    },
                });
            }
        }

        return anchors;
    }

    /**
     * Main wrapper entrypoint.
     * This is what ha_cli, ha_proxy, and ha_mcp will call.
     */
    async run(
        session: string,
        messages: SMAGEMessage[],
        options: SMAGEOptions,
    ): Promise<SMAGEMessage[]> {
        reversibleLog(session, "wrapper_request", {
            wrapper: this.config.id,
            messages,
        });

        // Inject wrapper anchors
        const wrapperAnchors = this.prepareWrapperAnchors();
        const merged = [...wrapperAnchors, ...messages];

        reversibleLog(session, "wrapper_pre_ccr", {
            wrapper: this.config.id,
            merged,
        });

        // Run CCR pipeline
        const shaped = await applyCCR(merged, this.config.id, session, options);

        reversibleLog(session, "wrapper_post_ccr", {
            wrapper: this.config.id,
            shaped,
        });

        // Provider call (subclass implements this)
        const response = await this.callProvider(session, shaped, options);

        reversibleLog(session, "wrapper_provider_response", {
            wrapper: this.config.id,
            response,
        });

        return response;
    }

    /**
     * Each wrapper defines its respective provider call.
     * wrapper → provider
     * Claude → Anthropic
     * Aider → Local
     * Cursor → OpenAI
     * Copilot → OpenAI
     */

    protected abstract callProvider(
        session: string,
        messages: SMAGEMessage[],
        options: SMAGEOptions,
    ): Promise<SMAGEMessage[]>;
}
