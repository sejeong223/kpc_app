"use client";

import { Button, makeStyles, mergeClasses, shorthands, tokens } from "@fluentui/react-components";
import { dadamUi } from "@/lib/ui/dadam-theme";
import { CommentAdd20Regular } from "@fluentui/react-icons";


import { useComments } from "./CommentsProvider";

const useStyles = makeStyles({
  button: {
    zIndex: 5,
    minHeight: "40px",
    padding: "8px 14px",
    borderRadius: dadamUi.controlRadius,
    fontFamily: tokens.fontFamilyBase, fontSize: dadamUi.bodySize, lineHeight: dadamUi.bodyLineHeight, fontWeight: 500,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground2,
    boxShadow: tokens.shadow2,
    ":enabled:hover": { backgroundColor: tokens.colorBrandBackground2, ...shorthands.borderColor(tokens.colorBrandStroke1), color: tokens.colorBrandForeground2 },
    ":disabled, &:disabled:hover, &:disabled:active": { backgroundColor: tokens.colorNeutralBackgroundDisabled, ...shorthands.borderColor(tokens.colorNeutralStrokeDisabled), color: tokens.colorNeutralForegroundDisabled, opacity: 1 },
  },
  active: {
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.borderColor(tokens.colorBrandStroke1),
    color: tokens.colorBrandForeground2,
  },
  compact: { height: "30px", minHeight: "30px", minWidth: 0, padding: "0 10px", borderRadius: "8px", fontSize: "12px", lineHeight: "20px", fontWeight: 500, columnGap: "4px", boxShadow: "none", ...shorthands.borderColor("var(--dadam-control-border)"), color: "#242424",
    ":enabled:hover": { backgroundColor: "#f5f5f5", ...shorthands.borderColor("var(--dadam-control-border-hover)"), color: "#242424" } },
  compactIcon: { width: "14px", height: "14px", fontSize: "14px", margin: 0, flexShrink: 0, "& svg": { width: "14px", height: "14px" } },
});

export interface CommentCreateButtonProps { slideId: string; surfaceId: string; buttonId: string; disabled?: boolean; compact?: boolean }
export default function CommentCreateButton({ slideId, surfaceId, buttonId, disabled = false, compact = false }: CommentCreateButtonProps): React.ReactElement | null {
  const styles = useStyles();
  const { state, controller, capabilities, requestPinMode } = useComments();
  const active = state.pinMode && state.pinModeSlideId === slideId;

  if(!capabilities.canCreate || !capabilities.slideIds.includes(slideId))return null;
  return (
    <Button
      type="button"
      id={buttonId}
      className={mergeClasses(styles.button, compact && styles.compact, active && styles.active)}
      icon={{ children: <CommentAdd20Regular />, className: compact ? styles.compactIcon : undefined }}
      data-comment-control
      data-comment-create={slideId}
      aria-controls={surfaceId}
      aria-pressed={active}
      disabled={disabled || !controller || state.status !== "ready" || state.busy}
      onClick={() => requestPinMode(slideId)}
    >
      {active ? "코멘트 추가 취소" : "코멘트 추가"}
    </Button>
  );
}
