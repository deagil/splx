import { describe, expect, it } from "vitest";
import {
  resolvePath,
  resolveTemplateRecord,
  resolveTemplateValue,
} from "./template";
import { backoffMs, nextRunAfter, MAX_WORKFLOW_DEPTH } from "./constants";
import { evaluateCondition } from "./actions/condition";
import { assertPublicUrl } from "@/server/lib/safe-url";

describe("template resolver", () => {
  const context = {
    event: { payload: { record: { id: "rec-1", name: "Ada" } } },
    steps: [{ output: { status: 200 } }],
  };

  it("resolves dotted paths", () => {
    expect(resolvePath(context, "event.payload.record.id")).toBe("rec-1");
    expect(resolvePath(context, "steps.0.output.status")).toBe(200);
  });

  it("returns undefined for missing paths", () => {
    expect(resolvePath(context, "event.payload.missing")).toBeUndefined();
    expect(resolvePath(context, "nope")).toBeUndefined();
  });

  it("only interpolates full-string templates", () => {
    expect(resolveTemplateValue("{{event.payload.record.id}}", context)).toBe(
      "rec-1"
    );
    expect(
      resolveTemplateValue("prefix {{event.payload.record.id}}", context)
    ).toBe("prefix {{event.payload.record.id}}");
  });

  it("walks objects recursively", () => {
    expect(
      resolveTemplateRecord(
        {
          id: "{{event.payload.record.id}}",
          nested: { name: "{{event.payload.record.name}}" },
        },
        context
      )
    ).toEqual({ id: "rec-1", nested: { name: "Ada" } });
  });
});

describe("condition action", () => {
  it("evaluates comparison operators", () => {
    expect(
      evaluateCondition({ left: "a", operator: "equals", right: "a" })
    ).toBe(true);
    expect(
      evaluateCondition({ left: "a", operator: "not_equals", right: "b" })
    ).toBe(true);
    expect(
      evaluateCondition({ left: 10, operator: "greater_than", right: 5 })
    ).toBe(true);
    expect(
      evaluateCondition({ left: "hello", operator: "contains", right: "ell" })
    ).toBe(true);
    expect(evaluateCondition({ left: null, operator: "is_null" })).toBe(true);
    expect(evaluateCondition({ left: "x", operator: "is_not_null" })).toBe(
      true
    );
  });
});

describe("http action uses shared SSRF guard", () => {
  it("rejects private hosts", async () => {
    await expect(assertPublicUrl("http://127.0.0.1/")).rejects.toThrow(
      /non-public|Refusing/
    );
  });
});

describe("backoff and depth", () => {
  it("grows exponentially and caps at one hour", () => {
    expect(backoffMs(1)).toBe(30_000);
    expect(backoffMs(2)).toBe(120_000);
    expect(backoffMs(3)).toBe(480_000);
    expect(backoffMs(10)).toBe(3_600_000);
  });

  it("computes a future run_after", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(nextRunAfter(1, now).toISOString()).toBe(
      "2026-01-01T00:00:30.000Z"
    );
  });

  it("exposes the depth cap", () => {
    expect(MAX_WORKFLOW_DEPTH).toBe(5);
  });
});
