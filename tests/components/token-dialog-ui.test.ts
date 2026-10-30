// @vitest-environment jsdom
import { FluentProvider, useThemeClassName, webLightTheme } from "@fluentui/react-components";
import { act, createElement, Fragment, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminRuntimeProvider, { useAdminRuntime } from "@/components/admin/AdminRuntimeProvider";
import ProfileMenu from "@/components/profile/ProfileMenu";
import ProfilePreviewProvider, { useProfilePreview, type ProfilePreviewContextValue } from "@/components/profile/ProfilePreviewProvider";
import TokenDialogs from "@/components/profile/token/TokenDialogs";
import DadamThemeScope from "@/components/providers/DadamThemeScope";
import { TOKEN_REASON_PRESETS } from "@/config/token-preview";

vi.mock("@/components/providers", () => ({ useAuthRuntime: () => ({ authEnabled: false, session: null }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/workspace/write" }));
let host: HTMLDivElement, root: Root, profile: ProfilePreviewContextValue;
let runtime: ReturnType<typeof useAdminRuntime>;
function CaptureProfile(): null {
  const value = useProfilePreview();
  const admin = useAdminRuntime();
  useEffect(() => { profile = value; }, [value]);
  useEffect(() => { runtime = admin; }, [admin]);
  return null;
}
function ThemeProbe({ id }: { id: string }): React.ReactElement {
  return createElement("span", { id, "data-theme": useThemeClassName() });
}
function button(text: string, within: ParentNode = document): HTMLButtonElement {
  const found = [...within.querySelectorAll<HTMLButtonElement>("button")].find(item => item.textContent === text);
  expect(found, text).toBeDefined();
  return found!;
}
function modal(): HTMLElement {
  const found = document.querySelector<HTMLElement>("[data-modal-frame]");
  expect(found).not.toBeNull();
  return found!;
}
async function flush() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); }); }
async function click(element: HTMLElement) { await act(async () => element.click()); await flush(); }
async function enter(view: "usage" | "request"): Promise<HTMLButtonElement> {
  const trigger = host.querySelector<HTMLButtonElement>("[data-sidebar-profile]")!;
  await click(trigger);
  await click(button(view === "usage" ? "사용량 상세 분석" : "토큰 추가 신청", host));
  return trigger;
}
async function input(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: string) {
  const prototype = element instanceof HTMLInputElement ? HTMLInputElement.prototype
    : element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLTextAreaElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
  });
}
function expectTokenPortal(element: HTMLElement) {
  const probe = document.getElementById("token-theme")!;
  const scope = probe.closest<HTMLElement>("[data-dadam-theme]")!;
  const mount = element.closest<HTMLElement>(".fui-FluentProvider")!;
  expect(host.contains(element)).toBe(false);
  expect(scope.className).toBe(probe.dataset.theme);
  for (const className of scope.classList) {
    if (!className.startsWith("___")) expect(mount.classList.contains(className), className).toBe(true);
  }
  expect(mount.style.display).not.toBe("contents");
  expect(probe.dataset.theme).not.toBe(document.getElementById("outside-theme")!.dataset.theme);
}

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => Number(setTimeout(() => cb(performance.now()), 0)));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  window.matchMedia = vi.fn().mockImplementation(media => ({ matches: false, media, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } }));
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockImplementation(() => [DOMRect.fromRect({ width: 40, height: 40 })] as unknown as DOMRectList);
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(createElement(FluentProvider, { theme: { ...webLightTheme, colorBrandBackground: "#d7192f" } },
    createElement(ProfilePreviewProvider, null, createElement(AdminRuntimeProvider, null, createElement(Fragment, null,
      createElement(CaptureProfile), createElement(ThemeProbe, { id: "outside-theme" }),
      createElement(DadamThemeScope, null, createElement(ProfileMenu, { isCollapsed: false, onNavigate() {} })),
      createElement(DadamThemeScope, null, createElement(ThemeProbe, { id: "token-theme" }), createElement(TokenDialogs)),
    ))))));
  await flush();
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("profile to token dialog and toast", () => {
  it("keeps the portal theme through usage/request navigation and restores the profile trigger", async () => {
    const trigger = await enter("usage");
    expect(modal().textContent).toContain("내 AI Token 사용량");
    expect(modal().style.width).toBe("760px");
    expectTokenPortal(modal());
    await click(button("토큰 추가 신청", modal()));
    expect(modal().style.width).toBe("560px");
    expect(button("신청하기", modal()).disabled).toBe(true);
    await click(button("사용량 보기", modal()));
    expect(modal().style.width).toBe("760px");
    await act(async () => modal().dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })));
    await flush();
    expect(profile.state.tokens.dialogView).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.getElementById("outside-theme")!.closest("[data-dadam-theme]")).toBeNull();
  });

  it("submits once, retains the toast theme after closing and resets only the next request draft", async () => {
    const trigger = await enter("request");
    const requestsBefore = (await runtime.service.getSelf(runtime.actor)).requests.length;
    await input(modal().querySelector<HTMLSelectElement>("select")!, "edu");
    await click(button(TOKEN_REASON_PRESETS[0], modal()));
    const submit = button("신청하기", modal());
    expect(submit.disabled).toBe(false);
    await act(async () => { submit.click(); submit.click(); });
    await flush();
    expect(profile.state.tokens.dialogView).toBeNull();
    const { requests } = await runtime.service.getSelf(runtime.actor);
    expect(requests).toHaveLength(requestsBefore + 1);
    expect(requests).toEqual(expect.arrayContaining([
      expect.objectContaining({ amountTokens: 50000, reason: TOKEN_REASON_PRESETS[0], projectId: "edu", status: "pending" }),
    ]));
    expect(document.activeElement).toBe(trigger);
    const toast = document.querySelector<HTMLElement>(".fui-Toast")!;
    expect(toast?.textContent).toContain("토큰 +50K 신청을 미리보기로 등록했습니다 · 관리자 승인 대기");
    expectTokenPortal(toast);
    await enter("request");
    expect(profile.state.tokens.requestDraft).toMatchObject({ amountChoice: "50", customAmountK: "", reason: "", projectId: "edu" });
    expect(button("신청하기", modal()).disabled).toBe(true);
    await click(button("취소", modal()));
    expect(document.activeElement).toBe(trigger);
  });

  it("validates custom amount and reason through the actual controlled input slots", async () => {
    await enter("request");
    await click(modal().querySelector<HTMLInputElement>('input[value="custom"]')!);
    const amount = modal().querySelector<HTMLInputElement>('[data-token-field="amount"]')!;
    expect(document.activeElement).toBe(amount);
    await input(amount, "0");
    await input(modal().querySelector<HTMLTextAreaElement>("textarea")!, "추가 작성 작업");
    expect(button("신청하기", modal()).disabled).toBe(true);
    await input(amount, "70");
    expect(button("신청하기", modal()).disabled).toBe(false);
    await click(button("신청하기", modal()));
    const { requests } = await runtime.service.getSelf(runtime.actor);
    expect(requests).toEqual(expect.arrayContaining([
      expect.objectContaining({ amountTokens: 70000, reason: "추가 작성 작업" }),
    ]));
  });
});
