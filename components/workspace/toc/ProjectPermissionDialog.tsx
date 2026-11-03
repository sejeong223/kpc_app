"use client";
import { useState } from "react";
import ModalFrame from "@/components/ui/ModalFrame";
import { DadamButton, DadamCheckbox } from "@/components/ui/DadamControls";
import {
  PROJECT_PERMISSIONS,
  PROJECT_PERMISSION_LABELS,
} from "@/config/workspace-production";
import { useWorkspaceCommand } from "@/hooks/workspace/use-workspace-production";
import { useWorkspaceRuntime } from "../WorkspaceProjectProvider";
import type {
  ProjectPermission,
  ProjectView,
  ProjectRequest,
} from "@/types/workspace-production";
import {
  DraftProtection,
  requestFor,
  workspaceTable,
  WorkspaceErrorText,
} from "../shared/WorkspaceUi";
export function ProjectPermissionTable({
  view,
  actorId,
  superAdmin,
  draft,
  onEdit,
  onChange,
}: {
  view: ProjectView;
  actorId: string;
  superAdmin: boolean;
  draft: { id: string; permissions: ProjectPermission[] } | null;
  onEdit(id: string): void;
  onChange(values: ProjectPermission[]): void;
}) {
  return (
    <table className={workspaceTable}>
      <thead>
        <tr>
          <th>참여자</th>
          {PROJECT_PERMISSIONS.map((p) => (
            <th key={p}>{PROJECT_PERMISSION_LABELS[p]}</th>
          ))}
          <th>관리</th>
        </tr>
      </thead>
      <tbody>
        {view.members
          .filter(
            (m) => view.capabilities.managePermissions || m.id === actorId,
          )
          .map((m) => {
            const fixed =
                m.id === view.project.pmId ||
                m.role === "super_admin" ||
                (superAdmin && m.id === actorId),
              values =
                draft?.id === m.id
                  ? draft.permissions
                  : (view.state.grants.find((g) => g.userId === m.id)
                      ?.permissions ?? []);
            return (
              <tr key={m.id}>
                <td>
                  {m.name}
                  {fixed && " · 전체 권한 고정"}
                </td>
                {PROJECT_PERMISSIONS.map((p) => (
                  <td key={p}>
                    {fixed ? (
                      "전체"
                    ) : draft?.id === m.id ? (
                      <DadamCheckbox
                        label={m.name + " " + PROJECT_PERMISSION_LABELS[p]}
                        checked={values.includes(p)}
                        onChange={(_, d) =>
                          onChange(
                            d.checked
                              ? [...values, p]
                              : values.filter((v) => v !== p),
                          )
                        }
                      />
                    ) : values.includes(p) ? (
                      "허용"
                    ) : (
                      "—"
                    )}
                  </td>
                ))}
                <td>
                  {!fixed && view.capabilities.managePermissions && (
                    <DadamButton
                      disabled={!!draft}
                      onClick={() => onEdit(m.id)}
                    >
                      편집
                    </DadamButton>
                  )}
                </td>
              </tr>
            );
          })}
      </tbody>
    </table>
  );
}
export default function ProjectPermissionDialog({
  view,
  onClose,
}: {
  view: ProjectView;
  onClose(): void;
}) {
  const runtime = useWorkspaceRuntime(),
    mutation = useWorkspaceCommand(),
    [draft, setDraft] = useState<{
      id: string;
      permissions: ProjectPermission[];
      request: ProjectRequest;
    } | null>(null);
  const save = async () => {
    if (!draft) return;
    await mutation.mutateAsync({
      ...draft.request,
      operation: {
        type: "set-grants",
        userId: draft.id,
        permissions: draft.permissions,
      },
    });
    setDraft(null);
  };
  return (
    <>
      <ModalFrame
        open
        title="참여자별 관리 권한"
        contentKey="project-permissions"
        width={900}
        onClose={() => {
          if (!draft && !mutation.isPending) onClose();
        }}
        footer={
          <>
            {draft ? (
              <>
                <DadamButton
                  disabled={mutation.isPending}
                  onClick={() => setDraft(null)}
                >
                  편집 취소
                </DadamButton>
                <DadamButton
                  appearance="primary"
                  disabled={mutation.isPending}
                  onClick={() => {
                    void save().catch(() => {});
                  }}
                >
                  권한 저장
                </DadamButton>
              </>
            ) : (
              <DadamButton onClick={onClose}>닫기</DadamButton>
            )}
          </>
        }
      >
        <p>
          PM과 슈퍼 관리자는 항상 전체 권한을 가집니다. 담당 지정 권한과 본문
          편집 권한은 별개입니다.
        </p>
        <ProjectPermissionTable
          view={view}
          actorId={runtime.identity.actor.id}
          superAdmin={runtime.identity.actor.role === "super_admin"}
          draft={draft}
          onEdit={(id) =>
            setDraft({
              id,
              permissions: [
                ...(view.state.grants.find((g) => g.userId === id)
                  ?.permissions ?? []),
              ],
              request: requestFor(view),
            })
          }
          onChange={(permissions) =>
            setDraft((d) => (d ? { ...d, permissions } : d))
          }
        />
        <WorkspaceErrorText error={mutation.error} />
      </ModalFrame>
      <DraftProtection
        dirty={!!draft}
        busy={mutation.isPending}
        onSave={save}
        onDiscard={() => {
          setDraft(null);
          onClose();
        }}
      />
    </>
  );
}
