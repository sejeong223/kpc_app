"use client";
import { DadamButton, DadamCheckbox } from "@/components/ui/DadamControls";
import { selectChecklistPermissions } from "@/lib/workspace/production/selectors";
import type {
  ChecklistItem,
  ProjectView,
  WorkspaceOperation,
} from "@/types/workspace-production";
import { workspaceCard, workspaceTable } from "../shared/WorkspaceUi";
export default function AdministrativeChecklist({
  view,
  actorId,
  busy,
  onOperation,
  onEdit,
  onAssign,
  onDelete,
  onAdd,
}: {
  view: ProjectView;
  actorId: string;
  busy: boolean;
  onOperation(op: WorkspaceOperation): void;
  onEdit(item: ChecklistItem): void;
  onAssign(item: ChecklistItem): void;
  onDelete(item: ChecklistItem): void;
  onAdd(): void;
}) {
  return (
    <section className={workspaceCard}>
      <header className="tw:mb-2 tw:flex tw:items-center tw:justify-between">
        <h2 className="tw:m-0 tw:text-sm">
          행정 체크리스트{" "}
          <span className="tw:font-normal tw:text-(--kpc-muted)">
            {view.state.body.checklist.filter((i) => i.done).length}/
            {view.state.body.checklist.length}
          </span>
        </h2>
        {view.capabilities.actions.outline && (
          <DadamButton disabled={busy} onClick={onAdd}>
            항목 추가
          </DadamButton>
        )}
      </header>
      <div className="tw:overflow-x-auto">
        <table className={workspaceTable}>
          <thead>
            <tr>
              {["항목", "근거", "담당자", "확인", "확인자·시각", "관리"].map(
                (label) => (
                  <th key={label}>{label}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {view.state.body.checklist.map((item) => {
              const can = selectChecklistPermissions(view, item, actorId);
              return (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td className="tw:whitespace-pre-wrap">
                    {item.source || "—"}
                  </td>
                  <td>
                    {item.assigneeIds
                      .map(
                        (id) =>
                          view.members.find((m) => m.id === id)?.name ??
                          "참여자",
                      )
                      .join(", ") || "미지정"}
                  </td>
                  <td>
                    {can.check ? (
                      <DadamCheckbox
                        label={item.title + " 확인"}
                        checked={item.done}
                        disabled={busy}
                        onChange={(_, d) =>
                          onOperation({
                            type: "check",
                            id: item.id,
                            done: !!d.checked,
                          })
                        }
                      />
                    ) : item.done ? (
                      "확인"
                    ) : (
                      "미확인"
                    )}
                  </td>
                  <td>
                    {item.checkedAt
                      ? (view.members.find((m) => m.id === item.checkedBy)
                          ?.name ?? "참여자") +
                        " · " +
                        new Date(item.checkedAt).toLocaleString("ko-KR")
                      : "—"}
                  </td>
                  <td className="tw:space-x-1">
                    {can.structure && (
                      <>
                        <DadamButton
                          size="small"
                          disabled={busy}
                          onClick={() => onEdit(item)}
                        >
                          수정
                        </DadamButton>
                        <DadamButton
                          size="small"
                          disabled={busy}
                          onClick={() => onDelete(item)}
                        >
                          삭제
                        </DadamButton>
                      </>
                    )}
                    {can.assign && (
                      <DadamButton
                        size="small"
                        disabled={busy}
                        onClick={() => onAssign(item)}
                      >
                        담당
                      </DadamButton>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!view.state.body.checklist.length && (
          <p>아직 등록된 행정 항목이 없습니다.</p>
        )}
      </div>
    </section>
  );
}
