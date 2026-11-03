"use client";
import { DadamButton } from "@/components/ui/DadamControls";
import type { FileDialogBaseProps } from "./file-ui-types";
export default function FileDialogFeedback({ error, busy, onReload }: Pick<FileDialogBaseProps, "error" | "busy" | "onReload">): React.ReactElement | null {
  if (!error) return null;
  return <div role="alert" className="tw:flex tw:flex-wrap tw:items-center tw:gap-(--layout-control-gap) tw:text-red-700">
    <span>{error.message}</span>
    {error.code === "CONFLICT" && <DadamButton disabled={busy} onClick={onReload}>최신 자료 다시 불러오기</DadamButton>}
  </div>;
}
