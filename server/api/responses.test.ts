import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, handleError, success } from "./responses";

describe("handleError", () => {
  it('maps Error("Unauthorized") to 401', async () => {
    // Regression: resolveTenantContext() throws this when there is no session,
    // and all ten copies of the old handleError fell through to 500.
    const response = handleError(new Error("Unauthorized"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Unauthorized",
    });
  });

  it('maps Error("Forbidden") to 403', async () => {
    const response = handleError(new Error("Forbidden"));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "Forbidden" });
  });

  it("maps tenant resolution failures to 403 rather than 500", async () => {
    for (const message of [
      "Workspace membership required",
      "Missing role assignment for workspace",
    ]) {
      expect(handleError(new Error(message)).status).toBe(403);
    }
  });

  it("maps ZodError to 400 with flattened issues", async () => {
    const schema = z.object({ name: z.string() });
    let caught: unknown;
    try {
      schema.parse({ name: 123 });
    } catch (error) {
      caught = error;
    }

    const response = handleError(caught);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe("Validation failed");
    expect(body.issues).toHaveLength(1);
    expect(body.issues[0].path).toBe("name");
  });

  it("honours ApiError status codes", async () => {
    const response = handleError(new ApiError(404, "Record not found"));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: "Record not found",
    });
  });

  it("does not leak internal error messages on unexpected failures", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {
      /* silence */
    });

    // The old handleError returned { error: error.message }, which surfaced SQL
    // text and connection strings to the client.
    const secret = 'syntax error at or near "postgres://user:pw@host/db"';
    const response = handleError(new Error(secret));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
    expect(JSON.stringify(body)).not.toContain("postgres://");

    // ...but it is still logged server-side.
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("threads the requestId through error responses", async () => {
    const response = handleError(new Error("Forbidden"), "req-123");
    await expect(response.json()).resolves.toMatchObject({
      requestId: "req-123",
    });
  });
});

describe("success", () => {
  it("wraps payloads in a data envelope", async () => {
    const response = success({ record: { id: 1 } });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { record: { id: 1 } },
    });
  });

  it("includes meta only when provided", async () => {
    const withMeta = await success({ records: [] }, {
      meta: { pagination: { total: 0 } },
    }).json();
    expect(withMeta.meta).toEqual({ pagination: { total: 0 } });

    const withoutMeta = await success({ records: [] }).json();
    expect(withoutMeta).not.toHaveProperty("meta");
  });

  it("honours a custom status", () => {
    expect(success({ record: {} }, { status: 201 }).status).toBe(201);
  });
});
