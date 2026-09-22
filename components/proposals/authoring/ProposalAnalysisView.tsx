"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Copy, FileSearch } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { MOCK_RFP_PREVIEW } from "@/data/proposals/mock-data";
import { cn } from "@/lib/utils";
import type { ProposalAnalysisItem, ProposalProject, ProposalWorkflowStep } from "@/types/proposals";

interface ProposalAnalysisViewProps {
  project: ProposalProject;
  analysisItems: readonly ProposalAnalysisItem[];
  onNavigate(step: ProposalWorkflowStep): void;
}

export default function ProposalAnalysisView({ project, analysisItems, onNavigate }: ProposalAnalysisViewProps): React.ReactElement {
  const [expandedIds, setExpandedIds] = useState(() => new Set(analysisItems.map((item) => item.id)));
  const [sourcePage, setSourcePage] = useState(7);
  const [sourceQuote, setSourceQuote] = useState("");
  const page = MOCK_RFP_PREVIEW.pages.find((item) => item.pageNumber === sourcePage) ?? MOCK_RFP_PREVIEW.pages[0];
  const contentParts = sourceQuote && page.content.includes(sourceQuote) ? page.content.split(sourceQuote) : [page.content];
  const allExpanded = expandedIds.size === analysisItems.length;

  const copyItem = async (item: ProposalAnalysisItem) => {
    try {
      await navigator.clipboard.writeText(`${item.title}\n${item.content}\n${item.sourceQuote}`);
      toast.success("분석 결과를 복사했습니다.");
    } catch {
      toast.error("복사하지 못했습니다. 브라우저 권한을 확인하세요.");
    }
  };

  return (
    <section className="min-h-full bg-[#F8F9FA] p-4 lg:p-6">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs text-[#83848A]">제안 목록 / {project.title} / 02 AI 분석</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-bold text-[#202124]">AI 분석 결과</h1><p className="mt-1 text-sm text-[#77787E]">RFP 핵심 내용과 근거 페이지를 함께 확인합니다.</p></div><Button variant="outline" onClick={() => setExpandedIds(allExpanded ? new Set() : new Set(analysisItems.map((item) => item.id)))}>{allExpanded ? "모두 접기" : "모두 펼치기"}</Button></div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,55fr)_minmax(360px,45fr)]">
          <div className="space-y-2">
            {analysisItems.map((item) => { const expanded = expandedIds.has(item.id); return <article key={item.id} className={cn("overflow-hidden rounded-md border bg-white", item.tone === "win" && "border-l-4 border-l-kpc-red", item.tone === "risk" && "border-l-4 border-l-amber-500")}><div className="flex items-center gap-2 p-4"><button type="button" className="flex min-w-0 flex-1 items-center justify-between text-left" onClick={() => setExpandedIds((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })}><span className="font-semibold">{item.title}</span>{expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</button><Button size="icon" variant="ghost" title="결과 복사" onClick={() => void copyItem(item)}><Copy className="size-4" /></Button></div>{expanded && <div className="border-t px-4 py-4"><p className="text-sm leading-6 text-[#55565C]">{item.content}</p><button type="button" className="mt-3 flex w-full items-start gap-2 rounded-md bg-[#F5F7FA] p-3 text-left text-xs hover:bg-[#EEF2F7]" onClick={() => { setSourcePage(Number(item.sourcePage.replace(/\D/g, ""))); setSourceQuote(item.sourceQuote); }}><FileSearch className="mt-0.5 size-4 shrink-0 text-[#3976D8]" /><span><strong className="text-[#3976D8]">RFP {item.sourcePage}</strong><span className="mt-1 block leading-5 text-[#68696F]">“{item.sourceQuote}”</span></span></button></div>}</article>; })}
          </div>

          <aside className="xl:sticky xl:top-6 xl:self-start">
            <div className="overflow-hidden rounded-md border bg-white"><div className="flex items-center justify-between border-b px-4 py-3"><h2 className="text-sm font-semibold">RFP 출처</h2><select className="h-8 rounded-md border px-2 text-xs" value={sourcePage} onChange={(event) => { setSourcePage(Number(event.target.value)); setSourceQuote(""); }}>{MOCK_RFP_PREVIEW.pages.map((item) => <option key={item.pageNumber} value={item.pageNumber}>p. {item.pageNumber}</option>)}</select></div><div className="min-h-[460px] p-7"><p className="text-xs font-semibold text-kpc-red">p. {page.pageNumber}</p><h3 className="mt-3 text-lg font-bold">{page.title}</h3><p className="mt-7 text-sm leading-8 text-[#4D4E54]">{contentParts.length === 3 ? <>{contentParts[0]}<mark className="bg-yellow-200">{sourceQuote}</mark>{contentParts[1]}</> : page.content}</p>{sourceQuote && <p className="mt-6 flex items-center gap-2 text-xs text-[#4A7A55]"><Check className="size-4" /> 선택한 근거가 강조 표시되었습니다.</p>}</div></div>
          </aside>
        </div>

        <div className="mt-5 flex justify-between"><Button variant="outline" onClick={() => onNavigate("setup")}>이전: 문서 설정</Button><Button className="bg-kpc-red text-white hover:bg-[#CA0010]" onClick={() => onNavigate("requirements")}>다음: 요구사항</Button></div>
      </div>
    </section>
  );
}