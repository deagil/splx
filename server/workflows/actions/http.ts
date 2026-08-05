import { z } from "zod";
import { assertPublicUrl } from "@/server/lib/safe-url";
import type { WorkflowAction } from "./types";

const HTTP_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 64 * 1024;

export const httpInputSchema = z.object({
  body: z.unknown().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
  url: z.string().url(),
});

export type HttpInput = z.infer<typeof httpInputSchema>;

async function readCappedBody(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    return "";
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (!value) {
      continue;
    }
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      reader.cancel().catch(() => undefined);
      throw new Error(`Response exceeded ${MAX_RESPONSE_BYTES} bytes`);
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export const httpAction: WorkflowAction<typeof httpInputSchema> = {
  async execute(input) {
    let url = await assertPublicUrl(input.url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

    try {
      // Manual redirect handling so each hop is re-checked for SSRF.
      let response = await fetch(url, {
        body:
          input.method === "GET" || input.method === "DELETE"
            ? undefined
            : JSON.stringify(input.body ?? {}),
        headers: {
          "content-type": "application/json",
          ...input.headers,
        },
        method: input.method,
        redirect: "manual",
        signal: controller.signal,
      });

      let redirects = 0;
      while (
        response.status >= 300 &&
        response.status < 400 &&
        response.headers.get("location") &&
        redirects < 5
      ) {
        const next = new URL(
          response.headers.get("location") ?? "",
          url
        ).toString();
        url = await assertPublicUrl(next);
        redirects += 1;
        response = await fetch(url, {
          body:
            input.method === "GET" || input.method === "DELETE"
              ? undefined
              : JSON.stringify(input.body ?? {}),
          headers: {
            "content-type": "application/json",
            ...input.headers,
          },
          method: input.method,
          redirect: "manual",
          signal: controller.signal,
        });
      }

      const text = await readCappedBody(response);
      let parsed: unknown = text;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text;
      }

      return {
        output: {
          body: parsed,
          status: response.status,
          success: response.ok,
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  },
  schema: httpInputSchema,
  type: "http",
};

export const __testing = { MAX_RESPONSE_BYTES };
