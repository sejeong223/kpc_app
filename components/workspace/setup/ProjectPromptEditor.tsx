"use client";
import { useState } from "react";
import {
  DadamButton,
  DadamInput,
  DadamSelect,
  DadamTextarea,
  DadamCheckbox,
} from "@/components/ui/DadamControls";
import { useWorkspaceCommand } from "@/hooks/workspace/use-workspace-production";
import {
  resolveProjectPrompt,
  suggestPromptBindings,
} from "@/lib/workspace/production/prompt-resolution";
import type {
  ProjectPromptOverride,
  ProjectRequest,
  ProjectView,
} from "@/types/workspace-production";
import type { PromptSource } from "@/types/admin-prompts";
import {
  DraftProtection,
  requestFor,
  workspaceCard,
  WorkspaceErrorText,
} from "../shared/WorkspaceUi";
const sources: readonly { value: PromptSource; label: string }[] = [
  { value: "proposal", label: "제안 관련 자료" },
  { value: "related", label: "유관자료" },
  { value: "web", label: "웹 검색" },
];
export default function ProjectPromptEditor({ view }: { view: ProjectView }) {
  const pin = view.state.pins.find(
      (p) => p.id === view.state.body.settings.promptPinId,
    ),
    mutation = useWorkspaceCommand(),
    [draft, setDraft] = useState<
      (ProjectPromptOverride & { request: ProjectRequest }) | null
    >(null),
    [search, setSearch] = useState("");
  if (pin?.kind !== "prompt")
    return (
      <section className={workspaceCard}>
        <p>프롬프트 세트를 선택하면 목차와 연결할 수 있습니다.</p>
      </section>
    );
  const access = view.assetAccess.find((a) => a.pinId === pin.id)?.access,
    can = view.capabilities.actions.setup && access?.status === "available",
    items = pin.snapshot.items,
    suggestions = suggestPromptBindings(view.state.body.sections, items),
    save = async () => {
      if (!draft) return;
      await mutation.mutateAsync({
        ...draft.request,
        operation: {
          type: "override-prompt",
          itemId: draft.itemId,
          prompt: draft.prompt,
          sources: draft.sources,
        },
      });
      setDraft(null);
    };
  return (
    <section className={workspaceCard}>
      <h2 className="tw:mt-0 tw:text-sm">
        목차별 프롬프트 · 프로젝트 전용 설정
      </h2>
      <p className="tw:text-xs">
        연결과 수정은 이 프로젝트에만 저장됩니다. 기존 슬라이드의 사용 설정은
        자산 재적용에서 대상을 선택해야 갱신됩니다.
      </p>
      {view.state.body.sections.map((section) => {
        const itemId =
            view.state.body.settings.bindings.find(
              (b) => b.sectionId === section.id,
            )?.itemId ?? null,
          suggest = suggestions.find((s) => s.sectionId === section.id),
          value = resolveProjectPrompt(
            items,
            itemId,
            view.state.body.settings.overrides,
          );
        return (
          <div
            key={section.id}
            className="tw:mb-3 tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line) tw:p-3"
          >
            <strong>{section.title}</strong>
            {can ? (
              <DadamSelect
                aria-label={section.title + " 프롬프트 연결"}
                value={itemId ?? ""}
                disabled={mutation.isPending || !!draft}
                onChange={(_, d) =>
                  mutation.mutate({
                    ...requestFor(view),
                    operation: {
                      type: "map-prompt",
                      sectionId: section.id,
                      itemId: d.value || null,
                    },
                  })
                }
              >
                <option value="">연결 안 함</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.level === 2 ? "└ " : ""}
                    {i.title}
                  </option>
                ))}
              </DadamSelect>
            ) : (
              <p>{items.find((i) => i.id === itemId)?.title ?? "연결 없음"}</p>
            )}
            {!itemId && suggest?.itemId && (
              <small>
                이름이 일치하는 후보:{" "}
                {items.find((i) => i.id === suggest.itemId)?.title} · 자동
                연결하지 않습니다.
              </small>
            )}
            <p className="tw:whitespace-pre-wrap tw:text-sm">
              {value.prompt || "연결된 프롬프트 없음"}
            </p>
            <small>
              {value.inherited ? "상위 상속 · " : ""}
              {value.sources
                .map((s) => sources.find((v) => v.value === s)?.label)
                .join(" → ")}
            </small>
          </div>
        );
      })}
      <DadamInput
        aria-label="프롬프트 항목 검색"
        value={search}
        onChange={(_, d) => setSearch(d.value)}
        placeholder="프롬프트 항목 검색"
      />
      {items
        .filter((i) => i.title.includes(search))
        .map((item) => {
          const override = view.state.body.settings.overrides.find(
            (o) => o.itemId === item.id,
          );
          return (
            <article key={item.id} className="tw:my-3">
              <strong>{item.title}</strong>
              {override && <span> · 프로젝트 전용</span>}
              {draft?.itemId === item.id ? (
                <div className="tw:space-y-2">
                  <DadamCheckbox
                    label="원본 프롬프트 사용"
                    checked={draft.prompt === null}
                    onChange={(_, d) =>
                      setDraft({
                        ...draft,
                        prompt: d.checked ? null : item.prompt,
                      })
                    }
                  />
                  {draft.prompt !== null && (
                    <label>
                      프로젝트 프롬프트
                      <DadamTextarea
                        value={draft.prompt}
                        onChange={(_, d) =>
                          setDraft({ ...draft, prompt: d.value })
                        }
                      />
                    </label>
                  )}
                  <DadamCheckbox
                    label="원본 소스 순서 사용"
                    checked={draft.sources === null}
                    onChange={(_, d) =>
                      setDraft({ ...draft, sources: d.checked ? null : [] })
                    }
                  />
                  {draft.sources !== null && (
                    <div className="tw:flex tw:gap-1">
                      {sources.map((s) => (
                        <DadamButton
                          key={s.value}
                          aria-pressed={draft.sources!.includes(s.value)}
                          onClick={() =>
                            setDraft({
                              ...draft,
                              sources: draft.sources!.includes(s.value)
                                ? draft.sources!.filter((v) => v !== s.value)
                                : [...draft.sources!, s.value],
                            })
                          }
                        >
                          {draft.sources!.includes(s.value)
                            ? draft.sources!.indexOf(s.value) + 1 + ". "
                            : ""}
                          {s.label}
                        </DadamButton>
                      ))}
                    </div>
                  )}
                  <p className="tw:text-xs">
                    빈 내용이나 소스는 상위 항목을 상속합니다. 소스는 누른
                    순서가 우선순위입니다.
                  </p>
                  <DadamButton
                    disabled={mutation.isPending}
                    onClick={() => {
                      void save().catch(() => {});
                    }}
                  >
                    저장
                  </DadamButton>
                  <DadamButton
                    disabled={mutation.isPending}
                    onClick={() => setDraft(null)}
                  >
                    취소
                  </DadamButton>
                </div>
              ) : (
                can && (
                  <DadamButton
                    size="small"
                    disabled={!!draft || mutation.isPending}
                    onClick={() =>
                      setDraft({
                        itemId: item.id,
                        prompt: override?.prompt ?? null,
                        sources: override?.sources ?? null,
                        request: requestFor(view),
                      })
                    }
                  >
                    프로젝트 수정
                  </DadamButton>
                )
              )}
            </article>
          );
        })}
      <WorkspaceErrorText error={mutation.error} />
      <DraftProtection
        dirty={!!draft}
        busy={mutation.isPending}
        onSave={save}
        onDiscard={() => setDraft(null)}
      />
    </section>
  );
}
