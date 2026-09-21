import { describe, expect, it } from "vitest";

import {
  isTrustedLoginSuccessMessage,
  LOGIN_SUCCESS_MESSAGE,
} from "@/lib/auth/login-message";

describe("isTrustedLoginSuccessMessage", () => {
  const popup = {} as Window;
  const trustedEvent = {
    origin: "https://app.example.com",
    source: popup,
    data: { type: LOGIN_SUCCESS_MESSAGE },
  } as Pick<MessageEvent, "origin" | "source" | "data">;

  it("accepts the expected origin, source, and payload", () => {
    expect(
      isTrustedLoginSuccessMessage(trustedEvent, {
        origin: "https://app.example.com",
        source: popup,
      }),
    ).toBe(true);
  });

  it.each([
    {
      event: { ...trustedEvent, origin: "https://evil.example.com" },
      source: popup,
    },
    {
      event: { ...trustedEvent, source: {} as Window },
      source: popup,
    },
    { event: trustedEvent, source: null },
    { event: { ...trustedEvent, data: null }, source: popup },
    {
      event: { ...trustedEvent, data: { type: "LOGIN_FAILED" } },
      source: popup,
    },
  ])("rejects an untrusted message", ({ event, source }) => {
    expect(
      isTrustedLoginSuccessMessage(event, {
        origin: "https://app.example.com",
        source,
      }),
    ).toBe(false);
  });
});
