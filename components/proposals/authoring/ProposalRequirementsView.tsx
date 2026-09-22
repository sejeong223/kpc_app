"use client";

import { useDeferredValue, useState } from "react";
import { Download, Edit3, Plus, Search, Trash2 } from "lucide-react";

import RequirementEditorDialog from "@/components/proposals/authoring/RequirementEditorDialog";
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
import type { ProposalWorkspaceAction } from "@/lib/proposals/workspace";
import type { ProposalProject, ProposalRequirement, ProposalWorkflowStep } from "@/types/proposals";

interface ProposalRequirementsViewProps {
  project: ProposalProject;
  requirements: ProposalRequirement[];
  dispatch: React.Dispatch<ProposalWorkspaceAction>;
  onNavigate(step: ProposalWorkflowStep): void;
}

function escapeCsvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export default function ProposalRequirementsView({ project, requirements, dispatch, onNavigate }: ProposalRequirementsViewProps): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery.trim().toLocaleLowerCase("ko-KR"));
  const [category, setCategory] = useState("전체");
  const [priority, setPriority] = useState("전체");
  const [status, setStatus] = useState("전체");
  const [editing, setEditing] = useState<ProposalRequirement | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleting, setDeleting] = useState<ProposalRequirement | null>(null);
  const [emptyConfirmOpen, setEmptyConfirmOpen] = useState(false);
  const categories = Array.from(new Set(requirements.map((requirement) => requirement.category)));
  const filtered = requirements.filter((requirement) =>
    (category === "전체" || requirement.category === category) &&
    (priority === "전체" || requirement.priority === priority) &&
    (status === "전체" || requirement.status === status) &&
    (!deferredQuery || `${requirement.id} ${requirement.title} ${requirement.assignee}`.toLocaleLowerCase("ko-KR").includes(deferredQuery)),
  );
  const reflected = requirements.filter((requirement) => requirement.status === "반영").length;
  const writing = requirements.filter((requirement) => requirement.status === "작성 중").length;
  const pending = requirements.filter((requirement) => requirement.status === "미반영").length;
  const completionRate = requirements.length === 0 ? 0 : Math.round((reflected / requirements.length) * 100);

  const exportCsv = () => {
    const rows = [
      ["ID", "요구사항", "분류", "RFP 페이지", "우선순위", "담당자", "상태"],
      ...requirements.map((requirement) => [requirement.id, requirement.title, requirement.category, requirement.sourcePage, requirement.priority, requirement.assignee, requirement.status]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.title.replace(/[^0-9A-Za-z가-힣_-]+/g, "_") || "proposal"}_requirements.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const navigateNext = () => {
    if (requirements.length === 0) setEmptyConfirmOpen(true);
    else onNavigate("editor");
  };

  return (
    <section className="min-h-full bg-[#F8F9FA] p-4 lg:p-6">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs text-[#83848A]">제안 목록 / {project.title} / 03 요구사항</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold">요구사항 Checklist</h1><p className="mt-1 text-sm text-[#77787E]">RFP 요구사항의 반영 상태와 담당자를 관리합니다.</p></div><div className="flex gap-2"><Button variant="outline" onClick={exportCsv}><Download className="size-4" /> CSV 내보내기</Button><Button className="bg-kpc-red text-white hover:bg-[#CA0010]" onClick={() => { setEditing(null); setEditorOpen(true); }}><Plus className="size-4" /> 요구사항 추가</Button></div></div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">{[["총 요구사항", requirements.length], ["반영", reflected], ["작성 중", writing], ["미반영", pending], ["완료율", `${completionRate}%`]].map(([label, value]) => <div key={label} className="rounded-md border bg-white px-4 py-3"><p className="text-xs text-[#85868B]">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}</div>

        <div className="mt-4 grid gap-2 rounded-md border bg-white p-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_160px_130px_130px]">
          <label className="relative"><span className="sr-only">요구사항 검색</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#929399]" /><Input className="pl-9" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="ID, 제목, 담당자 검색" /></label>
          <FilterSelect label="분류" value={category} options={categories} onChange={setCategory} />
          <FilterSelect label="우선순위" value={priority} options={["높음", "보통", "낮음"]} onChange={setPriority} />
          <FilterSelect label="상태" value={status} options={["반영", "작성 중", "미반영"]} onChange={setStatus} />
        </div>

        <div className="mt-4 overflow-x-auto rounded-md border bg-white"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-[#F5F6F7] text-xs text-[#717278]"><tr><th className="px-3 py-3">완료</th><th className="px-3 py-3">요구사항</th><th className="px-3 py-3">분류</th><th className="px-3 py-3">RFP</th><th className="px-3 py-3">우선순위</th><th className="px-3 py-3">담당자</th><th className="px-3 py-3">상태</th><th className="px-3 py-3 text-right">작업</th></tr></thead><tbody className="divide-y">{filtered.map((requirement) => <tr key={requirement.id}><td className="px-3 py-3"><input type="checkbox" checked={requirement.checked} aria-label={`${requirement.title} 반영 완료`} onChange={() => dispatch({ type: "toggle-requirement", requirementId: requirement.id })} /></td><td className="max-w-sm px-3 py-3"><p className="text-xs text-[#929399]">{requirement.id}</p><p className="mt-1 font-medium">{requirement.title}</p></td><td className="px-3 py-3">{requirement.category}</td><td className="px-3 py-3">{requirement.sourcePage}</td><td className="px-3 py-3">{requirement.priority}</td><td className="px-3 py-3">{requirement.assignee}</td><td className="px-3 py-3"><select className="h-8 rounded-md border px-2 text-xs" value={requirement.status} aria-label={`${requirement.title} 상태`} onChange={(event) => dispatch({ type: "update-requirement", requirementId: requirement.id, changes: { status: event.target.value as ProposalRequirement["status"], checked: event.target.value === "반영" } })}>{["미반영", "작성 중", "반영"].map((value) => <option key={value} value={value}>{value}</option>)}</select></td><td className="px-3 py-3"><div className="flex justify-end"><Button size="icon" variant="ghost" title="수정" onClick={() => { setEditing(requirement); setEditorOpen(true); }}><Edit3 className="size-4" /></Button><Button size="icon" variant="ghost" title="삭제" onClick={() => setDeleting(requirement)}><Trash2 className="size-4" /></Button></div></td></tr>)}</tbody></table>{filtered.length === 0 && <p className="p-10 text-center text-sm text-[#85868B]">조건에 맞는 요구사항이 없습니다.</p>}</div>

        <div className="mt-5 flex justify-between"><Button variant="outline" onClick={() => onNavigate("analysis")}>이전: AI 분석</Button><Button className="bg-kpc-red text-white hover:bg-[#CA0010]" onClick={navigateNext}>다음: 제안서 작성</Button></div>
      </div>

      <RequirementEditorDialog key={`${editing?.id ?? "new"}-${editorOpen}`} open={editorOpen} projectId={project.id} requirement={editing} onOpenChange={setEditorOpen} onSave={(requirement) => dispatch(requirement.id === editing?.id ? { type: "update-requirement", requirementId: requirement.id, changes: requirement } : { type: "add-requirement", requirement })} />
      <Dialog open={deleting !== null} onOpenChange={(open) => { if (!open) setDeleting(null); }}><DialogContent><DialogHeader><DialogTitle>요구사항 삭제</DialogTitle><DialogDescription>“{deleting?.title}”을 삭제하면 section 연결에서도 제거됩니다.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleting(null)}>취소</Button><Button variant="destructive" onClick={() => { if (deleting) dispatch({ type: "delete-requirement", requirementId: deleting.id }); setDeleting(null); }}>삭제</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={emptyConfirmOpen} onOpenChange={setEmptyConfirmOpen}><DialogContent><DialogHeader><DialogTitle>요구사항 없이 이동</DialogTitle><DialogDescription>등록된 요구사항이 없습니다. 빈 상태로 제안서 작성을 시작할까요?</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setEmptyConfirmOpen(false)}>취소</Button><Button onClick={() => onNavigate("editor")}>이동</Button></DialogFooter></DialogContent></Dialog>
    </section>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange(value: string): void }): React.ReactElement {
  return <label><span className="sr-only">{label}</span><select className="h-9 w-full rounded-md border bg-white px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}><option value="전체">{label} 전체</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}