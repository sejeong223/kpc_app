"use client";
import { useId, useState } from "react";
import ModalFrame from "@/components/ui/ModalFrame";
import { DadamButton } from "@/components/ui/DadamControls";
import { FileSettingsSchema } from "@/lib/workspace/files/schemas";
import type { FileSettings } from "@/types/workspace-files";
import FileReferenceFields from "./FileReferenceFields";
import FileDialogFeedback from "./FileDialogFeedback";
import type { FileSettingsDialogProps } from "./file-ui-types";
export default function FileSettingsDialog(props: FileSettingsDialogProps): React.ReactElement {
  const { resource, busy, onClose, onSubmit, copyToCurrent, onDirtyChange } = props;
  const [initial] = useState<FileSettings>(() => ({ kind: resource.version.kind, priority: resource.version.priority, instruction: resource.version.instruction }));
  const [value, setValue] = useState(initial), id = useId();
  return <ModalFrame open={props.open} title={copyToCurrent ? "현재 회차로 복사하여 수정" : "자료 설정"} subtitle={resource.version.label} width={760} contentKey={resource.version.id} onClose={onClose}
    footer={<><span className="tw:mr-auto tw:text-xs tw:text-(--kpc-secondary)">저장할 때 현재 회차에만 반영됩니다.</span><DadamButton disabled={busy} onClick={onClose}>취소</DadamButton><DadamButton appearance="primary" disabled={busy || resource.version.source.type !== "file" || !FileSettingsSchema.safeParse(value).success} onClick={() => { void onSubmit(value).catch(() => {}); }}>{busy ? "저장 중…" : "설정 저장"}</DadamButton></>}>
    <FileReferenceFields value={value} idPrefix={id} disabled={busy} onChange={next => { setValue(next); onDirtyChange(JSON.stringify(next) !== JSON.stringify(initial)); }} />
    <FileDialogFeedback {...props} />
  </ModalFrame>;
}
