import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for the API control plane and shared `lib/` logic.
 *
 * Deliberately scoped to `server/**` and `lib/**` so it does not collide with
 * the Playwright suite under `tests/`, which `pnpm test` still owns. Run with
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
    // `lib/ai/models.test.ts` is not a suite — it is an orphaned copy of the
    // Playwright mock models (the live one is `lib/ai/models.mock.ts`, which is
    // what `lib/ai/providers.ts` requires) that only kept the `.test.ts` suffix.
    exclude: ["**/node_modules/**", "lib/ai/models.test.ts"],
    // The `*.integration.test.ts` files share one database and truncate the
    // tables they assert on, so running files in parallel makes them clobber
    // each other. The whole suite runs in ~2s, so serialising it costs nothing.
    fileParallelism: false,
    include: ["server/**/*.test.ts", "lib/**/*.test.ts"],
  },
});
