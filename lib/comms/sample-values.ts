/**
 * Placeholder values used to render a template when no real data is available.
 *
 * Both previews (the instant canvas one and the server "true render" iframe)
 * must agree, so they both go through here rather than inventing their own
 * fakes. A template's persisted `sampleData` wins where it has a value.
 */

import type { EmailTemplateVariable } from "@/lib/comms/types";

function placeholderFor(variable: EmailTemplateVariable): string {
  switch (variable.type) {
    case "email":
      return "alex@example.com";
    case "url":
      return "https://example.com";
    case "number":
      return "42";
    case "boolean":
      return "true";
    case "date":
      return "2026-01-15";
    default:
      return variable.label;
  }
}

/** Fallback values derived purely from the declared variable types. */
export function placeholderValues(
  variables: EmailTemplateVariable[]
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const variable of variables) {
    values[variable.key] = placeholderFor(variable);
  }
  return values;
}

/**
 * Author-supplied sample data layered over the type placeholders, restricted to
 * keys the template actually declares so a renamed variable can't leave a stale
 * value behind.
 */
export function resolveSampleValues(
  variables: EmailTemplateVariable[],
  sampleData?: Record<string, unknown> | null
): Record<string, string> {
  const values = placeholderValues(variables);
  if (!sampleData) {
    return values;
  }
  for (const variable of variables) {
    const supplied = sampleData[variable.key];
    if (supplied === null || supplied === undefined || supplied === "") {
      continue;
    }
    values[variable.key] = String(supplied);
  }
  return values;
}
