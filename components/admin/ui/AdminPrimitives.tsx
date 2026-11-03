"use client";

import WorkspaceCard, { type WorkspaceCardProps } from "@/components/layout/WorkspaceCard";
import WorkspacePage, { type WorkspacePageProps } from "@/components/layout/WorkspacePage";
import Button from "@/components/common/Button";
import { ArrowUpRightRegular } from "@fluentui/react-icons";

type AdminPageProps = WorkspacePageProps;
type AdminCardProps = WorkspaceCardProps;
interface AdminMetricProps { label: string; value: string; caption?: string; unit?: string; icon?: React.ReactNode; selected?: boolean; onClick?: () => void; tone?: "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "purple"; variant?: "default" | "insight" }
export function AdminPage({ className = "", ...props }: AdminPageProps): React.ReactElement {
  return <WorkspacePage {...props}
    className={"tw:text-(--kpc-ink) tw:text-[12px] tw:leading-relaxed " + className} />;
}
export function AdminCard(props: AdminCardProps): React.ReactElement {
  return <WorkspaceCard {...props} />;
}
const tones = { neutral: "tw:text-(--kpc-ink)", brand: "tw:text-(--kpc-brand)", success: "tw:text-(--kpc-success)", warning: "tw:text-(--kpc-warning)", danger: "tw:text-(--kpc-danger)", info: "tw:text-(--kpc-info)", purple: "tw:text-(--kpc-purple)" };
export function AdminMetric({ label, value, caption, unit, icon, selected, onClick, tone = "neutral", variant = "default" }: AdminMetricProps): React.ReactElement {
  if (variant === "insight") {
    const classes = "tw:group tw:m-0 tw:flex tw:h-auto tw:min-w-0 tw:flex-col tw:items-stretch tw:gap-3 tw:rounded-(--kpc-radius-card) tw:border tw:border-solid tw:border-(--kpc-line) tw:bg-(--kpc-card) tw:p-(--layout-card-inset) tw:text-left tw:whitespace-normal tw:shadow-sm tw:shadow-black/3";
    const content = <>
      <span className="tw:flex tw:items-center tw:justify-between tw:gap-2"><span className="tw:text-xs tw:font-medium tw:text-(--kpc-secondary)">{label}</span><span aria-hidden="true" className={"tw:flex tw:size-8 tw:items-center tw:justify-center tw:rounded-lg tw:bg-(--kpc-bg) tw:text-lg " + tones[tone]}>{icon}</span></span>
      <strong className="tw:text-[34px] tw:leading-none tw:font-semibold tw:tracking-tight tw:text-(--kpc-ink) tw:tabular-nums">{value}{unit && <span className="tw:ml-1 tw:text-xs tw:font-normal tw:text-(--kpc-muted)">{unit}</span>}</strong>
      <span className="tw:flex tw:items-center tw:justify-between tw:gap-2 tw:text-[11px] tw:font-normal tw:text-(--kpc-secondary)"><span>{caption}</span>{onClick && <ArrowUpRightRegular aria-hidden="true" className="tw:shrink-0 tw:text-base tw:text-(--kpc-muted) tw:group-hover:text-(--kpc-brand)" />}</span>
    </>;
    return onClick ? <Button className={classes + " tw:hover:border-(--kpc-brand)"} onClick={onClick}>{content}</Button> : <div className={classes}>{content}</div>;
  }
  const className = "tw:m-0 tw:flex tw:min-w-0 tw:flex-col tw:gap-(--layout-inline-gap) tw:rounded-(--kpc-radius-card) tw:border tw:border-solid tw:p-(--layout-card-inset) tw:text-left " + (selected ? "tw:border-(--kpc-brand) tw:bg-(--kpc-brand-soft)" : "tw:border-(--kpc-line) tw:bg-(--kpc-card)");
  const text = <><span className="tw:text-[11px] tw:text-(--kpc-secondary)">{label}</span><strong className={"tw:text-[24px] tw:font-bold tw:tabular-nums " + tones[tone] + (icon ? " tw:leading-tight" : "")}>{value}{unit && <span className="tw:ml-(--layout-inline-gap) tw:text-[12px] tw:font-normal tw:text-(--kpc-muted)">{unit}</span>}</strong>{caption && <span title={icon ? caption : undefined} className={"tw:text-[11px] tw:text-(--kpc-muted)" + (icon ? " tw:truncate" : "")}>{caption}</span>}</>;
  const content = icon ? <div className="tw:flex tw:min-w-0 tw:items-start tw:gap-(--layout-control-gap)"><span aria-hidden="true" className={"tw:flex tw:size-8 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg tw:bg-(--kpc-bg) tw:text-lg " + tones[tone]}>{icon}</span><span className="tw:flex tw:min-w-0 tw:flex-col tw:gap-(--layout-inline-gap)">{text}</span></div> : text;
  return onClick ? <button type="button" className={className + " tw:cursor-pointer tw:hover:border-(--kpc-line-strong) tw:focus-visible:outline-2 tw:focus-visible:outline-(--kpc-brand)"} aria-pressed={Boolean(selected)} onClick={onClick}>{content}</button> : <div className={className}>{content}</div>;
}
