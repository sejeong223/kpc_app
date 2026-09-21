"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getPaginationItems } from "@/lib/pagination";
import { cn } from "@/lib/utils";

interface PaginationProps {
  totalItems: number;
  currentPage?: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

export function Pagination({
  totalItems,
  currentPage = 1,
  itemsPerPage = 10,
  onPageChange,
  className,
}: PaginationProps) {
  if (!Number.isFinite(totalItems) || totalItems < 0) {
    throw new RangeError("totalItems must be a non-negative number");
  }

  if (!Number.isFinite(itemsPerPage) || itemsPerPage <= 0) {
    throw new RangeError("itemsPerPage must be a positive number");
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const normalizedCurrentPage = Number.isFinite(currentPage)
    ? Math.min(totalPages, Math.max(1, Math.trunc(currentPage)))
    : 1;
  const items = getPaginationItems({
    totalPages,
    currentPage: normalizedCurrentPage,
  });

  return (
    <div
      className={cn(
        "mt-auto flex shrink-0 items-center justify-between border-t border-border px-2 pt-2",
        className,
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">
        총 <span className="font-bold text-primary">{totalItems}</span>개
      </p>
      <nav aria-label="페이지 탐색" className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          className="rounded-lg"
          aria-label="이전 페이지"
          disabled={normalizedCurrentPage === 1}
          onClick={() => onPageChange?.(normalizedCurrentPage - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex items-center">
          {items.map((item) => {
            if (typeof item !== "number") {
              return (
                <span
                  key={item}
                  className="flex size-8 items-center justify-center text-muted-foreground"
                  aria-hidden="true"
                >
                  …
                </span>
              );
            }

            const isCurrent = item === normalizedCurrentPage;

            return (
              <Button
                key={item}
                variant="ghost"
                size="icon-sm"
                className={cn(
                  "rounded-lg",
                  isCurrent
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                    : "text-muted-foreground",
                )}
                aria-label={`${item}페이지`}
                aria-current={isCurrent ? "page" : undefined}
                onClick={() => onPageChange?.(item)}
              >
                {item}
              </Button>
            );
          })}
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          className="rounded-lg"
          aria-label="다음 페이지"
          disabled={normalizedCurrentPage === totalPages}
          onClick={() => onPageChange?.(normalizedCurrentPage + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </nav>
    </div>
  );
}
