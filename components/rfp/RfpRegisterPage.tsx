"use client";

import { Badge, Button, Field, Input, Textarea, ToggleButton } from "@fluentui/react-components";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";

import WorkspaceCard from "@/components/layout/WorkspaceCard";
import WorkspacePage from "@/components/layout/WorkspacePage";
import { useProfilePreview } from "@/components/profile/ProfilePreviewProvider";
import { useAuthRuntime } from "@/components/providers";
import {
  RFP_ANALYZE_DURATION_MS, RFP_FIELD_LABELS, RFP_FILE_MAX_BYTES,
  RFP_PERIOD_OPTIONS, RFP_SAMPLE_FILES, type RfpTextField,
} from "@/config/rfp-register";
import { RfpError } from "@/lib/rfp/errors";
import {
  createRfpFormState, formatBudget, isPastDue, rfpFormReducer, rfpRequiredProgress, todayYmd, toRfpRecord,
} from "@/lib/rfp/form";
import { resolveRfpIdentity } from "@/lib/rfp/identity";
import { IndexedDbRfpRepository, type RfpRepository } from "@/lib/rfp/repository";

import ReviewerPicker from "./ReviewerPicker";
import RfpFileList from "./RfpFileList";
import RfpUploadZone from "./RfpUploadZone";

interface RfpRegisterPageProps {
  repositoryFactory?: () => RfpRepository;
  createId?: () => string;
  now?: () => Date;
  analyzeDelayMs?: number;
}

const AI_INPUT_STYLE = { backgroundColor: "var(--kpc-brand-soft)" };
const FULL = "tw:md:col-span-2";

