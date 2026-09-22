"use client";

import { useRef, useState } from "react";
import { Check, FileQuestion, ListChecks, MessageCircleQuestion, Plus, Sparkles } from "lucide-react";

import ProposalDocumentTable from "@/components/proposals/authoring/ProposalDocumentTable";
import ProposalDocumentPreviewDialog from "@/components/proposals/review/ProposalDocumentPreviewDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ProposalWorkspaceAction } from "@/lib/proposals/workspace";
import { cn } from "@/lib/utils";
import type { ProposalDocument, ProposalProject } from "@/types/proposals";

interface ProposalSetupViewProps {
  project: ProposalProject;
  documents: ProposalDocument[];
  dispatch: React.Dispatch<ProposalWorkspaceAction>;
}

const writingMethods = [
  { value: "requirements" as const, title: "요구사항 기반 작성", description: "RFP 요구사항을 문서 목차와 연결합니다.", icon: ListChecks },
  { value: "qa" as const, title: "Q&A 기반 작성", description: "질문에 답하며 초안을 구성합니다.", icon: MessageCircleQuestion },
  { value: "blank" as const, title: "빈 문서에서 시작", description: "자유롭게 목차와 내용을 작성합니다.", icon: FileQuestion },
];

function formatFileSize(bytes: number): string {
  return bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function ProposalSetupView({ project, documents, dispatch }: ProposalSetupViewProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [previewDocument, setPreviewDocument] = useState<ProposalDocument | null>(null);
  const primaryRfp = documents.find((document) => document.isPrimary);

  const addDocument = (file: File) => {
    const extension = file.name.split(".").pop()?.toLocaleLowerCase("en-US");
    if (!extension || !["pdf", "doc", "docx", "hwp"].includes(extension)) {
      setError("PDF, DOC, DOCX, HWP 파일만 등록할 수 있습니다.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("파일 크기는 20MB 이하여야 합니다.");
      return;
    }
    if (documents.some((document) => document.name === file.name)) {
      setError("같은 이름의 문서가 이미 등록되어 있습니다.");
      return;
    }
    dispatch({
      type: "add-document",
      document: {
        id: `document-${project.id}-${Date.now()}`,
        projectId: project.id,
        name: file.name,
        kind: primaryRfp ? "참고자료" : "RFP",
        size: formatFileSize(file.size),
        status: "업로드 완료",
        isPrimary: !primaryRfp,
      },
    });
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <section className="min-h-full bg-[#F8F9FA] p-4 lg:p-6">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs text-[#83848A]">제안 목록 / {project.title} / 01 문서 설정</p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div><h1 className="text-2xl font-bold text-[#202124]">문서 설정</h1><p className="mt-1 text-sm text-[#77787E]">작성 방식과 분석할 문서를 확인합니다.</p></div>
          <Badge variant="outline" className="bg-white">{project.analysisStatus}</Badge>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border bg-white px-4 py-3 text-sm"><strong>{project.agency}</strong><span className="text-[#74757B]">담당 {project.manager}</span><span className="text-[#74757B]">마감 D-{project.dDay}</span><span className="text-[#74757B]">예산 {project.budget.toLocaleString("ko-KR")}원</span></div>

        <section className="mt-5 rounded-lg border bg-white p-5">
          <h2 className="font-semibold text-[#292A2F]">작성 방식</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {writingMethods.map((method) => { const Icon = method.icon; const selected = project.workflowMode === method.value; return <button key={method.value} type="button" className={cn("relative min-h-28 rounded-md border p-4 text-left", selected ? "border-kpc-red bg-[#FFF8F8]" : "hover:border-black/20")} onClick={() => dispatch({ type: "set-workflow-mode", projectId: project.id, mode: method.value })}><Icon className={cn("size-5", selected ? "text-kpc-red" : "text-[#6F7076]")} /><p className="mt-3 text-sm font-semibold">{method.title}</p><p className="mt-1 text-xs leading-5 text-[#77787E]">{method.description}</p>{selected && <Check className="absolute right-3 top-3 size-4 text-kpc-red" />}</button>; })}
          </div>
        </section>

        <section className="mt-5 rounded-lg border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-[#292A2F]">분석 문서</h2><p className="mt-1 text-xs text-[#818288]">확장자와 20MB 표시 크기만 확인하며 파일 내용은 읽지 않습니다.</p></div><Button variant="outline" onClick={() => inputRef.current?.click()}><Plus className="size-4" /> 문서 추가</Button></div>
          <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.hwp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) addDocument(file); }} />
          {error && <p className="mt-3 text-xs text-kpc-red">{error}</p>}
          <div className="mt-4"><ProposalDocumentTable documents={documents} onPreview={setPreviewDocument} onRemove={(documentId) => dispatch({ type: "remove-document", documentId })} /></div>
        </section>

        <section className="mt-5 rounded-lg border bg-white p-5">
          {project.analysisStatus === "분석 중" ? <div><div className="flex items-center gap-2"><Sparkles className="size-5 text-kpc-red" /><h2 className="font-semibold">RFP 분석 진행 중</h2></div><Progress className="mt-4" value={72} /><ul className="mt-4 grid gap-2 text-sm text-[#5E5F65] sm:grid-cols-3"><li>✓ 문서 구조 확인</li><li>✓ 핵심 요구사항 추출</li><li>• 수주 전략 정리</li></ul><Button className="mt-5 bg-kpc-red text-white hover:bg-[#CA0010]" onClick={() => { dispatch({ type: "set-analysis-status", projectId: project.id, status: "분석 완료" }); dispatch({ type: "navigate", view: "workspace", step: "analysis" }); }}>분석 결과 생성</Button></div> : <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-semibold">RFP 분석</h2><p className="mt-1 text-sm text-[#77787E]">{primaryRfp ? `${primaryRfp.name}을 fixture 결과로 분석합니다.` : "주 RFP를 등록해야 분석을 시작할 수 있습니다."}</p></div><Button disabled={!primaryRfp} className="bg-kpc-red text-white hover:bg-[#CA0010]" onClick={() => dispatch({ type: "set-analysis-status", projectId: project.id, status: "분석 중" })}><Sparkles className="size-4" /> RFP 분석 시작</Button></div>}
        </section>
      </div>
      <ProposalDocumentPreviewDialog document={previewDocument} open={previewDocument !== null} onOpenChange={(open) => { if (!open) setPreviewDocument(null); }} />
    </section>
  );
}