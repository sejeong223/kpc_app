import { describe, expect, it } from "vitest";
import { AdminCommandSchema, AdminRoleSchema, PeriodSchema, NewAdminUserSchema } from "@/lib/admin/schemas";

describe("관리자 입력 계약", () => {
  it("역할·날짜·추가 필드·토큰 경계를 거절한다", () => {
    expect(AdminRoleSchema.safeParse("root").success).toBe(false);
    for (const from of ["2026-02-30", "2026-13-01", "2026-10-21"]) expect(PeriodSchema.safeParse({ from, to: "2026-10-20" }).success).toBe(false);
    const command = { type: "submit-token-request", submissionId: "r1", projectId: null, amountTokens: 1000, reason: "추가 검토" };
    expect(AdminCommandSchema.safeParse(command).success).toBe(true);
    expect(AdminCommandSchema.safeParse({ ...command, requesterId: "다른 사용자" }).success).toBe(false);
    for (const amountTokens of [-1, 0, 999, 1001, 1000.5, Infinity, NaN, 1_000_001_000]) expect(AdminCommandSchema.safeParse({ ...command, amountTokens }).success).toBe(false);
  });
  it("생성 입력을 정규화하고 기본 초대·역할을 적용한다", () => {
    const result = NewAdminUserSchema.parse({ name: " 신규 ", email: " NEW@EXAMPLE.INVALID ", departmentId: null, title: "연구원" });
    expect(result).toMatchObject({ name: "신규", email: "new@example.invalid", role: "user", invite: true });
  });
});