export default function RfpRegisterPage({
  repositoryFactory = () => new IndexedDbRfpRepository(),
  createId = () => crypto.randomUUID(),
  now = () => new Date(),
  analyzeDelayMs = RFP_ANALYZE_DURATION_MS,
}: RfpRegisterPageProps): React.ReactElement {
  const { authEnabled, session } = useAuthRuntime();
  const { profile } = useProfilePreview();
  const identity = useMemo(() => resolveRfpIdentity({ authEnabled, session, displayName: profile.name }), [authEnabled, session, profile.name]);
  const [state, dispatch] = useReducer(rfpFormReducer, undefined, createRfpFormState);
  const [repository] = useState(repositoryFactory);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  const stopTimer = () => { if (timer.current !== null) { clearTimeout(timer.current); timer.current = null; } };
  useEffect(() => () => { stopTimer(); repository.close(); }, [repository]);

  const progress = rfpRequiredProgress(state);
  const analyzing = state.phase === "analyzing";
  const pastDue = isPastDue(state.values.due, todayYmd(now()));

  const addFiles = (files: { name: string; sizeBytes: number }[]) => {
    setNotice(null);
    dispatch({ type: "add-files", files: files.map((f) => ({ id: createId(), name: f.name, sizeBytes: f.sizeBytes })) });
    // reducer 결과를 기다리지 않고 받아들일 파일이 있는지 미리 판단한다.
    if (state.phase !== "idle" || !files.some((f) => f.sizeBytes <= RFP_FILE_MAX_BYTES)) return;
    dispatch({ type: "start-analysis" });
    stopTimer();
    timer.current = setTimeout(() => { timer.current = null; dispatch({ type: "finish-analysis" }); }, analyzeDelayMs);
  };
  const restart = () => { stopTimer(); dispatch({ type: "reset" }); setNotice(null); setSubmitError(null); };

  const submit = async () => {
    if (!identity || submitting) return;
    setSubmitting(true); setSubmitError(null); setNotice(null);
    try {
      const record = toRfpRecord(state, {
        id: createId(), namespace: identity.namespace, actor: { id: identity.actor.id, name: identity.actor.name },
        departmentName: profile.department, now: now().toISOString(),
      });
      await repository.create(identity, record);
      stopTimer();
      dispatch({ type: "reset" });
      setNotice(`'${record.name}' RFP를 등록했습니다. 검토 목록 화면은 준비 중입니다.`);
      nameInput.current?.focus();
    } catch (error) {
      setSubmitError(error instanceof RfpError ? error.message : "RFP를 저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const label = (field: RfpTextField) => {
    const page = state.ai[field];
    return { children: <>{RFP_FIELD_LABELS[field]}{page !== undefined && <Badge className="tw:ml-(--layout-inline-gap)" appearance="tint" color="informative" size="small">AI 추출 · p.{page}</Badge>}</> };
  };
  const aiProps = (field: RfpTextField) => state.ai[field] !== undefined ? { "data-ai": "true", style: AI_INPUT_STYLE } : {};
  const setField = (field: RfpTextField) => (_: unknown, data: { value: string }) => dispatch({ type: "set-field", field, value: data.value });
  const locked = analyzing || submitting;

  return <WorkspacePage title="RFP 등록" showTitle>
    <div className="tw:mx-auto tw:flex tw:w-full tw:max-w-[960px] tw:min-w-0 tw:flex-col tw:gap-(--layout-section-gap)">
      <RfpUploadZone phase={state.phase}
        onFiles={(files) => addFiles(files.map((f) => ({ name: f.name, sizeBytes: f.size })))}
        onSample={() => addFiles(RFP_SAMPLE_FILES.map((f) => ({ ...f })))} onRestart={restart} />
      <RfpFileList files={state.files} disabled={locked}
        onKindChange={(id, kind) => dispatch({ type: "set-file-kind", id, kind })} onRemove={(id) => dispatch({ type: "remove-file", id })} />
      <WorkspaceCard title="사업개요" actions={<span className="tw:text-[11px] tw:font-semibold tw:text-(--kpc-muted)">필수 {progress.done}/{progress.total}</span>}>
        <div className="tw:grid tw:min-w-0 tw:grid-cols-1 tw:gap-(--layout-section-gap) tw:md:grid-cols-2">
          <Field label={label("name")} required>
            <Input ref={nameInput} placeholder="내부에서 부를 이름" value={state.values.name} disabled={locked} onChange={setField("name")} {...aiProps("name")} />
          </Field>
          <Field label={label("org")} required>
            <Input value={state.values.org} disabled={locked} onChange={setField("org")} {...aiProps("org")} />
          </Field>
          <Field label={label("due")} required validationState={pastDue ? "warning" : "none"} validationMessage={pastDue ? "마감일이 이미 지났습니다. 날짜를 확인하세요." : undefined}>
            <Input type="date" value={state.values.due} disabled={locked} onChange={setField("due")} {...aiProps("due")} />
          </Field>
          <Field label={label("budget")}>
            <Input inputMode="numeric" placeholder="예: 1,200,000,000" value={formatBudget(state.values.budget)} disabled={locked} onChange={setField("budget")} {...aiProps("budget")} />
          </Field>
          <Field className={FULL} label={label("summary")} required>
            <Textarea rows={3} resize="vertical" value={state.values.summary} disabled={locked} onChange={setField("summary")} {...aiProps("summary")} />
          </Field>
        </div>
        <section aria-label="추가 정보" className="tw:flex tw:min-w-0 tw:flex-col tw:gap-(--layout-section-gap) tw:border-0 tw:border-t tw:border-dashed tw:border-(--kpc-line) tw:pt-(--layout-section-gap)">
          <h3 className="tw:m-0 tw:text-[12px] tw:font-bold tw:text-(--kpc-secondary)">추가 정보</h3>
          <div className="tw:grid tw:min-w-0 tw:grid-cols-1 tw:gap-(--layout-section-gap) tw:md:grid-cols-2">
            <Field className={FULL} label={label("official")}>
              <Input value={state.values.official} disabled={locked} onChange={setField("official")} {...aiProps("official")} />
            </Field>
            <Field className={FULL} label={RFP_FIELD_LABELS.period}>
              <div role="group" aria-label={RFP_FIELD_LABELS.period} className="tw:flex tw:flex-wrap tw:gap-(--layout-inline-gap)">
                {RFP_PERIOD_OPTIONS.map((period) => <ToggleButton key={period} size="small" shape="circular" checked={state.period === period} disabled={locked}
                  onClick={() => dispatch({ type: "set-period", period: state.period === period ? null : period })}>{period}</ToggleButton>)}
              </div>
            </Field>
            <Field className={FULL} label={RFP_FIELD_LABELS.reviewers} required>
              <ReviewerPicker selected={state.reviewers} disabled={locked}
                onToggle={(person) => dispatch({ type: "toggle-reviewer", person })} onRemove={(id) => dispatch({ type: "remove-reviewer", id })} />
            </Field>
            <Field className={FULL} label={RFP_FIELD_LABELS.memo}>
              <Textarea rows={3} resize="vertical" value={state.values.memo} disabled={locked} onChange={setField("memo")} />
            </Field>
          </div>
        </section>
      </WorkspaceCard>
      <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-(--layout-control-gap)">
        {progress.missing.length > 0 && <span className="tw:text-[11px] tw:text-(--kpc-muted)">필수 항목: {progress.missing.join(", ")}</span>}
        <Button appearance="primary" size="large" disabled={progress.done < progress.total || submitting || analyzing || !identity} onClick={() => void submit()}>
          {submitting ? "등록 중…" : "등록"}
        </Button>
      </div>
      {!identity && <p role="alert" className="tw:m-0 tw:text-[12px] tw:text-(--kpc-danger)">사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요.</p>}
      {notice && <p role="status" className="tw:m-0 tw:text-[12px] tw:text-(--kpc-success)">{notice}</p>}
      {submitError && <p role="alert" className="tw:m-0 tw:text-[12px] tw:text-(--kpc-danger)">{submitError}</p>}
    </div>
  </WorkspacePage>;
}
