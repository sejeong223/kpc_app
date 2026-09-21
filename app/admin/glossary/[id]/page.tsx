"use client";

import { useState, use } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
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
import { ArrowLeft, Plus, Trash2, Search, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import dayjs from "@/lib/dayjs";

// Mock Data for Terms
const MOCK_TERMS = [
  { id: 1, source: "안녕하세요", target: "Hello", createdAt: new Date("2024-12-19T10:00:00") },
  { id: 2, source: "감사합니다", target: "Thank you", createdAt: new Date("2024-12-19T10:05:00") },
  { id: 3, source: "다루다", target: "Daruda", createdAt: new Date("2024-12-19T11:20:00") },
  { id: 4, source: "번역", target: "Translation", createdAt: new Date("2024-12-19T11:25:00") },
  { id: 5, source: "인공지능", target: "Artificial Intelligence", createdAt: new Date("2024-12-18T14:00:00") },
];

export default function GlossaryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [terms, setTerms] = useState(MOCK_TERMS);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTerm, setNewTerm] = useState({ source: "", target: "" });

  const filteredTerms = terms.filter(
    (t) =>
      t.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.target.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddTerm = () => {
    if (!newTerm.source || !newTerm.target) {
      toast.error("원본 용어와 번역 용어를 모두 입력해주세요.");
      return;
    }

    const newItem = {
      id: Math.max(...terms.map(t => t.id), 0) + 1,
      source: newTerm.source,
      target: newTerm.target,
      createdAt: new Date()
    };

    setTerms([newItem, ...terms]);
    setIsAddDialogOpen(false);
    setNewTerm({ source: "", target: "" });
    toast.success("새로운 용어가 추가되었습니다.");
  };

  const handleDeleteTerm = (id: number) => {
    if (confirm("정말로 이 용어를 삭제하시겠습니까?")) {
      setTerms(terms.filter(t => t.id !== id));
      toast.success("용어가 삭제되었습니다.");
    }
  };

  return (
    <PageContainer maxWidth="full" className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col gap-4">
        {/* Navigation & Header */}
        <div className="flex items-center gap-2 text-slate-500 mb-2">
          <Link href="/admin/glossary" className="hover:text-sky-600 transition-colors flex items-center gap-1 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            <span>용어집 목록</span>
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-bold text-sm">상세 관리</span>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-800">한국어 <ArrowRight className="inline w-5 h-5 text-slate-300 mx-1" /> 영어</h1>
            </div>
            <p className="text-slate-500 text-sm">이 용어집에 등록된 모든 용어를 관리합니다.</p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-sky-600 hover:bg-sky-700 text-white gap-2 rounded-xl shadow-sm h-10 px-5">
                <Plus className="w-4 h-4" />
                <span className="font-bold text-sm">새 용어 추가</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 용어 추가</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="source-term" className="text-right">
                    원본 용어
                  </Label>
                  <Input
                    id="source-term"
                    value={newTerm.source}
                    onChange={(e) => setNewTerm({ ...newTerm, source: e.target.value })}
                    className="col-span-3"
                    placeholder="예: 다루다"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="target-term" className="text-right">
                    번역 용어
                  </Label>
                  <Input
                    id="target-term"
                    value={newTerm.target}
                    onChange={(e) => setNewTerm({ ...newTerm, target: e.target.value })}
                    className="col-span-3"
                    placeholder="예: Daruda"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleAddTerm} className="bg-sky-600 hover:bg-sky-700 w-full rounded-lg">저장하기</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Terms Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="용어 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 border-slate-200 bg-white"
            />
          </div>
          <div className="text-xs font-bold text-slate-500">
            총 <span className="text-sky-600">{filteredTerms.length}</span>개
          </div>
        </div>

        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[100px] font-bold text-slate-500">No.</TableHead>
              <TableHead className="font-bold text-slate-600">원본 용어</TableHead>
              <TableHead className="font-bold text-slate-600">번역 용어</TableHead>
              <TableHead className="w-[150px] font-bold text-slate-500">등록일</TableHead>
              <TableHead className="w-[80px] font-bold text-slate-500 text-center">삭제</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTerms.map((term, index) => (
              <TableRow key={term.id} className="hover:bg-slate-50/50">
                <TableCell className="font-medium text-slate-400 text-xs">{filteredTerms.length - index}</TableCell>
                <TableCell className="font-medium text-slate-800">{term.source}</TableCell>
                <TableCell className="font-medium text-sky-600">{term.target}</TableCell>
                <TableCell className="text-xs text-slate-400">{dayjs(term.createdAt).format("YYYY.MM.DD")}</TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                    onClick={() => handleDeleteTerm(term.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredTerms.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center text-slate-400">
                  등록된 용어가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </PageContainer>
  );
}
