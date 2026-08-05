import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SSRF guard for endpoints that fetch a caller-supplied URL.
 *
 * `/api/og-metadata` and `/api/url-content` take a `?url=` and fetch it
 * server-side. Unguarded, that turns the app into a proxy for anything its
 * network can reach — cloud instance metadata (169.254.169.254), the Supabase
 * host, other services on the private network.
 *
 * Two checks, both needed:
 *
 * 1. Scheme must be http/https. Blocks `file:`, `gopher:`, `data:`.
 * 2. The resolved address must be publicly routable. Checking the hostname
 *    string is not enough — a name under the caller's control can resolve to
 *    127.0.0.1 — so this resolves first and inspects the address.
 *
 * This does not close the DNS-rebinding window (the address could change
 * between our lookup and fetch's). Closing that needs a custom agent that pins
 * the resolved address; noted rather than done.
 */

const BLOCKED_IPV4 = [
  { prefix: "0.", reason: "this-network" },
  { prefix: "10.", reason: "private" },
  { prefix: "127.", reason: "loopback" },
  { prefix: "169.254.", reason: "link-local / cloud metadata" },
  { prefix: "192.168.", reason: "private" },
];

function isBlockedIpv4(address: string): string | null {
  for (const entry of BLOCKED_IPV4) {
    if (address.startsWith(entry.prefix)) {
      return entry.reason;
    }
  }

  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some(Number.isNaN)) {
    return "unparseable address";
  }

  // 172.16.0.0/12
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) {
    return "private";
  }

  // 100.64.0.0/10 carrier-grade NAT
  if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) {
    return "carrier-grade NAT";
  }

  // 224.0.0.0/4 multicast and above
  if (octets[0] >= 224) {
    return "multicast or reserved";
  }

  return null;
}

function isBlockedIpv6(address: string): string | null {
  const normalized = address.toLowerCase();

  if (normalized === "::1" || normalized === "::") {
    return "loopback";
  }

  // Unique local (fc00::/7) and link-local (fe80::/10).
  if (
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  ) {
    return "private or link-local";
  }

  // IPv4-mapped (::ffff:127.0.0.1) — check the embedded address.
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) {
    return isBlockedIpv4(mapped[1]);
  }

  return null;
}

export class UnsafeUrlError extends Error {
  constructor(reason: string) {
    super(`Refusing to fetch this URL: ${reason}`);
    this.name = "UnsafeUrlError";
  }
}

/**
 * Throws {@link UnsafeUrlError} if the URL is malformed, uses a non-HTTP
 * scheme, or resolves to a non-public address.
 */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("invalid URL format");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError(`unsupported scheme "${url.protocol}"`);
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");

  const addresses: string[] = [];
  if (isIP(hostname)) {
    addresses.push(hostname);
  } else {
    try {
      const resolved = await lookup(hostname, { all: true });
      addresses.push(...resolved.map((entry) => entry.address));
    } catch {
      throw new UnsafeUrlError("hostname could not be resolved");
    }
  }

  if (addresses.length === 0) {
    throw new UnsafeUrlError("hostname could not be resolved");
  }

  for (const address of addresses) {
    const reason =
      isIP(address) === 6 ? isBlockedIpv6(address) : isBlockedIpv4(address);
    if (reason) {
      throw new UnsafeUrlError(`resolves to a non-public address (${reason})`);
    }
  }

  return url;
}

/** Exported for unit tests. */
export const __testing = { isBlockedIpv4, isBlockedIpv6 };
