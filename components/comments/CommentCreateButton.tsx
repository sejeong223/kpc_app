"use client";

import { Button, makeStyles, mergeClasses, shorthands } from "@fluentui/react-components";
import { CommentAdd20Regular } from "@fluentui/react-icons";

import { COMMENT_VISUALS } from "@/config/comments";

import { useComments } from "./CommentsProvider";

const useStyles = makeStyles({
  button: {
    position: "fixed",
    top: "16px",
    right: "20px",
    zIndex: 5,
    minHeight: "40px",
    padding: "8px 14px",
    borderRadius: "8px",
    backgroundColor: "#fff",
    border: "1px solid #e6e7eb",
    color: "#475569",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)",
    ":hover": { backgroundColor: "#fff5f6", ...shorthands.borderColor(COMMENT_VISUALS.red), color: COMMENT_VISUALS.red },
    ":disabled": { backgroundColor: "#f3f4f6", ...shorthands.borderColor("#e6e7eb"), color: COMMENT_VISUALS.gray },
  },
  active: {
    backgroundColor: "#fff1f2",
    ...shorthands.borderColor(COMMENT_VISUALS.red),
    color: COMMENT_VISUALS.red,
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
