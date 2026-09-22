"use client";

import { useState } from "react";
import { ArrowLeft, PenLine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ProposalWorkspaceAction } from "@/lib/proposals/workspace";
import type { ProposalProject, ProposalSection } from "@/types/proposals";

interface ProposalTaskManagementViewProps {
  project: ProposalProject;
  sections: ProposalSection[];
  dispatch: React.Dispatch<ProposalWorkspaceAction>;
}

const currentUser = "정소담";
const statuses: ProposalSection["status"][] = ["작성 대기", "작성 중", "검토 요청", "완료"];

export default function ProposalTaskManagementView({ project, sections, dispatch }: ProposalTaskManagementViewProps): React.ReactElement {
  const [statusFilter, setStatusFilter] = useState("전체");
  const [mineOnly, setMineOnly] = useState(false);
  const people = Array.from(new Set([currentUser, project.manager, ...project.teamMembers, ...sections.flatMap((section) => [section.assignee, section.reviewer])].filter(Boolean)));
  const filtered = sections.filter((section) => (statusFilter === "전체" || section.status === statusFilter) && (!mineOnly || section.assignee === currentUser || section.reviewer === currentUser));
  const completed = sections.filter((section) => section.status === "완료").length;
  const reviewRequested = sections.filter((section) => section.status === "검토 요청").length;
  const delayed = sections.filter((section) => section.status !== "완료" && section.dueDate < "2026.09.22").length;
  const currentCharacters = sections.reduce((total, section) => total + section.content.length, 0);
  const targetCharacters = sections.reduce((total, section) => total + section.targetCharacters, 0);

  const updateSection = (sectionId: string, changes: Partial<ProposalSection>) => dispatch({ type: "update-section", sectionId, changes });

  return (
    <section className="min-h-full bg-[#F8F9FA] p-4 lg:p-6">
      <div className="mx-auto max-w-7xl">
        <Button variant="ghost" className="-ml-3" onClick={() => dispatch({ type: "navigate", view: "workspace", step: "editor" })}><ArrowLeft className="size-4" /> 제안서 작성</Button>
        <div className="mt-2"><h1 className="text-2xl font-bold">작성 관리</h1><p className="mt-1 text-sm text-[#77787E]">{project.title}의 section별 담당자와 진행 상태를 관리합니다.</p></div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">{[["전체 Section", sections.length], ["완료", completed], ["검토 요청", reviewRequested], ["지연", delayed], ["글자 수", `${currentCharacters.toLocaleString()}/${targetCharacters.toLocaleString()}`]].map(([label, value]) => <div key={label} className="rounded-md border bg-white px-4 py-3"><p className="text-xs text-[#85868B]">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>)}</div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-white p-3"><select className="h-9 rounded-md border px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="작성 상태 필터"><option value="전체">상태 전체</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mineOnly} onChange={(event) => setMineOnly(event.target.checked)} /> 내 작업 ({currentUser})</label></div>

        <div className="mt-4 overflow-x-auto rounded-md border bg-white"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-[#F5F6F7] text-xs text-[#717278]"><tr><th className="px-3 py-3">Section</th><th className="px-3 py-3">담당자</th><th className="px-3 py-3">검토자</th><th className="px-3 py-3">상태</th><th className="px-3 py-3">마감일</th><th className="px-3 py-3">작성량</th><th className="px-3 py-3 text-right">작업</th></tr></thead><tbody className="divide-y">{filtered.map((section) => { const percent = Math.min(100, Math.round((section.content.length / section.targetCharacters) * 100)); return <tr key={section.id}><td className="px-3 py-3"><p className="text-xs text-[#8A8B91]">{section.number}</p><p className="mt-1 font-medium">{section.title}</p></td><td className="px-3 py-3"><PersonSelect label={`${section.title} 담당자`} value={section.assignee} people={people} onChange={(assignee) => updateSection(section.id, { assignee })} /></td><td className="px-3 py-3"><PersonSelect label={`${section.title} 검토자`} value={section.reviewer} people={people} onChange={(reviewer) => updateSection(section.id, { reviewer })} /></td><td className="px-3 py-3"><select className="h-8 rounded-md border px-2 text-xs" aria-label={`${section.title} 상태`} value={section.status} onChange={(event) => updateSection(section.id, { status: event.target.value as ProposalSection["status"] })}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></td><td className="px-3 py-3"><input type="date" className="h-8 rounded-md border px-2 text-xs" aria-label={`${section.title} 마감일`} value={section.dueDate} onChange={(event) => updateSection(section.id, { dueDate: event.target.value })} /></td><td className="w-44 px-3 py-3"><div className="flex justify-between text-[11px]"><span>{section.content.length.toLocaleString()}</span><span>{section.targetCharacters.toLocaleString()}</span></div><Progress className="mt-1.5" value={percent} /></td><td className="px-3 py-3 text-right"><Button variant="outline" size="sm" onClick={() => { dispatch({ type: "select-section", sectionId: section.id }); dispatch({ type: "navigate", view: "workspace", step: "editor" }); }}><PenLine className="size-4" /> 집필 열기</Button></td></tr>; })}</tbody></table>{filtered.length === 0 && <p className="p-10 text-center text-sm text-[#85868B]">조건에 맞는 작성 업무가 없습니다.</p>}</div>
      </div>
    </section>
  );
}

function PersonSelect({ label, value, people, onChange }: { label: string; value: string; people: string[]; onChange(value: string): void }): React.ReactElement {
  return <select className="h-8 rounded-md border px-2 text-xs" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>{people.map((person) => <option key={person} value={person}>{person}</option>)}</select>;
}