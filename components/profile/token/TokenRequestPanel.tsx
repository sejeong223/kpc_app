"use client";

import { Button, Field, Input, makeStyles, tokens, mergeClasses, ProgressBar, Select, shorthands, Textarea } from "@fluentui/react-components";
import { dadamUi } from "@/lib/ui/dadam-theme";
import { ClockRegular, PeopleRegular } from "@fluentui/react-icons";
import { useEffect, useRef } from "react";

import SegmentedControl from "@/components/ui/SegmentedControl";
import {
  TOKEN_PROJECT_OPTIONS, TOKEN_REASON_PRESETS,
  type TokenAmountChoice, type TokenPreviewAction, type TokenRequestDraft,
  type TokenRequestErrors, type TokenRequestPreview,
} from "@/config/token-preview";
import { formatTokenCount, getProfileTokenSummary } from "@/lib/profile-preview";
import { getRequestedTokenAmountK } from "@/lib/token-preview";

type TokenDraftAction = Extract<TokenPreviewAction, {
  type: "set-amount" | "set-custom-amount" | "set-project" | "set-reason";
}>;
export interface TokenRequestPanelProps {
  formId: string;
  draft: TokenRequestDraft;
  latestPending: TokenRequestPreview | null;
  used: number;
  limit: number;
  errors: TokenRequestErrors;
  onDraftAction(action: TokenDraftAction): void;
  onFieldBlur(field: "amount" | "project" | "reason"): void;
  onSubmit(event: React.FormEvent<HTMLFormElement>): void;
}

