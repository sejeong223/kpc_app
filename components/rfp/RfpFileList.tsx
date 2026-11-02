"use client";

import { Badge, Button, Select } from "@fluentui/react-components";
import { Dismiss16Regular, Document20Regular } from "@fluentui/react-icons";

import { RFP_FILE_KIND_LABELS, RFP_FILE_KINDS, type RfpFileKind } from "@/config/rfp-register";
import type { RfpFileMeta } from "@/lib/rfp/schemas";

interface RfpFileListProps {
  files: RfpFileMeta[];
  disabled: boolean;
  onKindChange(id: string, kind: RfpFileKind): void;
  onRemove(id: string): void;
}

function isKind(value: string): value is RfpFileKind {
  return (RFP_FILE_KINDS as readonly string[]).includes(value);
}

export default function RfpFileList({ files, disabled, onKindChange, onRemove }: RfpFileListProps): React.ReactElement | null {
  if (!files.length) return null;
  return <ul aria-label="업로드한 파일" className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-(--layout-inline-gap) tw:p-0">
    {files.map((file) => <li key={file.id} className="tw:flex tw:min-w-0 tw:items-center tw:gap-(--layout-control-gap) tw:rounded-(--kpc-radius-control) tw:border tw:border-solid tw:border-(--kpc-line) tw:bg-(--kpc-card) tw:px-(--layout-card-inset) tw:py-(--layout-inline-gap)">
      <Document20Regular aria-hidden="true" className="tw:flex-none tw:text-(--kpc-muted)" />
      <span title={file.name} className="tw:min-w-0 tw:flex-1 tw:truncate tw:text-[12px] tw:font-semibold">{file.name}</span>
      {file.isMain && <Badge appearance="tint" color="brand" size="small">대표 RFP</Badge>}
      <span className="tw:flex-none tw:text-[11px] tw:text-(--kpc-muted)">{(file.sizeBytes / 1048576).toFixed(1)} MB</span>
      <Select size="small" aria-label={`${file.name} 종류`} value={file.kind} disabled={disabled}
        onChange={(_, data) => { if (isKind(data.value)) onKindChange(file.id, data.value); }}>
        {RFP_FILE_KINDS.map((kind) => <option key={kind} value={kind}>{RFP_FILE_KIND_LABELS[kind]}</option>)}
      </Select>
      <Button appearance="subtle" size="small" icon={<Dismiss16Regular />} aria-label={`${file.name} 빼기`} disabled={disabled} onClick={() => onRemove(file.id)} />
    </li>)}
  </ul>;
}
