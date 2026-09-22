"use client";

import { useDeferredValue, useState } from "react";
import { Building2, Eye, FileText, Search } from "lucide-react";
import { toast } from "sonner";

import EnterpriseLibraryDialog from "@/components/proposals/support/EnterpriseLibraryDialog";
import ProposalLibraryPreviewDialog from "@/components/proposals/support/ProposalLibraryPreviewDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MOCK_ENTERPRISE_LIBRARY_ITEMS } from "@/data/proposals/mock-data";
import type { ProposalWorkspaceAction } from "@/lib/proposals/workspace";
import type { ProposalLibraryItem, ProposalProject } from "@/types/proposals";

interface ProposalLibraryViewProps {
  items: ProposalLibraryItem[];
  activeProject: ProposalProject | null;
  importedDocumentIds: string[];
  dispatch: React.Dispatch<ProposalWorkspaceAction>;
}

type LibrarySort = "최근 수정" | "사용 횟수" | "이름";

export default function ProposalLibraryView({ items, activeProject, importedDocumentIds, dispatch }: ProposalLibraryViewProps): React.ReactElement {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("ko-KR"));
  const [category, setCategory] = useState("전체");
  const [sort, setSort] = useState<LibrarySort>("최근 수정");
  const [previewItem, setPreviewItem] = useState<ProposalLibraryItem | null>(null);
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);
  const categories = ["전체", ...Array.from(new Set(items.map((item) => item.category)))];
  const importedIds = new Set(importedDocumentIds.map((id) => id.split(`library-${activeProject?.id}-`)[1]).filter(Boolean));
  const filtered = items.filter((item) => (category === "전체" || item.category === category) && (!deferredQuery || `${item.title} ${item.description} ${item.tags.join(" ")} ${item.department}`.toLocaleLowerCase("ko-KR").includes(deferredQuery))).sort((left, right) => sort === "최근 수정" ? right.updatedAt.localeCompare(left.updatedAt) : sort === "사용 횟수" ? right.useCount - left.useCount : left.title.localeCompare(right.title, "ko-KR"));

  const importItem = (item: ProposalLibraryItem) => {
    if (!activeProject || importedIds.has(item.id)) return;
    dispatch({ type: "import-library-item", item, projectId: activeProject.id });
    toast.success(`${item.title}을 프로젝트에 추가했습니다.`);
  };

  return (
    <section className="min-h-full bg-[#F8F9FA] p-4 lg:p-6"><div className="mx-auto max-w-7xl"><header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold">제안 자료 라이브러리</h1><p className="mt-1 text-sm text-[#77787E]">재사용 가능한 사내 자료 {items.length}개</p></div><Button className="bg-kpc-red text-white hover:bg-[#CA0010]" onClick={() => setEnterpriseOpen(true)}><Building2 className="size-4" /> 사내 지식 가져오기</Button></header><div className="mt-5 rounded-md border bg-white p-3"><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><label className="relative min-w-0 flex-1"><span className="sr-only">라이브러리 검색</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#929399]" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목, 설명, 태그, 부서 검색" /></label><select className="h-9 rounded-md border px-3 text-sm" value={sort} onChange={(event) => setSort(event.target.value as LibrarySort)} aria-label="자료 정렬"><option>최근 수정</option><option>사용 횟수</option><option>이름</option></select></div><div className="mt-3 flex flex-wrap gap-2">{categories.map((value) => <button key={value} type="button" className={`rounded-full border px-3 py-1 text-xs ${category === value ? "border-kpc-red bg-[#FFF1F2] text-kpc-red" : "bg-white text-[#626369]"}`} onClick={() => setCategory(value)}>{value}</button>)}</div></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((item) => <article key={item.id} className="rounded-md border bg-white p-4"><div className="flex items-start justify-between gap-3"><FileText className="size-5 shrink-0 text-kpc-red" /><span className="rounded bg-[#F0F1F3] px-2 py-1 text-[10px] font-bold">{item.fileFormat}</span></div><h2 className="mt-3 font-semibold">{item.title}</h2><p className="mt-2 line-clamp-2 text-xs leading-5 text-[#77787E]">{item.description}</p><div className="mt-3 flex flex-wrap gap-1">{item.tags.map((tag) => <span key={tag} className="rounded-full bg-[#F5F6F7] px-2 py-1 text-[10px]">{tag}</span>)}</div><dl className="mt-4 grid grid-cols-2 gap-2 border-t pt-3 text-[11px] text-[#77787E]"><div>{item.category} · {item.department}</div><div className="text-right">{item.size} · {item.useCount}회</div><div>{item.updatedAt}</div></dl><Button className="mt-3 w-full" variant="outline" size="sm" onClick={() => setPreviewItem(item)}><Eye className="size-4" /> 미리보기</Button></article>)}</div>{filtered.length === 0 && <p className="py-16 text-center text-sm text-[#85868B]">조건에 맞는 자료가 없습니다.</p>}</div><ProposalLibraryPreviewDialog item={previewItem} canImport={Boolean(activeProject && previewItem && !importedIds.has(previewItem.id))} open={previewItem !== null} onOpenChange={(open) => { if (!open) setPreviewItem(null); }} onImport={importItem} /><EnterpriseLibraryDialog key={`${activeProject?.id}-${enterpriseOpen}`} open={enterpriseOpen} items={MOCK_ENTERPRISE_LIBRARY_ITEMS} importedItemIds={importedIds} onOpenChange={setEnterpriseOpen} onImport={(selected) => selected.forEach(importItem)} /></section>
  );
}