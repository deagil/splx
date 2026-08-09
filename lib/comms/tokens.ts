/**
 * Pure helpers for strings containing `{{variable.key}}` merge tokens.
 *
 * This is the only module that has to stay in lockstep with `lib/comms/merge.ts`
 * — it borrows that module's regex source so the editor can never disagree with
 * the renderer about what counts as a token. No DOM, no React: everything here
 * is unit-testable in isolation.
 */

import { createInlineTokenRe } from "@/lib/comms/merge";
import type { EmailTemplateVariable } from "@/lib/comms/types";

export type TokenSegment =
  | { type: "text"; text: string }
  | { type: "token"; key: string };

const TOKEN_KEY_RE = /^[a-zA-Z0-9_.]+$/;

export function isValidTokenKey(key: string): boolean {
  return TOKEN_KEY_RE.test(key);
}

/** Splits a stored string into literal runs and tokens, in document order. */
export function parseTokenString(value: string): TokenSegment[] {
  const segments: TokenSegment[] = [];
  // A fresh regex each call: `lastIndex` on a shared /g instance would make
  // consecutive calls skip matches.
  const re = createInlineTokenRe();
  let cursor = 0;
  let match = re.exec(value);

  while (match !== null) {
    if (match.index > cursor) {
      segments.push({ text: value.slice(cursor, match.index), type: "text" });
    }
    segments.push({ key: match[1] ?? "", type: "token" });
    cursor = match.index + match[0].length;
    match = re.exec(value);
  }

  if (cursor < value.length) {
    segments.push({ text: value.slice(cursor), type: "text" });
  }
  return segments;
}

export function serializeSegments(segments: TokenSegment[]): string {
  return segments
    .map((segment) =>
      segment.type === "token" ? `{{${segment.key}}}` : segment.text
    )
    .join("");
}

/** Every distinct token key used in a string, in first-appearance order. */
export function extractTokenKeys(value: string): string[] {
  const keys: string[] = [];
  for (const segment of parseTokenString(value)) {
    if (segment.type === "token" && !keys.includes(segment.key)) {
      keys.push(segment.key);
    }
  }
  return keys;
}

export function variablesToMap(
  variables: EmailTemplateVariable[]
): Map<string, EmailTemplateVariable> {
  return new Map(variables.map((variable) => [variable.key, variable]));
}

/**
 * Value-equality key for a variable list. `TokenField` repaints its DOM when
 * this changes, so it must cover everything a chip displays — comparing array
 * identity instead would repaint on every parent render and eat the caret.
 */
export function variablesFingerprint(
  variables: EmailTemplateVariable[]
): string {
  return variables
    .map((variable) => `${variable.key}\u0000${variable.label}`)
    .join("\u0001");
}

const ILLEGAL_KEY_CHARS_RE = /[^a-zA-Z0-9_.\s-]/g;
const WORD_BOUNDARY_RE = /[\s-]+(.)/g;
const TRAILING_SEPARATOR_RE = /[\s-]+$/;
const LEADING_NON_LETTER_RE = /^[^a-zA-Z]+/;

/** Best-effort conversion of typed prose into a legal token key. */
export function slugifyToTokenKey(draft: string): string {
  return draft
    .trim()
    .replace(ILLEGAL_KEY_CHARS_RE, "")
    .replace(WORD_BOUNDARY_RE, (_match, char: string) => char.toUpperCase())
    .replace(TRAILING_SEPARATOR_RE, "")
    .replace(LEADING_NON_LETTER_RE, "");
}

const CAMEL_BOUNDARY_RE = /([a-z0-9])([A-Z])/g;
const UNDERSCORE_RUN_RE = /_+/g;

/** Title-cased label suggestion for a key, e.g. `customer.firstName` → `First name`. */
export function labelFromTokenKey(key: string): string {
  const leaf = key.split(".").at(-1) ?? key;
  const spaced = leaf
    .replace(CAMEL_BOUNDARY_RE, "$1 $2")
    .replace(UNDERSCORE_RUN_RE, " ")
    .trim();
  if (!spaced) {
    return key;
  }
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/**
 * Ranks variables for the `{{` menu. Label matches beat key matches, and
 * prefix matches beat mid-string ones, so typing "fir" surfaces "First name"
 * ahead of "Order confirmation".
 */
export function filterVariables(
  variables: EmailTemplateVariable[],
  query: string
): EmailTemplateVariable[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return variables;
  }

  const scored: { score: number; variable: EmailTemplateVariable }[] = [];
  for (const variable of variables) {
    const label = variable.label.toLowerCase();
    const key = variable.key.toLowerCase();
    let score = -1;

    if (label.startsWith(needle)) {
      score = 0;
    } else if (key.startsWith(needle)) {
      score = 1;
    } else if (label.includes(needle)) {
      score = 2;
    } else if (key.includes(needle)) {
      score = 3;
    }

    if (score >= 0) {
      scored.push({ score, variable });
    }
  }

  return scored
    .sort((a, b) => a.score - b.score)
    .map((entry) => entry.variable);
}
