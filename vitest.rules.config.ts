import { defineConfig } from "vitest/config";

// Database rules tests run against the Firebase emulator; see tests-rules/rules.test.ts.
export default defineConfig({
  test: { include: ["tests-rules/**/*.test.ts"], environment: "node", testTimeout: 15000 },
});
