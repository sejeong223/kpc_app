"use client";
import { Field } from "@fluentui/react-components";
import { DadamButton as Button, DadamInput as Input, DadamSelect as Select } from "@/components/ui/DadamControls";
import WorkspaceToolbar from "@/components/layout/WorkspaceToolbar";
import { WorkspaceCardSection } from "@/components/layout/WorkspaceCard";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import AdminTable from "@/components/admin/ui/AdminTable";
import AdminPager from "@/components/admin/ui/AdminPager";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { PromptQuerySchema } from "@/lib/admin/prompts/schemas";
import type { PromptList, PromptQuery, PromptRow } from "@/types/admin-prompts";
import type { AssetAudienceOptions } from "@/types/admin-assets";
import PromptVisibilitySummary from "./PromptVisibilitySummary";
interface Props {
  query: PromptQuery; onQueryChange(query: PromptQuery): void; list?: PromptList; audience?: AssetAudienceOptions;
  error?: string; loading: boolean; busy: boolean; canCreate: boolean; onRetry(): void; onCreate(): void;
  onOpen(id: string): void; onEdit(id: string): void; onDuplicate(row: PromptRow): void;
}
export default function PromptListPanel(props: Props): React.ReactElement {
  const change = (patch: Partial<PromptQuery>) => props.onQueryChange({ ...props.query, ...patch, page: 1 });
  const counts = props.list?.counts;
  return <AdminCard bodyPadding="flush" title="프롬프트 세트 목록" actions={props.canCreate && <Button data-prompt-create appearance="primary" disabled={props.busy} onClick={props.onCreate}>+ 프롬프트 세트 등록</Button>}>
    <WorkspaceCardSection afterHeader><WorkspaceToolbar>
      <Field label="검색"><Input aria-label="프롬프트 세트 검색" placeholder="이름 · 설명 검색" maxLength={254} value={props.query.search} onChange={(_, data) => change({ search: data.value })} /></Field>
      <Field label="공개 범위"><Select value={props.query.visibility} onChange={(_, data) => change({ visibility: PromptQuerySchema.shape.visibility.parse(data.value) })}>
        <option value="all">모든 공개 범위</option><option value="organization">전사 공통</option><option value="department">부서 공개</option><option value="group">그룹 공개</option><option value="user">개인 공개</option><option value="private">비공개</option>
      </Select></Field>
      <Field label="부서"><Select value={props.query.departmentId ?? ""} onChange={(_, data) => change({ departmentId: data.value || null })}>
        <option value="">모든 부서</option>{props.list?.departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
      </Select></Field>
      <SegmentedControl ariaLabel="프롬프트 세트 상태" value={props.query.status} onChange={status => change({ status })} options={[{ value: "all", label: "전체 " + (counts?.all ?? "—") }, { value: "active", label: "활성 " + (counts?.active ?? "—") }, { value: "draft", label: "초안 " + (counts?.draft ?? "—") }]} />
    </WorkspaceToolbar></WorkspaceCardSection>
    {props.error ? <AdminAsyncState state="error" message={props.error} onRetry={props.onRetry} /> : props.loading || !props.list ? <AdminAsyncState state="loading" /> : <>
      <AdminTable label="프롬프트 세트 목록" rows={props.list.rows.items} emptyMessage="조건에 맞는 프롬프트 세트가 없습니다."
        sort={{ columnId: props.query.sort, direction: props.query.direction }} onSort={id => change({ sort: id === "name" ? "name" : "updatedAt", direction: props.query.sort === id && props.query.direction === "desc" ? "asc" : "desc" })}
        columns={[
          { id: "name", label: "이름", sortable: true, width: "28%", render: row => <div><Button data-prompt-open={row.id} appearance="transparent" onClick={() => props.onOpen(row.id)}>{row.name}</Button><p className="tw:m-0 tw:px-(--layout-control-gap) tw:text-[11px] tw:text-(--kpc-muted)">{row.description}</p></div> },
          { id: "summary", label: "요약", render: row => <span className="tw:text-[11px]">{row.ownerDepartmentName} · 대목차 {row.majorCount} · 소목차 {row.minorCount}</span> },
          { id: "visibility", label: "공개 범위", render: row => <PromptVisibilitySummary value={row.visibility} audience={props.audience} /> },
          { id: "author", label: "작성자", render: row => row.authorName },
          { id: "updatedAt", label: "수정일", sortable: true, render: row => <span className="tw:whitespace-nowrap tw:text-[11px]">{new Date(row.updatedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</span> },
          { id: "uses", label: "사용", render: row => <span title="조회 가능한 사용 프로젝트 수">{row.usageCount}</span> },
          { id: "status", label: "상태 / 버전", render: row => <span className="tw:whitespace-nowrap"><span className={row.status === "active" ? "tw:text-(--kpc-success)" : "tw:text-(--kpc-muted)"}>{row.status === "active" ? "활성" : "초안"}</span> · v{row.currentRevision}</span> },
          { id: "actions", label: "작업", render: row => <div className="tw:flex tw:gap-(--layout-inline-gap)">{row.capabilities.duplicate && <Button size="small" disabled={props.busy} aria-label={row.name + " 복제"} onClick={() => props.onDuplicate(row)}>복제</Button>}{row.capabilities.update && <Button size="small" disabled={props.busy} aria-label={row.name + " 수정"} onClick={() => props.onEdit(row.id)}>수정</Button>}</div> },
        ]} />
      <WorkspaceCardSection><AdminPager {...props.list.rows} onChange={page => props.onQueryChange({ ...props.query, page })} /></WorkspaceCardSection>
    </>}
  </AdminCard>;
}
