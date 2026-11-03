"use client";
import { WorkspaceCardSection } from "@/components/layout/WorkspaceCard";
import { Avatar, Badge } from "@fluentui/react-components";
import { DadamButton as Button } from "@/components/ui/DadamControls";
import { useState } from "react";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import AdminPager from "@/components/admin/ui/AdminPager";
import AdminTable, { type AdminColumn } from "@/components/admin/ui/AdminTable";
import { TOKEN_PROJECT_OPTIONS } from "@/config/token-preview";
import { DEFAULT_PAGE_SIZE } from "@/config/pagination";
import { useAdminAccess, useAdminCommand, useAdminRequests } from "@/hooks/admin/use-admin-data";
import { toKoreanDay } from "@/lib/admin/dates";
import { paginate } from "@/lib/admin/selectors";
import type { AdminTokenRequest } from "@/types/admin";
export default function TokenRequestsPanel(): React.ReactElement {
  const requests = useAdminRequests(), access = useAdminAccess(), command = useAdminCommand(), [notice, setNotice] = useState("");
  const [page, setPage] = useState(1), rows = paginate(requests.data ?? [], { page, pageSize: DEFAULT_PAGE_SIZE });
  function process(request: AdminTokenRequest, status: "approved" | "rejected") { command.mutate({ type: "process-token-request", target: { id: request.id, version: request.version }, status }, { onSuccess: () => setNotice(status === "approved" ? request.requesterName + " 님의 신청을 승인해 개인 한도에 반영했습니다." : request.requesterName + " 님의 신청을 반려했습니다.") }); }
  const columns: AdminColumn<AdminTokenRequest>[] = [
    { id: "date", label: "신청일", render: (r) => toKoreanDay(r.createdAt) }, { id: "name", label: "신청자", render: (r) => <span className="tw:flex tw:items-center tw:gap-(--layout-control-gap) tw:whitespace-nowrap"><Avatar name={r.requesterName} size={32} color="colorful" aria-hidden="true" /><strong>{r.requesterName}</strong></span> },
    { id: "department", label: "부서", render: (r) => access.data?.departments.find((d) => d.id === r.departmentId)?.name ?? "미지정" },
    { id: "project", label: "프로젝트", render: (r) => <span className="tw:block tw:max-w-48 tw:break-words">{TOKEN_PROJECT_OPTIONS.find((p) => p.id === (r.projectId ?? "outside"))?.name ?? "프로젝트 외 사용"}</span> },
    { id: "amount", label: "요청량", render: (r) => <strong className="tw:whitespace-nowrap tw:text-(--kpc-brand)">+{(r.amountTokens / 1000).toLocaleString("ko-KR")}K</strong> },
    { id: "reason", label: "사유", render: (r) => <span className="tw:block tw:max-w-64 tw:break-words">{r.reason}</span> },
    { id: "status", label: "상태", render: (r) => <Badge appearance="tint" color={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "warning"}>{{ pending: "승인 대기", approved: "승인", rejected: "반려" }[r.status]}</Badge> },
  ];
  if (access.data?.grants.tokenRequests.update) columns.push({ id: "manage", label: "처리", render: (r) => r.status === "pending" ? <div className="tw:flex tw:gap-(--layout-inline-gap)"><Button size="small" appearance="primary" aria-label={r.requesterName + " 토큰 신청 승인"} disabled={command.isPending} onClick={() => process(r, "approved")}>승인</Button><Button size="small" aria-label={r.requesterName + " 토큰 신청 반려"} disabled={command.isPending} onClick={() => process(r, "rejected")}>반려</Button></div> : "처리 완료" });
  return <AdminCard bodyPadding="flush" title="토큰 추가 신청" actions={<span className="tw:text-[11px] tw:text-(--kpc-muted)">승인 대기 {requests.data?.filter((r) => r.status === "pending").length ?? "—"}건</span>}>
    {(notice || command.error) && <WorkspaceCardSection afterHeader>
      {notice && <p role="status">{notice}</p>}{command.error && <p role="alert">{command.error.message}{command.error.code === "INACTIVE_USER" ? " 사용자 상태를 확인해 주세요." : null}<Button onClick={() => void requests.refetch()}>다시 불러오기</Button></p>}
    </WorkspaceCardSection>}
    {!requests.data ? <AdminAsyncState state={requests.isError ? "error" : "loading"} onRetry={() => void requests.refetch()} /> : <>
      {requests.isError && <AdminAsyncState state="error" onRetry={() => void requests.refetch()} />}
      <AdminTable label="토큰 추가 신청 목록" rows={rows.items} columns={columns} emptyMessage="아직 토큰 신청이 없습니다." />
      <WorkspaceCardSection><AdminPager page={rows.page} total={rows.total} pageSize={rows.pageSize} onChange={setPage} /></WorkspaceCardSection>
    </>}
  </AdminCard>;
}
