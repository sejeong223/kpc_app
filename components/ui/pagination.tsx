"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  // Mock logic for display: usually we would calculate total pages
  // const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className={cn("flex items-center justify-between px-2 pt-2 shrink-0 border-t border-slate-50 mt-auto", className)}>
      <p className="text-xs text-slate-400 font-medium">
        검색 결과 <span className="text-sky-600 font-bold">{totalItems}</span>건
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-slate-200 disabled:opacity-50"
          disabled={currentPage <= 1}
          onClick={() => onPageChange?.(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center">
          {/* Mock Pages for visualization */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 rounded-lg font-bold",
              currentPage === 1 ? "bg-sky-50 text-sky-600" : "text-slate-400 hover:text-slate-600"
            )}
            onClick={() => onPageChange?.(1)}
          >
            1
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 rounded-lg font-bold",
              currentPage === 2 ? "bg-sky-50 text-sky-600" : "text-slate-400 hover:text-slate-600"
            )}
            onClick={() => onPageChange?.(2)}
          >
            2
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 rounded-lg font-bold",
              currentPage === 3 ? "bg-sky-50 text-sky-600" : "text-slate-400 hover:text-slate-600"
            )}
            onClick={() => onPageChange?.(3)}
          >
            3
          </Button>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg border-slate-200"
          onClick={() => onPageChange?.(currentPage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
