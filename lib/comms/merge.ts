/**
 * Inline merge for email subject/body strings.
 * Replaces {{variable.key}} tokens; unknown keys stay as-is.
 * Whole-string workflow templates use server/workflows/template.ts instead.
 */

/**
 * Source (not a compiled regex) so callers can mint their own instance.
 * A shared `/g` regex carries `lastIndex`, and `.replace()` resets it while
 * `.exec()` loops do not — sharing one object across both is a latent bug.
 */
export const INLINE_TOKEN_SOURCE = "\\{\\{\\s*([a-zA-Z0-9_.]+)\\s*\\}\\}";

export const createInlineTokenRe = (): RegExp =>
  new RegExp(INLINE_TOKEN_SOURCE, "g");

const INLINE_TOKEN_RE = createInlineTokenRe();

export function mergeEmailString(
  template: string,
  values: Record<string, unknown>
): string {
  return template.replace(INLINE_TOKEN_RE, (_match, key: string) => {
    if (!(key in values)) {
      return `{{${key}}}`;
    }
    const value = values[key];
    if (value === null || value === undefined) {
      return "";
    }
    return String(value);
  });
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Only for raw-HTML sinks (`dangerouslySetInnerHTML`, string concatenation).
 * Do NOT use for React children or JSX attributes — React escapes those itself,
 * so the output would be escaped twice and `Acme & Co` would be delivered as
 * `Acme &amp; Co`.
 */
export function mergeAndEscape(
  template: string,
  values: Record<string, unknown>
): string {
  return escapeHtml(mergeEmailString(template, values));
}
