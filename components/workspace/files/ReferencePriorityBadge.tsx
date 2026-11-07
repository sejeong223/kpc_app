"use client";

import { mergeClasses } from "@fluentui/react-components";
import type { ReferencePriority } from "@/types/workspace-files";
import { REFERENCE_PRIORITIES } from "@/config/workspace-files";
import { useFileListStyles } from "./file-list.styles";
export interface ReferencePriorityBadgeProps {
    priority: ReferencePriority;
}
export default function ReferencePriorityBadge({ priority }: ReferencePriorityBadgeProps) {
    const styles = useFileListStyles();
    return <span className={mergeClasses(styles.badge, priority === "excluded" ? styles.excludedBadge : styles[priority])}>{REFERENCE_PRIORITIES.find(p => p.value === priority)?.label}</span>;
}
