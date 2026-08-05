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
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "."),
    },
  },
  test: {
    environment: "node",
    // The `*.integration.test.ts` files share one database and truncate the
    // tables they assert on, so running files in parallel makes them clobber
    // each other. The whole suite runs in ~2s, so serialising it costs nothing.
    fileParallelism: false,
    include: ["server/**/*.test.ts"],
  },
});
