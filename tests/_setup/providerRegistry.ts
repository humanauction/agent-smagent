import { providers } from "../../ha_core/call/providers/index.js";
import {
    mockSuccess,
    mockFailure,
    mockRetry,
    mockFallback,
} from "../_mocks/providers.js";

// Default: everything succeeds
export function installMockProviders() {
    providers["openai"] = mockSuccess("openai");
    providers["anthropic"] = mockSuccess("anthropic");
    providers["google"] = mockSuccess("google");
    providers["local"] = mockSuccess("local");
}

// Fallback tests
export function installFallbackMocks() {
    providers["openai"] = mockFailure("openai");
    providers["anthropic"] = mockSuccess("anthropic", "anthropic success");
}

// Multi-provider selection tests
export function installMultiProviderMocks() {
    providers["openai"] = mockSuccess("openai", "[openai] success");
    providers["anthropic"] = mockSuccess("anthropic", "[anthropic] success");
    providers["google"] = mockSuccess("google", "[google] success");
}

// Retry tests
export function installRetryMocks() {
    providers["openai"] = mockRetry("openai");
    providers["anthropic"] = mockSuccess(
        "anthropic",
        "anthropic fallback success",
    );
}

// Orchestrator fallback tests
export function installOrchestratorFallbackMocks() {
    providers["openai"] = mockFailure("openai");
    providers["anthropic"] = mockFallback("anthropic");
}

export function installFailureMocks() {
    providers["openai"] = mockFailure("openai");
    providers["anthropic"] = mockFailure("anthropic");
    providers["google"] = mockFailure("google");
}

export function installSuccessMocks() {
    providers["openai"] = mockSuccess("openai", "openai success");
    providers["anthropic"] = mockSuccess("anthropic", "anthropic success");
    providers["google"] = mockSuccess("google", "google success");
}
