"use client";

import { Field, fieldClassNames, labelClassNames, makeStyles, mergeClasses, shorthands } from "@fluentui/react-components";
import { ArrowRight16Regular, Sparkle12Regular } from "@fluentui/react-icons";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";

import Button from "@/components/common/Button";
import WorkspaceCard from "@/components/layout/WorkspaceCard";
import WorkspacePage from "@/components/layout/WorkspacePage";
import { useProfilePreview } from "@/components/profile/ProfilePreviewProvider";
import { useAuthRuntime } from "@/components/providers";
import { useAppToast } from "@/components/ui/AppToast";
import { DadamInput, DadamTextarea } from "@/components/ui/DadamControls";
import {
  RFP_ANALYZE_DURATION_MS, RFP_FIELD_LABELS, RFP_FILE_MAX_BYTES,
  RFP_PERIOD_OPTIONS, RFP_REVIEWER_MAX, RFP_SAMPLE_FILES, type RfpTextField,
} from "@/config/rfp-register";
import { RfpError } from "@/lib/rfp/errors";
import {
  createRfpFormState, describeFileRejection, formatBudget, isPastDue, rfpFormReducer, rfpRequiredProgress, todayYmd, toRfpRecord,
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

const FULL = "tw:md:col-span-2";
const GRID = "tw:grid tw:min-w-0 tw:grid-cols-1 tw:gap-x-[14px] tw:gap-y-3 tw:md:grid-cols-2";

// Fluent Field·입력 부품은 Griffel 스타일이 Tailwind보다 나중에 들어오므로 makeStyles로 덮어쓴다.
const useStyles = makeStyles({
  field: {
    rowGap: "5px",
    [`& .${fieldClassNames.label}`]: { fontSize: "11px", fontWeight: 700, color: "#55585f" },
    [`& .${labelClassNames.required}`]: { color: "var(--kpc-brand)" },
  },
  // AI가 채운 칸: 상태 의미 색(노랑)은 브랜드색으로 바꾸지 않는다.
  aiField: { backgroundColor: "#fffdf3", ...shorthands.borderColor("#ecd98f") },
  textarea: { "& textarea": { lineHeight: 1.6 } },
});

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const styles = useStyles();
  const toast = useAppToast();

  const stopTimer = () => { if (timer.current !== null) { clearTimeout(timer.current); timer.current = null; } };
  useEffect(() => () => { stopTimer(); repository.close(); }, [repository]);

  const progress = rfpRequiredProgress(state);
  const analyzing = state.phase === "analyzing";
  const pastDue = isPastDue(state.values.due, todayYmd(now()));

  const addFiles = (files: { name: string; sizeBytes: number }[]) => {
    // 같은 거절이 반복돼도 매번 알리도록 fileError 변화 대신 직접 계산한다.
    const rejection = describeFileRejection(state.files.length, files);
    if (rejection) toast.notify(rejection, "error");
    dispatch({ type: "add-files", files: files.map((f) => ({ id: createId(), name: f.name, sizeBytes: f.sizeBytes })) });
    // reducer 결과를 기다리지 않고 받아들일 파일이 있는지 미리 판단한다.
    if (state.phase !== "idle" || !files.some((f) => f.sizeBytes <= RFP_FILE_MAX_BYTES)) return;
    dispatch({ type: "start-analysis" });
    stopTimer();
    timer.current = setTimeout(() => {
      timer.current = null;
      dispatch({ type: "finish-analysis" });
      toast.notify("AI가 사업개요를 채웠습니다", "success");
    }, analyzeDelayMs);
  };
  const restart = () => { stopTimer(); dispatch({ type: "reset" }); setSubmitError(null); };

  const submit = async () => {
    if (!identity || submitting) return;
    setSubmitting(true); setSubmitError(null);
    try {
      const record = toRfpRecord(state, {
        id: createId(), namespace: identity.namespace, actor: { id: identity.actor.id, name: identity.actor.name },
        departmentName: profile.department, now: now().toISOString(),
      });
      await repository.create(identity, record);
      stopTimer();
      dispatch({ type: "reset" });
      toast.notify(`'${record.name}' RFP를 등록했습니다`, "success");
      nameInput.current?.focus();
    } catch (error) {
      setSubmitError(error instanceof RfpError ? error.message : "RFP를 저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const label = (field: RfpTextField) => {
    const page = state.ai[field];
    return { children: <>{RFP_FIELD_LABELS[field]}{page !== undefined && <span className="tw:ml-1.5 tw:inline-flex tw:items-center tw:gap-[3px] tw:rounded tw:bg-[#f4effe] tw:px-[5px] tw:py-px tw:align-middle tw:text-[9.5px] tw:font-extrabold tw:text-[#6b3fc4]">
      <Sparkle12Regular aria-hidden="true" />AI 추출 · p.{page}</span>}</> };
  };
  const ai = (field: RfpTextField) => state.ai[field] !== undefined;
  const aiProps = (field: RfpTextField) => ai(field) ? { "data-ai": "true" } : {};
  const inputClass = (field: RfpTextField) => mergeClasses(ai(field) && styles.aiField);
  const textareaClass = (field: RfpTextField) => mergeClasses(styles.textarea, ai(field) && styles.aiField);
  const toggleReviewer = (person: { id: string; name: string }) => {
    const removing = state.reviewers.some((p) => p.id === person.id);
    if (!removing && state.reviewers.length >= RFP_REVIEWER_MAX) return;
    dispatch({ type: "toggle-reviewer", person });
    toast.notify(removing ? `${person.name}님을 검토 담당자에서 뺐습니다` : `${person.name}님을 검토 담당자로 지정했습니다`, "success");
  };
  const removeReviewer = (id: string) => {
    const person = state.reviewers.find((p) => p.id === id);
    dispatch({ type: "remove-reviewer", id });
    if (person) toast.notify(`${person.name}님을 검토 담당자에서 뺐습니다`, "success");
  };
  const setField = (field: RfpTextField) => (_: unknown, data: { value: string }) => dispatch({ type: "set-field", field, value: data.value });
  const locked = analyzing || submitting;

  return <WorkspacePage title="RFP 등록" showTitle>
    <div className="tw:flex tw:w-full tw:min-w-0 tw:flex-col tw:gap-(--layout-section-gap)">
      <RfpUploadZone phase={state.phase}
        onFiles={(files) => addFiles(files.map((f) => ({ name: f.name, sizeBytes: f.size })))}
        onSample={() => addFiles(RFP_SAMPLE_FILES.map((f) => ({ ...f })))} onRestart={restart} />
      <RfpFileList files={state.files} disabled={locked}
        onKindChange={(id, kind) => dispatch({ type: "set-file-kind", id, kind })} onRemove={(id) => dispatch({ type: "remove-file", id })} />
      <WorkspaceCard title="사업개요" actions={<span className="tw:text-[11px] tw:text-(--kpc-muted)"><span aria-hidden="true" className="tw:text-(--kpc-brand)">* </span>필수 {progress.done}/{progress.total}</span>}>
        <div className={GRID}>
          <Field className={styles.field} label={label("name")} required>
            <DadamInput ref={nameInput} className={inputClass("name")} placeholder="내부에서 부를 이름" value={state.values.name} disabled={locked} onChange={setField("name")} {...aiProps("name")} />
          </Field>
          <Field className={styles.field} label={label("org")} required>
            <DadamInput className={inputClass("org")} value={state.values.org} disabled={locked} onChange={setField("org")} {...aiProps("org")} />
          </Field>
          <Field className={styles.field} label={label("due")} required validationState={pastDue ? "warning" : "none"} validationMessage={pastDue ? "마감일이 이미 지났습니다. 날짜를 확인하세요." : undefined}>
            <DadamInput type="date" className={inputClass("due")} value={state.values.due} disabled={locked} onChange={setField("due")} {...aiProps("due")} />
          </Field>
          <Field className={styles.field} label={label("budget")}>
            <DadamInput inputMode="numeric" className={inputClass("budget")} placeholder="예: 1,200,000,000" value={formatBudget(state.values.budget)} disabled={locked} onChange={setField("budget")} {...aiProps("budget")} />
          </Field>
          <Field className={mergeClasses(styles.field, FULL)} label={label("summary")} required>
            <DadamTextarea rows={3} resize="vertical" className={textareaClass("summary")} value={state.values.summary} disabled={locked} onChange={setField("summary")} {...aiProps("summary")} />
          </Field>
        </div>
        <section aria-label="추가 정보" className="tw:mt-[18px] tw:min-w-0 tw:border-0 tw:border-t tw:border-dashed tw:border-(--kpc-line) tw:pt-4">
          <h3 className="tw:mt-0 tw:mb-3 tw:text-[12.5px] tw:font-extrabold tw:text-[#34363c]">추가 정보</h3>
          <div className={GRID}>
            <Field className={mergeClasses(styles.field, FULL)} label={label("official")}>
              <DadamInput className={inputClass("official")} value={state.values.official} disabled={locked} onChange={setField("official")} {...aiProps("official")} />
            </Field>
            <Field className={mergeClasses(styles.field, FULL)} label={RFP_FIELD_LABELS.period}>
              <div role="group" aria-label={RFP_FIELD_LABELS.period} className="tw:flex tw:flex-wrap tw:gap-1.5">
                {RFP_PERIOD_OPTIONS.map((period) => {
                  const checked = state.period === period;
                  return <Button key={period} aria-pressed={checked} disabled={locked}
                    className={"tw:h-7 tw:rounded-[14px] tw:px-2.5 tw:text-[11.5px] " + (checked ? "active tw:font-extrabold" : "")}
                    onClick={() => dispatch({ type: "set-period", period: checked ? null : period })}>{period}</Button>;
                })}
              </div>
            </Field>
            <Field className={mergeClasses(styles.field, FULL)} label={RFP_FIELD_LABELS.reviewers} required>
              <ReviewerPicker selected={state.reviewers} disabled={locked} onToggle={toggleReviewer} onRemove={removeReviewer} />
            </Field>
            <Field className={mergeClasses(styles.field, FULL)} label={RFP_FIELD_LABELS.memo}>
              <DadamTextarea rows={3} resize="vertical" className={styles.textarea} value={state.values.memo} disabled={locked} onChange={setField("memo")} />
            </Field>
          </div>
        </section>
      </WorkspaceCard>
      <div className="tw:mt-3.5 tw:flex tw:flex-wrap tw:items-center tw:justify-end tw:gap-(--layout-control-gap)">
        {progress.missing.length > 0 && <span className="tw:text-[11px] tw:text-(--kpc-muted)">필수 항목: {progress.missing.join(", ")}</span>}
        <Button className="primary tw:px-4 tw:text-[13px] tw:font-bold" disabled={progress.done < progress.total || submitting || analyzing || !identity} onClick={() => void submit()}>
          {submitting ? "등록 중…" : "등록"}<ArrowRight16Regular aria-hidden="true" />
        </Button>
      </div>
      {!identity && <p role="alert" className="tw:m-0 tw:text-[12px] tw:text-(--kpc-danger)">사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요.</p>}
      {submitError && <p role="alert" className="tw:m-0 tw:text-[12px] tw:text-(--kpc-danger)">{submitError}</p>}
    </div>
  </WorkspacePage>;
}
