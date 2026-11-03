"use client";
import { useState } from "react";
import { DadamButton, DadamTextarea } from "@/components/ui/DadamControls";
import ModalFrame from "@/components/ui/ModalFrame";
import type { ProjectView, ProposalSlide } from "@/types/workspace-production";
import { useWorkspaceCommand } from "@/hooks/workspace/use-workspace-production";
import MemberPicker from "../../shared/MemberPicker";
import {
  DraftProtection,
  requestFor,
  WorkspaceErrorText,
} from "../../shared/WorkspaceUi";
export default function ReviewRequestDialog({
  view,
  slide,
  onClose,
}: {
  view: ProjectView;
  slide: ProposalSlide;
  onClose(): void;
}) {
  const [request] = useState(() => requestFor(view)),
    [users, setUsers] = useState<string[]>([]),
    [text, setText] = useState("검토 부탁드립니다."),
    mutation = useWorkspaceCommand(),
    section = view.state.body.sections.find((s) => s.id === slide.sectionId),
    can =
      !!section &&
      (view.actor.role === "super_admin" ||
        view.actor.id === view.project.pmId ||
        section.assigneeIds.includes(view.actor.id));
  const save = async () => {
    let message = "검토 요청: ";
    const mentions = users.map((id) => {
      const user = view.members.find((m) => m.id === id)!,
        start = message.length;
      message += "@" + user.name;
      const end = message.length;
      message += " ";
      return { userId: id, name: user.name, start, end };
    });
    message += text;
    await mutation.mutateAsync({
      ...request,
      operation: {
        type: "comment-create",
        sectionId: slide.sectionId,
        slideId: slide.id,
        point: null,
        draft: { text: message, mentions },
        review: view.state.phase === "completed",
      },
    });
    onClose();
  };
  return (
    <>
      <ModalFrame
        open
        title="검토 요청 기록"
        contentKey={slide.id}
        onClose={() => {
          if (!mutation.isPending) onClose();
        }}
        footer={
          <>
            <DadamButton disabled={mutation.isPending} onClick={onClose}>
              취소
            </DadamButton>
            {can && (
              <DadamButton
                appearance="primary"
                disabled={mutation.isPending || !users.length || !text.trim()}
                onClick={() => {
                  void save().catch(() => {});
                }}
              >
                의견으로 기록
              </DadamButton>
            )}
          </>
        }
      >
        <p>
          리뷰자:{" "}
          {section?.reviewerIds
            .map((id) => view.members.find((m) => m.id === id)?.name)
            .join(", ") || "미지정"}
        </p>
        <p>
          선택한 참여자 멘션과 의견을 로컬에 기록합니다. 메일·메신저를 발송하지
          않습니다.
        </p>
        <MemberPicker
          label="검토를 요청할 참여자"
          members={view.members}
          selected={users}
          minimum={0}
          onChange={setUsers}
        />
        <label>
          요청 내용
          <DadamTextarea
            value={text}
            maxLength={4000}
            onChange={(_, d) => setText(d.value)}
          />
        </label>
        <WorkspaceErrorText error={mutation.error} />
      </ModalFrame>
      <DraftProtection
        dirty={users.length > 0}
        busy={mutation.isPending}
        onSave={save}
        onDiscard={onClose}
      />
    </>
  );
}
