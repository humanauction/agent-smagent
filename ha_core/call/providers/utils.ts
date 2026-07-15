import type { ProviderRequest, ProviderResponse } from "./interface.js";
import { reversibleLog } from "../../cache/log.js";

export function shapeOutput(role: string, content: string): ProviderResponse {
    return { role, content };
}

export function logProviderIO(
    session: string,
    provider: string,
    req: ProviderRequest,
    res: ProviderResponse,
) {
    reversibleLog(session, "provider_io", {
        provider,
        request: req,
        response: res,
        ts: Date.now(),
    });
}
