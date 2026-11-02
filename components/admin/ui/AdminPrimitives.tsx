"use client";

import WorkspaceCard, { type WorkspaceCardProps } from "@/components/layout/WorkspaceCard";
import WorkspacePage, { type WorkspacePageProps } from "@/components/layout/WorkspacePage";

type AdminPageProps = WorkspacePageProps;
type AdminCardProps = WorkspaceCardProps;
interface AdminMetricProps { label: string; value: string; caption?: string; selected?: boolean; onClick?: () => void; tone?: "neutral" | "brand" | "success" | "warning" | "danger" }
export function AdminPage({ dataNotice, dataNoticeSummary, className = "", ...props }: AdminPageProps): React.ReactElement {
  return <WorkspacePage {...props}
    dataNotice={dataNotice === undefined ? "예시 데이터 · 기준일 2026.10.20" : dataNotice}
    dataNoticeSummary={dataNoticeSummary ?? (dataNotice === undefined ? "예시 데이터" : undefined)}
    className={"tw:text-(--kpc-ink) tw:text-[12px] tw:leading-relaxed " + className} />;
}
export function AdminCard(props: AdminCardProps): React.ReactElement {
  return <WorkspaceCard {...props} />;
}
const tones = { neutral: "tw:text-(--kpc-ink)", brand: "tw:text-(--kpc-brand)", success: "tw:text-(--kpc-success)", warning: "tw:text-(--kpc-warning)", danger: "tw:text-(--kpc-danger)" };
export function AdminMetric({ label, value, caption, selected, onClick, tone = "neutral" }: AdminMetricProps): React.ReactElement {
  const className = "tw:m-0 tw:flex tw:min-w-0 tw:flex-col tw:gap-(--layout-inline-gap) tw:rounded-(--kpc-radius-card) tw:border tw:border-solid tw:p-(--layout-card-inset) tw:text-left " + (selected ? "tw:border-(--kpc-brand) tw:bg-(--kpc-brand-soft)" : "tw:border-(--kpc-line) tw:bg-(--kpc-card)");
  const content = <><span className="tw:text-[11px] tw:text-(--kpc-secondary)">{label}</span><strong className={"tw:text-[24px] tw:font-bold tw:tabular-nums " + tones[tone]}>{value}</strong>{caption && <span className="tw:text-[11px] tw:text-(--kpc-muted)">{caption}</span>}</>;
  return onClick ? <button type="button" className={className} aria-pressed={Boolean(selected)} onClick={onClick}>{content}</button> : <div className={className}>{content}</div>;
}
