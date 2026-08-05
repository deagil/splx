import { describe, expect, it } from "vitest";
import { assertPublicUrl, UnsafeUrlError, __testing } from "./safe-url";

const { isBlockedIpv4, isBlockedIpv6 } = __testing;

describe("isBlockedIpv4", () => {
  it("blocks loopback, private, and link-local ranges", () => {
    for (const address of [
      "127.0.0.1",
      "10.0.0.5",
      "192.168.1.1",
      "172.16.0.1",
      "172.31.255.255",
      "169.254.169.254", // cloud instance metadata
      "0.0.0.0",
      "100.64.0.1",
      "239.255.255.250",
    ]) {
      expect(isBlockedIpv4(address), address).not.toBeNull();
    }
  });

  it("allows public addresses", () => {
    for (const address of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "93.184.216.34"]) {
      expect(isBlockedIpv4(address), address).toBeNull();
    }
  });
});

describe("isBlockedIpv6", () => {
  it("blocks loopback, unique-local, and link-local", () => {
    for (const address of ["::1", "::", "fd00::1", "fe80::1"]) {
      expect(isBlockedIpv6(address), address).not.toBeNull();
    }
  });

  it("sees through IPv4-mapped addresses", () => {
    expect(isBlockedIpv6("::ffff:127.0.0.1")).not.toBeNull();
    expect(isBlockedIpv6("::ffff:169.254.169.254")).not.toBeNull();
  });

  it("allows public addresses", () => {
    expect(isBlockedIpv6("2606:4700:4700::1111")).toBeNull();
  });
});

describe("assertPublicUrl", () => {
  it("rejects non-HTTP schemes", async () => {
    for (const url of [
      "file:///etc/passwd",
      "gopher://example.com",
      "data:text/plain,hello",
    ]) {
      await expect(assertPublicUrl(url)).rejects.toThrow(UnsafeUrlError);
    }
  });

  it("rejects malformed URLs", async () => {
    await expect(assertPublicUrl("not a url")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejects literal private and metadata addresses", async () => {
    for (const url of [
      "http://127.0.0.1/",
      "http://169.254.169.254/latest/meta-data/",
      "http://10.0.0.1/",
      "http://[::1]/",
    ]) {
      await expect(assertPublicUrl(url), url).rejects.toThrow(UnsafeUrlError);
    }
  });

  it("rejects hostnames that resolve to loopback", async () => {
    // "localhost" is the simple case a string-only check would also catch, but
    // it goes through the same resolve-then-inspect path as any other name.
    await expect(assertPublicUrl("http://localhost:3000/")).rejects.toThrow(
      UnsafeUrlError
    );
  });

  it("accepts a public literal address", async () => {
    const url = await assertPublicUrl("https://1.1.1.1/");
    expect(url.hostname).toBe("1.1.1.1");
  });
});
