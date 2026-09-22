"use client";

import { useDeferredValue, useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ProposalDepartment, ProposalLibraryItem } from "@/types/proposals";

interface EnterpriseLibraryDialogProps {
  open: boolean;
  items: ProposalLibraryItem[];
  importedItemIds: Set<string>;
  onOpenChange(open: boolean): void;
  onImport(items: ProposalLibraryItem[]): void;
}

export default function EnterpriseLibraryDialog({ open, items, importedItemIds, onOpenChange, onImport }: EnterpriseLibraryDialogProps): React.ReactElement {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("ko-KR"));
  const [department, setDepartment] = useState<ProposalDepartment>("전체");
  const [category, setCategory] = useState("전체");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const departments = Array.from(new Set(items.map((item) => item.department)));
  const categories = Array.from(new Set(items.map((item) => item.category)));
  const filtered = items.filter((item) => (department === "전체" || item.department === department) && (category === "전체" || item.category === category) && (!deferredQuery || `${item.title} ${item.tags.join(" ")}`.toLocaleLowerCase("ko-KR").includes(deferredQuery)));

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>사내 지식 가져오기</DialogTitle><DialogDescription>부서와 자료 분류를 탐색해 현재 프로젝트에 추가합니다.</DialogDescription></DialogHeader><div className="grid gap-2 sm:grid-cols-3"><label className="relative"><span className="sr-only">사내 자료 검색</span><Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#929399]" /><Input className="pl-8" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="자료 검색" /></label><select className="h-9 rounded-md border px-3 text-sm" value={department} onChange={(event) => setDepartment(event.target.value as ProposalDepartment)} aria-label="부서 필터"><option value="전체">부서 전체</option>{departments.map((value) => <option key={value} value={value}>{value}</option>)}</select><select className="h-9 rounded-md border px-3 text-sm" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="자료 분류"><option value="전체">분류 전체</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select></div><div className="space-y-2">{filtered.map((item) => { const imported = importedItemIds.has(item.id); return <label key={item.id} className={`flex items-start gap-3 rounded-md border p-3 ${imported ? "bg-[#F5F6F7] opacity-60" : ""}`}><input type="checkbox" className="mt-1" disabled={imported} checked={imported || selectedIds.includes(item.id)} onChange={() => setSelectedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} /><span className="min-w-0"><strong className="block text-sm">{item.title}</strong><span className="mt-1 block text-xs text-[#7B7C82]">{item.department} / {item.category}{imported ? " · 가져옴" : ""}</span></span></label>; })}</div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button><Button disabled={selectedIds.length === 0} className="bg-kpc-red text-white hover:bg-[#CA0010]" onClick={() => { onImport(items.filter((item) => selectedIds.includes(item.id))); setSelectedIds([]); onOpenChange(false); }}>선택 자료 가져오기 ({selectedIds.length})</Button></DialogFooter></DialogContent></Dialog>;
}