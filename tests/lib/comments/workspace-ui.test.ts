// @vitest-environment jsdom
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { IDBFactory } from "fake-indexeddb";
import { act, createElement, useSyncExternalStore } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommentController } from "@/lib/comments/controller";
import { CommentError, resolveCommentIdentity } from "@/lib/comments/domain";
import { IndexedDbCommentRepository } from "@/lib/comments/repository";
import CommentsWorkspace from "@/components/comments/CommentsWorkspace";

const identity = resolveCommentIdentity({ authEnabled: false, session: null, displayName: "정소담" })!;
let controller: CommentController, repository: IndexedDbCommentRepository, factory: IDBFactory, root: Root, host: HTMLDivElement;
vi.mock("@/components/comments/CommentsProvider", () => ({
  useComments: () => ({ controller, identity, state: useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot) }),
}));
function element<T extends HTMLElement = HTMLElement>(selector: string): T {
  const found = host.querySelector<T>(selector); expect(found, selector).not.toBeNull(); return found!;
}
function button(label: string): HTMLButtonElement {
  const found = Array.from(host.querySelectorAll("button")).find(el => (el.getAttribute("aria-label") ?? el.textContent?.trim()) === label);
  expect(found, label).toBeTruthy(); return found!;
}
async function settle() {
  await act(async () => {
    for (let i = 0; i < 100 && controller.getSnapshot().busy; i++) await new Promise(resolve => setTimeout(resolve, 5));
  });
  expect(controller.getSnapshot().busy).toBe(false);
}
async function click(target: HTMLElement, x = 600, y = 400) {
  await act(async () => {
    target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerId: 1, isPrimary: true, clientX: x, clientY: y }));
    target.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0, pointerId: 1, isPrimary: true, clientX: x, clientY: y }));
    target.click();
  });
  await settle();
}
async function key(target: HTMLElement, value: string, options: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: value, ...options });
  await act(async () => { target.dispatchEvent(event); }); await settle(); return event;
}
async function type(value: string, target = element<HTMLTextAreaElement>("textarea:not(:disabled)")) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(target, value);
    target.setSelectionRange(value.length, value.length);
    target.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 1));
  });
}
async function tick(ms = 10) { await act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); }); }
async function createDraft() { await click(button("핀 생성")); await click(element("[data-comment-surface]")); }

beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => Number(setTimeout(() => cb(performance.now()), 0)));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 }); Object.defineProperty(window, "innerHeight", { configurable: true, value: 900 });
  window.matchMedia = vi.fn().mockImplementation(query => ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } }));
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const surface = this.hasAttribute("data-comment-surface");
    const left = window.innerWidth <= 760 ? 0 : 220;
    return DOMRect.fromRect({ x: surface ? left : Number.parseFloat(this.style.left) || 0, y: surface ? 0 : Number.parseFloat(this.style.top) || 0,
      width: surface ? window.innerWidth - left : Number.parseFloat(this.style.width) || 360, height: surface ? window.innerHeight : Number.parseFloat(this.style.height) || 360 });
  });
  HTMLElement.prototype.setPointerCapture = vi.fn(); HTMLElement.prototype.hasPointerCapture = vi.fn(() => false); HTMLElement.prototype.releasePointerCapture = vi.fn();
  factory = new IDBFactory(); repository = new IndexedDbCommentRepository({ factory });
  let sequence = 0;
  controller = new CommentController({ identity, repositoryFactory: () => repository, createId: () => `ui-${++sequence}` });
  await controller.load(); host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => { root.render(createElement(FluentProvider, { theme: webLightTheme }, createElement(CommentsWorkspace))); });
  await tick();
});
afterEach(async () => { await act(async () => root.unmount()); controller.dispose(); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("comment workspace interaction with the real controller and isolated IndexedDB adapter", () => {
  it("places and saves a pin from the creation mode and restores it from storage", async () => {
    await createDraft();
    expect(element("[data-comment-popup]")).toBeTruthy();
    expect(button("의견 등록").disabled).toBe(true);
    await type("새 코멘트"); expect(button("의견 등록").disabled).toBe(false);
    await key(element("textarea"), "Enter"); await tick();
    expect(controller.getSnapshot().snapshot!.threads).toHaveLength(3);
    expect(host.querySelector("[data-comment-pin='pending-comment']")).toBeNull();
    const second = new IndexedDbCommentRepository({ factory });
    expect((await second.load(identity)).messages.find(m => m.id === "ui-2")?.text).toBe("새 코멘트"); second.close();
  });
  it("never submits composition Enter, supports Shift+Enter, and commits ordinary Enter", async () => {
    await createDraft(); await type("한글"); const input = element<HTMLTextAreaElement>("textarea");
    await act(async () => { input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true })); });
    await key(input, "Enter", { isComposing: true }); expect(controller.getSnapshot().snapshot!.threads).toHaveLength(2);
    await act(async () => { input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true })); });
    expect((await key(input, "Enter", { shiftKey: true })).defaultPrevented).toBe(false);
    await key(input, "Enter"); expect(controller.getSnapshot().snapshot!.threads).toHaveLength(3);
  });
  it("uses Enter for mention selection before posting and persists structured mentions", async () => {
    await createDraft(); await type("@김");
    expect(element('[role="listbox"]').textContent).toContain("김민수");
    await key(element("textarea"), "Enter");
    expect(element<HTMLTextAreaElement>("textarea").value).toBe("@김민수 ");
    expect(controller.getSnapshot().snapshot!.threads).toHaveLength(2);
    await key(element("textarea"), "Enter");
    expect(controller.getSnapshot().snapshot!.messages.find(m => m.id === "ui-2")?.mentions).toMatchObject([{ userId: "mock:kim-minsu", start: 0, end: 4 }]);
  });
  it("dismisses only the mention list on Escape, then preserves a closed draft", async () => {
    await createDraft(); await type("@없는이름"); await key(element("textarea"), "Escape");
    expect(host.querySelector('[role="listbox"]')).toBeNull(); expect(host.querySelector("[data-comment-popup]")).not.toBeNull();
    await key(element("textarea"), "Escape"); expect(host.querySelector("[data-comment-popup]")).toBeNull();
    await click(button("핀 생성")); expect(element<HTMLTextAreaElement>("textarea").value).toBe("@없는이름");
  });
  it("supports keyboard placement and renders the latest root preview", async () => {
    await click(button("핀 생성")); await key(element("[data-comment-surface]"), "Enter");
    expect(controller.getSnapshot().pendingPoint).toEqual({ xRatio: .5, yRatio: .5 });
    await click(button("코멘트 닫기"));
    await act(async () => { element('[data-comment-pin="seed-thread-open"]').dispatchEvent(new MouseEvent("mouseover", { bubbles: true })); });
    await tick(220); expect(element('[role="tooltip"]').textContent).toContain("정소담");
  });
  it("resolves and reopens while preserving the reply draft", async () => {
    await click(element('[data-comment-pin="seed-thread-open"]')); await type("작성 중 답글");
    await click(button("반영 완료")); expect(element<HTMLTextAreaElement>("textarea").disabled).toBe(true);
    expect(button("다시 열기").getAttribute("aria-pressed")).toBe("true");
    await click(button("다시 열기")); expect(element<HTMLTextAreaElement>("textarea").value).toBe("작성 중 답글");
  });
  it("edits the owner's root only after a change and confirms thread deletion", async () => {
    await click(element('[data-comment-pin="seed-thread-open"]')); await click(button("코멘트 메뉴")); await click(button("수정"));
    expect(button("수정 저장").disabled).toBe(true); await type("고친 의견"); await click(button("수정 저장"));
    expect(element('[data-comment-message="seed-message-open"]').textContent).toContain("고친 의견");
    await click(button("코멘트 메뉴")); await click(button("대화 전체 삭제")); expect(element('[role="alertdialog"]').textContent).toContain("답글 1개");
    await click(button("취소")); expect(controller.getSnapshot().snapshot!.threads).toHaveLength(2);
    await click(button("코멘트 메뉴")); await click(button("대화 전체 삭제")); await click(button("삭제"));
    expect(host.querySelector('[data-comment-pin="seed-thread-open"]')).toBeNull();
    expect((await repository.load(identity)).threads).toHaveLength(1);
  });
  it("offers no root edit menu on another author's thread but allows status changes", async () => {
    await click(element('[data-comment-pin="seed-thread-resolved"]'));
    expect(Array.from(host.querySelectorAll("button")).some(el => el.getAttribute("aria-label") === "코멘트 메뉴")).toBe(false);
    await click(button("다시 열기")); expect(controller.getSnapshot().snapshot!.threads.find(t => t.id === "seed-thread-resolved")?.status).toBe("open");
  });
  it("resizes without resetting input and exposes the completion label at 420px", async () => {
    await click(element('[data-comment-pin="seed-thread-open"]')); await type("크기를 바꿔도 유지");
    expect(button("반영 완료").textContent?.trim()).toBe("");
    const handle = element('[data-comment-resize="e"]');
    for (let i = 0; i < 4; i++) await key(handle, "ArrowRight");
    expect(element("[data-comment-popup]").style.width).toBe("424px"); expect(button("반영 완료").textContent).toContain("반영 완료");
    expect(element<HTMLTextAreaElement>("textarea").value).toBe("크기를 바꿔도 유지");
  });
  it("commits only the final drag point and cancels a later drag on Escape", async () => {
    const pin = element('[data-comment-pin="seed-thread-open"]'), spy = vi.spyOn(controller, "moveThread");
    await act(async () => {
      pin.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, isPrimary: true, button: 0, pointerId: 7, clientX: 525, clientY: 270 }));
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 7, clientX: 600, clientY: 320 }));
      window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 7, clientX: 650, clientY: 350 }));
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 7, clientX: 650, clientY: 350 }));
    });
    await settle(); expect(spy).toHaveBeenCalledTimes(1); expect(controller.getSnapshot().snapshot!.threads[0].xRatio).toBeCloseTo((650 - 220) / 1220);
    await act(async () => { pin.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, isPrimary: true, button: 0, pointerId: 8, clientX: 650, clientY: 350 })); window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 8, clientX: 900, clientY: 500 })); });
    await key(pin, "Escape"); expect(spy).toHaveBeenCalledTimes(1);
  });
  it("keeps input and shows an error after a failed write", async () => {
    await createDraft(); await type("실패 후에도 유지");
    vi.spyOn(repository, "execute").mockRejectedValueOnce(new CommentError("storage", "저장 실패"));
    await click(button("의견 등록")); expect(element('[role="alert"]').textContent).toContain("저장 실패");
    expect(element<HTMLTextAreaElement>("textarea").value).toBe("실패 후에도 유지");
    await click(button("의견 등록")); expect(controller.getSnapshot().snapshot!.threads).toHaveLength(3);
  });
  it("requires explicit conflict review before overwriting a newer revision", async () => {
    await click(element('[data-comment-pin="seed-thread-open"]')); await click(button("코멘트 메뉴")); await click(button("수정")); await type("내 수정 초안");
    await repository.execute(identity, { type: "edit-message", messageId: "seed-message-open", expectedRevision: 1, draft: { text: "다른 창의 최신 내용", mentions: [] } });
    await click(button("수정 저장")); expect(element('[role="alert"]').textContent).toContain("변경");
    await click(button("최신 내용 불러오기")); await tick();
    expect(button("수정 저장").disabled).toBe(true); expect(element('[data-comment-message="seed-message-open"]').textContent).toContain("다른 창의 최신 내용");
    expect(element<HTMLTextAreaElement>('textarea[aria-label="의견 수정"]').value).toBe("내 수정 초안");
    await click(button("최신 내용 기준으로 수정")); await click(button("수정 저장"));
    expect(controller.getSnapshot().snapshot!.messages.find(m => m.id === "seed-message-open")?.text).toBe("내 수정 초안");
  });
  it("edits and deletes only the current user's reply", async () => {
    await click(element('[data-comment-pin="seed-thread-resolved"]')); await click(button("정소담 답글 메뉴")); await click(button("수정")); await type("완료 후 답글 수정"); await click(button("수정 저장"));
    expect(controller.getSnapshot().snapshot!.messages.find(m => m.id === "seed-reply-resolved")?.text).toBe("완료 후 답글 수정");
    await click(button("정소담 답글 메뉴")); await click(button("답글 삭제")); await click(button("삭제"));
    expect(controller.getSnapshot().snapshot!.threads).toHaveLength(2);
    expect(controller.getSnapshot().snapshot!.messages.some(m => m.id === "seed-reply-resolved")).toBe(false);
  });
  it.each([[1024, 500], [390, 844], [320, 568]])("keeps the popup inside the %s × %s work area", async (width, height) => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width }); Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
    await act(async () => { window.dispatchEvent(new Event("resize")); }); await tick();
    await click(element('[data-comment-pin="seed-thread-resolved"]'));
    const style = element("[data-comment-popup]").style;
    expect(Number.parseFloat(style.width)).toBeLessThanOrEqual(width > 760 ? width * .5 : width - 24);
    expect(Number.parseFloat(style.height)).toBeLessThanOrEqual(height * .8);
    expect(Number.parseFloat(style.left)).toBeGreaterThanOrEqual(width > 760 ? 232 : 12);
    expect(Number.parseFloat(style.left) + Number.parseFloat(style.width)).toBeLessThanOrEqual(width - 12);
  });
});
