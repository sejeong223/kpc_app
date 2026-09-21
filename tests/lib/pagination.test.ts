import { describe, expect, it } from "vitest";

import { getPaginationItems } from "@/lib/pagination";

describe("getPaginationItems", () => {
  it("returns every page when the range is small", () => {
    expect(
      getPaginationItems({ totalPages: 5, currentPage: 3 }),
    ).toEqual([1, 2, 3, 4, 5]);
  });

  it("adds both ellipses around a middle page", () => {
    expect(
      getPaginationItems({ totalPages: 20, currentPage: 10 }),
    ).toEqual([1, "ellipsis-start", 9, 10, 11, "ellipsis-end", 20]);
  });

  it("expands the leading range near the first page", () => {
    expect(
      getPaginationItems({ totalPages: 20, currentPage: 1 }),
    ).toEqual([1, 2, 3, 4, 5, "ellipsis-end", 20]);
  });

  it("expands the trailing range near the last page", () => {
    expect(
      getPaginationItems({ totalPages: 20, currentPage: 20 }),
    ).toEqual([1, "ellipsis-start", 16, 17, 18, 19, 20]);
  });

  it("clamps a current page outside the valid range", () => {
    expect(
      getPaginationItems({ totalPages: 10, currentPage: 99 }),
    ).toEqual([1, "ellipsis-start", 6, 7, 8, 9, 10]);
    expect(
      getPaginationItems({ totalPages: 10, currentPage: -4 }),
    ).toEqual([1, 2, 3, 4, 5, "ellipsis-end", 10]);
  });

  it("supports an explicit sibling count", () => {
    expect(
      getPaginationItems({
        totalPages: 20,
        currentPage: 10,
        siblingCount: 2,
      }),
    ).toEqual([
      1,
      "ellipsis-start",
      8,
      9,
      10,
      11,
      12,
      "ellipsis-end",
      20,
    ]);
  });

  it("rejects invalid page counts and sibling counts", () => {
    expect(() =>
      getPaginationItems({ totalPages: 0, currentPage: 1 }),
    ).toThrow(RangeError);
    expect(() =>
      getPaginationItems({
        totalPages: 10,
        currentPage: 1,
        siblingCount: -1,
      }),
    ).toThrow(RangeError);
  });
});
