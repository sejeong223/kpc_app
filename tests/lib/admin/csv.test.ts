import { expect, it } from "vitest";
import { makeCsv } from "@/lib/admin/csv";

it("CSV 인코딩·따옴표·수식 접두사를 안전하게 처리한다", () => {
  const csv = makeCsv(["이름", "값"], [["=1+1", "쉼표,값"], ["@SUM(A1)", '줄\n"인용"'], ["\t명령", null], ["-명령", 1], ["+명령", "\r명령"]]);
  expect(csv.startsWith("\uFEFF")).toBe(true); expect(csv).toContain("\r\n"); expect(csv).toContain('"\'=1+1"'); expect(csv).toContain('"\'@SUM(A1)"'); expect(csv).toContain('"줄\n""인용"""');
  expect(csv).toContain("'\t명령"); expect(csv).toContain("'-명령"); expect(csv).toContain("'+명령"); expect(csv).toContain("'\r명령");
});
