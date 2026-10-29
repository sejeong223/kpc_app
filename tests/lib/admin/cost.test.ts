import { expect, it } from "vitest";
import { calculateCost, formatKrw, formatUsd, parseFx, parseUsdRate, sumMoney } from "@/lib/admin/cost";

const price = { id: "p", modelId: "m", version: 1, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", inputUsdMicrosPerMillion: 2000000, outputUsdMicrosPerMillion: 8000000 };
it("사용 시점 비용과 새 단가의 비용을 독립적으로 계산한다", () => {
  const input = { inputTokens: 1000, outputTokens: 500, price, krwMicrosPerUsd: 1400000000, capturedAt: price.createdAt };
  const old = calculateCost(input);
  expect(old.amountUsdMicros).toBe("6000"); expect(old.amountKrwMicros).toBe("8400000");
  expect(calculateCost({ ...input, price: { ...price, version: 2, inputUsdMicrosPerMillion: 4000000, outputUsdMicrosPerMillion: 16000000 }, krwMicrosPerUsd: 1500000000 }).amountKrwMicros).toBe("18000000");
  expect(old.amountKrwMicros).toBe("8400000");
  expect(calculateCost({ ...input, inputTokens: 0, outputTokens: 0 }).amountKrwMicros).toBe("0");
  expect(() => calculateCost({ ...input, inputTokens: -1 })).toThrow();
});
it("큰 정수·6자리 소수·합산 후 반올림을 보존한다", () => {
  expect(parseUsdRate("0.000001")).toBe(1); expect(parseFx("1400.123456")).toBe(1400123456);
  for (const value of ["1e3", "1,000", "-1", "0.0000001", "Infinity"]) expect(parseUsdRate(value)).toBeNull();
  expect(formatKrw(sumMoney([{ usdMicros: "1", krwMicros: "400000" }, { usdMicros: "2", krwMicros: "400000" }]).krwMicros)).toBe("₩1");
  expect(formatUsd("1000001")).toBe("$1.000001");
  const result = calculateCost({ inputTokens: 1000000000, outputTokens: 1000000000, price: { ...price, inputUsdMicrosPerMillion: 1000000000, outputUsdMicrosPerMillion: 1000000000 }, krwMicrosPerUsd: 10000000000, capturedAt: price.createdAt });
  expect(result.amountKrwMicros).toBe("20000000000000000");
  expect(calculateCost({ inputTokens: 1, outputTokens: 0, price: { ...price, inputUsdMicrosPerMillion: 500000 }, krwMicrosPerUsd: 1, capturedAt: price.createdAt }).amountUsdMicros).toBe("1");
});
