"use client";

import { useState } from "react";
import { Download, Printer, Search, SearchCheck } from "lucide-react";

import ProposalDocumentPreview from "@/components/proposals/review-final/ProposalDocumentPreview";
import ProposalFactCheckDialog from "@/components/proposals/review-final/ProposalFactCheckDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildProposalTextExport, calculateProposalReviewSummary, findMockFactIssues } from "@/lib/proposals/review";
import type { ProposalWorkspaceAction } from "@/lib/proposals/workspace";
import type { ProposalProject, ProposalRequirement, ProposalSection } from "@/types/proposals";

interface ProposalReviewViewProps {
  project: ProposalProject;
  sections: ProposalSection[];
  requirements: ProposalRequirement[];
  dispatch: React.Dispatch<ProposalWorkspaceAction>;
}

export default function ProposalReviewView({ project, sections, requirements, dispatch }: ProposalReviewViewProps): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState("");
  const [factOpen, setFactOpen] = useState(false);
  const summary = calculateProposalReviewSummary(sections, requirements);
  const issues = findMockFactIssues(sections);
  const requirementRate = summary.totalRequirements === 0 ? 0 : Math.round((summary.coveredRequirements / summary.totalRequirements) * 100);
  const sortedSections = [...sections].sort((left, right) => left.number.localeCompare(right.number, "ko-KR", { numeric: true }));

  const downloadText = () => {
    const content = `\uFEFF${buildProposalTextExport(project, sections)}`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_") || "proposal"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const openEditor = (sectionId: string) => {
    dispatch({ type: "select-section", sectionId });
    dispatch({ type: "navigate", view: "workspace", step: "editor" });
  };

  return (
    <section className="min-h-full bg-[#F8F9FA] p-4 lg:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="print:hidden"><p className="text-xs text-[#83848A]">제안 목록 / {project.title} / 05 검토 및 완성</p><div className="mt-3 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold">검토 및 완성</h1><p className="mt-1 text-sm text-[#77787E]">전체 문서와 누락 항목을 확인합니다. 모든 출력은 목업 출력입니다.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setFactOpen(true)}><SearchCheck className="size-4" /> 목업 Fact Check</Button><Button variant="outline" onClick={downloadText}><Download className="size-4" /> 텍스트 다운로드</Button><Button className="bg-kpc-red text-white hover:bg-[#CA0010]" onClick={() => window.print()}><Printer className="size-4" /> 인쇄 미리보기</Button></div></div></header>

        <div className="mt-5 grid grid-cols-2 gap-3 print:hidden lg:grid-cols-4">{[["완료 Section", `${summary.completedSections}/${summary.totalSections}`], ["작성 글자 수", `${summary.totalCharacters.toLocaleString()}/${summary.targetCharacters.toLocaleString()}`], ["요구사항 충족률", `${requirementRate}%`], ["목업 확인 항목", issues.length]].map(([label, value]) => <div key={label} className="rounded-md border bg-white px-4 py-3"><p className="text-xs text-[#85868B]">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>)}</div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="space-y-4 print:hidden"><section className="rounded-md border bg-white p-3"><label className="relative block"><span className="sr-only">전체 문서 검색</span><Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#929399]" /><Input className="h-8 pl-8 text-xs" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="본문 검색" /></label><nav className="mt-3 space-y-1">{sortedSections.map((section) => <a key={section.id} href={`#review-${section.id}`} className="block rounded-md px-2 py-2 text-xs hover:bg-[#F5F6F7]"><span className="font-bold text-kpc-red">{section.number}</span><span className="ml-2">{section.title}</span><span className="mt-1 block text-[10px] text-[#8A8B91]">{section.status} · {section.content.length}자</span></a>)}</nav></section></aside>
          <ProposalDocumentPreview sections={sections} searchQuery={searchQuery} />
        </div>

        <section className="mt-5 rounded-md border bg-white p-5 print:hidden"><h2 className="font-semibold">요구사항 Matrix</h2><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#F5F6F7] text-xs text-[#727379]"><tr><th className="px-3 py-3">요구사항</th><th className="px-3 py-3">출처</th><th className="px-3 py-3">상태</th><th className="px-3 py-3">연결 Section</th></tr></thead><tbody className="divide-y">{requirements.map((requirement) => { const mapped = sections.filter((section) => section.requirementIds.includes(requirement.id)); const incomplete = requirement.status !== "반영"; return <tr key={requirement.id} className={incomplete ? "bg-amber-50" : ""}><td className="px-3 py-3 font-medium">{requirement.title}</td><td className="px-3 py-3">{requirement.sourcePage}</td><td className={`px-3 py-3 ${incomplete ? "font-semibold text-kpc-red" : "text-[#397348]"}`}>{requirement.status}</td><td className="px-3 py-3">{mapped.length ? mapped.map((section) => section.number).join(", ") : <span className="text-kpc-red">미연결</span>}</td></tr>; })}</tbody></table></div></section>
      </div>
      <ProposalFactCheckDialog open={factOpen} issues={issues} sections={sections} onOpenChange={setFactOpen} onOpenEditor={openEditor} />
    </section>
  );
}