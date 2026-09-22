"use client";

import { useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Search } from "lucide-react";

import ProposalRejectDialog from "@/components/proposals/review/ProposalRejectDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MOCK_PROPOSAL_REVIEW_CRITERIA, MOCK_RFP_PREVIEW } from "@/data/proposals/mock-data";
import { getSelectedProposalDocuments, getSelectedProposalProject, type ProposalWorkspaceAction } from "@/lib/proposals/workspace";
import type { ProposalWorkspaceState } from "@/types/proposals";

interface ProposalReviewDetailProps {
  state: ProposalWorkspaceState;
  dispatch: React.Dispatch<ProposalWorkspaceAction>;
  canReview: boolean;
}

export default function ProposalReviewDetail({ state, dispatch, canReview }: ProposalReviewDetailProps): React.ReactElement {
  const project = getSelectedProposalProject(state);
  const documents = getSelectedProposalDocuments(state);
  const [pageIndex, setPageIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuote, setSelectedQuote] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [comment, setComment] = useState("");

  if (!project) {
    return <div className="p-8"><Button variant="outline" onClick={() => dispatch({ type: "navigate", view: "pipeline" })}><ArrowLeft className="size-4" /> 제안 목록으로</Button></div>;
  }

  const page = MOCK_RFP_PREVIEW.pages[pageIndex];
  const totalScore = MOCK_PROPOSAL_REVIEW_CRITERIA.reduce((total, criterion) => total + criterion.score, 0);
  const openCriterion = (sourcePage: number, quote: string) => {
    const index = MOCK_RFP_PREVIEW.pages.findIndex((item) => item.pageNumber === sourcePage);
    if (index >= 0) setPageIndex(index);
    setSelectedQuote(quote);
  };
  const contentParts = selectedQuote && page.content.includes(selectedQuote) ? page.content.split(selectedQuote) : [page.content];

  return (
    <section className="min-h-full bg-[#F8F9FA] p-4 lg:p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button size="icon" variant="ghost" title="제안 목록" onClick={() => dispatch({ type: "navigate", view: "pipeline" })}><ArrowLeft className="size-5" /></Button>
          <div className="min-w-0"><h1 className="truncate text-lg font-bold text-[#202124]">{project.title}</h1><p className="text-xs text-[#7B7C82]">{documents[0]?.name ?? project.primaryRfpFileName}</p></div>
        </div>
        <Badge variant="outline" className="bg-white">{project.stage}</Badge>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,58fr)_minmax(360px,42fr)]">
        <section className="min-h-[620px] overflow-hidden rounded-lg border bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" disabled={pageIndex === 0} onClick={() => { setPageIndex((value) => value - 1); setSelectedQuote(""); }}><ChevronLeft className="size-4" /></Button>
              <select className="h-8 rounded-md border bg-white px-2 text-xs" value={pageIndex} onChange={(event) => { setPageIndex(Number(event.target.value)); setSelectedQuote(""); }} aria-label="RFP 페이지">
                {MOCK_RFP_PREVIEW.pages.map((item, index) => <option key={item.pageNumber} value={index}>p. {item.pageNumber}</option>)}
              </select>
              <Button size="icon" variant="ghost" disabled={pageIndex === MOCK_RFP_PREVIEW.pages.length - 1} onClick={() => { setPageIndex((value) => value + 1); setSelectedQuote(""); }}><ChevronRight className="size-4" /></Button>
            </div>
            <label className="relative w-full sm:w-56"><span className="sr-only">문서 검색</span><Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#929399]" /><Input className="h-8 pl-8 text-xs" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="현재 페이지 검색" /></label>
          </div>
          <div className="mx-auto my-6 min-h-[500px] w-[min(92%,720px)] border bg-white p-8 shadow-sm sm:p-12">
            <p className="text-xs font-semibold text-kpc-red">RFP · p. {page.pageNumber}</p>
            <h2 className="mt-4 text-xl font-bold text-[#25262A]">{page.title}</h2>
            <p className="mt-8 whitespace-pre-wrap text-sm leading-8 text-[#48494F]">
              {contentParts.length === 3 ? <>{contentParts[0]}<mark className="bg-yellow-200 px-0.5">{selectedQuote}</mark>{contentParts[1]}</> : page.content}
            </p>
            {searchQuery && <p className="mt-8 rounded-md bg-[#F5F6F7] p-3 text-xs text-[#68696F]">현재 페이지에서 “{searchQuery}” {page.content.toLocaleLowerCase("ko-KR").includes(searchQuery.toLocaleLowerCase("ko-KR")) ? "검색됨" : "검색 결과 없음"}</p>}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border bg-white p-5">
            <div className="flex items-end justify-between"><div><p className="text-xs font-medium text-[#7D7E84]">P/Win 종합</p><p className="mt-1 text-3xl font-bold text-kpc-red">{totalScore}<span className="text-base text-[#77787E]">/100</span></p></div><p className="text-xs text-[#85868B]">fixture 기반 참고 점수</p></div>
            <div className="mt-5 space-y-3">
              {MOCK_PROPOSAL_REVIEW_CRITERIA.map((criterion) => (
                <button key={criterion.id} type="button" className="w-full rounded-md border p-3 text-left hover:border-kpc-red/40 hover:bg-[#FFF8F8]" onClick={() => openCriterion(criterion.sourcePage, criterion.sourceQuote)}>
                  <div className="flex justify-between text-sm font-semibold"><span>{criterion.category}</span><span>{criterion.score}/{criterion.maxScore}</span></div>
                  <p className="mt-1 text-xs leading-5 text-[#6F7076]">{criterion.rationale}</p>
                  <p className="mt-2 text-[11px] font-medium text-kpc-red">근거 p. {criterion.sourcePage}</p>
                </button>
              ))}
            </div>
          </section>
          <section className="rounded-lg border bg-white p-5 text-sm">
            <h2 className="font-semibold">핵심 검토 사항</h2>
            <dl className="mt-3 space-y-3"><div><dt className="text-xs text-[#85868B]">사업 요약</dt><dd className="mt-1 leading-6">{project.summary}</dd></div><div><dt className="text-xs text-[#85868B]">주요 위험</dt><dd className="mt-1 leading-6">권한 체계 연계와 제한된 제안 기간 내 보안 검증이 필요합니다.</dd></div></dl>
            <label className="mt-4 block text-xs font-medium text-[#68696F]">관리자 의견<Textarea className="mt-2" value={comment} onChange={(event) => setComment(event.target.value)} readOnly={!canReview} /></label>
          </section>
          <section className="rounded-lg border bg-white p-4">
            {canReview ? (
              <div className="flex flex-wrap justify-end gap-2">
                {project.stage === "검토 대기" && <Button className="bg-kpc-red text-white hover:bg-[#CA0010]" onClick={() => dispatch({ type: "update-stage", projectId: project.id, stage: "검토 중" })}>검토 시작</Button>}
                {project.stage === "검토 중" && <><Button variant="outline" onClick={() => setRejectOpen(true)}>진행 안 함</Button><Button className="bg-kpc-red text-white hover:bg-[#CA0010]" onClick={() => dispatch({ type: "update-stage", projectId: project.id, stage: "진행" })}>진행 승인</Button></>}
                {project.stage === "진행" && <Button className="bg-kpc-red text-white hover:bg-[#CA0010]" onClick={() => dispatch({ type: "navigate", view: "workspace", step: "setup" })}>제안서 작성 시작</Button>}
                {project.stage === "진행 안 함" && <p className="w-full text-sm text-[#68696F]">진행 안 함: {project.rejectionReason}</p>}
              </div>
            ) : <p className="text-sm text-[#68696F]">검토 정보는 읽기 전용입니다. 단계 변경은 관리자만 할 수 있습니다.</p>}
          </section>
        </aside>
      </div>
      <ProposalRejectDialog open={rejectOpen} onOpenChange={setRejectOpen} onConfirm={(reason) => dispatch({ type: "update-stage", projectId: project.id, stage: "진행 안 함", rejectionReason: reason })} />
    </section>
  );
}