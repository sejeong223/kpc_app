"use client";
import { DadamButton, DadamSelect } from "@/components/ui/DadamControls";
import type { ProjectView } from "@/types/workspace-production";
export default function ProductionToolbar({
  view,
  sectionId,
  onSection,
  actions,
  onState,
  busy = false,
}: {
  view: ProjectView;
  sectionId: string | null;
  onSection(id: string): void;
  actions?: React.ReactNode;
  busy?: boolean;
  onState?(state: "writing" | "done"): void;
}) {
  const current = view.state.body.sections.find((s) => s.id === sectionId);
  const sections = view.state.body.chapters.flatMap((c) =>
      view.state.body.sections.filter((s) => s.chapterId === c.id),
    ),
    index = sections.findIndex((s) => s.id === sectionId);
  return (
    <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
      <strong>
        {view.state.currentRound}회차 ·{" "}
        {view.state.phase === "completed" ? "완성" : "작성 중"}
      </strong>
      <DadamButton
        aria-label="이전 소목차"
        disabled={index <= 0}
        onClick={() => onSection(sections[index - 1].id)}
      >
        ←
      </DadamButton>
      <DadamSelect
        aria-label="제작할 소목차"
        value={sectionId ?? ""}
        onChange={(_, d) => onSection(d.value)}
      >
        <option value="" disabled>
          소목차 선택
        </option>
        {sections.map((s) => (
          <option key={s.id} value={s.id}>
            {view.state.body.chapters.find((c) => c.id === s.chapterId)?.title}{" "}
            / {s.title}
            {s.locked ? " · 고정" : ""}
          </option>
        ))}
      </DadamSelect>
      <DadamButton
        aria-label="다음 소목차"
        disabled={index < 0 || index >= sections.length - 1}
        onClick={() => onSection(sections[index + 1].id)}
      >
        →
      </DadamButton>
      {current &&
        (view.capabilities.editableSectionIds.includes(current.id) &&
        onState ? (
          <DadamSelect
            aria-label="소목차 작성 상태"
            value={current.state}
            disabled={busy}
            onChange={(_, d) =>
              onState(d.value === "done" ? "done" : "writing")
            }
          >
            <option value="writing">작성 중</option>
            <option value="done">작성 완료</option>
          </DadamSelect>
        ) : (
          <span>
            {current.locked
              ? "작성 완료 · 고정"
              : current.state === "done"
                ? "작성 완료"
                : "작성 중"}
          </span>
        ))}
      <span className="tw:ml-auto" />
      {actions}
    </div>
  );
}
