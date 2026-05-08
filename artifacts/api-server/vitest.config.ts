import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ["./src/test/env-setup.ts"],
    sequence: { concurrent: false },
    fileParallelism: false,
    reporter: "verbose",
  },
});
