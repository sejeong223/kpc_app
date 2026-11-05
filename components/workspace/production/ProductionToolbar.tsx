"use client";
import { DadamButton, DadamSelect } from "@/components/ui/DadamControls";
import type { ProjectView } from "@/types/workspace-production";
export default function ProductionToolbar({ view, sectionId, onSection, onState, onUnlock, busy = false }: {
  view: ProjectView; sectionId: string | null; onSection(id: string): void; busy?: boolean;
  onState?(state: "writing" | "done"): void; onUnlock?(): void;
}) {
  const current = view.state.body.sections.find(s => s.id === sectionId);
  return <div data-comment-control className="tw:mb-(--layout-section-gap) tw:flex tw:flex-wrap tw:items-center tw:gap-(--layout-control-gap)">
    <DadamSelect aria-label="제작할 장과 소목차" value={sectionId ?? ""} disabled={busy} onChange={(_, d) => onSection(d.value)} className="tw:min-w-0 tw:flex-1">
      <option value="" disabled>소목차 선택</option>
      {view.state.body.chapters.map(chapter => <optgroup key={chapter.id} label={chapter.title}>{view.state.body.sections.filter(s => s.chapterId === chapter.id).map(section => <option key={section.id} value={section.id}>{chapter.title} / {section.title}</option>)}</optgroup>)}
    </DadamSelect>
    {current && (view.capabilities.editableSectionIds.includes(current.id) && onState ? <DadamSelect aria-label="소목차 작성 상태" value={current.state} disabled={busy} onChange={(_, d) => onState(d.value === "done" ? "done" : "writing")}><option value="writing">작성 중</option><option value="done">작성 완료</option></DadamSelect> : <span className="tw:text-xs">{current.locked ? "작성 완료 · 고정" : current.state === "done" ? "작성 완료" : "작성 중"}</span>)}
    {current && onUnlock && view.capabilities.unlockableSectionIds.includes(current.id) && <DadamButton size="small" disabled={busy} onClick={onUnlock}>고정 해제</DadamButton>}
  </div>;
}
