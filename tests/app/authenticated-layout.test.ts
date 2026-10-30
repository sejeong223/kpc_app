import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthenticatedLayout from "@/app/(authenticated)/layout";
import { useAdminRuntime } from "@/components/admin/AdminRuntimeProvider";
import { useComments } from "@/components/comments/CommentsProvider";

const mocks = vi.hoisted(() => ({ requireAppAccess: vi.fn() }));
vi.mock("@/lib/auth/guards", () => ({ requireAppAccess: mocks.requireAppAccess }));
vi.mock("@/components/providers", () => ({ useAuthRuntime: () => ({ authEnabled: false, session: null }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/workspace/write", useServerInsertedHTML() {} }));

function WorkspaceConsumer(): React.ReactElement {
  const { actor } = useAdminRuntime();
  const { controller, identity } = useComments();
  expect(actor.userId).toBeTruthy();
  expect(controller).not.toBeNull();
  expect(identity).not.toBeNull();
  return createElement("p", null, "관리자 데이터와 제작 코멘트 연결 완료");
}

describe("authenticated workspace integration", () => {
  beforeEach(() => mocks.requireAppAccess.mockReset().mockResolvedValue(undefined));

  it("provides both runtimes while rendering the real sidebar and token dialogs", async () => {
    const layout = await AuthenticatedLayout({ children: createElement(WorkspaceConsumer) });
    const markup = renderToStaticMarkup(layout);
    expect(mocks.requireAppAccess).toHaveBeenCalledOnce();
    expect(markup).toContain("관리자 데이터와 제작 코멘트 연결 완료");
    expect(markup).toContain('id="workspace-sidebar"');
    expect(markup).toContain("data-dadam-theme");
  });

  it("propagates access rejection before returning the workspace", async () => {
    mocks.requireAppAccess.mockRejectedValueOnce(new Error("NEXT_REDIRECT:/auth/login"));
    await expect(AuthenticatedLayout({ children: createElement(WorkspaceConsumer) }))
      .rejects.toThrow("NEXT_REDIRECT:/auth/login");
  });
});
