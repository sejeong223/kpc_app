"use client";

import { Badge, makeStyles } from "@fluentui/react-components";
import { Dismiss12Regular, Document16Regular } from "@fluentui/react-icons";

import Button from "@/components/common/Button";
import { DadamSelect } from "@/components/ui/DadamControls";
import { RFP_FILE_KIND_LABELS, RFP_FILE_KINDS, type RfpFileKind } from "@/config/rfp-register";
import type { RfpFileMeta } from "@/lib/rfp/schemas";

interface RfpFileListProps {
  files: RfpFileMeta[];
  disabled: boolean;
  onKindChange(id: string, kind: RfpFileKind): void;
  onRemove(id: string): void;
}

// 레퍼런스 .badge.b-active를 파랑 계열로 치환
const useStyles = makeStyles({
  select: { flexShrink: 0, width: "120px" },
  mainBadge: {
    flexShrink: 0, height: "20px", padding: "0 7px", borderRadius: "6px", fontSize: "10px", fontWeight: 800,
    color: "var(--kpc-brand-ink)", backgroundColor: "var(--kpc-brand-soft)",
    border: "1px solid color-mix(in srgb, var(--kpc-brand) 25%, #fff)",
  },
});

function isKind(value: string): value is RfpFileKind {
  return (RFP_FILE_KINDS as readonly string[]).includes(value);
}

export default function RfpFileList({ files, disabled, onKindChange, onRemove }: RfpFileListProps): React.ReactElement | null {
  const styles = useStyles();
  if (!files.length) return null;
  return <ul aria-label="업로드한 파일" className="tw:m-0 tw:flex tw:list-none tw:flex-col tw:gap-1.5 tw:p-0">
    {files.map((file) => <li key={file.id} className="tw:flex tw:min-w-0 tw:items-center tw:gap-2.5 tw:rounded-[9px] tw:border tw:border-solid tw:border-[#eff0f3] tw:bg-[#fcfcfd] tw:px-2.5 tw:py-2">
      <Document16Regular aria-hidden="true" className="tw:flex-none tw:text-(--kpc-muted)" />
      <span title={file.name} className="tw:min-w-0 tw:flex-1 tw:truncate tw:text-[11.5px] tw:font-bold tw:text-(--kpc-ink)">{file.name}</span>
      <DadamSelect size="small" className={styles.select} aria-label={`${file.name} 종류`} value={file.kind} disabled={disabled}
        onChange={(_, data) => { if (isKind(data.value)) onKindChange(file.id, data.value); }}>
        {RFP_FILE_KINDS.map((kind) => <option key={kind} value={kind}>{RFP_FILE_KIND_LABELS[kind]}</option>)}
      </DadamSelect>
      {file.isMain && <Badge className={styles.mainBadge}>대표 RFP</Badge>}
      <Button className="ghost tw:size-5 tw:rounded-full tw:p-0 tw:text-(--kpc-muted)" aria-label={`${file.name} 빼기`} disabled={disabled} onClick={() => onRemove(file.id)}>
        <Dismiss12Regular aria-hidden="true" />
      </Button>
    </li>)}
  </ul>;
}
