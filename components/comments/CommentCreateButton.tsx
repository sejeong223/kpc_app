"use client";

import { Button, makeStyles, mergeClasses, shorthands, tokens } from "@fluentui/react-components";
import { dadamUi } from "@/lib/ui/dadam-theme";
import { CommentAdd20Regular } from "@fluentui/react-icons";


import { useComments } from "./CommentsProvider";

const useStyles = makeStyles({
  button: {
    position: "fixed",
    top: "16px",
    right: "20px",
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

export default function CommentCreateButton(): React.ReactElement {
  const styles = useStyles();
  const { state, controller } = useComments();

  return (
    <Button
      type="button"
      className={mergeClasses(styles.button, state.pinMode && styles.active)}
      icon={<CommentAdd20Regular />}
      data-comment-control
      data-comment-create
      aria-pressed={state.pinMode}
      disabled={!controller || state.status !== "ready" || state.busy}
      onClick={() => {
        controller?.togglePinMode();
        if (controller?.getSnapshot().pinMode) document.querySelector<HTMLElement>("[data-comment-surface]")?.focus({ preventScroll: true });
      }}
    >
      핀 생성
    </Button>
  );
}