const useStyles = makeStyles({
  form: { display: "flex", flexDirection: "column", gap: "12px", minWidth: 0, flexShrink: 0 },
  now: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px", padding: "10px 12px", borderRadius: dadamUi.cardRadius, backgroundColor: tokens.colorNeutralBackground3, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, minWidth: 0 },
  count: { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
  progress: { flex: 1, minWidth: "60px", height: "7px", backgroundColor: tokens.colorNeutralBackground5 },
  progressBar: { height: "7px", backgroundColor: tokens.colorStatusSuccessBackground3 },
  warningBar: { backgroundColor: tokens.colorStatusWarningBackground3 },
  overBar: { backgroundColor: tokens.colorStatusDangerBackground3 },
  meta: { color: tokens.colorNeutralForeground3, fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, overflowWrap: "anywhere" },
  pending: { display: "flex", alignItems: "flex-start", gap: "6px", fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, fontWeight: 500, padding: "6px 9px", borderRadius: dadamUi.cardRadius, backgroundColor: tokens.colorStatusWarningBackground1, color: tokens.colorStatusWarningForeground1, overflowWrap: "anywhere" },
  icon: { width: "14px", height: "14px", flexShrink: 0, marginTop: "2px" },
  field: { display: "flex", flexDirection: "column", gap: "5px", minWidth: 0, "& > label": { padding: 0, margin: 0, fontFamily: tokens.fontFamilyBase, fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, fontWeight: 500, color: tokens.colorNeutralForeground2 } },
  choices: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px", minWidth: 0 },
  custom: { width: "110px", minWidth: 0, minHeight: dadamUi.controlHeight, height: "auto", borderRadius: dadamUi.controlRadius, ...shorthands.borderColor(tokens.colorNeutralStroke1), backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground1, fontFamily: tokens.fontFamilyBase, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight },
  inputFace: { fontFamily: tokens.fontFamilyBase, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight },
  select: { width: "100%", minWidth: 0, minHeight: dadamUi.controlHeight, height: "auto", borderRadius: dadamUi.controlRadius, ...shorthands.borderColor(tokens.colorNeutralStroke1), backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground1, fontFamily: tokens.fontFamilyBase, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight },
  selectFace: { minWidth: 0, maxWidth: "100%", paddingLeft: "10px", fontFamily: tokens.fontFamilyBase, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, textOverflow: "ellipsis" },
  textarea: { width: "100%", minWidth: 0, maxWidth: "100%", borderRadius: dadamUi.controlRadius, ...shorthands.borderColor(tokens.colorNeutralStroke1), backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground1 },
  textareaFace: { minWidth: 0, maxWidth: "100%", padding: "8px 10px", fontFamily: tokens.fontFamilyBase, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight },
  reasons: { display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" },
  reason: {
    minHeight: dadamUi.smallControlHeight, height: "auto", minWidth: 0, padding: "4px 9px", whiteSpace: "normal", border: `1px solid ${tokens.colorNeutralStroke1}`, borderRadius: "14px",
    backgroundColor: tokens.colorNeutralBackground1, color: tokens.colorNeutralForeground2, fontFamily: tokens.fontFamilyBase, fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, fontWeight: 500,
    ":enabled:hover": { backgroundColor: tokens.colorNeutralBackground2Hover, ...shorthands.borderColor(tokens.colorNeutralStroke1) },
  },
  approver: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px", paddingTop: "4px", fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, color: tokens.colorNeutralForeground2, "& b": { color: tokens.colorNeutralForeground1, fontWeight: 700 } },
  error: { margin: 0, color: tokens.colorStatusDangerForeground1, fontSize: dadamUi.metaSize, lineHeight: dadamUi.metaLineHeight, overflowWrap: "anywhere" },
});

export default function TokenRequestPanel({
  formId, draft, latestPending, used, limit, errors, onDraftAction, onFieldBlur, onSubmit,
}: TokenRequestPanelProps): React.ReactElement {
  const styles = useStyles();
  const customRef = useRef<HTMLInputElement>(null);
  const summary = getProfileTokenSummary(used, limit);
  const amountK = getRequestedTokenAmountK(draft);
  const projected = amountK === null ? null : limit + amountK * 1000;
  const projectedLabel = projected !== null && Number.isSafeInteger(projected) && summary.status !== "unavailable"
    ? formatTokenCount(projected) : "—";
  useEffect(() => {
    if (draft.amountChoice !== "custom") return;
    const frame = requestAnimationFrame(() => customRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [draft.amountChoice]);

  return (
    <form id={formId} noValidate onSubmit={onSubmit} className={styles.form}>
      <div className={styles.now}>
        <span>현재 사용</span>
        <b className={styles.count}>{formatTokenCount(summary.used)} / {formatTokenCount(summary.limit)}</b>
        <ProgressBar className={styles.progress} value={summary.progressPercent / 100}
          bar={{ className: mergeClasses(styles.progressBar, summary.status === "warning" && styles.warningBar, summary.status === "over" && styles.overBar) }} aria-label="현재 Token 사용률" />
        <span className={styles.meta}>신청 후 한도 {projectedLabel}</span>
      </div>
      {latestPending && <div className={styles.pending} role="status">
        <ClockRegular className={styles.icon} aria-hidden="true" />
        <span>이미 {latestPending.amountK}K 신청이 승인 대기 중입니다. 새로 신청하면 함께 검토됩니다.</span>
      </div>}
      <Field className={styles.field} label="추가 요청량" validationState={errors.amount ? "error" : "none"} validationMessage={errors.amount}>
        <div className={styles.choices} onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) onFieldBlur("amount");
        }}>
          <SegmentedControl<TokenAmountChoice>
            ariaLabel="추가 요청량" variant="chips" value={draft.amountChoice}
            options={[{ value: "30", label: "+30K" }, { value: "50", label: "+50K" }, { value: "100", label: "+100K" }, { value: "custom", label: "직접 입력" }]}
            onChange={(choice) => onDraftAction({ type: "set-amount", choice })}
          />
          {draft.amountChoice === "custom" && <>
            <Input ref={customRef} className={styles.custom} input={{ className: styles.inputFace }} type="text" inputMode="numeric"
              aria-label="직접 입력 요청량 (K Token)" data-token-field="amount"
              placeholder="예: 70" value={draft.customAmountK} aria-invalid={!!errors.amount}
              onChange={(_, data) => onDraftAction({ type: "set-custom-amount", value: data.value })} />
            <span className={styles.meta}>K Token</span>
          </>}
        </div>
      </Field>
      <Field className={styles.field} label="사용할 프로젝트" validationState={errors.project ? "error" : "none"} validationMessage={errors.project}>
        <Select className={styles.select} select={{ className: styles.selectFace, "data-token-field": "project" } as React.ComponentProps<"select">}
          value={draft.projectId} onBlur={() => onFieldBlur("project")}
          onChange={(event) => {
            const project = TOKEN_PROJECT_OPTIONS.find((item) => item.id === event.target.value);
            if (project) onDraftAction({ type: "set-project", projectId: project.id });
          }}>
          {TOKEN_PROJECT_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
      </Field>
      <Field className={styles.field} label="신청 사유" required validationState={errors.reason ? "error" : "none"} validationMessage={errors.reason}>
        <div>
          <Textarea className={styles.textarea} textarea={{ className: styles.textareaFace, "data-token-field": "reason" } as React.ComponentProps<"textarea">}
            rows={3} resize="vertical" value={draft.reason}
            placeholder="예) 2차 검수 의견 반영으로 3장 기술 부문 전체 재작성이 필요합니다"
            onBlur={() => onFieldBlur("reason")}
            onChange={(_, data) => onDraftAction({ type: "set-reason", value: data.value })} />
          <div className={styles.reasons} aria-label="신청 사유 예시">
            {TOKEN_REASON_PRESETS.map((reason) => <Button key={reason} type="button" className={styles.reason}
              onClick={() => onDraftAction({ type: "set-reason", value: reason })}>{reason}</Button>)}
          </div>
        </div>
      </Field>
      <div className={styles.approver}>
        <PeopleRegular className={styles.icon} aria-hidden="true" /><span>승인자</span><b>운영 정책 관리자</b>
        <span className={styles.meta}>· 운영 정책 › 토큰·비용 관리에서 처리</span>
      </div>
      {errors.form && <p className={styles.error} role="alert">{errors.form}</p>}
    </form>
  );
}
