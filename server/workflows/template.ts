/**
 * Path-only template resolver for workflow step inputs.
 *
 * Supported forms:
 * - `{{event.record.id}}` — look up a dotted path on the run context
 * - plain values pass through unchanged
 * - objects and arrays are walked recursively
 *
 * No expression evaluation: a saved workflow must not become arbitrary code.
 */

const TEMPLATE_RE = /^\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}$/;

export type TemplateContext = Record<string, unknown>;

export function resolvePath(
  context: TemplateContext,
  path: string
): unknown {
  const parts = path.split(".");
  let current: unknown = context;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

export function resolveTemplateValue(
  value: unknown,
  context: TemplateContext
): unknown {
  if (typeof value === "string") {
    const match = TEMPLATE_RE.exec(value);
    if (!match) {
      return value;
    }
    return resolvePath(context, match[1] ?? "");
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveTemplateValue(item, context));
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      result[key] = resolveTemplateValue(nested, context);
    }
    return result;
  }

  return value;
}

export function resolveTemplateRecord(
  input: Record<string, unknown>,
  context: TemplateContext
): Record<string, unknown> {
  return resolveTemplateValue(input, context) as Record<string, unknown>;
}

export const __testing = { TEMPLATE_RE };
