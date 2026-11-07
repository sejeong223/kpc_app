"use client";
import { DadamButton } from "@/components/ui/DadamControls";
import type { FileDialogBaseProps } from "./file-ui-types";
import { useFileDialogStyles } from "./file-dialog.styles";
export default function FileDialogFeedback({ error, busy, onReload }: Pick<FileDialogBaseProps, "error" | "busy" | "onReload">): React.ReactElement | null {
  const styles = useFileDialogStyles();
  if (!error) return null;
  return <div role="alert" className={styles.feedback}>
    <span>{error.message}</span>
    {error.code === "CONFLICT" && <DadamButton className={styles.button} disabled={busy} onClick={onReload}>최신 자료 다시 불러오기</DadamButton>}
  </div>;
}
