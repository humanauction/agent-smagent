import { defineConfig } from "vitest/config";

export default defineConfig({
    // Vitest inherits Vite's resolver at the top level
    resolve: {
        extensions: [".ts", ".js", ".mjs"],
        alias: {
            "@core": "./ha_core",
            "@proxy": "./ha_proxy",
            "@wrap": "./ha_wrap",
            "@learn": "./ha_learn",
            "@cli": "./ha_cli",
            "@docs": "./ha_docs",
            "@mcp": "./ha_mcp",
        },
    },

    test: {
        globals: true,
        environment: "node",

        setupFiles: ["./tests/setup.ts"],

        // Discover all .test.ts files
        include: ["tests/**/*.test.ts"],

        // Use dedicated test tsconfig
        typecheck: {
            tsconfig: "tests/tsconfig.test.json",
        },

        root: ".",

        // Only exclude integration tests + mocks
        exclude: [
            "**/*.integration.test.ts",
            "dist",
            "tests/_mocks",
            "tests/_setup",
        ],
    },
});
