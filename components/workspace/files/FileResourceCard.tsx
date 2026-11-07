"use client";
import { DocumentRegular, GlobeRegular } from "@fluentui/react-icons";
import { mergeClasses } from "@fluentui/react-components";
import { DadamButton } from "@/components/ui/DadamControls";
import ReferencePriorityBadge from "./ReferencePriorityBadge";
import FileResourceMeta from "./FileResourceMeta";
import type { FileResourceView } from "@/types/workspace-files";
import { useFileListStyles } from "./file-list.styles";
export interface FileResourceCardProps {
  resource: FileResourceView; round: number; readOnly: boolean; disabled?: boolean;
  onOpen?(resource: FileResourceView, round: number): void;
  onEdit?(resource: FileResourceView, round: number): void;
  onRemove?(resource: FileResourceView): void;
}
export default function FileResourceCard({ resource, round, readOnly, disabled, onOpen, onEdit, onRemove }: FileResourceCardProps): React.ReactElement {
  const styles = useFileListStyles();
  const { version } = resource;
  const source = version.source;
  return <article className={mergeClasses(styles.card, version.priority === "excluded" && styles.excluded)}>
    <div className={styles.cardHeader}>
      <span className={styles.icon} aria-hidden="true">{source.type === "file" ? <DocumentRegular /> : <GlobeRegular />}</span>
      <div className={styles.cardText}>
        {onOpen ? <button type="button" className={styles.name} onClick={() => onOpen(resource, round)}>{version.label}</button>
          : <strong className={styles.name}>{version.label}</strong>}
        <FileResourceMeta resource={resource}/>
      </div>
    </div>
    <div className={styles.tags}>
      <ReferencePriorityBadge priority={version.priority}/>
      {resource.isInherited && <span className={mergeClasses(styles.badge, styles.normal)}>이전 회차 계승</span>}
    </div>
    {version.instruction && <p className={styles.instruction}>{version.instruction}</p>}
    <div className={styles.actions}>
      {resource.canManage && onEdit && <DadamButton size="small" className={styles.smallButton} disabled={disabled} onClick={() => onEdit(resource, round)}>{readOnly ? "현재 회차에서 편집" : resource.isInherited ? "현재 회차로 복사하여 수정" : "설정"}</DadamButton>}
      {resource.canManage && !readOnly && onRemove && <DadamButton size="small" className={styles.smallButton} disabled={disabled} onClick={() => onRemove(resource)}>삭제</DadamButton>}
    </div>
  </article>;
}
