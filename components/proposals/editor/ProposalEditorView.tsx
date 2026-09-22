"use client";

import { useState } from "react";

import ProposalAssistantPanel from "@/components/proposals/editor/ProposalAssistantPanel";
import ProposalContentEditor from "@/components/proposals/editor/ProposalContentEditor";
import ProposalSectionNavigator from "@/components/proposals/editor/ProposalSectionNavigator";
import SectionReferenceDialog from "@/components/proposals/editor/SectionReferenceDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  expandMockText,
  generateMockDraft,
  reduceMockText,
  refineMockText,
} from "@/lib/proposals/editor-mocks";
import type { ProposalWorkspaceAction } from "@/lib/proposals/workspace";
import type {
  ProposalComment,
  ProposalDocument,
  ProposalLibraryItem,
  ProposalProject,
  ProposalRequirement,
  ProposalSection,
  ProposalVersion,
  ProposalWorkflowStep,
  SectionReferenceConfig,
} from "@/types/proposals";

interface ProposalEditorViewProps {
  project: ProposalProject;
  sections: ProposalSection[];
  requirements: ProposalRequirement[];
  documents: ProposalDocument[];
  libraryItems: ProposalLibraryItem[];
  selectedSectionId: string | null;
  dispatch: React.Dispatch<ProposalWorkspaceAction>;
  onNavigate(step: ProposalWorkflowStep): void;
}

