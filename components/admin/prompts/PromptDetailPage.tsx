"use client";
import { Button } from "@fluentui/react-components";
import { useState } from "react";
import { AdminCard, AdminPage } from "@/components/admin/ui/AdminPrimitives";
import AdminTable from "@/components/admin/ui/AdminTable";
import AdminPager from "@/components/admin/ui/AdminPager";
import AdminTabs from "@/components/admin/ui/AdminTabs";
import { WorkspaceCardSection } from "@/components/layout/WorkspaceCard";
import { paginate } from "@/lib/admin/selectors";
import { RFP_STATUS_LABELS } from "@/config/admin-labels";
import type { PromptDetail, PromptCommand } from "@/types/admin-prompts";
import type { AssetAudienceOptions } from "@/types/admin-assets";
import PromptVisibilitySummary from "./PromptVisibilitySummary";
import PromptOutlineTable from "./PromptOutlineTable";
const tabs = [{ value: "body", label: "내용" }, { value: "uses", label: "사용 중인 프로젝트" }, { value: "history", label: "변경이력" }] as const;
interface Props { detail: PromptDetail; audience?: AssetAudienceOptions; busy: boolean; error?: string; onClose(): void; onEdit(): void; onVisibility(): void; onDelete(): void; onCommand(command: PromptCommand): void }
export default function PromptDetailPage({ detail, audience, busy, error, onClose, onEdit, onVisibility, onDelete, onCommand }: Props): React.ReactElement {
  const [tab, setTab] = useState<typeof tabs[number]["value"]>("body"), [usagePage, setUsagePage] = useState(1), [historyPage, setHistoryPage] = useState(1);
  const { row, revision } = detail, target = { id: row.id, version: row.version };
  const usages = paginate(detail.usages, { page: usagePage, pageSize: 10 }), history = paginate(detail.history, { page: historyPage, pageSize: 10 });
  return <AdminPage title={row.name} dataNotice="관리 정보는 임시 저장되며 새로고침하면 초기화됩니다." dataNoticeSummary="예시 데이터" leading={<Button appearance="subtle" onClick={onClose} disabled={busy}>← 프롬프트 세트 목록</Button>}
    actions={<><span className="tw:text-(--kpc-muted)">v{row.currentRevision} · {row.status === "active" ? "활성" : "초안"}</span>
      {row.capabilities.update && <><Button disabled={busy} onClick={onVisibility}>공개 범위</Button><Button disabled={busy} onClick={() => onCommand({ type: "set-prompt-status", target, status: row.status === "active" ? "draft" : "active" })}>{row.status === "active" ? "비활성화" : "활성화"}</Button></>}
      {row.capabilities.duplicate && <Button disabled={busy} onClick={() => onCommand({ type: "duplicate-prompt-set", target })}>복제</Button>}
      {row.capabilities.update && <Button appearance="primary" disabled={busy} onClick={onEdit}>수정</Button>}
      {row.capabilities.delete && <Button disabled={busy} onClick={onDelete}>삭제</Button>}
    </>}>
    {error && <p role="alert">{error}</p>}
    <div className="tw:flex tw:flex-wrap tw:gap-(--layout-control-gap) tw:text-[11px]"><span>{row.ownerDepartmentName} · {row.authorName}</span><PromptVisibilitySummary value={row.visibility} audience={audience} /></div>
    <AdminTabs<typeof tabs[number]["value"]> label="프롬프트 세트 상세 탭" value={tab} options={tabs} onChange={setTab} />
    {tab === "body" && <AdminCard title="목차별 작성 지침" bodyPadding="flush"><WorkspaceCardSection afterHeader><p>{revision.description || "등록된 설명이 없습니다."}</p></WorkspaceCardSection><PromptOutlineTable items={revision.items} /></AdminCard>}
    {tab === "uses" && <AdminCard title="사용 중인 프로젝트" bodyPadding="flush"><WorkspaceCardSection afterHeader><p className="tw:text-[11px] tw:text-(--kpc-muted)">조회 가능한 프로젝트의 예시 적용 정보입니다. 원본 수정·비활성화·삭제 후에도 적용 당시 버전이 보존됩니다.</p></WorkspaceCardSection>
      <AdminTable label="프롬프트 세트 사용 프로젝트" rows={usages.items} emptyMessage="조회 가능한 사용 프로젝트가 없습니다." columns={[
        { id: "project", label: "프로젝트", render: usage => usage.projectName }, { id: "department", label: "부서", render: usage => usage.departmentName },
        { id: "status", label: "상태", render: usage => RFP_STATUS_LABELS[usage.status] },
        { id: "mode", label: "사용 범위", render: usage => usage.mode === "project" ? "프로젝트 기본값" : "일부 섹션" },
        { id: "revision", label: "적용 버전", render: usage => "v" + usage.revision + (usage.revision < row.currentRevision ? " · 새 버전 있음" : "") },
      ]} /><WorkspaceCardSection><AdminPager {...usages} onChange={setUsagePage} /></WorkspaceCardSection></AdminCard>}
    {tab === "history" && <AdminCard title="변경이력" bodyPadding="flush"><AdminTable label="프롬프트 세트 변경이력" rows={history.items} emptyMessage="변경이력이 없습니다." columns={[
      { id: "date", label: "일시", render: event => new Date(event.occurredAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) },
      { id: "detail", label: "변경 내용", render: event => event.detail }, { id: "actor", label: "변경자", render: event => event.actorName },
    ]} /><WorkspaceCardSection><AdminPager {...history} onChange={setHistoryPage} /></WorkspaceCardSection></AdminCard>}
  </AdminPage>;
}
