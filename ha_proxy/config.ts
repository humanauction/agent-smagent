// this file contains the configuration for the HA Proxy server, including the port and provider API keys.
export const config = {
    port: process.env.HA_PROXY_PORT ?? 8000,
    providers: {
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        google: process.env.GOOGLE_API_KEY,
    },
};
