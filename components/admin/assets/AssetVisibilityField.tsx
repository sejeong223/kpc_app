"use client";

import { useId } from "react";
import { DadamButton as Button, DadamCheckbox as Checkbox } from "@/components/ui/DadamControls";
import type { AssetAudienceOptions, AssetVisibility, AssetAudienceTarget } from "@/types/admin-assets";

interface AssetVisibilityFieldProps {
  value: AssetVisibility;
  candidates: AssetAudienceOptions;
  disabled: boolean;
  onChange(value: AssetVisibility): void;
}

export default function AssetVisibilityField({ value, candidates, disabled, onChange }: AssetVisibilityFieldProps): React.ReactElement {
  const id = useId();
  const groups = [
    { type: "department", label: "부서", items: candidates.departments },
    { type: "group", label: "그룹", items: candidates.groups },
    { type: "user", label: "사용자", items: candidates.users },
  ] as const;
  const toggle = (target: AssetAudienceTarget, checked: boolean) => onChange({
    all: false,
    targets: checked ? [...value.targets, target] : value.targets.filter(item => item.type !== target.type || item.id !== target.id),
  });
  return <fieldset disabled={disabled} className="tw:m-0 tw:min-w-0 tw:rounded-xl tw:border tw:border-solid tw:border-(--kpc-line) tw:p-(--layout-card-inset)">
    <legend className="tw:px-(--layout-inline-gap) tw:font-semibold">공개 범위</legend>
    <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-(--layout-control-gap) tw:rounded-lg tw:bg-(--dadam-control-muted) tw:p-(--layout-inline-gap)">
      <Checkbox label="전사 공개" checked={value.all} disabled={disabled} onChange={(_, data) => onChange({ all: data.checked === true, targets: [] })} />
      <span className="tw:px-(--layout-control-gap) tw:text-xs tw:text-(--kpc-secondary)">{value.all ? "모든 사용자에게 공개" : value.targets.length ? `공개 대상 ${value.targets.length}개 선택` : "비공개"}</span>
    </div>
    <p className="tw:my-(--layout-control-gap) tw:text-xs tw:text-(--kpc-muted)">공개 대상은 조회·적용할 수 있습니다. 편집 권한은 소유 부서에 유지됩니다.</p>
    {!value.all && <>
      {value.targets.length > 0 && <div aria-label="선택한 공개 대상" className="tw:mb-(--layout-control-gap) tw:flex tw:flex-wrap tw:gap-(--layout-inline-gap)">{value.targets.map(target => {
        const group = groups.find(group => group.type === target.type);
        const name = group?.items.find(item => item.id === target.id)?.name ?? "기존 대상";
        return <Button key={target.type + target.id} size="small" disabled={disabled} aria-label={name + " 공개 대상 제거"} onClick={() => toggle(target, false)}>{group?.label} · {name} ×</Button>;
      })}</div>}
      <div className="tw:grid tw:gap-(--layout-control-gap) tw:lg:grid-cols-3">{groups.map(group => <section key={group.type} aria-labelledby={id + group.type} className="tw:min-w-0 tw:overflow-hidden tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line)">
        <div className="tw:flex tw:items-center tw:justify-between tw:gap-(--layout-control-gap) tw:border-0 tw:border-b tw:border-solid tw:border-(--kpc-line-soft) tw:bg-(--dadam-control-muted) tw:px-(--layout-card-inset) tw:py-(--layout-control-gap)">
          <h3 id={id + group.type} className="tw:m-0 tw:text-xs tw:font-semibold">{group.label}</h3>
          <span className="tw:text-xs tw:text-(--dadam-accent-ink)">{value.targets.filter(target => target.type === group.type).length}개 선택</span>
        </div>
        <div className="tw:grid tw:max-h-48 tw:grid-cols-2 tw:gap-(--layout-inline-gap) tw:overflow-y-auto tw:p-(--layout-control-gap) tw:[scrollbar-gutter:stable]">{group.items.length ? group.items.map(item => <Checkbox key={item.id} variant="tile"
          label={item.name} disabled={disabled} checked={value.targets.some(target => target.type === group.type && target.id === item.id)}
          onChange={(_, data) => toggle({ type: group.type, id: item.id }, data.checked === true)} />) : <p className="tw:col-span-2 tw:m-0 tw:p-(--layout-control-gap) tw:text-xs tw:text-(--kpc-muted)">선택 가능한 대상 없음</p>}</div>
      </section>)}</div>
      {!value.targets.length && <p className="tw:mb-0 tw:mt-(--layout-control-gap) tw:text-xs tw:text-(--kpc-muted)">비공개 · 소유 부서 관리자와 슈퍼 관리자만 접근합니다.</p>}
    </>}
  </fieldset>;
}
