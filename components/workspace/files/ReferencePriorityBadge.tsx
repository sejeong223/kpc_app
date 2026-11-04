import type { ReferencePriority } from "@/types/workspace-files";
import { REFERENCE_PRIORITIES } from "@/config/workspace-files";
const tones: Record<ReferencePriority, string> = {
    required: "tw:bg-(--colorStatusWarningBackground1) tw:text-(--colorStatusWarningForeground1)",
    preferred: "tw:bg-(--dadam-accent-soft) tw:text-(--dadam-accent-ink)",
    normal: "tw:bg-(--colorNeutralBackground3) tw:text-(--colorNeutralForeground2)",
    excluded: "tw:bg-(--colorNeutralBackground2) tw:text-(--colorNeutralForeground3)",
};
export interface ReferencePriorityBadgeProps {
    priority: ReferencePriority;
}
export default function ReferencePriorityBadge({ priority }: ReferencePriorityBadgeProps) { return <span className={"tw:rounded tw:px-2 tw:py-1 tw:text-xs " + tones[priority]}>{REFERENCE_PRIORITIES.find(p => p.value === priority)?.label}</span>; }
