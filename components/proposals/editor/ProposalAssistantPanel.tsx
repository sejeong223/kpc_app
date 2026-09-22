"use client";

import { useState } from "react";
import { Check, Link2, MessageSquarePlus, RotateCcw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
  ProposalComment,
  ProposalDocument,
  ProposalLibraryItem,
  ProposalRequirement,
  ProposalSection,
  ProposalVersion,
  SectionReferenceConfig,
} from "@/types/proposals";

type AssistantTab = "ai" | "requirements" | "sources" | "comments" | "versions";

interface ProposalAssistantPanelProps {
  section: ProposalSection;
  requirements: ProposalRequirement[];
  documents: ProposalDocument[];
  libraryItems: ProposalLibraryItem[];
  referenceConfig: SectionReferenceConfig;
  comments: ProposalComment[];
  versions: ProposalVersion[];
  aiPreview: string;
  onGenerate(action: "draft" | "refine" | "expand" | "reduce"): void;
  onApplyPreview(): void;
  onOpenReferences(): void;
  onAddComment(text: string): void;
  onResolveComment(commentId: string): void;
  onRestoreVersion(version: ProposalVersion): void;
}

const tabs: Array<{ id: AssistantTab; label: string }> = [
  { id: "ai", label: "AI 작성" },
  { id: "requirements", label: "요구사항" },
  { id: "sources", label: "출처" },
  { id: "comments", label: "댓글" },
  { id: "versions", label: "버전" },
];

export default function ProposalAssistantPanel(props: ProposalAssistantPanelProps): React.ReactElement {
  const [tab, setTab] = useState<AssistantTab>("ai");
  const [comment, setComment] = useState("");
  const linkedRequirements = props.requirements.filter((requirement) => props.section.requirementIds.includes(requirement.id));
  const selectedDocuments = props.documents.filter((document) => props.referenceConfig.documentIds.includes(document.id));
  const selectedLibrary = props.libraryItems.filter((item) => props.referenceConfig.libraryItemIds.includes(item.id));

  return (
    <aside className="flex min-h-0 flex-col border-l bg-white">
      <div role="tablist" aria-label="작성 보조" className="grid grid-cols-5 border-b">{tabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={`h-11 text-[11px] font-medium ${tab === item.id ? "border-b-2 border-kpc-red text-kpc-red" : "text-[#74757B]"}`} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "ai" && <div><div className="grid grid-cols-2 gap-2"><Button variant="outline" size="sm" onClick={() => props.onGenerate("draft")}><Sparkles className="size-3.5" /> 초안 생성</Button><Button variant="outline" size="sm" onClick={() => props.onGenerate("refine")}>다듬기</Button><Button variant="outline" size="sm" onClick={() => props.onGenerate("expand")}>확장</Button><Button variant="outline" size="sm" onClick={() => props.onGenerate("reduce")}>축약</Button></div>{props.aiPreview ? <div className="mt-4"><p className="text-xs font-semibold">결과 미리보기</p><div className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-md bg-[#F5F6F7] p-3 text-xs leading-6">{props.aiPreview}</div><Button className="mt-3 w-full bg-kpc-red text-white hover:bg-[#CA0010]" onClick={props.onApplyPreview}>본문에 적용</Button></div> : <p className="mt-5 text-center text-xs leading-5 text-[#898A90]">작업을 선택하면 deterministic 결과를 먼저 미리봅니다.</p>}</div>}
        {tab === "requirements" && <div className="space-y-2">{linkedRequirements.map((requirement) => <article key={requirement.id} className="rounded-md border p-3"><div className="flex items-start gap-2"><span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border ${requirement.checked ? "border-kpc-red bg-kpc-red text-white" : "text-transparent"}`}><Check className="size-3" /></span><div><p className="text-xs font-medium leading-5">{requirement.title}</p><p className="mt-1 text-[11px] text-[#85868B]">{requirement.status} · {requirement.sourcePage}</p></div></div></article>)}{linkedRequirements.length === 0 && <p className="text-center text-xs text-[#898A90]">연결된 요구사항이 없습니다.</p>}</div>}
        {tab === "sources" && <div><Button variant="outline" className="w-full" onClick={props.onOpenReferences}><Link2 className="size-4" /> 출처 설정</Button><SourceGroup title="프로젝트 문서" items={selectedDocuments.map((item) => item.name)} /><SourceGroup title="라이브러리" items={selectedLibrary.map((item) => item.title)} /><SourceGroup title="URL" items={props.referenceConfig.includeUrls} />{props.referenceConfig.webSearchEnabled && <span className="mt-3 inline-flex rounded-full bg-[#EAF2FF] px-2 py-1 text-[11px] text-[#2D66BE]">웹 검색 참고 켜짐</span>}</div>}
        {tab === "comments" && <div><Textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="검토 의견을 입력하세요." /><Button className="mt-2 w-full" variant="outline" disabled={!comment.trim()} onClick={() => { props.onAddComment(comment.trim()); setComment(""); }}><MessageSquarePlus className="size-4" /> 댓글 추가</Button><div className="mt-4 space-y-2">{props.comments.map((item) => <article key={item.id} className={`rounded-md border p-3 ${item.resolved ? "opacity-55" : ""}`}><p className="text-xs leading-5">{item.text}</p><div className="mt-2 flex items-center justify-between text-[10px] text-[#898A90]"><span>{item.author} · {item.createdAt}</span>{!item.resolved && <button type="button" className="font-medium text-kpc-red" onClick={() => props.onResolveComment(item.id)}>해결</button>}</div></article>)}</div></div>}
        {tab === "versions" && <div className="space-y-2">{props.versions.map((version) => <article key={version.id} className="rounded-md border p-3"><p className="text-xs font-semibold">{version.label}</p><p className="mt-1 text-[10px] text-[#898A90]">{version.author} · {version.createdAt}</p><Button className="mt-2" size="sm" variant="ghost" onClick={() => props.onRestoreVersion(version)}><RotateCcw className="size-3.5" /> 복원</Button></article>)}{props.versions.length === 0 && <p className="text-center text-xs text-[#898A90]">저장된 버전이 없습니다.</p>}</div>}
      </div>
    </aside>
  );
}

function SourceGroup({ title, items }: { title: string; items: string[] }): React.ReactElement {
  return <section className="mt-4"><h3 className="text-xs font-semibold">{title}</h3><div className="mt-2 flex flex-wrap gap-1">{items.map((item) => <span key={item} className="max-w-full truncate rounded-full bg-[#F0F1F3] px-2 py-1 text-[10px]">{item}</span>)}{items.length === 0 && <span className="text-[11px] text-[#9A9BA0]">선택 없음</span>}</div></section>;
}