import { describe, it, expect } from "vitest";
import { ProviderChainRouter } from "../../ha_core/call/providers/chainRouter.js";

describe("ProviderChainRouter baselineFreeze", () => {
    it("keeps provider chain ordering stable", () => {
        const config = {
            metrics: {
                openai: {
                    speed: 0.5,
                    cost: 0.5,
                    depth: 0.5,
                    quality: 0.5,
                    reliability: 0.5,
                },
                anthropic: {
                    speed: 0.5,
                    cost: 0.5,
                    depth: 0.5,
                    quality: 0.5,
                    reliability: 0.5,
                },
                google: {
                    speed: 0.5,
                    cost: 0.5,
                    depth: 0.5,
                    quality: 0.5,
                    reliability: 0.5,
                },
                local: {
                    speed: 0.5,
                    cost: 0.5,
                    depth: 0.5,
                    quality: 0.5,
                    reliability: 0.5,
                },
            },
            weights: {
                speed: 1,
                cost: 1,
                depth: 1,
                quality: 1,
                reliability: 1,
            },
            baselineFreeze: true,
        };

        const router1 = new ProviderChainRouter(config, "freeze-session");
        const router2 = new ProviderChainRouter(config, "freeze-session");

        expect(JSON.stringify(router1.getTelemetry())).toBe(
            JSON.stringify(router2.getTelemetry()),
        );
    });
});
