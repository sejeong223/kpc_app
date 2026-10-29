"use client";
import { Button, Field, Select } from "@fluentui/react-components";
import { useState } from "react";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import { useAdminAccess, useAdminCommand, useAdminModels } from "@/hooks/admin/use-admin-data";
import type { JobKind, ModelSettingsView } from "@/types/admin";
const jobs: { id: JobKind; label: string; detail: string }[] = [
  { id: "analysis", label: "AI 분석", detail: "RFP 요구사항을 분석합니다." }, { id: "checklist", label: "체크리스트", detail: "제안 요건과 누락 항목을 점검합니다." },
  { id: "search", label: "자료 검색", detail: "참고 자료와 근거를 찾습니다." }, { id: "slides", label: "PPT 생성 및 고도화", detail: "발표 자료 작성과 개선을 지원합니다." }, { id: "quality", label: "품질 검증", detail: "작성 결과의 품질을 검토합니다." },
];
export default function ModelDefaultsPanel(): React.ReactElement {
  const query = useAdminModels(), access = useAdminAccess(), command = useAdminCommand();
  const [draft, setDraft] = useState<Pick<ModelSettingsView, "version" | "modelByJob"> | null>(null), [notice, setNotice] = useState("");
  const value = draft ?? query.data, canEdit = access.data?.grants.modelSettings.update;
  return <AdminCard title="업무별 기본 모델" actions={canEdit ? <Button appearance="primary" disabled={!draft || command.isPending} onClick={() => { if (draft) command.mutate({ type: "save-model-defaults", version: draft.version, value: draft.modelByJob }, { onSuccess: () => { setDraft(null); setNotice("기본 모델을 저장했습니다."); } }); }}>변경 저장</Button> : undefined}>
    {!query.data || !value ? <AdminAsyncState state={query.isError ? "error" : "loading"} onRetry={() => void query.refetch()} /> : <div className="tw:grid tw:gap-3 tw:md:grid-cols-2">
      {jobs.map((job) => <div key={job.id} className="tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line-soft) tw:p-4"><Field label={job.label} hint={job.detail}>{canEdit ? <Select value={value.modelByJob[job.id]} disabled={command.isPending} onChange={(_, d) => { setDraft({ version: value.version, modelByJob: { ...value.modelByJob, [job.id]: d.value } }); setNotice(""); }}>{query.data!.models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</Select> : <strong>{query.data!.models.find((m) => m.id === value.modelByJob[job.id])?.name}</strong>}</Field></div>)}
    </div>}
    {notice && <p role="status">{notice}</p>}{command.error && <p role="alert">{command.error.message} 입력값은 유지됩니다. <Button onClick={() => { setDraft(null); command.reset(); void query.refetch(); }}>다시 불러오기</Button></p>}
  </AdminCard>;
}
