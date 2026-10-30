// @vitest-environment jsdom
import { FluentProvider, Portal, useThemeClassName, webLightTheme } from "@fluentui/react-components";
import { act, createElement, Fragment } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DadamThemeScope from "@/components/providers/DadamThemeScope";
import { dadamTheme } from "@/lib/ui/dadam-theme";

let host: HTMLDivElement, root: Root;
function Probe({ id }: { id: string }): React.ReactElement {
  return createElement("span", { id, "data-theme": useThemeClassName() });
}
function probe(id: string): HTMLElement {
  const element = document.getElementById(id);
  expect(element).not.toBeNull();
  return element!;
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  window.matchMedia = vi.fn().mockImplementation(media => ({
    matches: false, media, onchange: null, addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
  }));
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe("Dadam theme isolation and portal propagation", () => {
  it("keeps sibling themes separate and carries typography to the external portal mount", async () => {
    const outsideTheme = Object.freeze({ ...webLightTheme, colorBrandBackground: "#d7192f" });
    const originalLight = { ...webLightTheme }, originalDadam = { ...dadamTheme };
    await act(async () => {
      root.render(createElement(FluentProvider, { theme: outsideTheme }, createElement(Fragment, null,
        createElement(Probe, { id: "outside" }),
        createElement(DadamThemeScope, null,
          createElement(Probe, { id: "inside" }),
          createElement(Portal, null, createElement(Probe, { id: "portal" }))),
      )));
    });
    const scope = host.querySelector<HTMLElement>('[data-dadam-theme="basic"]')!;
    const insideTheme = probe("inside").dataset.theme!;
    expect(insideTheme).not.toBe(probe("outside").dataset.theme);
    expect(probe("portal").dataset.theme).toBe(insideTheme);
    expect(scope.contains(probe("portal"))).toBe(false);
    expect(host.contains(probe("portal"))).toBe(false);
    const mount = probe("portal").closest<HTMLElement>(".fui-FluentProvider")!;
    expect(mount).not.toBeNull();
    // Griffel replaces its merge bookkeeping class; the actual CSS classes survive.
    for (const className of scope.classList) {
      if (!className.startsWith("___")) expect(mount.classList.contains(className), className).toBe(true);
    }
    expect(scope.style.display).toBe("contents");
    expect(mount.style.display).not.toBe("contents");
    expect(probe("outside").closest("[data-dadam-theme]")).toBeNull();
    expect(outsideTheme.colorBrandBackground).toBe("#d7192f");
    expect(webLightTheme).toEqual(originalLight);
    expect(dadamTheme).toEqual(originalDadam);
  });
});
