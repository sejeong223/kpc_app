"use client";

import { Avatar, Button, Checkbox, Input, Popover, PopoverSurface, PopoverTrigger } from "@fluentui/react-components";
import { Add16Regular, Dismiss16Regular, Search16Regular } from "@fluentui/react-icons";
import { useMemo, useState } from "react";

import { RFP_REVIEWER_MAX } from "@/config/rfp-register";
import { filterReviewerCandidates, getReviewerCandidates, type ReviewerCandidate } from "@/lib/rfp/reviewers";
import type { RfpPerson } from "@/lib/rfp/schemas";

interface ReviewerPickerProps {
  selected: RfpPerson[];
  disabled: boolean;
  onToggle(person: RfpPerson): void;
  onRemove(id: string): void;
  candidates?: ReviewerCandidate[];
}

export default function ReviewerPicker({ selected, disabled, onToggle, onRemove, candidates }: ReviewerPickerProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pool = useMemo(() => candidates ?? getReviewerCandidates(), [candidates]);
  const rows = useMemo(() => filterReviewerCandidates(pool, query), [pool, query]);
  const selectedIds = new Set(selected.map((p) => p.id));
  const full = selected.length >= RFP_REVIEWER_MAX;

  return <div className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-(--layout-control-gap)">
    {selected.length > 0 && <ul aria-label="선택한 검토자" className="tw:m-0 tw:flex tw:list-none tw:flex-wrap tw:gap-(--layout-inline-gap) tw:p-0">
      {selected.map((person) => <li key={person.id} className="tw:flex tw:items-center tw:gap-(--layout-inline-gap) tw:rounded-full tw:border tw:border-solid tw:border-(--kpc-line) tw:bg-(--kpc-card) tw:py-0.5 tw:pr-0.5 tw:pl-1">
        <Avatar size={20} name={person.name} aria-hidden="true" />
        <span className="tw:text-[12px] tw:font-semibold">{person.name}</span>
        <Button appearance="subtle" size="small" icon={<Dismiss16Regular />} aria-label={`${person.name} 검토자에서 빼기`} disabled={disabled} onClick={() => onRemove(person.id)} />
      </li>)}
    </ul>}
    <Popover open={open} trapFocus positioning={{ position: "below", align: "start", offset: 6 }}
      onOpenChange={(_, data) => { setOpen(data.open); if (!data.open) setQuery(""); }}>
      <PopoverTrigger disableButtonEnhancement>
        <Button size="small" icon={<Add16Regular />} disabled={disabled}>검토자 추가</Button>
      </PopoverTrigger>
      <PopoverSurface aria-label="검토자 선택" className="tw:flex tw:w-[300px] tw:max-w-[calc(100vw-32px)] tw:flex-col tw:gap-(--layout-control-gap) tw:p-(--layout-popover-compact-inset)">
        <p className="tw:m-0 tw:text-[11px] tw:font-semibold tw:text-(--kpc-muted)">검토 담당자 지정 · 여러 명 가능</p>
        <Input autoFocus size="small" contentBefore={<Search16Regular />} placeholder="이름 · 부서 검색" aria-label="검토자 검색" value={query} onChange={(_, data) => setQuery(data.value)} />
        <div className="tw:flex tw:max-h-[300px] tw:flex-col tw:overflow-y-auto">
          {rows.length ? rows.map((c) => {
            const checked = selectedIds.has(c.id);
            return <Checkbox key={c.id} checked={checked} disabled={!checked && full} label={`${c.name} ${c.title} · ${c.departmentName}`}
              onChange={() => onToggle({ id: c.id, name: c.name })} />;
          }) : <p className="tw:m-0 tw:py-(--layout-control-gap) tw:text-center tw:text-[12px] tw:text-(--kpc-muted)">검색 결과가 없습니다</p>}
        </div>
      </PopoverSurface>
    </Popover>
  </div>;
}
