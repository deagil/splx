/**
 * Streamdown's rehype-harden replaces rejected `<a href>` nodes with the
 * link label plus a literal ` [blocked]` suffix. Platform MCP results often
 * have no permalinks, so the model invents relative / localhost / malformed
 * URLs that harden rejects — which is why company names show up as
 * `Grid Robotics [blocked]`.
 *
 * Unwrap those links to plain label text before markdown render. Keep normal
 * public http(s) permalinks intact.
 */
export function unwrapUnsafeMarkdownLinks(text: string): string {
  return text.replace(
    /\[([^\]]*)\]\(([^)\s]+)\)/g,
    (full, label: string, url: string) => {
      if (isRenderableChatLink(url)) {
        return full;
      }
      return label;
    }
  );
}

function isRenderableChatLink(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    // Bare loopback only — workspace subdomains like techscaler.localhost are OK.
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host.endsWith(".local") ||
      host.endsWith(".internal")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
