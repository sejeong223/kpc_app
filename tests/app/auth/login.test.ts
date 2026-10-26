import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LoginComponentProps } from "@/components/auth/LoginComponent";

const mocks = vi.hoisted(() => ({
  env: { authEnabled: false, embeddedMode: false },
  getSession: vi.fn(),
  authConstructor: vi.fn(),
  redirect: vi.fn((url: string) => { throw new Error(`redirect:${url}`); }),
}));

vi.mock("@/config/env", () => ({ serverEnv: mocks.env }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/components/auth/LoginComponent", () => ({ default: () => null }));
vi.mock("@/services/AuthService", () => ({
  default: class AuthServiceMock {
    constructor() { mocks.authConstructor(); }
    getSession = mocks.getSession;
  },
}));

import LoginPage from "@/app/auth/login/page";

async function loginProps(params: { callbackUrl?: string; reason?: string } = {}) {
  const page = await LoginPage({ searchParams: Promise.resolve(params) }) as ReactElement<{
    children: ReactElement<LoginComponentProps>;
  }>;
  return page.props.children.props;
}

describe("login page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.env.authEnabled = false;
    mocks.env.embeddedMode = false;
    mocks.getSession.mockResolvedValue(null);
  });

  it("renders a disabled preview without initializing authentication", async () => {
    expect(await loginProps()).toMatchObject({ authEnabled: false, callbackUrl: "/" });
    expect(mocks.authConstructor).not.toHaveBeenCalled();
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it("enables Microsoft login and sanitizes the callback when authentication is configured", async () => {
    mocks.env.authEnabled = true;
    expect(await loginProps({ callbackUrl: "https://untrusted.example" })).toMatchObject({
      authEnabled: true, callbackUrl: "/", embeddedMode: false,
    });
    expect(mocks.getSession).toHaveBeenCalledOnce();
  });

  it("redirects an existing session to its internal destination", async () => {
    mocks.env.authEnabled = true;
    mocks.getSession.mockResolvedValue({ user: { roles: ["Admin"] } });
    await expect(loginProps({ callbackUrl: "/admin" })).rejects.toThrow("redirect:/admin");
  });

  it("keeps the account-switch screen available for a forbidden session", async () => {
    mocks.env.authEnabled = true;
    mocks.getSession.mockResolvedValue({ user: { roles: ["User"] } });
    expect(await loginProps({ callbackUrl: "/admin", reason: "forbidden" })).toMatchObject({
      authEnabled: true, callbackUrl: "/admin", reason: "forbidden",
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("shows account switching instead of looping for a session without app access", async () => {
    mocks.env.authEnabled = true;
    mocks.getSession.mockResolvedValue({ user: { roles: [] } });
    expect(await loginProps()).toMatchObject({ reason: "forbidden" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
