// @vitest-environment jsdom
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { act, createElement, Fragment, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppShell from "@/components/layout/AppShell";
import ProfilePreviewProvider, { useProfilePreview, type ProfilePreviewContextValue } from "@/components/profile/ProfilePreviewProvider";
import TokenDialogs from "@/components/profile/token/TokenDialogs";

const mocks = vi.hoisted(() => ({ suspendUi: vi.fn(), pathname: "/workspace/write" }));
vi.mock("@/components/comments/CommentsProvider", () => ({ useComments: () => ({ controller: { suspendUi: mocks.suspendUi } }) }));
vi.mock("@/components/providers", () => ({ useAuthRuntime: () => ({ authEnabled: false, session: null }) }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, useRouter: () => ({ push() {}, replace() {}, prefetch() {} }) }));
let profile: ProfilePreviewContextValue, host: HTMLDivElement, root: Root;
function CaptureProfile(): null {
  const value = useProfilePreview();
  useEffect(() => { profile = value; }, [value]);
  return null;
}
function byId(id: string): HTMLElement { const found = document.getElementById(id); expect(found).not.toBeNull(); return found!; }
async function flush() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); }); }
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => Number(setTimeout(() => cb(performance.now()), 0)));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  window.matchMedia = vi.fn().mockImplementation(query => ({ matches: query.includes("max-width: 760px"), media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } }));
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockImplementation(() => [DOMRect.fromRect({ width: 40, height: 40 })] as unknown as DOMRectList);
  mocks.suspendUi.mockClear(); document.body.style.overflow = "";
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => { root.render(createElement(FluentProvider, { theme: webLightTheme }, createElement(ProfilePreviewProvider, null,
    createElement(Fragment, null, createElement(CaptureProfile), createElement(AppShell, null, createElement("p", null, "제작 본문")), createElement(TokenDialogs))))); });
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("header removal preserves navigation and modal focus", () => {
  it("opens the mobile sidebar, suspends comment UI and restores focus on Escape", async () => {
    expect(host.querySelector("header")).toBeNull();
    const trigger = byId("workspace-sidebar-trigger");
    await act(async () => trigger.click());
    expect(mocks.suspendUi).toHaveBeenCalledOnce(); expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(byId("main-content").parentElement?.hasAttribute("inert")).toBe(true);
    expect(document.body.style.overflow).toBe("hidden"); expect(document.activeElement?.hasAttribute("data-sidebar-close")).toBe(true);
    await act(async () => document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })));
    await flush(); expect(document.activeElement).toBe(trigger); expect(document.body.style.overflow).toBe("");
    expect(byId("main-content").parentElement?.hasAttribute("inert")).toBe(false);
  });
  it.each(["usage", "request"] as const)("restores the independent menu button after the %s modal closes", async view => {
    const trigger = byId("workspace-sidebar-trigger");
    await act(async () => profile.openTokenDialog(view, trigger)); await flush();
    const modal = document.querySelector<HTMLElement>("[data-modal-frame]"); expect(modal).not.toBeNull();
    await act(async () => modal!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })));
    await flush(); expect(profile.state.tokens.dialogView).toBeNull(); expect(document.activeElement).toBe(trigger);
  });
});
