export type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function getPaginationItems(input: {
  totalPages: number;
  currentPage: number;
  siblingCount?: number;
}): PaginationItem[] {
  const { totalPages, currentPage, siblingCount = 1 } = input;

  if (!Number.isInteger(totalPages) || totalPages < 1) {
    throw new RangeError("totalPages must be a positive integer");
  }

  if (!Number.isInteger(siblingCount) || siblingCount < 0) {
    throw new RangeError("siblingCount must be a non-negative integer");
  }

  const normalizedCurrentPage = Number.isFinite(currentPage)
    ? Math.min(totalPages, Math.max(1, Math.trunc(currentPage)))
    : 1;
  const visiblePageSlots = siblingCount * 2 + 5;

  if (totalPages <= visiblePageSlots) {
    return range(1, totalPages);
  }

  const leftSibling = Math.max(
    normalizedCurrentPage - siblingCount,
    1,
  );
  const rightSibling = Math.min(
    normalizedCurrentPage + siblingCount,
    totalPages,
  );
  const showStartEllipsis = leftSibling > 2;
  const showEndEllipsis = rightSibling < totalPages - 1;

  if (!showStartEllipsis && showEndEllipsis) {
    const leadingPageCount = 3 + siblingCount * 2;
    return [
      ...range(1, leadingPageCount),
      "ellipsis-end",
      totalPages,
    ];
  }

  if (showStartEllipsis && !showEndEllipsis) {
    const trailingPageCount = 3 + siblingCount * 2;
    return [
      1,
      "ellipsis-start",
      ...range(totalPages - trailingPageCount + 1, totalPages),
    ];
  }

  return [
    1,
    "ellipsis-start",
    ...range(leftSibling, rightSibling),
    "ellipsis-end",
    totalPages,
  ];
}
