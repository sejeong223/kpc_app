"use client";
import { useId, useLayoutEffect, useRef } from "react";
import { makeStyles, shorthands, tokens } from "@fluentui/react-components";
import { ArrowUp20Regular } from "@fluentui/react-icons";
import { DadamButton } from "@/components/ui/DadamControls";
import { dadamUi } from "@/lib/ui/dadam-theme";

export interface SlidePromptEditorProps {
  value: string;
  dirty: boolean;
  readOnly: boolean;
  busy: boolean;
  composing: boolean;
  error: string | null;
  onEditStart(): void;
  onChange(value: string): void;
  onCompositionChange(value: boolean): void;
  onSave(): void;
}
const useStyles = makeStyles({
  shell: { minWidth: 0, width: "100%", maxWidth: "100%", boxSizing: "border-box", marginTop: "10px", border: "1px solid var(--kpc-line)", borderRadius: "14px", backgroundColor: tokens.colorNeutralBackground1, boxShadow: "0 1px 3px rgba(0,0,0,.05)",
    ":focus-within": { ...shorthands.borderColor("#b9bcc4"), boxShadow: "0 2px 10px rgba(0,0,0,.08)" } },
  frame: { position: "relative", minWidth: 0 },
  input: { display: "block", boxSizing: "border-box", width: "100%", minWidth: 0, padding: "12px 52px 12px 16px", minHeight: "48px", maxHeight: "180px", overflowY: "auto", overscrollBehavior: "contain", resize: "none", border: 0, borderRadius: "14px", backgroundColor: "transparent", outline: "none",
    fontFamily: tokens.fontFamilyBase, fontSize: "13px", lineHeight: "1.7", color: "#26282d", whiteSpace: "pre-wrap", overflowWrap: "anywhere", "::placeholder": { color: tokens.colorNeutralForeground4 } },
  save: { position: "absolute", right: "10px", bottom: "10px", width: "30px", height: "30px", minWidth: "30px", minHeight: "30px", padding: 0, borderRadius: "50%" },
  meta: { color: tokens.colorNeutralForeground3, margin: "8px 12px", fontSize: dadamUi.metaSize },
  error: { color: tokens.colorStatusDangerForeground1, margin: "8px 12px", fontSize: dadamUi.metaSize },
});

export default function SlidePromptEditor({ value, dirty, readOnly, busy, composing, error, onEditStart, onChange, onCompositionChange, onSave }: SlidePromptEditorProps): React.ReactElement {
  const styles = useStyles(), input = useRef<HTMLTextAreaElement>(null), composingNow = useRef(false), errorId = useId();
  useLayoutEffect(() => {
    const element = input.current;
    if (!element) return;
    const measure = () => { element.style.height = "auto"; element.style.height = Math.min(180, Math.max(48, element.scrollHeight)) + "px"; };
    measure();
    let width = element.clientWidth;
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      if (element.clientWidth !== width) { width = element.clientWidth; measure(); }
    });
    observer?.observe(element);
    return () => observer?.disconnect();
  }, [value]);
  return <section className={styles.shell} aria-label="슬라이드 원문 편집">
    <div className={styles.frame}>
      <textarea ref={input} className={styles.input} value={value} aria-label="슬라이드 작성 내용"
        placeholder="슬라이드에 담을 내용을 자유롭게 작성해 주세요." spellCheck={false}
        readOnly={busy || (readOnly && !composing)} aria-invalid={!!error} aria-describedby={error ? errorId : undefined}
        onBeforeInput={() => { if (!busy && !readOnly) onEditStart(); }}
        onChange={event => { if (!busy && (!readOnly || composingNow.current)) { onEditStart(); onChange(event.currentTarget.value); } }}
        onCompositionStart={() => { if (busy || readOnly) return; composingNow.current = true; onEditStart(); onCompositionChange(true); }}
        onCompositionEnd={event => {
          if (composingNow.current && !busy) onChange(event.currentTarget.value);
          composingNow.current = false; onCompositionChange(false);
        }} />
      {!readOnly && <DadamButton className={styles.save} appearance="primary" icon={<ArrowUp20Regular />} title="슬라이드에 반영" aria-label="슬라이드에 반영"
        disabled={busy || composing || !!error} onClick={() => { if (!composingNow.current && !busy && !error) onSave(); }} />}
    </div>
    <p className={styles.meta}>AI 배치 시연{readOnly ? dirty ? " · 읽기 전용 · 미반영 변경 보관 중" : " · 읽기 전용" : dirty ? " · 미반영 변경" : ""}</p>
    {error && <p id={errorId} role="alert" className={styles.error}>{error}</p>}
  </section>;
}
