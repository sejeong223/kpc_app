"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, RotateCcw, Sliders } from "lucide-react";

interface PermissionFilterProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  roleFilter: string;
  setRoleFilter: (value: string) => void;
  onReset: () => void;
}

export function PermissionFilter({
  searchQuery,
  setSearchQuery,
  roleFilter,
  setRoleFilter,
  onReset,
}: PermissionFilterProps) {
  return (
    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-2">
        <Sliders className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-bold text-slate-600">필터</span>
      </div>

      <div className="h-4 w-px bg-slate-200 mx-1" />

      <div className="relative w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          placeholder="이름 또는 이메일 검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-xs bg-slate-50 border-slate-200"
        />
      </div>

      <Select value={roleFilter} onValueChange={setRoleFilter}>
        <SelectTrigger className="w-[130px] h-8 text-xs bg-slate-50 border-slate-200">
          <SelectValue placeholder="권한" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">권한: 전체</SelectItem>
          <SelectItem value="admin">관리자</SelectItem>
          <SelectItem value="user">사용자</SelectItem>
        </SelectContent>
      </Select>

      <div className="ml-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-8 text-xs text-slate-500 hover:text-sky-600"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          초기화
        </Button>
      </div>
    </div>
  );
}
