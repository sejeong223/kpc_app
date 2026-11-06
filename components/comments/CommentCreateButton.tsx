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
});

export interface CommentCreateButtonProps { slideId: string; surfaceId: string; buttonId: string; disabled?: boolean }
export default function CommentCreateButton({ slideId, surfaceId, buttonId, disabled = false }: CommentCreateButtonProps): React.ReactElement | null {
  const styles = useStyles();
  const { state, controller, capabilities, requestPinMode } = useComments();
  const active = state.pinMode && state.pinModeSlideId === slideId;

  if(!capabilities.canCreate || !capabilities.slideIds.includes(slideId))return null;
  return (
    <Button
      type="button"
      id={buttonId}
      className={mergeClasses(styles.button, active && styles.active)}
      icon={<CommentAdd20Regular />}
      data-comment-control
      data-comment-create={slideId}
      aria-controls={surfaceId}
      aria-pressed={active}
      disabled={disabled || !controller || state.status !== "ready" || state.busy}
      onClick={() => requestPinMode(slideId)}
    >
      핀 생성
    </Button>
  );
}
