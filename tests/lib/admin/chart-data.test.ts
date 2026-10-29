import { expect, it } from "vitest";
import { buildChartCoordinates } from "@/lib/admin/chart-data";
const point = { id: "one", label: "첫날", value: 0, tooltip: "0건" };
it("빈 값·한 점·모든 0값·같은 최대값을 유한한 좌표로 계산한다", () => {
  expect(buildChartCoordinates([], 720, 200)).toEqual([]);
  expect(buildChartCoordinates([point], 720, 200)[0]).toMatchObject({ x: 360, y: 176 });
  const zero = buildChartCoordinates([point, { ...point, id: "two" }], 720, 200);
  expect(zero.map((p) => p.y)).toEqual([176, 176]); expect(zero.map((p) => p.x)).toEqual([24, 696]);
  const equal = buildChartCoordinates([{ ...point, value: 10 }, { ...point, id: "two", value: 10 }], 720, 200);
  expect(equal.map((p) => p.y)).toEqual([24, 24]); expect(point.value).toBe(0);
});
it("음수·비유한 값·부적절한 차트 크기를 거절한다", () => {
  for (const value of [-1, NaN, Infinity]) expect(() => buildChartCoordinates([{ ...point, value }], 720, 200)).toThrow();
  for (const size of [0, 48, -10, NaN, Infinity]) expect(() => buildChartCoordinates([], size, 200)).toThrow();
});
