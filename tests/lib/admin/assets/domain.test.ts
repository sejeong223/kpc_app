import { describe, expect, it } from "vitest";
import { DEFAULT_SKILL_RULES } from "@/config/skill-options";
import { SkillRulesSchema } from "@/lib/skills/schema";
import { AssetCommandSchema, AssetVisibilitySchema } from "@/lib/admin/assets/schemas";

describe("자산 설정 입력", () => {
  it("6개 페이지의 공통 상속과 기준 서식을 보존한다", () => {
    const value = SkillRulesSchema.parse(DEFAULT_SKILL_RULES);
    expect(value.pt.body.title).toBeNull();
    expect(value.mg).toEqual([1.2, 1.5, 1, 1.5]);
    expect(Object.keys(value.pt)).toHaveLength(6);
    value.font.title[0] = 999;
    expect(SkillRulesSchema.safeParse(value).success).toBe(false);
  });
  it("비유한 수치·다른 페이지 규칙·추가 필드를 거절한다", () => {
    for (const grid of [NaN, Infinity, -1, .123]) expect(SkillRulesSchema.safeParse({ ...DEFAULT_SKILL_RULES, grid }).success).toBe(false);
    expect(SkillRulesSchema.safeParse({ ...DEFAULT_SKILL_RULES, injected: true }).success).toBe(false);
    const value = structuredClone(DEFAULT_SKILL_RULES);
    value.pt.body.rule = value.pt.cover.rule;
    expect(SkillRulesSchema.safeParse(value).success).toBe(false);
  });
  it("공개 대상은 정규화하고 작성자·버전 주입을 거절한다", () => {
    expect(AssetVisibilitySchema.parse({ all: true, targets: [{ type: "user", id: "u-1" }] }).targets).toEqual([]);
    const command = { type: "create-skill", ownerDepartmentId: "d-ai", status: "inactive", visibility: { all: false, targets: [] }, value: { name: "서식", short: "표준", description: "", rules: DEFAULT_SKILL_RULES } };
    expect(AssetCommandSchema.safeParse(command).success).toBe(true);
    expect(AssetCommandSchema.safeParse({ ...command, createdBy: "other" }).success).toBe(false);
    expect(AssetCommandSchema.safeParse({ ...command, currentRevision: 10 }).success).toBe(false);
  });
});
