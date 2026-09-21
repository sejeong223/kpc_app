import { describe, expect, it } from "vitest";

import {
  buildFrameAncestors,
  isAuthPath,
  isPublicAuthAssetPath,
  shouldApplyAuthentication,
} from "@/lib/auth/proxy-policy";

describe("proxy policy", () => {
  it.each(["/auth", "/auth/login", "/auth/logout"])(
    "recognizes auth path %s",
    (pathname) => {
      expect(isAuthPath(pathname)).toBe(true);
    },
  );

  it("protects non-auth pages only when authentication is enabled", () => {
    expect(
      shouldApplyAuthentication({ authEnabled: false, pathname: "/admin" }),
    ).toBe(false);
    expect(
      shouldApplyAuthentication({ authEnabled: true, pathname: "/auth/login" }),
    ).toBe(false);
    expect(
      shouldApplyAuthentication({ authEnabled: true, pathname: "/admin" }),
    ).toBe(true);
  });

  it("keeps the login logo public without opening similarly named routes", () => {
    expect(isPublicAuthAssetPath("/microsoft.svg")).toBe(true);
    expect(isPublicAuthAssetPath("/reports/export.csv")).toBe(false);
    expect(
      shouldApplyAuthentication({
        authEnabled: true,
        pathname: "/microsoft.svg",
      }),
    ).toBe(false);
    expect(
      shouldApplyAuthentication({
        authEnabled: true,
        pathname: "/reports/export.csv",
      }),
    ).toBe(true);
  });

  it("uses self-only frame ancestors outside embedded mode", () => {
    expect(
      buildFrameAncestors({
        embeddedMode: false,
        additionalDomains: ["https://portal.example.com"],
      }),
    ).toBe("frame-ancestors 'self'");
  });

  it("adds Microsoft and configured sources only in embedded mode", () => {
    const policy = buildFrameAncestors({
      embeddedMode: true,
      additionalDomains: [
        "https://portal.example.com",
        "https://*.apps.example.com",
      ],
    });

    expect(policy).toContain("frame-ancestors 'self'");
    expect(policy).toContain("https://login.microsoftonline.com");
    expect(policy).toContain("https://*.cloud.microsoft");
    expect(policy).toContain("https://portal.example.com");
    expect(policy).toContain("https://*.apps.example.com");
  });

  it.each([
    "https://example.com;script-src",
    "https://exa mple.com",
    "http://example.com",
    "https://example.com/path",
  ])("rejects unsafe frame source %s", (source) => {
    expect(() =>
      buildFrameAncestors({
        embeddedMode: true,
        additionalDomains: [source],
      }),
    ).toThrow("IFRAME_ALLOWED_DOMAINS");
  });
});
