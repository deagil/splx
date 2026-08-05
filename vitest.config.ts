import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for the API control plane.
 *
 * Deliberately scoped to `server/**` so it does not collide with the Playwright
 * suite under `tests/`, which `pnpm test` still owns. Run with
 * `pnpm test:unit`.
 */
export default defineConfig({
  test: {
    include: ["server/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
