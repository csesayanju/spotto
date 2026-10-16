/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  plugins: [react()],
  base: "./", // relative paths so the build works inside the Capacitor WebView
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    rolldownOptions: {
      output: {
        // Libraries in their own files: they change far less often than the game, so
        // returning players keep them cached across releases.
        codeSplitting: {
          groups: [
            { name: "firebase", test: /node_modules[\/](@firebase|firebase)[\/]/ },
            { name: "react", test: /node_modules[\/](react|react-dom|scheduler)[\/]/ },
          ],
        },
      },
    },
  },
  // Rules tests (tests-rules/) need the Firebase emulator, so plain `npm test` skips them.
  test: { include: ["tests/**/*.test.ts"] },
});
