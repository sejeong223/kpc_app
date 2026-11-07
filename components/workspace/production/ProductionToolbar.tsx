"use client";
import { useId, useRef, useState } from "react";
import { Popover, PopoverSurface, PopoverTrigger, makeStyles, tokens } from "@fluentui/react-components";
import { ChevronDown16Regular } from "@fluentui/react-icons";
import { DadamButton, DadamSelect } from "@/components/ui/DadamControls";
import { outlineNumbers } from "@/lib/workspace/production/selectors";
import { selectProductionSlides } from "@/lib/workspace/production/presentation";
import type { ProjectView } from "@/types/workspace-production";
import ProductionTocBadge from "./ProductionTocBadge";
export interface ProductionToolbarProps {
  view: ProjectView; sectionId: string | null; slideId: string | null; busy?: boolean;
  onSection(id: string): void; onState?(state: "writing" | "done"): void; onUnlock?(): void;
  onManageToc(): void; commentActionSlot: React.ReactNode;
}
const useStyles = makeStyles({
  title: { minWidth: 0, maxWidth: "100%", minHeight: 0, height: "auto", padding: "2px 6px", marginLeft: "-6px", columnGap: "6px", border: 0, borderRadius: "7px", fontSize: "16px", fontWeight: 700, letterSpacing: "-.01em", lineHeight: "24px", color: "var(--kpc-ink)", textAlign: "left", justifyContent: "flex-start" },
  state: { "--dadam-current-control-height": "30px", width: "auto", minHeight: "30px", height: "30px", fontSize: "12px", "& select": { minHeight: "28px", paddingTop: 0, paddingBottom: 0 } },
  popup: { width: "380px", maxWidth: "calc(100vw - 32px)", maxHeight: "min(70vh, var(--available-height, 70vh))", overflowY: "auto", boxSizing: "border-box", padding: "6px", border: "1px solid var(--kpc-line)", borderRadius: "12px", boxShadow: "0 18px 48px rgba(16,17,20,.16),0 2px 6px rgba(16,17,20,.06)", backgroundColor: "#fff", color: "var(--kpc-ink)", fontFamily: tokens.fontFamilyBase, lineHeight: "1.5" },
  group: { margin: 0, padding: "8px 9px 4px", fontSize: "10px", fontWeight: 700, color: "#a0a2a9" },
  option: { display: "flex", alignItems: "center", gap: "8px", width: "100%", boxSizing: "border-box", padding: "8px 9px", border: 0, borderRadius: "8px", backgroundColor: "transparent", color: "inherit", textAlign: "left", fontFamily: "inherit", fontSize: "12px", lineHeight: "18px", fontWeight: 400, cursor: "pointer",
    ":enabled:hover, &[aria-pressed='true']": { backgroundColor: "#f4f5f7" }, ":focus-visible": { outline: "2px solid var(--dadam-accent)", outlineOffset: "-2px" }, ":disabled": { cursor: "default", opacity: .5 } },
  number: { width: "28px", flexShrink: 0, color: "#74747d" },
  optionTitle: { minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  count: { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "17px", height: "17px", padding: 0, lineHeight: 0, flexShrink: 0 },
  avatars: { display: "inline-flex", alignItems: "center", flexShrink: 0, "& > span + span": { marginLeft: "-7px" } },
  avatar: { width: "22px", height: "22px", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 0, flexShrink: 0 },
  status: { display: "inline-flex", alignItems: "center", gap: "4px", flexShrink: 0, fontSize: "10px", fontWeight: 700, whiteSpace: "nowrap", "& i": { display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "currentColor" } },
  divider: { height: "1px", margin: "4px 0", backgroundColor: "#eff0f3" },
});
const avatarColors: Record<string, string> = { "정소담": "#1d1e22", "김민수": "#2f6fdc", "이서연": "#0f8a5f", "박지훈": "#b45309", "최유진": "#7c3aed", "박성훈": "#be123c" };
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
      <Popover open={open} onOpenChange={(_, data) => data.open ? setOpenedSection(sectionId) : close()} positioning={{ position: "below", align: "start", offset: 6 }}>
        <PopoverTrigger disableButtonEnhancement><DadamButton ref={trigger} data-production-section-picker appearance="transparent" className={styles.title}
          disabled={busy || !current} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} aria-label="제작할 장과 소목차 선택">
          <span className="tw:truncate" title={current?.title}>{current ? `${numbers[current.id]} ${current.title}` : "소목차 선택"}</span><ChevronDown16Regular className="tw:shrink-0" />
        </DadamButton></PopoverTrigger>
        <PopoverSurface id={id} className={styles.popup} role="dialog" aria-label="소목차 선택">
          {view.state.body.chapters.map((group, index) => <section key={group.id}><h3 className={styles.group}>{chapterNumber(index)}. {group.title}</h3>
            {view.state.body.sections.filter(s => s.chapterId === group.id).map(section => {
              const count = rows.filter(row => row.section.id === section.id).reduce((sum, row) => sum + row.openComments, 0);
              const authors = view.members.filter(member => section.assigneeIds.includes(member.id));
              const done = section.state === "done";
              return <button type="button" key={section.id} className={styles.option} disabled={busy}
                aria-pressed={section.id === sectionId} onClick={() => { if (section.id === sectionId) close(); else onSection(section.id); }}>
                <span className={styles.number}>{numbers[section.id]}</span>
                <span className={styles.optionTitle} title={section.title}>{section.title}</span>
                {count > 0 && <span className={styles.count} role="img" aria-label={`미처리 의견 ${count}개`}><ProductionTocBadge text={String(count)} kind="count" color="var(--dadam-accent)" /></span>}
                <span className={styles.avatars}>{authors.length ? authors.map(author => <span key={author.id} className={styles.avatar} role="img" aria-label={`작성자 ${author.name}`} title={author.name}><ProductionTocBadge text={author.name.slice(0, 1)} kind="avatar" color={avatarColors[author.name] ?? "#888"} /></span>) : <span className={styles.avatar} role="img" aria-label="작성자 미지정" title="미지정"><ProductionTocBadge text="?" kind="avatar" color="#888" /></span>}</span>
                <span className={styles.status} style={{ color: done ? "#15985a" : "#2563eb" }} title={section.locked ? "작성 완료 · 고정" : undefined}><i aria-hidden="true" />{done ? "작성 완료" : "작성 중"}</span>
              </button>;
            })}
          </section>)}
          {!view.state.body.sections.length && <p>목차가 비어 있습니다</p>}
          <div className={styles.divider} /><button type="button" className={styles.option} disabled={busy} onClick={onManageToc}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" style={{ flexShrink: 0, color: "#74747d" }} aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>목차 관리</button>
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
