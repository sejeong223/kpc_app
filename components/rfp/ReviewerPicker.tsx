"use client";

import { Avatar, Popover, PopoverSurface, PopoverTrigger } from "@fluentui/react-components";
import { Add12Regular, Dismiss12Regular, Search16Regular } from "@fluentui/react-icons";
import { useMemo, useState } from "react";

import Button from "@/components/common/Button";
import { DadamCheckbox, DadamInput } from "@/components/ui/DadamControls";
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

  return <div className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-1.5">
    {selected.length > 0 && <ul aria-label="선택한 검토자" className="tw:m-0 tw:flex tw:list-none tw:flex-wrap tw:gap-1.5 tw:p-0">
      {selected.map((person) => <li key={person.id} className="tw:inline-flex tw:h-[30px] tw:items-center tw:gap-1.5 tw:rounded-[15px] tw:border tw:border-solid tw:border-(--kpc-line) tw:bg-(--kpc-card) tw:py-0 tw:pr-1 tw:pl-1.5 tw:text-[11.5px]">
        <Avatar size={24} name={person.name} aria-hidden="true" />
        <b className="tw:font-extrabold tw:text-(--kpc-ink)">{person.name}</b>
        <Button className="ghost tw:size-5 tw:rounded-full tw:p-0 tw:text-(--kpc-muted)" aria-label={`${person.name} 검토자에서 빼기`} disabled={disabled} onClick={() => onRemove(person.id)}>
          <Dismiss12Regular aria-hidden="true" />
        </Button>
      </li>)}
    </ul>}
    <Popover open={open} trapFocus positioning={{ position: "below", align: "start", offset: 6 }}
      onOpenChange={(_, data) => { setOpen(data.open); if (!data.open) setQuery(""); }}>
      <PopoverTrigger disableButtonEnhancement>
        <Button className="tw:h-(--dadam-control-height-compact) tw:text-[12px]" disabled={disabled}><Add12Regular aria-hidden="true" />검토자 추가</Button>
      </PopoverTrigger>
      <PopoverSurface aria-label="검토자 선택" className="tw:flex tw:w-[320px] tw:max-w-[calc(100vw-32px)] tw:flex-col tw:rounded-[12px] tw:p-1.5">
        <p className="tw:m-0 tw:px-[9px] tw:pt-2 tw:pb-1 tw:text-[10px] tw:font-black tw:text-(--kpc-muted)">검토 담당자 지정 · 여러 명 가능</p>
        <DadamInput autoFocus size="small" className="tw:mx-1 tw:mb-1.5" contentBefore={<Search16Regular />} placeholder="이름 · 부서 검색" aria-label="검토자 검색" value={query} onChange={(_, data) => setQuery(data.value)} />
        <div className="tw:flex tw:max-h-[300px] tw:flex-col tw:overflow-y-auto">
          {rows.length ? rows.map((c) => {
            const checked = selectedIds.has(c.id);
            const locked = !checked && full;
            return <label key={c.id} className={"tw:flex tw:items-center tw:gap-2 tw:rounded-lg tw:px-[9px] tw:py-2 "
              + (locked ? "tw:cursor-not-allowed tw:opacity-50 " : "tw:cursor-pointer ")
              + (checked ? "tw:bg-(--kpc-brand-soft)" : "tw:hover:bg-[#f4f5f7]")}>
              <DadamCheckbox checked={checked} disabled={locked} aria-label={`${c.name} 검토자 선택`} onChange={() => onToggle({ id: c.id, name: c.name })} />
              <Avatar size={24} name={c.name} aria-hidden="true" />
              <span className="tw:min-w-0 tw:flex-1 tw:text-[12px]">
                <span className="tw:block tw:truncate"><b className="tw:font-extrabold tw:text-(--kpc-ink)">{c.name}</b> <span className="tw:text-[11px] tw:text-(--kpc-muted)">{c.title}</span></span>
                <span className="tw:block tw:truncate tw:text-[11px] tw:text-(--kpc-muted)">{c.departmentName}</span>
              </span>
            </label>;
          }) : <p className="tw:m-0 tw:py-2 tw:text-center tw:text-[12px] tw:text-(--kpc-muted)">검색 결과가 없습니다</p>}
        </div>
      </PopoverSurface>
    </Popover>
  </div>;
}
