"use client";
import { useState } from "react";
import { DadamButton } from "@/components/ui/DadamControls";
import AdminPager from "@/components/admin/ui/AdminPager";
import type { ProjectView } from "@/types/workspace-production";
import {
  versionHasLaterChanges,
  versionPage,
} from "@/lib/workspace/production/diff";
import { workspaceTable } from "../shared/WorkspaceUi";
export default function PptVersionHistory({
  view,
  busy,
  canCompare,
  onDownload,
  onCompare,
}: {
  view: ProjectView;
  busy: boolean;
  canCompare: boolean;
  onDownload(id: string): void;
  onCompare(id: string): void;
}) {
  const [page, setPage] = useState(1),
    result = versionPage(view.state.pptVersions, page);
  return (
    <>
      <div className="tw:overflow-x-auto">
        <table className={workspaceTable}>
          <caption className="tw:sr-only">보관된 PPT 원본 버전</caption>
          <thead>
            <tr>
              {[
                "버전·회차",
                "원본",
                "파일·크기",
                "작성자·시각",
                "기준",
                "작업",
              ].map((label) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((v) => {
              const allowed = v.pinIds.every(
                (id) =>
                  view.assetAccess.find((a) => a.pinId === id)?.access
                    .status === "available",
              );
              return (
                <tr key={v.id}>
                  <td>
                    v{v.index} · {v.round}회차{v.snapshotId ? " · 보관본" : ""}
                  </td>
                  <td>{v.kind === "generated" ? "생성본" : "외부 수정본"}</td>
                  <td className="tw:break-all">
                    {v.filename}
                    <br />
                    {v.byteLength.toLocaleString("ko-KR")} bytes
                  </td>
                  <td>
                    {view.members.find((m) => m.id === v.createdBy)?.name ??
                      "사용자"}
                    <br />
                    {new Date(v.createdAt).toLocaleString("ko-KR")}
                  </td>
                  <td>
                    입력 v{v.inputRevision}
                    {versionHasLaterChanges(v, view) && <p>이후 수정 있음</p>}
                  </td>
                  <td>
                    {allowed ? (
                      <>
                        <DadamButton
                          size="small"
                          disabled={busy}
                          onClick={() => onDownload(v.id)}
                        >
                          {v.kind === "generated"
                            ? "생성본 다운로드"
                            : "수정본 원본 다운로드"}
                        </DadamButton>
                        {v.kind === "uploaded" && canCompare && (
                          <DadamButton
                            size="small"
                            disabled={busy}
                            onClick={() => onCompare(v.id)}
                          >
                            다시 비교
                          </DadamButton>
                        )}
                      </>
                    ) : (
                      <span>원본·이용 권한 확인 필요</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!result.total && <p>보관된 PPT 버전이 없습니다.</p>}
      <AdminPager
        page={result.page}
        total={result.total}
        pageSize={10}
        onChange={setPage}
      />
    </>
  );
}
