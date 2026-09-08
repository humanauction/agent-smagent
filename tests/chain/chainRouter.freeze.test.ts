import { describe, it, expect } from "vitest";
import { ProviderChainRouter } from "../../ha_core/call/providers/chainRouter.js";
import { ProviderChainTelemetry } from "../../ha_core/call/providers/chainTelemetry.js";
import { providers } from "../../ha_core/call/providers/index.js";

describe("ProviderChainRouter baselineFreeze", () => {
    it("keeps provider chain ordering stable", () => {
        const config = {
            metrics: Object.fromEntries(
                Object.keys(providers).map((p) => [
                    p,
                    {
                        speed: 0.5,
                        cost: 0.5,
                        depth: 0.5,
                        quality: 0.5,
                        reliability: 0.5,
                    },
                ]),
            ),
            weights: {
                speed: 1,
                cost: 1,
                depth: 1,
                quality: 1,
                reliability: 1,
            },
        };

        const router1 = new ProviderChainRouter(config, "test-session-1");
        const router2 = new ProviderChainRouter(config, "test-session-2");

        expect(JSON.stringify(router1.getTelemetry())).toBe(
            JSON.stringify(router2.getTelemetry()),
        );
    });
});
