"use client";
import { Field } from "@fluentui/react-components";
import { DadamButton as Button, DadamInput as Input, DadamSelect as Select, DadamTextarea as Textarea } from "@/components/ui/DadamControls";
import { useEffect, useId, useRef, useState } from "react";
import { AdminPage, AdminCard } from "@/components/admin/ui/AdminPrimitives";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import ModalFrame from "@/components/ui/ModalFrame";
import AssetVisibilityField from "@/components/admin/assets/AssetVisibilityField";
import { useAdminRuntime } from "@/components/admin/AdminRuntimeProvider";
import { usePromptSet, usePromptAudience, usePromptCommand } from "@/hooks/admin/use-prompt-sets";
import { useUnsavedNavigation } from "@/hooks/use-unsaved-navigation";
import { PromptCommandSchema, PromptStatusSchema } from "@/lib/admin/prompts/schemas";
import { DEFAULT_PROMPT_SOURCES } from "@/lib/admin/prompts/outline";
import type { AssetVisibility } from "@/types/admin-assets";
import type { PromptDetail, PromptStatus, PromptValue } from "@/types/admin-prompts";
import PromptOutlineEditor from "./PromptOutlineEditor";
interface Draft { value: PromptValue; ownerDepartmentId: string | null; status: PromptStatus; visibility: AssetVisibility; baseVersion: number }
function initial(detail: PromptDetail | null, departmentId: string | null): Draft {
  return { value: detail ? { name: detail.revision.name, description: detail.revision.description, items: structuredClone(detail.revision.items) } :
    { name: "", description: "", items: [{ id: crypto.randomUUID(), level: 1, title: "", prompt: "", sources: [...DEFAULT_PROMPT_SOURCES] }, { id: crypto.randomUUID(), level: 2, title: "", prompt: "", sources: null }] },
    ownerDepartmentId: detail ? detail.row.ownerDepartmentId : departmentId, status: detail?.row.status ?? "draft", visibility: structuredClone(detail?.row.visibility ?? { all: false, targets: [] }), baseVersion: detail?.row.version ?? 1 };
}
interface Props { detail: PromptDetail | null; onClose(): void; onSaved(id: string): void }
export default function PromptEditorPage({ detail, onClose, onSaved }: Props): React.ReactElement {
  const { actor, access } = useAdminRuntime(), latest = usePromptSet(detail?.row.id ?? null), audience = usePromptAudience(), command = usePromptCommand();
  const [draft, setDraft] = useState(() => initial(detail, actor.departmentId)), [baseline, setBaseline] = useState(() => JSON.stringify(draft));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formId = useId(), form = useRef<HTMLFormElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const allowed = Boolean(access?.grants.promptSets.read && (!detail || latest.data?.row.capabilities.read));
  const editable = allowed && Boolean(detail ? latest.data?.row.capabilities.update && access?.grants.promptSets.update : access?.grants.promptSets.create);
  const dirty = JSON.stringify(draft) !== baseline, disabled = !editable || command.isPending;
  const guard = useUnsavedNavigation(dirty && editable, command.isPending, onClose);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  function change(patch: Partial<Draft>) { setDraft(current => ({ ...current, ...patch })); }
  async function save() {
    if (disabled || !dirty) return;
    const raw = detail ? { type: "update-prompt-set", target: { id: detail.row.id, version: draft.baseVersion }, value: draft.value, status: draft.status, visibility: draft.visibility } :
      { type: "create-prompt-set", ownerDepartmentId: draft.ownerDepartmentId, value: draft.value, status: draft.status, visibility: draft.visibility };
    const parsed = PromptCommandSchema.safeParse(raw);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map(issue => [issue.path.join(".").replace(/^value\./, ""), issue.message])));
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()); return;
    }
    setErrors({});
    try { const result = await command.mutateAsync(parsed.data); onSaved(result.id); } catch { /* 실패 시 입력을 유지한다. */ }
  }
  async function reload() { const result = await latest.refetch(); if (result.data) { const next = initial(result.data, actor.departmentId); setDraft(next); setBaseline(JSON.stringify(next)); setErrors({}); command.reset(); } }
  return <AdminPage title={detail ? "프롬프트 세트 수정" : "프롬프트 세트 등록"} headingRef={heading} stickyHeader dataNotice="관리 정보는 임시 저장되며 새로고침하면 초기화됩니다." dataNoticeSummary="예시 데이터"
    leading={<Button appearance="subtle" disabled={command.isPending} onClick={guard.close}>← {detail ? "상세로" : "목록으로"}</Button>}
    actions={<><Button disabled={command.isPending} onClick={guard.close}>취소</Button>{editable && <Button appearance="primary" type="submit" form={formId} disabled={!dirty || command.isPending}>{command.isPending ? "저장 중…" : detail ? "저장" : "등록"}</Button>}</>}>
    {command.error && <div role="alert">{command.error.message}{command.error.code === "CONFLICT" && <Button onClick={() => void reload()}>최신 내용 불러오기</Button>}</div>}
    {Object.keys(errors).length > 0 && <p role="alert">입력 오류를 확인해 주세요. {Object.values(errors)[0]}</p>}
    {!allowed ? <AdminAsyncState state={latest.isError ? "error" : latest.isPending && access?.grants.promptSets.read ? "loading" : "forbidden"} message={latest.error?.message} onRetry={() => void latest.refetch()} /> : !editable ? <AdminAsyncState state="forbidden" /> :
      <form id={formId} ref={form} aria-label="프롬프트 세트 입력" noValidate onSubmit={event => { event.preventDefault(); void save(); }} className="tw:flex tw:min-w-0 tw:flex-col tw:gap-(--layout-section-gap)">
        <AdminCard title="1. 기본 정보"><div className="tw:grid tw:gap-(--layout-section-gap) tw:md:grid-cols-3">
          <Field label="프롬프트 세트 이름" required validationMessage={errors.name} validationState={errors.name ? "error" : "none"}><Input disabled={disabled} maxLength={80} value={draft.value.name} onChange={(_, data) => change({ value: { ...draft.value, name: data.value } })} /></Field>
          <Field label="소유 부서"><Select disabled={disabled || Boolean(detail) || actor.role !== "super_admin"} value={draft.ownerDepartmentId ?? ""} onChange={(_, data) => change({ ownerDepartmentId: data.value || null })}>
            {actor.role === "super_admin" && <option value="">전사 공통</option>}{access?.departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
          </Select></Field>
          <Field label="상태"><Select disabled={disabled} value={draft.status} onChange={(_, data) => change({ status: PromptStatusSchema.parse(data.value) })}><option value="draft">초안</option><option value="active">활성</option></Select></Field>
          <Field label="설명" className="tw:md:col-span-3"><Textarea disabled={disabled} maxLength={1000} value={draft.value.description} onChange={(_, data) => change({ value: { ...draft.value, description: data.value } })} placeholder="어떤 제안서의 대표 목차인지 설명하세요." /></Field>
        </div>
          <AssetVisibilityField value={draft.visibility} candidates={audience.data ?? { departments: [], users: [], groups: [] }} disabled={disabled || !audience.data} onChange={visibility => change({ visibility })} />
          {audience.isError && <AdminAsyncState state="error" message={audience.error.message} onRetry={() => void audience.refetch()} />}
        </AdminCard>
        <PromptOutlineEditor items={draft.value.items} disabled={disabled} errors={errors} onChange={items => change({ value: { ...draft.value, items } })} />
        <p className="tw:m-0 tw:text-[11px] tw:text-(--kpc-muted)">초안은 신규 적용 대상에서 제외됩니다. 수정해도 사용 중인 프로젝트의 적용 버전은 자동으로 바뀌지 않습니다.</p>
      </form>}
    {guard.confirmOpen && <ModalFrame open title="변경사항 버리기" contentKey="prompt-unsaved" onClose={guard.cancel} footer={<><Button onClick={guard.cancel}>계속 편집</Button><Button appearance="primary" onClick={guard.discard}>변경사항 버리기</Button></>}><p>저장하지 않은 프롬프트 세트 변경사항을 버리고 이동할까요?</p></ModalFrame>}
  </AdminPage>;
}
