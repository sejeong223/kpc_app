"use client";

import { useDeferredValue, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ProposalSection } from "@/types/proposals";

interface ProposalSectionNavigatorProps {
  sections: ProposalSection[];
  selectedSectionId: string;
  onSelect(sectionId: string): void;
}

export default function ProposalSectionNavigator({ sections, selectedSectionId, onSelect }: ProposalSectionNavigatorProps): React.ReactElement {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("ko-KR"));
  const [status, setStatus] = useState("전체");
  const filtered = sections.filter((section) => (status === "전체" || section.status === status) && (!deferredQuery || `${section.number} ${section.title}`.toLocaleLowerCase("ko-KR").includes(deferredQuery)));

  return (
    <aside className="flex min-h-0 flex-col border-r bg-white">
      <div className="border-b p-3"><label className="relative block"><span className="sr-only">Section 검색</span><Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#929399]" /><Input className="h-8 pl-8 text-xs" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Section 검색" /></label><select className="mt-2 h-8 w-full rounded-md border px-2 text-xs" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Section 상태 필터"><option value="전체">상태 전체</option>{["작성 대기", "작성 중", "검토 요청", "완료"].map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2" aria-label="제안서 Section">{filtered.map((section) => { const progress = Math.min(100, Math.round((section.content.length / section.targetCharacters) * 100)); const selected = section.id === selectedSectionId; return <button key={section.id} type="button" className={cn("w-full rounded-md border p-3 text-left", selected ? "border-kpc-red bg-[#FFF7F8]" : "border-transparent hover:bg-[#F6F7F8]")} onClick={() => onSelect(section.id)}><div className="flex items-start justify-between gap-2"><span className="text-xs font-bold text-kpc-red">{section.number}</span><span className="text-[10px] text-[#7B7C82]">{section.status}</span></div><p className="mt-1 text-sm font-medium leading-5">{section.title}</p><Progress className="mt-3 h-1" value={progress} /><p className="mt-1 text-right text-[10px] text-[#898A90]">{section.content.length}/{section.targetCharacters}</p></button>; })}{filtered.length === 0 && <p className="p-4 text-center text-xs text-[#8A8B91]">표시할 Section이 없습니다.</p>}</nav>
    </aside>
  );
}