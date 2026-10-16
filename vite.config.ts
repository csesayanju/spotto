/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json";

export default defineConfig({
  plugins: [react()],
  base: "./", // relative paths so the build works inside the Capacitor WebView
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // Rules tests (tests-rules/) need the Firebase emulator, so plain `npm test` skips them.
  test: { include: ["tests/**/*.test.ts"] },
});
