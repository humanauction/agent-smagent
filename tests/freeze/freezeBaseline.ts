import { writeFreezeSnapshot } from "./freezeSnapshot.js";
import { CCRPipeline } from "../../ha_core/transform/ccr/pipeline.js";
import { ProviderChainRouter } from "../../ha_core/call/providers/chainRouter.js";
import { ProviderChainTelemetry } from "../../ha_core/call/providers/chainTelemetry.js";
import { mockMessages } from "../utils/mockMessages.js";
import { mockConfig } from "../utils/mockConfig.js";

// this file runs freeze suite once, writes snapshots

export async function generateFreezeBaseline() {
    // CCR baseline
    const ccr = new CCRPipeline(new ProviderChainTelemetry());
    const agent = mockConfig.agents[0];

    if (!agent) throw new Error("No agent found in mockConfig");

    const ccrOptions = {
        provider: agent.provider,
        depth: agent.depth ?? 0,
        cost: agent.cost ?? 0,
        quality: agent.quality ?? 0,
        reliability: 0.9,
        baselineFreeze: true,
    };

    const ccrOut = await ccr.run(mockConfig.session, mockMessages, ccrOptions);
    writeFreezeSnapshot("ccr", ccrOut);

    // ChainRouter baseline
    const chainConfig = {
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

    const router = new ProviderChainRouter(chainConfig, "freeze-session");
    const chainOut = router.getTelemetry();
    writeFreezeSnapshot("chainRouter", chainOut);

    return true;
}
