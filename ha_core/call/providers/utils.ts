import type { ProviderRequest, ProviderResponse } from "./interface";
import { reversibleLog } from "../../cache/log";

export function shapeOutput(role: string, content: string): ProviderResponse {
    return { role, content };
}

export function logProviderIO(
    session: string,
    provider: string,
    req: ProviderRequest,
    res: ProviderResponse,
) {
    reversibleLog(session, {
        provider,
        request: req,
        response: res,
        ts: Date.now(),
    });
}
