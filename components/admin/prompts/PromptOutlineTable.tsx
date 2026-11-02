import AdminTable from "@/components/admin/ui/AdminTable";
import { outlineNumbers, PROMPT_SOURCE_LABELS, resolvePromptItem } from "@/lib/admin/prompts/outline";
import type { PromptItem } from "@/types/admin-prompts";
export default function PromptOutlineTable({ items }: { items: PromptItem[] }): React.ReactElement {
  const numbers = outlineNumbers(items), rows = items.map((item, index) => ({ ...item, number: numbers[index], effective: resolvePromptItem(items, index) }));
  return <AdminTable label="목차별 프롬프트" rows={rows} emptyMessage="등록된 목차가 없습니다." columns={[
    { id: "name", label: "목차명", width: "24%", render: row => <div className={row.level === 2 ? "tw:pl-(--layout-card-inset)" : ""}><span className="tw:mr-(--layout-control-gap) tw:text-(--kpc-muted)">{row.number}</span><strong>{row.title}</strong></div> },
    { id: "prompt", label: "프롬프트", render: row => <div className="tw:whitespace-pre-wrap tw:break-words">{row.effective.promptInherited && <p className="tw:mt-0 tw:text-[11px] tw:text-(--kpc-muted)">↳ {row.effective.parentTitle} 프롬프트 상속</p>}{row.effective.prompt || <span className="tw:text-(--kpc-muted)">별도 프롬프트 없음</span>}</div> },
    { id: "sources", label: "소스 우선순위", width: "25%", render: row => <div><div className="tw:flex tw:flex-wrap tw:gap-(--layout-inline-gap)">{row.effective.sources.map((source, i) => <span key={source} className="tw:rounded-md tw:bg-(--kpc-bg) tw:px-(--layout-control-gap) tw:py-(--layout-inline-gap)">{i + 1}. {PROMPT_SOURCE_LABELS[source]}</span>)}</div>{!row.effective.sources.length && "지정 없음"}{row.effective.sourcesInherited && <p className="tw:mb-0 tw:text-[11px] tw:text-(--kpc-muted)">↳ 대목차 상속</p>}</div> },
  ]} />;
}
