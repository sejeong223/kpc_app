"use client";
import { DadamSelect } from "@/components/ui/DadamControls";
import { useState } from "react";
import { useWorkspaceRuntime } from "../WorkspaceProjectProvider";
import {
  loadProjectView,
  useWorkspaceCommand,
} from "@/hooks/workspace/use-workspace-production";
import type { ProjectView } from "@/types/workspace-production";
import { requestFor, WorkspaceErrorText } from "../shared/WorkspaceUi";
export default function RequirementCoverage({
  view,
  sectionId,
}: {
  view: ProjectView;
  sectionId: string | null;
}) {
  const mutation = useWorkspaceCommand(),
    runtime = useWorkspaceRuntime(),
    [error, setError] = useState<string | null>(null);
  return (
    <>
      <WorkspaceErrorText error={error ?? mutation.error} />
      {view.state.body.requirements
        .filter((r) => r.sectionId === sectionId || r.sectionId === null)
        .map((r) => (
          <article
            key={r.id}
            className="tw:mb-3 tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line) tw:p-2"
          >
            <strong>{r.title}</strong>
            <p className="tw:my-1 tw:text-xs">
              {r.provenance === "mock"
                ? "Mock 근거"
                : r.page
                  ? "원문 " + r.page + "쪽"
                  : "원문 위치 미지정"}
              {!r.sectionId ? " · 목차 미연결" : ""}
            </p>
            {r.excerpt && (
              <p className="tw:whitespace-pre-wrap tw:text-sm">{r.excerpt}</p>
            )}
            {r.sectionId &&
            view.capabilities.editableSectionIds.includes(r.sectionId) ? (
              <DadamSelect
                aria-label={r.title + " RFP 반영"}
                value={r.coverage}
                disabled={mutation.isPending}
                onChange={(_, d) => {
                  setError(null);
                  void runtime
                    .navigate(async () => {
                      const fresh = await loadProjectView(
                        runtime,
                        view.project.id,
                      );
                      await mutation.mutateAsync({
                        ...requestFor(fresh),
                        operation: {
                          type: "set-coverage",
                          requirementId: r.id,
                          coverage:
                            d.value === "full"
                              ? "full"
                              : d.value === "partial"
                                ? "partial"
                                : "none",
                        },
                      });
                    })
                    .catch((e) =>
                      setError(
                        e instanceof Error
                          ? e.message
                          : "반영 상태를 저장하지 못했습니다.",
                      ),
                    );
                }}
              >
                <option value="none">미반영</option>
                <option value="partial">일부 반영</option>
                <option value="full">전체 반영</option>
              </DadamSelect>
            ) : (
              <span>
                {
                  { none: "미반영", partial: "일부 반영", full: "전체 반영" }[
                    r.coverage
                  ]
                }
              </span>
            )}
          </article>
        ))}
    </>
  );
}
