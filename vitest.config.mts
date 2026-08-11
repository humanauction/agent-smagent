import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",

        // Only run tests in /tests
        include: ["tests/**/*.test.ts"],

        // Exclude dist and internal test files
        exclude: [
            "**/*.integration.test.ts", // stage 2 integration test. npx vitest --run --include tests/providers/openai.integration.test.ts
            "dist",
            "ha_core/**/*",
            "ha_proxy/**/*",
            "ha_mcp/**/*",
            "ha_wrap/**/*",
            "ha_cli/**/*",
            "ha_docs/**/*",
            "ha_learn/**/*",
            "smage/**/*",
        ],
    },
});
