"use client";

import { DadamCheckbox } from "@/components/ui/DadamControls";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import type { AdminRole } from "@/lib/admin/schemas";

export interface PersonListItem {
  id: string;
  name: string;
  title?: string;
  departmentName?: string;
  role?: AdminRole | null;
  photoUrl?: string | null;
}

interface PersonCheckListProps<T extends PersonListItem> {
  people: readonly T[];
  selectedIds: ReadonlySet<string>;
  onToggle(person: T): void;
  /** 선택 최대 인원. 도달하면 미선택 행 비활성 */
  max?: number;
  disabled?: boolean;
  /** 체크박스 접근성 이름. 기본 `${name} 선택` */
  itemLabel?(person: T): string;
  emptyText?: string;
  className?: string;
}

// 레퍼런스 .badge.b-plain 회색 배지. 화면에는 짧게, 스크린 리더에는 전체 이름을 읽힌다.
const ROLE_BADGES: Partial<Record<AdminRole, { short: string; full: string }>> = {
  super_admin: { short: "SA", full: "슈퍼 관리자" },
  department_admin: { short: "Admin", full: "관리자" },
};

// 줄 순서는 people 그대로 그린다. 정렬은 호출부 책임(체크할 때 줄이 움직이지 않게).
export function PersonCheckList<T extends PersonListItem>({
  people, selectedIds, onToggle, max, disabled = false, itemLabel, emptyText = "검색 결과가 없습니다", className = "",
}: PersonCheckListProps<T>): React.ReactElement {
  if (!people.length) return <p className="tw:m-0 tw:py-2 tw:text-center tw:text-[12px] tw:text-(--kpc-muted)">{emptyText}</p>;
  const full = max !== undefined && selectedIds.size >= max;
  return <div className={"tw:flex tw:flex-col " + className}>
    {people.map((p) => {
      const checked = selectedIds.has(p.id);
      const locked = disabled || (!checked && full);
      const badge = p.role ? ROLE_BADGES[p.role] : undefined;
      return <label key={p.id} className={"tw:flex tw:items-center tw:gap-2 tw:rounded-lg tw:px-[9px] tw:py-2 "
        + (locked ? "tw:cursor-not-allowed tw:opacity-50 " : "tw:cursor-pointer ")
        + (checked ? "tw:bg-(--kpc-brand-soft)" : "tw:hover:bg-[#f4f5f7]")}>
        <DadamCheckbox checked={checked} disabled={locked} aria-label={itemLabel ? itemLabel(p) : `${p.name} 선택`} onChange={() => onToggle(p)} />
        <PersonAvatar name={p.name} photoUrl={p.photoUrl} colorId={p.id} size={20} />
        <span className="tw:min-w-0 tw:flex-1 tw:text-[12px]">
          <span className="tw:block tw:truncate"><b className="tw:font-extrabold tw:text-(--kpc-ink)">{p.name}</b>{p.title && <> <span className="tw:text-[11px] tw:text-(--kpc-muted)">{p.title}</span></>}</span>
          {p.departmentName && <span className="tw:block tw:truncate tw:text-[11px] tw:text-(--kpc-muted)">{p.departmentName}</span>}
        </span>
        {badge && <span title={badge.full} className="tw:inline-flex tw:h-[18px] tw:flex-none tw:items-center tw:rounded-[6px] tw:border tw:border-solid tw:border-[#e8e9ec] tw:bg-[#f4f5f7] tw:px-[7px] tw:text-[10px] tw:font-extrabold tw:whitespace-nowrap tw:text-[#55585f]">
          <span aria-hidden="true">{badge.short}</span><span className="tw:sr-only">{badge.full}</span>
        </span>}
      </label>;
    })}
  </div>;
}
