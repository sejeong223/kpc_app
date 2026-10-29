import { z } from "zod";
import { AdminPriceSchema, CostSnapshotSchema, MoneyTotalSchema } from "@/lib/admin/schemas";
import { validationError } from "@/lib/admin/errors";
import type { AdminPrice, CostSnapshot, MoneyTotal } from "@/types/admin";

const million = BigInt(1_000_000);
const halfUp = (n: bigint, d: bigint): bigint => (n + d / BigInt(2)) / d;
const CostInputSchema = z.strictObject({
  inputTokens: z.number().int().min(0).max(1_000_000_000), outputTokens: z.number().int().min(0).max(1_000_000_000),
  price: AdminPriceSchema, krwMicrosPerUsd: z.number().int().min(1).max(10_000_000_000), capturedAt: z.iso.datetime(),
});
export function calculateCost(input: { inputTokens: number; outputTokens: number; price: AdminPrice; krwMicrosPerUsd: number; capturedAt: string }): CostSnapshot {
  const result = CostInputSchema.safeParse(input);
  if (!result.success) throw validationError(result.error);
  const { inputTokens, outputTokens, price, krwMicrosPerUsd, capturedAt } = result.data;
  const amount = BigInt(inputTokens) * BigInt(price.inputUsdMicrosPerMillion) + BigInt(outputTokens) * BigInt(price.outputUsdMicrosPerMillion);
  return CostSnapshotSchema.parse({ priceId: price.id, priceVersion: price.version,
    inputUsdMicrosPerMillion: price.inputUsdMicrosPerMillion, outputUsdMicrosPerMillion: price.outputUsdMicrosPerMillion,
    krwMicrosPerUsd, capturedAt, amountUsdMicros: halfUp(amount, million).toString(),
    amountKrwMicros: halfUp(amount * BigInt(krwMicrosPerUsd), million * million).toString() });
}
export function sumMoney(items: readonly MoneyTotal[]): MoneyTotal {
  let usd = BigInt(0), krw = BigInt(0);
  for (const item of items) {
    const parsed = MoneyTotalSchema.safeParse(item);
    if (!parsed.success) throw validationError(parsed.error);
    usd += BigInt(item.usdMicros); krw += BigInt(item.krwMicros);
  }
  return { usdMicros: usd.toString(), krwMicros: krw.toString() };
}
function money(value: string): bigint {
  const parsed = MoneyTotalSchema.safeParse({ usdMicros: value, krwMicros: value });
  if (!parsed.success) throw validationError(parsed.error);
  return BigInt(value);
}
export function formatKrw(micros: string): string { return "₩" + halfUp(money(micros), million).toLocaleString("ko-KR"); }
export function formatUsd(micros: string): string {
  const value = money(micros), fraction = (value % million).toString().padStart(6, "0").replace(/0+$/, "");
  return "$" + (value / million).toLocaleString("en-US") + (fraction ? "." + fraction : "");
}
function parseDecimal(text: string, min: number, max: number): number | null {
  if (!/^\d+(\.\d{1,6})?$/.test(text.trim())) return null;
  const [whole, fraction = ""] = text.trim().split(".");
  const value = BigInt(whole) * million + BigInt(fraction.padEnd(6, "0"));
  return value < BigInt(min) || value > BigInt(max) ? null : Number(value);
}
export function parseUsdRate(text: string): number | null { return parseDecimal(text, 0, 1_000_000_000); }
export function parseFx(text: string): number | null { return parseDecimal(text, 1, 10_000_000_000); }
