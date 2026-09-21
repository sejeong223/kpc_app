"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  ArrowRight,
  Search,
  RotateCcw,
  Trash2,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import Link from "next/link";
import { Pagination } from "@/components/ui/pagination";

interface HistoryItem {
  id: string;
  filename: string;
  sourceLang: string;
  targetLang: string;
  registrant: string;
  date: string;
  status: "completed" | "processing" | "failed";
}

const mockData: HistoryItem[] = Array.from({ length: 15 }, (_, i) => ({
  id: `${i + 1}`,
  filename: `document_${i + 1}.pdf`,
  sourceLang: i % 2 === 0 ? "한국어" : "영어",
  targetLang: i % 2 === 0 ? "영어" : "한국어",
  registrant: ["김철수", "이영희", "박민수", "최지우"][i % 4],
  date: "2024-12-18",
  status: (["completed", "processing", "failed"] as const)[i % 3],
}));

interface HistoryTableProps {
  title?: string;
  showPagination?: boolean;
  maxItems?: number;
  showFilter?: boolean;
  showViewAll?: boolean;
}

export function HistoryTable({
  title = "최근 등록 파일 조회",
  showPagination = true,
  maxItems,
  showFilter = true,
  showViewAll = false
}: HistoryTableProps) {
  const [data, setData] = useState<HistoryItem[]>(mockData);
  const [filterFilename, setFilterFilename] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleReset = () => {
    setFilterFilename("");
    setStartDate("");
    setEndDate("");
  };

  const handleDelete = (id: string) => {
    setData(prev => prev.filter(item => item.id !== id));
  };

  const filteredData = data.filter(item => {
    const matchesFilename = item.filename.toLowerCase().includes(filterFilename.toLowerCase());
    const matchesStartDate = !startDate || item.date >= startDate;
    const matchesEndDate = !endDate || item.date <= endDate;
    return matchesFilename && matchesStartDate && matchesEndDate;
  });

  const displayedData = maxItems ? filteredData.slice(0, maxItems) : filteredData;

  return (
    <div className="flex flex-col h-full min-h-0 space-y-4">
      {/* Header & Integrated Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 px-1">
        <h3 className="text-lg font-semibold text-slate-800 shrink-0">{title}</h3>

        {/* Integrated Controls Group */}
        <div className="flex flex-wrap items-center gap-2">
          {showFilter && (
            <>
              {/* Filename Search */}
              <div className="relative w-full sm:w-[180px] xl:w-[220px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder="파일명 검색"
                  className="pl-8 h-8 bg-slate-50 border-slate-200 text-[11px] rounded-lg focus:bg-white transition-colors"
                  value={filterFilename}
                  onChange={(e) => setFilterFilename(e.target.value)}
                />
              </div>

              {/* Date Range Group */}
              <div className="flex items-center gap-1.5 bg-slate-50/50 p-1 rounded-lg border border-slate-100/50">
                <div className="relative w-[110px] xl:w-[130px]">
                  <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <Input
                    type="date"
                    className="pl-6 h-7 bg-white border-transparent text-[10px] rounded focus:border-slate-200 transition-all px-1"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <span className="text-slate-300 text-[10px]">~</span>
                <div className="relative w-[110px] xl:w-[130px]">
                  <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                  <Input
                    type="date"
                    className="pl-6 h-7 bg-white border-transparent text-[10px] rounded focus:border-slate-200 transition-all px-1"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Reset Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-8 w-8 xl:w-auto xl:px-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg shrink-0"
                title="필터 초기화"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden xl:inline text-[11px] font-bold ml-1.5">초기화</span>
              </Button>
            </>
          )}

          {showViewAll && (
            <Link href="/translation-history">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg flex items-center gap-1.5"
              >
                <span className="text-[11px] font-bold">전체 보기</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-1 min-h-0 border border-slate-100 rounded-2xl bg-white shadow-sm overflow-hidden flex flex-col">
        <ScrollArea className="h-full w-full" type="always">
          <div className="min-w-[900px]">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50/90 backdrop-blur-md">
                  <th className="h-11 px-4 text-left align-middle font-semibold text-slate-600 border-b border-slate-100 min-w-[300px]">파일명</th>
                  <th className="h-11 px-4 text-left align-middle font-semibold text-slate-600 border-b border-slate-100 min-w-[160px]">번역 방식</th>
                  <th className="h-11 px-4 text-left align-middle font-semibold text-slate-600 border-b border-slate-100 min-w-[120px]">등록자</th>
                  <th className="h-11 px-4 text-left align-middle font-semibold text-slate-600 border-b border-slate-100 min-w-[140px]">등록일</th>
                  <th className="h-11 px-4 text-left align-middle font-semibold text-slate-600 border-b border-slate-100 min-w-[140px]">상태</th>
                  <th className="h-11 px-4 text-right align-middle font-semibold text-slate-600 border-b border-slate-100 w-[60px]">관리</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0 text-[13px]">
                {displayedData.map((item) => (
                  <tr key={item.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 align-middle font-medium text-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-sky-500" />
                        </div>
                        <span className="truncate">{item.filename}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2 text-slate-500">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-medium">{item.sourceLang}</span>
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                        <span className="bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded text-[11px] font-medium">{item.targetLang}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle text-slate-600">{item.registrant}</td>
                    <td className="p-4 align-middle text-slate-400">{item.date}</td>
                    <td className="p-4 align-middle">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "rounded-lg px-2.5 py-1 font-semibold border-0 shadow-none",
                          item.status === "completed" && "bg-emerald-50 text-emerald-600",
                          item.status === "processing" && "bg-sky-50 text-sky-600",
                          item.status === "failed" && "bg-rose-50 text-rose-600"
                        )}
                      >
                        {item.status === "completed" && "완료"}
                        {item.status === "processing" && "진행 중"}
                        {item.status === "failed" && "실패"}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Pagination - Pinned Bottom */}
      {showPagination && (
        <Pagination
          totalItems={filteredData.length}
          className="px-4 py-3 bg-white border-t border-slate-100"
        />
      )}
    </div>
  );
}
