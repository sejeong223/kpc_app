import { describe, expect, it } from "vitest";

import {
  getSidebarItemByPathname,
  getSidebarItemByScreen,
  getVisibleSidebarGroups,
  sidebarGroups,
} from "@/config/sidebar";

const expectedLabels = [
  "RFP 등록", "검토 목록", "AI 분석", "파일 업로드", "목차", "제작 설정", "제작",
  "프롬프트 세트", "Skill", "Template", "운영 정책", "토큰·비용 관리", "사용자 설정", "대시보드", "활동 로그",
];

describe("sidebar catalog", () => {
  it("preserves the final mock-up menu order and unique destinations", () => {
    const items = sidebarGroups.flatMap((group) => group.items);
    expect(sidebarGroups.map((group) => group.id)).toEqual(["proposal", "project", "admin"]);
    expect(items.map((item) => item.label)).toEqual(expectedLabels);
    expect(new Set(items.map((item) => item.id)).size).toBe(15);
    expect(new Set(items.map((item) => item.href)).size).toBe(15);
    expect(items.filter((item) => item.requiredRole === "Admin")).toHaveLength(8);
    expect(items.slice(0, 7).every((item) => item.requiredRole === undefined)).toBe(true);
    for (const item of items) expect(item.href).toBe(`/workspace/${item.id}`);
  });

  it("looks up only exact, allowlisted screens and paths", () => {
    expect(getSidebarItemByScreen("register")?.label).toBe("RFP 등록");
    expect(getSidebarItemByPathname("/workspace/audit")?.label).toBe("활동 로그");
    for (const screen of ["missing", "REGISTER", "../admin", "constructor"]) {
      expect(getSidebarItemByScreen(screen)).toBeUndefined();
    }
    for (const path of ["/workspace/register-extra", "/workspace/analysis/nested", "/workspace/register?preview=true", "/admin"]) {
      expect(getSidebarItemByPathname(path)).toBeUndefined();
    }
  });
});

describe("sidebar visibility", () => {
  it.each([
    { name: "auth-disabled preview", authEnabled: false, authenticated: false, roles: [], count: 15 },
    { name: "anonymous", authEnabled: true, authenticated: false, roles: ["Admin"], count: 0 },
    { name: "User", authEnabled: true, authenticated: true, roles: ["User"], count: 7 },
    { name: "Admin", authEnabled: true, authenticated: true, roles: ["Admin"], count: 15 },
    { name: "unrecognized role", authEnabled: true, authenticated: true, roles: ["admin", " Admin", "Owner"], count: 7 },
  ])("shows the expected menus for $name", ({ count, ...context }) => {
    const groups = getVisibleSidebarGroups(context);
    const items = groups.flatMap((group) => group.items);
    expect(items.map((item) => item.label)).toEqual(expectedLabels.slice(0, count));
    expect(groups.every((group) => group.items.length > 0)).toBe(true);
    if (count === 7) expect(groups.map((group) => group.id)).toEqual(["proposal", "project"]);
  });

  it("does not mutate the source catalog while filtering roles", () => {
    const original = JSON.stringify(sidebarGroups);
    getVisibleSidebarGroups({ authEnabled: true, authenticated: true, roles: ["User"] });
    expect(JSON.stringify(sidebarGroups)).toBe(original);
    expect(getVisibleSidebarGroups({ authEnabled: false, authenticated: false }).flatMap((group) => group.items)).toHaveLength(15);
  });

  it.each([
    { authEnabled: false, authenticated: false, previewRole: "user", roles: [], count: 7 },
    { authEnabled: false, authenticated: false, previewRole: "admin", roles: [], count: 15 },
    { authEnabled: true, authenticated: true, previewRole: "admin", roles: ["User"], count: 7 },
    { authEnabled: true, authenticated: true, previewRole: "user", roles: ["Admin"], count: 15 },
    { authEnabled: true, authenticated: false, previewRole: "admin", roles: ["Admin"], count: 0 },
    { authEnabled: true, authenticated: true, previewRole: "admin", roles: ["Owner"], count: 7 },
  ] as const)("keeps preview $previewRole separate from session roles $roles", ({ count, ...context }) => {
    const before = JSON.stringify(sidebarGroups);
    const items = getVisibleSidebarGroups(context).flatMap((group) => group.items);
    expect(items.map((item) => item.label)).toEqual(expectedLabels.slice(0, count));
    expect(JSON.stringify(sidebarGroups)).toBe(before);
  });
});
