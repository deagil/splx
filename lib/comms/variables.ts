import type { EmailTemplateVariable, EmailVariableType } from "./types";

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

export function coerceEmailVariable(
  type: EmailVariableType,
  value: unknown
): unknown {
  if (isBlank(value)) {
    return value;
  }

  switch (type) {
    case "string":
    case "email":
    case "url":
    case "date":
      return String(value);
    case "number": {
      const n = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(n)) {
        throw new Error(`Expected a number, got ${String(value)}`);
      }
      return n;
    }
    case "boolean": {
      if (typeof value === "boolean") {
        return value;
      }
      if (value === "true" || value === "1") {
        return true;
      }
      if (value === "false" || value === "0") {
        return false;
      }
      throw new Error(`Expected a boolean, got ${String(value)}`);
    }
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function resolveTemplateVariables(
  schema: EmailTemplateVariable[],
  mapping: Record<string, unknown>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const variable of schema) {
    const raw = mapping[variable.key];
    if (isBlank(raw)) {
      if (variable.required) {
        throw new Error(`Missing required variable: ${variable.key}`);
      }
      continue;
    }
    try {
      resolved[variable.key] = coerceEmailVariable(variable.type, raw);
    } catch (error) {
      throw new Error(
        `Invalid value for ${variable.key}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  return resolved;
}
