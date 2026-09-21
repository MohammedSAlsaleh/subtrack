import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    env: {
      AI_INTEGRATIONS_OPENAI_BASE_URL: "http://127.0.0.1:1/v1",
      AI_INTEGRATIONS_OPENAI_API_KEY: "test-only-placeholder",
    },
  },
});
