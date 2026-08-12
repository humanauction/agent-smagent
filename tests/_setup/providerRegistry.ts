import { providers } from "../../ha_core/call/providers/index.js";
import {
    mockSuccessProvider,
    mockFailureProvider,
    mockRetryableProvider,
    mockSlowProvider,
    mockDeepProvider,
} from "../_mocks/providers.js";

// Reset all providers before each test suite
export function installMockProviders() {
    providers["openai"] = mockSuccessProvider("openai");
    providers["anthropic"] = mockSuccessProvider("anthropic");
    providers["google"] = mockSuccessProvider("google");
    providers["local"] = mockSuccessProvider("local");
}

// Optional: install special-case mocks
export function installRetryMocks() {
    providers["openai"] = mockRetryableProvider("openai");
    providers["anthropic"] = mockSuccessProvider("anthropic");
}

export function installFailureMocks() {
    providers["openai"] = mockFailureProvider("openai");
    providers["anthropic"] = mockSuccessProvider("anthropic");
}

export function installSlowMocks() {
    providers["openai"] = mockSlowProvider("openai", 200);
    providers["anthropic"] = mockSuccessProvider("anthropic");
}

export function installDeepMocks() {
    providers["openai"] = mockDeepProvider("openai");
    providers["anthropic"] = mockSuccessProvider("anthropic");
}
