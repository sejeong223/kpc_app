"use client";
import { useId, useState } from "react";
import { makeStyles, tokens } from "@fluentui/react-components";
import { LockClosed16Regular } from "@fluentui/react-icons";
import { DadamButton } from "@/components/ui/DadamControls";
import { dadamControl as control } from "@/lib/ui/dadam-theme";

export interface CompletedSlidePromptProps { prompt: string }
const useStyles = makeStyles({
  shell: { width: "100%", minWidth: 0, boxSizing: "border-box", minHeight: "54px", marginTop: "10px", padding: "12px 16px", border: `1px dashed ${control.border}`, borderRadius: "14px", backgroundColor: control.muted, boxShadow: "none", fontFamily: tokens.fontFamilyBase, fontSize: "13px", color: control.ink },
  header: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", minWidth: 0 },
  label: { display: "flex", alignItems: "center", gap: "8px", minWidth: 0, overflowWrap: "anywhere" },
  lock: { display: "block", width: "16px", height: "16px", flexShrink: 0 },
  toggle: { marginLeft: "auto", flexShrink: 0 },
  prompt: { minWidth: 0, marginTop: "12px", maxHeight: "180px", overflowY: "auto", overscrollBehavior: "contain", whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: "1.7", color: tokens.colorNeutralForeground2 },
});

export default function CompletedSlidePrompt({ prompt }: CompletedSlidePromptProps): React.ReactElement {
  const styles = useStyles(), promptId = useId(), [expanded, setExpanded] = useState(false);
  return <section className={styles.shell} aria-label="작성 완료 프롬프트">
    <div className={styles.header}>
      <span className={styles.label}><LockClosed16Regular className={styles.lock} aria-hidden="true" /><strong>작성 완료 · 고정됨</strong></span>
      <DadamButton type="button" size="small" className={styles.toggle} aria-expanded={expanded} aria-controls={promptId}
        onClick={() => setExpanded(value => !value)}>{expanded ? "프롬프트 접기" : "프롬프트 보기"}</DadamButton>
    </div>
    {expanded && <div id={promptId} role="region" aria-label="완료된 슬라이드 프롬프트" tabIndex={0} className={styles.prompt}>{prompt || "저장된 프롬프트가 없습니다."}</div>}
  </section>;
}
