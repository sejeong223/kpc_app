"use client";

import { Button, makeStyles, tokens } from "@fluentui/react-components";
import ProjectHeader from "@/components/common/ProjectHeader";
import { dadamUi } from "@/lib/ui/dadam-theme";
import DadamThemeScope from "@/components/providers/DadamThemeScope";
import ProductionScreen from "@/components/workspace/production/ProductionScreen";
import { useComments } from "./CommentsProvider";

const useStyles = makeStyles({
  surface: { display: "flex", flexDirection: "column", flex: "1 1 0%", width: "100%", minHeight: 0, minWidth: 0, backgroundColor: tokens.colorNeutralBackground2, fontFamily: tokens.fontFamilyBase, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, color: tokens.colorNeutralForeground1 },
  intro: { padding: "var(--layout-canvas-tools-inset) var(--layout-canvas-tools-inset) 0", display: "flex", flexDirection: "column", flexShrink: 0, minHeight: 0, maxHeight: "50%", overflowY: "auto", overscrollBehavior: "contain", gap: "var(--layout-control-gap)" },
  text: { fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, margin: 0 },
  alert: { position: "relative", zIndex: 3, margin: "var(--layout-canvas-tools-inset)", padding: "var(--layout-card-inset)", border: `1px solid ${tokens.colorStatusDangerBorder1}`, borderRadius: dadamUi.cardRadius, color: tokens.colorStatusDangerForeground1, backgroundColor: tokens.colorStatusDangerBackground1, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight },
});

export default function CommentsWorkspace(): React.ReactElement {
  const styles = useStyles(), { state, controller, capabilities, roundConflict } = useComments();
  const unavailableDrafts = state.status === "ready" ? Object.entries(state.drafts).filter(([key, draft]) => {
    if (!draft.text.trim()) return false;
    const message = key.startsWith("edit:") ? state.snapshot?.messages.find(m => m.id === key.slice(5)) : null;
    if (message && draft.text === message.text && JSON.stringify(draft.mentions) === JSON.stringify(message.mentions)) return false;
    const threadId = key.startsWith("reply:") ? key.slice(6) : message?.threadId;
    const slideId = key === "new" ? state.pendingSlideId : state.snapshot?.threads.find(t => t.id === threadId)?.slideId;
    return !!slideId && !capabilities.slideIds.includes(slideId);
  }) : [];
  return <DadamThemeScope><section className={styles.surface} aria-labelledby="workspace-screen-title">
    <div className={styles.intro} data-comment-control data-production-header>
      <ProjectHeader title="제작" headingId="workspace-screen-title" />
      {roundConflict && <section role="alert" className="tw:rounded-lg tw:border tw:border-solid tw:border-amber-300 tw:bg-amber-50 tw:p-(--layout-card-inset)">
        <p>{roundConflict.from}차에서 작성하던 의견을 보관하고 있습니다. 현재 작업은 {roundConflict.to}차로 변경되어 이 초안을 저장할 수 없습니다. 필요한 내용을 복사한 뒤 최신 회차를 불러와 주세요.</p>
        {Object.entries(state.drafts).filter(([, draft]) => draft.text.trim()).map(([key, draft]) => <pre key={key} className="tw:my-2 tw:whitespace-pre-wrap tw:break-words tw:font-sans">{draft.text}</pre>)}
        <Button disabled={state.busy} onClick={roundConflict.reload}>최신 회차 불러오기</Button>
      </section>}
      {!roundConflict && unavailableDrafts.length > 0 && <section role="alert" className={styles.alert}>
        <p>의견을 작성하던 슬라이드를 더 이상 찾을 수 없습니다. 입력 내용은 보관하고 있으니 필요한 내용을 복사해 주세요.</p>
        {unavailableDrafts.map(([key, draft]) => <pre key={key} className="tw:whitespace-pre-wrap tw:break-words tw:font-sans">{draft.text}</pre>)}
      </section>}
      {(state.status === "idle" || state.status === "loading") && <p className={styles.text} role="status">코멘트를 불러오는 중입니다.</p>}
      {state.error && !state.view && <div className={styles.alert} role="alert" data-comment-control>{state.error.message} {controller && <Button size="small" disabled={state.busy || state.status === "loading"} onClick={() => void controller.load()}>다시 불러오기</Button>}</div>}
    </div>
    <ProductionScreen />
  </section></DadamThemeScope>;
}
