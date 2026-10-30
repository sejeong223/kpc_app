import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  env: { authEnabled: false },
  requireRole: vi.fn(),
  redirect: vi.fn((url: string) => { throw new Error("NEXT_REDIRECT:" + url); }),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));

vi.mock("@/config/env", () => ({ serverEnv: mocks.env }));
vi.mock("@/lib/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound, redirect: mocks.redirect }));
vi.mock("@/components/profile/PreviewRoleBoundary", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/admin/AdminScreenRouter", () => ({ default: ({ screen, requestedTab }: { screen: string; requestedTab: string | null }) => createElement("div", { "data-admin-screen": screen, "data-tab": requestedTab }, "관리자 화면") }));

import WorkspaceScreenPage from "@/app/(authenticated)/workspace/[screen]/page";

const screens = [
  ["register", "RFP 등록"], ["pipeline", "검토 목록"], ["analysis", "AI 분석"],
  ["files", "파일 업로드"], ["toc", "목차"], ["setup", "제작 설정"], ["write", "제작"],
  ["prompt-sets", "프롬프트 세트"], ["skills", "Skill"], ["templates", "Template"],
  ["policy", "모델·토큰 관리"], ["users", "사용자 설정"],
  ["dashboard", "대시보드"], ["audit", "활동 로그"],
] as const;

function page(screen: string) {
  return WorkspaceScreenPage({ params: Promise.resolve({ screen }) });
}

describe("workspace placeholder pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.env.authEnabled = false;
    mocks.requireRole.mockReset().mockResolvedValue(undefined);
  });

  it.each(screens)("previews %s without authenticating or assigning a role", async (screen, label) => {
    const markup = renderToStaticMarkup(await page(screen));
    if (["users", "policy", "audit", "dashboard", "skills", "templates"].includes(screen)) expect(markup).toContain('data-admin-screen="' + screen + '"');
    else {
      expect(markup).toContain('<h1 id="workspace-screen-title">' + label + '</h1>');
      expect(markup).toContain('<p>' + label + ' 화면입니다.</p>');
    }
    expect(mocks.requireRole).not.toHaveBeenCalled();
  });

  it.each(screens.slice(0, 7))("does not require Admin for the ordinary %s screen", async (screen) => {
    mocks.env.authEnabled = true;
    await page(screen);
    expect(mocks.requireRole).not.toHaveBeenCalled();
  });

  it.each(screens.slice(7))("checks Admin on the server for %s", async (screen) => {
    mocks.env.authEnabled = true;
    await page(screen);
    expect(mocks.requireRole).toHaveBeenCalledExactlyOnceWith("Admin", `/workspace/${screen}`);
  });

  it("waits for authorization before returning the administrator screen", async () => {
    mocks.env.authEnabled = true;
    let allow: (() => void) | undefined;
    mocks.requireRole.mockReturnValue(new Promise<void>((resolve) => { allow = resolve; }));
    let rendered = false;
    const result = page("audit").then((element) => { rendered = true; return element; });
    await vi.waitFor(() => expect(mocks.requireRole).toHaveBeenCalledOnce());
    expect(rendered).toBe(false);
    allow?.();
    await result;
    expect(rendered).toBe(true);
  });

  it.each(["NEXT_REDIRECT:/auth/login", "NEXT_REDIRECT:/auth/login?reason=forbidden"])(
    "propagates authorization rejection %s",
    async (reason) => {
      mocks.env.authEnabled = true;
      mocks.requireRole.mockRejectedValueOnce(new Error(reason));
      await expect(page("users")).rejects.toThrow(reason);
    },
  );

  it.each([false, true])("rejects an unknown screen when authEnabled=%s", async (authEnabled) => {
    mocks.env.authEnabled = authEnabled;
    await expect(page("missing")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledOnce();
    expect(mocks.requireRole).not.toHaveBeenCalled();
  });
});

it("레거시 토큰 URL은 서버 권한 검사 이후 통합 탭으로 이동한다", async () => {
  mocks.env.authEnabled = true; mocks.requireRole.mockResolvedValue(undefined);
  await expect(page("tokens")).rejects.toThrow("NEXT_REDIRECT:/workspace/policy?tab=tokens");
  expect(mocks.requireRole).toHaveBeenLastCalledWith("Admin", "/workspace/tokens");
});
