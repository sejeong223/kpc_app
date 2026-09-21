"use client";

import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardFooter, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, RotateCcw, ArrowRight, Book, Calendar } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import dayjs from "@/lib/dayjs";

// Mock Data
const MOCK_GLOSSARIES = [
  { id: 1, source: "ko", target: "en", termCount: 154, updatedAt: new Date("2024-12-19T10:00:00") },
  { id: 2, source: "en", target: "ko", termCount: 89, updatedAt: new Date("2024-12-18T15:30:00") },
  { id: 3, source: "ko", target: "ja", termCount: 230, updatedAt: new Date("2024-12-20T09:12:00") },
  { id: 4, source: "ja", target: "ko", termCount: 45, updatedAt: new Date("2024-12-15T11:20:00") },
  { id: 5, source: "ko", target: "zh", termCount: 102, updatedAt: new Date("2024-12-10T14:45:00") },
];

const LANGUAGES = [
  { value: "ko", label: "한국어", flag: "🇰🇷" },
  { value: "en", label: "영어", flag: "🇺🇸" },
  { value: "ja", label: "일본어", flag: "🇯🇵" },
  { value: "zh", label: "중국어", flag: "🇨🇳" },
];

export default function GlossaryPage() {
  const [glossaries, setGlossaries] = useState(MOCK_GLOSSARIES);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newGlossary, setNewGlossary] = useState({ source: "", target: "" });

  const filteredGlossaries = glossaries.filter((g) => {
    const matchSource = sourceFilter === "all" || g.source === sourceFilter;
    const matchTarget = targetFilter === "all" || g.target === targetFilter;
    return matchSource && matchTarget;
  });

  const handleResetFilter = () => {
    setSourceFilter("all");
    setTargetFilter("all");
  };

  const handleAddGlossary = () => {
    if (!newGlossary.source || !newGlossary.target) {
      toast.error("원본 언어와 번역 언어를 모두 선택해주세요.");
      return;
    }
    if (newGlossary.source === newGlossary.target) {
      toast.error("원본 언어와 번역 언어는 같을 수 없습니다.");
      return;
    }

    const newItem = {
      id: Math.max(...glossaries.map(g => g.id), 0) + 1,
      source: newGlossary.source,
      target: newGlossary.target,
      termCount: 0,
      updatedAt: new Date()
    };

    setGlossaries([newItem, ...glossaries]);
    setIsAddDialogOpen(false);
    setNewGlossary({ source: "", target: "" });
    toast.success("새로운 용어집이 추가되었습니다.");
  };

  const getLangLabel = (code: string) => LANGUAGES.find(l => l.value === code)?.label || code;
  const getLangFlag = (code: string) => LANGUAGES.find(l => l.value === code)?.flag || "";

  return (
    <PageContainer maxWidth="full" className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageHeader
          title="용어집 관리"
          description="번역 품질 향상을 위한 사용자 정의 용어집을 관리하세요."
          className="mb-0"
        />

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-sky-600 hover:bg-sky-700 text-white gap-2 rounded-xl shadow-sm">
              <Plus className="w-4 h-4" />
              <span className="font-bold text-sm">용어집 추가</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>새 용어집 만들기</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="source-lang" className="text-right">
                  원본
                </Label>
                <Select
                  value={newGlossary.source}
                  onValueChange={(val) => setNewGlossary({ ...newGlossary, source: val })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="언어 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.flag} {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="target-lang" className="text-right">
                  번역
                </Label>
                <Select
                  value={newGlossary.target}
                  onValueChange={(val) => setNewGlossary({ ...newGlossary, target: val })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="언어 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.flag} {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleAddGlossary} className="bg-sky-600 hover:bg-sky-700 w-full rounded-lg">저장하기</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtering Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Book className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-bold text-slate-600">필터</span>
        </div>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        <div className="flex gap-2">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="원본 언어" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">원본: 전체</SelectItem>
              {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.flag} {l.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={targetFilter} onValueChange={setTargetFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="번역 언어" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">번역: 전체</SelectItem>
              {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.flag} {l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto">
          <Button variant="ghost" size="sm" onClick={handleResetFilter} className="h-8 text-xs text-slate-500 hover:text-sky-600">
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            초기화
          </Button>
        </div>
      </div>

      {/* Glossary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredGlossaries.map((glossary) => (
          <Link href={`/admin/glossary/${glossary.id}`} key={glossary.id} className="block group">
            <Card className="hover:border-sky-300 hover:shadow-md transition-all duration-200 h-full flex flex-col cursor-pointer border-slate-200">
              <CardHeader className="pb-3 flex-1">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="flex flex-col items-center">
                    <span className="text-2xl mb-1">{getLangFlag(glossary.source)}</span>
                    <span className="text-xs font-bold text-slate-600">{getLangLabel(glossary.source)}</span>
                  </div>
                  <ArrowRight className="text-slate-300 w-5 h-5" />
                  <div className="flex flex-col items-center">
                    <span className="text-2xl mb-1">{getLangFlag(glossary.target)}</span>
                    <span className="text-xs font-bold text-slate-600">{getLangLabel(glossary.target)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-2 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Book className="w-3.5 h-3.5 text-sky-500" />
                  <span className="font-bold text-slate-700">{glossary.termCount}</span>
                  <span>용어</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{dayjs(glossary.updatedAt).format("YYYY.MM.DD")}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {filteredGlossaries.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Book className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">조건에 맞는 용어집이 없습니다.</p>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
