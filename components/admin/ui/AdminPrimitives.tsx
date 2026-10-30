"use client";

interface AdminPageProps { title: string; description?: string; dataNotice?:string|null; actions?: React.ReactNode; children: React.ReactNode }
interface AdminCardProps { title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }
interface AdminMetricProps { label: string; value: string; caption?: string; selected?: boolean; onClick?: () => void; tone?: "neutral" | "brand" | "success" | "warning" | "danger" }
export function AdminPage({ title, description, dataNotice="예시 데이터 · 기준일 2026.10.20", actions, children }: AdminPageProps): React.ReactElement {
  return <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-4 tw:text-(--kpc-ink) tw:text-[12px] tw:leading-relaxed">
    <header className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-3">
      <div><h1 className="tw:m-0 tw:text-[18px] tw:font-bold">{title}</h1>{description && <p className="tw:mt-1 tw:mb-0 tw:text-(--kpc-secondary)">{description}</p>}
        {dataNotice&&<p className="tw:mt-2 tw:mb-0 tw:text-[11px] tw:text-(--kpc-muted)">{dataNotice}</p>}</div>
      {actions && <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">{actions}</div>}
    </header>{children}
  </div>;
}
export function AdminCard({ title, actions, children, className = "" }: AdminCardProps): React.ReactElement {
  return <section aria-label={title} className={"tw:min-w-0 tw:rounded-(--kpc-radius-card) tw:border tw:border-solid tw:border-(--kpc-line) tw:bg-(--kpc-card) tw:p-4 " + className}>
    {(title || actions) && <header className="tw:mb-3 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2">{title && <h2 className="tw:m-0 tw:text-[13px] tw:font-bold">{title}</h2>}{actions}</header>}{children}
  </section>;
}
const tones = { neutral: "tw:text-(--kpc-ink)", brand: "tw:text-(--kpc-brand)", success: "tw:text-(--kpc-success)", warning: "tw:text-(--kpc-warning)", danger: "tw:text-(--kpc-danger)" };
export function AdminMetric({ label, value, caption, selected, onClick, tone = "neutral" }: AdminMetricProps): React.ReactElement {
  const className = "tw:m-0 tw:flex tw:min-w-0 tw:flex-col tw:gap-1 tw:rounded-(--kpc-radius-card) tw:border tw:border-solid tw:p-4 tw:text-left " + (selected ? "tw:border-(--kpc-brand) tw:bg-(--kpc-brand-soft)" : "tw:border-(--kpc-line) tw:bg-(--kpc-card)");
  const content = <><span className="tw:text-[11px] tw:text-(--kpc-secondary)">{label}</span><strong className={"tw:text-[24px] tw:font-bold tw:tabular-nums " + tones[tone]}>{value}</strong>{caption && <span className="tw:text-[11px] tw:text-(--kpc-muted)">{caption}</span>}</>;
  return onClick ? <button type="button" className={className} aria-pressed={Boolean(selected)} onClick={onClick}>{content}</button> : <div className={className}>{content}</div>;
}
