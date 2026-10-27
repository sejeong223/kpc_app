import { describe, expect, it } from "vitest";

import { appConfig } from "@/config/app";

// Navigation policy lives in sidebar.test.ts; appConfig retains template identity.
describe("appConfig", () => {
  it("preserves neutral template metadata", () => {
    expect(appConfig.name).toBe("Azure App Template");
    expect(appConfig.description).toBe("Azure 기반 업무 애플리케이션 템플릿");
  });
});