export default function ProposalEditorView({ project, sections, requirements, documents, libraryItems, selectedSectionId, dispatch, onNavigate }: ProposalEditorViewProps): React.ReactElement {
  const selectedSection = sections.find((section) => section.id === selectedSectionId) ?? sections[0];
  const [draft, setDraft] = useState(selectedSection?.content ?? "");
  const [aiPreview, setAiPreview] = useState("");
  const [pendingSectionId, setPendingSectionId] = useState<string | null>(null);
  const [pendingVersion, setPendingVersion] = useState<ProposalVersion | null>(null);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [comments, setComments] = useState<ProposalComment[]>([]);
  const [versions, setVersions] = useState<ProposalVersion[]>([]);
  const [referenceConfigs, setReferenceConfigs] = useState<Record<string, SectionReferenceConfig>>({});
  const [compactPane, setCompactPane] = useState<"sections" | "editor" | "assistant">("editor");

  if (!selectedSection) {
    return <section className="flex min-h-full items-center justify-center bg-[#F8F9FA] p-6"><div className="text-center"><h1 className="text-lg font-bold">작성할 Section이 없습니다.</h1><Button className="mt-4" variant="outline" onClick={() => onNavigate("requirements")}>요구사항으로 이동</Button></div></section>;
  }

  const saved = draft === selectedSection.content;
  const people = Array.from(new Set([project.manager, ...project.teamMembers, selectedSection.assignee, selectedSection.reviewer].filter(Boolean)));
  const referenceConfig = referenceConfigs[selectedSection.id] ?? {
    sectionId: selectedSection.id,
    libraryItemIds: [],
    documentIds: documents.filter((document) => document.isPrimary).map((document) => document.id),
    webSearchEnabled: false,
    includeUrls: [],
  };
  const sectionComments = comments.filter((comment) => comment.sectionId === selectedSection.id);
  const sectionVersions = versions.filter((version) => version.sectionId === selectedSection.id).toReversed();

  const switchSection = (sectionId: string) => {
    const target = sections.find((section) => section.id === sectionId);
    if (!target) return;
    dispatch({ type: "select-section", sectionId });
    setDraft(target.content);
    setAiPreview("");
    setPendingSectionId(null);
    setCompactPane("editor");
  };
  const requestSection = (sectionId: string) => {
    if (sectionId === selectedSection.id) return;
    if (!saved) setPendingSectionId(sectionId);
    else switchSection(sectionId);
  };
  const save = () => {
    const createdAt = new Date().toLocaleString("ko-KR");
    dispatch({ type: "update-section", sectionId: selectedSection.id, changes: { content: draft, updatedAt: createdAt } });
    setVersions((current) => [...current, { id: `version-${selectedSection.id}-${Date.now()}`, sectionId: selectedSection.id, label: `저장본 ${current.filter((version) => version.sectionId === selectedSection.id).length + 1}`, author: "정소담", createdAt, content: draft }]);
  };
  const generate = (action: "draft" | "refine" | "expand" | "reduce") => {
    const result = action === "draft" ? generateMockDraft(selectedSection, requirements) : action === "refine" ? refineMockText(draft) : action === "expand" ? expandMockText(draft) : reduceMockText(draft);
    setAiPreview(result);
  };

  return (
    <section className="h-full min-h-[680px] bg-[#F8F9FA]">
      <div className="grid grid-cols-3 border-b bg-white xl:hidden" role="tablist" aria-label="편집 화면"><button type="button" role="tab" aria-selected={compactPane === "sections"} className={`h-10 text-xs ${compactPane === "sections" ? "border-b-2 border-kpc-red text-kpc-red" : ""}`} onClick={() => setCompactPane("sections")}>Section</button><button type="button" role="tab" aria-selected={compactPane === "editor"} className={`h-10 text-xs ${compactPane === "editor" ? "border-b-2 border-kpc-red text-kpc-red" : ""}`} onClick={() => setCompactPane("editor")}>본문</button><button type="button" role="tab" aria-selected={compactPane === "assistant"} className={`h-10 text-xs ${compactPane === "assistant" ? "border-b-2 border-kpc-red text-kpc-red" : ""}`} onClick={() => setCompactPane("assistant")}>작성 보조</button></div>
      <div className="grid h-[calc(100%-2.5rem)] grid-cols-1 md:grid-cols-[256px_minmax(0,1fr)] xl:h-full xl:grid-cols-[256px_minmax(560px,1fr)_320px]">
        <div className={compactPane === "sections" ? "block" : "hidden md:block"}><ProposalSectionNavigator sections={sections} selectedSectionId={selectedSection.id} onSelect={requestSection} /></div>
        <div className={compactPane === "editor" ? "block min-w-0" : "hidden xl:block"}><ProposalContentEditor section={selectedSection} draft={draft} people={people} saved={saved} onDraftChange={setDraft} onMetadataChange={(changes) => dispatch({ type: "update-section", sectionId: selectedSection.id, changes })} onSave={save} /></div>
        <div className={compactPane === "assistant" ? "block min-w-0" : "hidden xl:block"}><ProposalAssistantPanel section={selectedSection} requirements={requirements} documents={documents} libraryItems={libraryItems} referenceConfig={referenceConfig} comments={sectionComments} versions={sectionVersions} aiPreview={aiPreview} onGenerate={generate} onApplyPreview={() => { setDraft(aiPreview); setAiPreview(""); }} onOpenReferences={() => setReferenceOpen(true)} onAddComment={(text) => setComments((current) => [...current, { id: `comment-${Date.now()}`, sectionId: selectedSection.id, author: "정소담", text, createdAt: new Date().toLocaleString("ko-KR"), resolved: false }])} onResolveComment={(commentId) => setComments((current) => current.map((comment) => comment.id === commentId ? { ...comment, resolved: true } : comment))} onRestoreVersion={setPendingVersion} /></div>
      </div>

      <SectionReferenceDialog key={`${selectedSection.id}-${referenceOpen}`} open={referenceOpen} documents={documents} libraryItems={libraryItems} initialConfig={referenceConfig} onOpenChange={setReferenceOpen} onSave={(config) => setReferenceConfigs((current) => ({ ...current, [selectedSection.id]: config }))} />
      <Dialog open={pendingSectionId !== null} onOpenChange={(open) => { if (!open) setPendingSectionId(null); }}><DialogContent><DialogHeader><DialogTitle>저장하지 않고 이동</DialogTitle><DialogDescription>현재 Section의 변경사항이 저장되지 않았습니다. 변경을 버리고 이동할까요?</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setPendingSectionId(null)}>계속 작성</Button><Button variant="destructive" onClick={() => { if (pendingSectionId) switchSection(pendingSectionId); }}>버리고 이동</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={pendingVersion !== null} onOpenChange={(open) => { if (!open) setPendingVersion(null); }}><DialogContent><DialogHeader><DialogTitle>버전 복원</DialogTitle><DialogDescription>{pendingVersion?.label}의 내용을 편집기에 불러옵니다. 저장 전까지 원본은 변경되지 않습니다.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setPendingVersion(null)}>취소</Button><Button onClick={() => { if (pendingVersion) setDraft(pendingVersion.content); setPendingVersion(null); }}>복원</Button></DialogFooter></DialogContent></Dialog>
    </section>
  );
}