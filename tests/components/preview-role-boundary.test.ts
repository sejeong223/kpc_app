import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { APP_ROLES } from "@/lib/auth/roles";

const mocks = vi.hoisted(() => ({
  runtime: { authEnabled: false, state: { previewRole: "user" as "user" | "admin" } },
  replace: vi.fn(),
}));

vi.mock("@/components/profile/ProfilePreviewProvider", () => ({ useProfilePreview: () => mocks.runtime }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));

import PreviewRoleBoundary from "@/components/profile/PreviewRoleBoundary";

describe("preview screen content boundary", () => {
  beforeEach(() => {
    mocks.runtime.authEnabled = false;
    mocks.runtime.state.previewRole = "user";
    vi.clearAllMocks();
  });

  function render(requiredRole?: "Admin" | "User") {
    const props = {
      requiredRole,
      children: createElement("p", null, "restricted preview content"),
    };
    return renderToStaticMarkup(createElement(PreviewRoleBoundary, props));
  }

  it("does not emit restricted content before the client redirect", () => {
    expect(render(APP_ROLES.ADMIN)).toBe("");
    // SSR has no effects. Navigation itself is checked in the mounted browser.
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("preserves ordinary content for the preview user", () => {
    expect(render()).toContain("restricted preview content");
  });

  it("preserves administrator preview content", () => {
    mocks.runtime.state.previewRole = "admin";
    expect(render(APP_ROLES.ADMIN)).toContain("restricted preview content");
  });

  it("does not replace server authorization when authentication is active", () => {
    mocks.runtime.authEnabled = true;
    expect(render(APP_ROLES.ADMIN)).toContain("restricted preview content");
  });
});
