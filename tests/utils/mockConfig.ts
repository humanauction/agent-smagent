export const mockConfig = {
    session: "test-session",
    strategy: "single",
    agents: [
        {
            id: "agent1",
            provider: "openai",
            model: "gpt-4o-mini",
            options: {
                baselineFreeze: true,
                depth: 2,
                cost: 0.5,
                quality: 0.8,
            },
        },
    ],
};
