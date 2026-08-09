import { describe, expect, it } from "vitest";
import { mergeEmailString } from "./merge";
import {
  extractTokenKeys,
  filterVariables,
  labelFromTokenKey,
  parseTokenString,
  serializeSegments,
  slugifyToTokenKey,
  variablesFingerprint,
} from "./tokens";
import type { EmailTemplateVariable } from "./types";

const variable = (
  key: string,
  label: string,
  type: EmailTemplateVariable["type"] = "string"
): EmailTemplateVariable => ({ key, label, required: true, type });

describe("parseTokenString", () => {
  it("splits literals and tokens in order", () => {
    expect(parseTokenString("Hi {{customer.firstName}}, welcome")).toEqual([
      { text: "Hi ", type: "text" },
      { key: "customer.firstName", type: "token" },
      { text: ", welcome", type: "text" },
    ]);
  });

  it("handles adjacent tokens with no literal between them", () => {
    expect(parseTokenString("{{a}}{{b}}")).toEqual([
      { key: "a", type: "token" },
      { key: "b", type: "token" },
    ]);
  });

  it("ignores braces that are not tokens", () => {
    expect(parseTokenString("a { b } c")).toEqual([
      { text: "a { b } c", type: "text" },
    ]);
  });

  it("is not affected by regex lastIndex across calls", () => {
    const input = "{{a}} {{b}}";
    expect(parseTokenString(input)).toEqual(parseTokenString(input));
  });

  it("round-trips through serializeSegments", () => {
    for (const input of [
      "",
      "plain",
      "{{a}}",
      "x {{a}} y {{b.c}} z",
      "trailing space ",
    ]) {
      expect(serializeSegments(parseTokenString(input))).toBe(input);
    }
  });

  it("agrees with the renderer about what a token is", () => {
    // Both sides read from INLINE_TOKEN_SOURCE; this pins that they stay aligned.
    const input = "{{ spaced.key }} and {{tight}}";
    const keys = extractTokenKeys(input);
    const merged = mergeEmailString(
      input,
      Object.fromEntries(keys.map((key) => [key, "X"]))
    );
    expect(keys).toEqual(["spaced.key", "tight"]);
    expect(merged).toBe("X and X");
  });
});

describe("extractTokenKeys", () => {
  it("dedupes and preserves first-appearance order", () => {
    expect(extractTokenKeys("{{b}} {{a}} {{b}}")).toEqual(["b", "a"]);
  });
});

describe("variablesFingerprint", () => {
  it("changes when a label changes", () => {
    expect(variablesFingerprint([variable("a", "One")])).not.toBe(
      variablesFingerprint([variable("a", "Two")])
    );
  });

  it("does not collide across the key/label boundary", () => {
    expect(variablesFingerprint([variable("a b", "c")])).not.toBe(
      variablesFingerprint([variable("a", "b c")])
    );
  });

  it("is stable for equal values in different array instances", () => {
    expect(variablesFingerprint([variable("a", "A")])).toBe(
      variablesFingerprint([variable("a", "A")])
    );
  });
});

describe("slugifyToTokenKey", () => {
  it("camel-cases prose and drops illegal characters", () => {
    expect(slugifyToTokenKey("first name")).toBe("firstName");
    expect(slugifyToTokenKey("Order #total!")).toBe("OrderTotal");
    expect(slugifyToTokenKey("customer.first name")).toBe("customer.firstName");
  });

  it("refuses to start with a non-letter", () => {
    expect(slugifyToTokenKey("123abc")).toBe("abc");
  });
});

describe("labelFromTokenKey", () => {
  it("humanises the leaf segment", () => {
    expect(labelFromTokenKey("customer.firstName")).toBe("First name");
    expect(labelFromTokenKey("order_total")).toBe("Order total");
    expect(labelFromTokenKey("actionUrl")).toBe("Action url");
  });
});

describe("filterVariables", () => {
  const variables = [
    variable("order.total", "Order total", "number"),
    variable("customer.firstName", "First name"),
    variable("firstVisit", "Visited before", "boolean"),
  ];

  it("returns everything for an empty query", () => {
    expect(filterVariables(variables, "  ")).toHaveLength(3);
  });

  it("ranks label prefixes above key prefixes and substrings", () => {
    const result = filterVariables(variables, "fir");
    expect(result.map((item) => item.key)).toEqual([
      "customer.firstName", // label prefix "First name"
      "firstVisit", // key prefix
    ]);
  });

  it("matches on key when the label does not", () => {
    expect(filterVariables(variables, "order.")[0]?.key).toBe("order.total");
  });
});
