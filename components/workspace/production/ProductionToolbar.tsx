"use client";
import { useId, useRef, useState } from "react";
import { Popover, PopoverSurface, PopoverTrigger, makeStyles, tokens } from "@fluentui/react-components";
import { Checkmark16Regular, ChevronDown16Regular } from "@fluentui/react-icons";
import { DadamButton, DadamSelect } from "@/components/ui/DadamControls";
import { outlineNumbers } from "@/lib/workspace/production/selectors";
import { selectProductionSlides } from "@/lib/workspace/production/presentation";
import type { ProjectView } from "@/types/workspace-production";
export interface ProductionToolbarProps {
  view: ProjectView; sectionId: string | null; slideId: string | null; busy?: boolean;
  onSection(id: string): void; onState?(state: "writing" | "done"): void; onUnlock?(): void;
  onManageToc(): void; commentActionSlot: React.ReactNode;
}
const useStyles = makeStyles({
  title: { minWidth: 0, minHeight: 0, height: "auto", padding: "2px 6px", marginLeft: "-6px", columnGap: "6px", border: 0, borderRadius: "7px", fontSize: "16px", fontWeight: 700, letterSpacing: "-.01em", lineHeight: "24px", color: "var(--kpc-ink)", textAlign: "left", justifyContent: "flex-start" },
  state: { "--dadam-current-control-height": "30px", width: "auto", minHeight: "30px", height: "30px", fontSize: "12px", "& select": { minHeight: "28px", paddingTop: 0, paddingBottom: 0 } },
  popup: { width: "380px", maxWidth: "calc(100vw - 32px)", maxHeight: "min(480px, calc(100svh - 100px))", overflowY: "auto", boxSizing: "border-box", padding: "8px", fontFamily: tokens.fontFamilyBase },
  option: { width: "100%", height: "auto", padding: "8px", justifyContent: "flex-start", textAlign: "left", fontSize: "12px", columnGap: "6px" },
});
const chapterNumber = (index: number) => ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][index] ?? String(index + 1);
export default function ProductionToolbar({ view, sectionId, slideId, onSection, onState, onUnlock, onManageToc, commentActionSlot, busy = false }: ProductionToolbarProps) {
  const styles = useStyles(), id = useId(), trigger = useRef<HTMLButtonElement>(null);
  const [openedSection, setOpenedSection] = useState<string | null | undefined>(undefined);
  const open = openedSection !== undefined && openedSection === sectionId;
  const current = view.state.body.sections.find(s => s.id === sectionId), numbers = outlineNumbers(view.state), rows = selectProductionSlides(view);
  const activeSlide = view.state.body.slides.find(s => s.id === slideId && s.sectionId === sectionId);
  const canChangeState = !!activeSlide && (activeSlide.state === "done"
    ? view.capabilities.unlockableSlideIds.includes(activeSlide.id)
    : view.capabilities.editableSlideIds.includes(activeSlide.id));
  const chapterIndex = view.state.body.chapters.findIndex(c => c.id === current?.chapterId), chapter = view.state.body.chapters[chapterIndex];
  const close = () => { setOpenedSection(undefined); requestAnimationFrame(() => trigger.current?.focus()); };
  return <div data-comment-control>
    <div className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-1.5">
      {chapter && <span className="tw:shrink-0 tw:text-[11px] tw:font-bold tw:text-(--dadam-accent)">{chapterNumber(chapterIndex)}. {chapter.title} ›</span>}
      <Popover open={open} onOpenChange={(_, data) => data.open ? setOpenedSection(sectionId) : close()} positioning={{ position: "below", align: "start" }}>
        <PopoverTrigger disableButtonEnhancement><DadamButton ref={trigger} data-production-section-picker appearance="transparent" className={styles.title}
          disabled={busy || !current} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} aria-label="제작할 장과 소목차 선택">
          <span className="tw:truncate" title={current?.title}>{current ? `${numbers[current.id]} ${current.title}` : "소목차 선택"}</span><ChevronDown16Regular className="tw:shrink-0" />
        </DadamButton></PopoverTrigger>
        <PopoverSurface id={id} className={styles.popup} role="dialog" aria-label="소목차 선택">
          {view.state.body.chapters.map((group, index) => <section key={group.id}><h3 className="tw:mx-2 tw:my-2 tw:text-xs tw:text-(--kpc-muted)">{chapterNumber(index)}. {group.title}</h3>
            {view.state.body.sections.filter(s => s.chapterId === group.id).map(section => {
              const count = rows.filter(row => row.section.id === section.id).reduce((sum, row) => sum + row.openComments, 0);
              const names = view.members.filter(member => section.assigneeIds.includes(member.id)).map(member => member.name).join(" · ") || "미지정";
              return <DadamButton key={section.id} appearance={section.id === sectionId ? "secondary" : "transparent"} className={styles.option} disabled={busy}
                aria-pressed={section.id === sectionId} onClick={() => { if (section.id === sectionId) close(); else onSection(section.id); }}>
                <span className="tw:shrink-0 tw:text-(--kpc-muted)">{numbers[section.id]}</span>
                <span className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col"><span className="tw:truncate" title={section.title}>{section.title}</span><span className="tw:truncate tw:text-[11px] tw:text-(--kpc-muted)" title={names}>{names}</span></span>
                {count > 0 && <span className="tw:rounded-full tw:bg-(--dadam-accent-soft) tw:px-1.5 tw:text-(--dadam-accent-ink)" aria-label={`미처리 의견 ${count}개`}>{count}</span>}
                <span className="tw:shrink-0 tw:text-[11px]">{section.locked ? "작성 완료 · 고정" : section.state === "done" ? "작성 완료" : "작성 중"}</span>
                {section.id === sectionId && <Checkmark16Regular className="tw:shrink-0" />}
              </DadamButton>;
            })}
          </section>)}
          {!view.state.body.sections.length && <p>목차가 비어 있습니다</p>}
          <div className="tw:mt-1 tw:border-t tw:border-(--kpc-line) tw:pt-1"><DadamButton appearance="transparent" className={styles.option} disabled={busy} onClick={onManageToc}>목차 관리</DadamButton></div>
        </PopoverSurface>
      </Popover>
      <span className="tw:flex-1" />{commentActionSlot}
      {activeSlide && <DadamSelect className={styles.state} aria-label="슬라이드 작성 상태" value={activeSlide.state} disabled={busy || !onState || !canChangeState}
        onChange={(_, data) => { const next = data.value === "done" ? "done" : "writing"; if (canChangeState && next !== activeSlide.state) onState?.(next); }}><option value="writing">작성 중</option><option value="done">작성 완료</option></DadamSelect>}
    </div>
    {activeSlide?.state === "done" && <div className="tw:mt-2.5 tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:rounded-lg tw:bg-(--dadam-accent-soft) tw:px-3 tw:py-2 tw:text-xs tw:text-(--dadam-accent-ink)">
      <strong>작성 완료 · 고정됨</strong>
      {onUnlock && view.capabilities.unlockableSlideIds.includes(activeSlide.id) && <DadamButton className="tw:ml-auto" size="small" disabled={busy} onClick={onUnlock}>고정 해제</DadamButton>}
    </div>}
  </div>;
}
