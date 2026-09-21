import { describe, expect, it } from "vitest";

import { sanitizeCallbackUrl } from "@/lib/auth/callback-url";

describe("sanitizeCallbackUrl", () => {
  it.each(["/", "/admin", "/path?query=value"])(
    "keeps internal callback %s",
    (value) => {
      expect(sanitizeCallbackUrl(value)).toBe(value);
    },
  );

  it.each([
    undefined,
    null,
    "",
    "   ",
    "https://example.com",
    "http://example.com",
    "//example.com/path",
    "javascript:alert(1)",
    "\\example.com",
    "/safe\\redirect",
    "/path with spaces",
  ])("normalizes unsafe callback %s to root", (value) => {
    expect(sanitizeCallbackUrl(value)).toBe("/");
  });
});
