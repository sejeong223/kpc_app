"use client";
import { useState } from "react";
import { useWorkspaceCommand } from "./use-workspace-production";
import {
  createSlideDraft,
  refreshSlideDraft,
  validateSlideDraft,
} from "@/lib/workspace/production/editor";
import type {
  ProjectView,
  ProposalSlide,
  SlideContent,
  SlideTemplateRef,
} from "@/types/workspace-production";
import { WorkspaceError } from "@/lib/workspace/production/errors";
export function useSlideDraft(view: ProjectView, slide: ProposalSlide) {
  const [local, setLocal] = useState(() => createSlideDraft(view, slide)),
    mutation = useWorkspaceCommand(),
    result = refreshSlideDraft(local, view, slide),
    draft = result.draft;
  const update = (value: Partial<Pick<typeof draft, "content" | "template">>) =>
    setLocal({ ...draft, ...value, dirty: true });
  const save = async () => {
    const validation = validateSlideDraft(draft);
    if (validation) throw new WorkspaceError("VALIDATION", validation);
    const receipt = await mutation.mutateAsync({
      projectId: draft.projectId,
      expectedRevision: draft.baseRevision,
      expectedRound: draft.round,
      operation: {
        type: "save-slide",
        id: draft.slideId,
        content: draft.content,
        template: draft.template,
      },
    });
    const saved = receipt.state.body.slides.find(
      (s) => s.id === draft.slideId,
    )!;
    setLocal(createSlideDraft({ ...view, state: receipt.state }, saved));
  };
  return {
    draft,
    conflict: result.conflict,
    error: validateSlideDraft(draft) ?? mutation.error?.message ?? null,
    busy: mutation.isPending,
    save,
    setContent: (content: SlideContent) => update({ content }),
    setTemplate: (template: SlideTemplateRef | null) => update({ template }),
    discard: () => {
      setLocal(createSlideDraft(view, slide));
      mutation.reset();
    },
  };
}
