import { RFP_STATUS_LABELS } from "@/config/admin-labels";
import type { RfpStatus } from "@/types/admin";

export const RFP_STATUS_ORDER: readonly RfpStatus[] = ["review", "writing", "submitted", "won", "lost", "dropped"];
export const RFP_STATUS_COLORS: Record<RfpStatus, string> = {
  review: "var(--kpc-muted)", writing: "var(--kpc-info)", submitted: "var(--kpc-purple)",
  won: "var(--kpc-success)", lost: "var(--kpc-danger)", dropped: "var(--kpc-secondary)",
};
export const formatWinRate = (won: number, lost: number): string => won + lost === 0 ? "—" : (won / (won + lost) * 100).toFixed(1) + "%";
export const rfpSegments = (counts: Record<RfpStatus, number>) => RFP_STATUS_ORDER.map(id => ({ id, label: RFP_STATUS_LABELS[id], count: counts[id], color: RFP_STATUS_COLORS[id] }));
