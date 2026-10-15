import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
export default defineConfig({
  plugins: [react(), cloudflare()],
  test: { include: ["src/**/*.test.ts"] },
  build: { chunkSizeWarningLimit: 1100 },
});