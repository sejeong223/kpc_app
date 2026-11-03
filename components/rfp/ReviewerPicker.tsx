"use client";

import { Popover, PopoverSurface, PopoverTrigger } from "@fluentui/react-components";
import { Add12Regular, Dismiss12Regular, Search16Regular } from "@fluentui/react-icons";
import { useEffect, useMemo, useRef, useState } from "react";

import Button from "@/components/common/Button";
import { DadamInput } from "@/components/ui/DadamControls";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { PersonCheckList } from "@/components/ui/PersonCheckList";
import { RFP_REVIEWER_MAX } from "@/config/rfp-register";
import { filterReviewerCandidates, getReviewerCandidates, sortReviewerCandidates, type ReviewerCandidate } from "@/lib/rfp/reviewers";
import type { RfpPerson } from "@/lib/rfp/schemas";

interface ReviewerPickerProps {
  selected: RfpPerson[];
  disabled: boolean;
  onToggle(person: RfpPerson): void;
  onRemove(id: string): void;
  candidates?: ReviewerCandidate[];
  /** 같은 부서 우선 정렬 기준. 등록하는 사람의 부서 */
  preferredDepartment?: string | null;
}

// 레퍼런스 popAt() 값
const POP_GAP = 6;
const VIEWPORT_MARGIN = 8;
const POP_MIN_HEIGHT = 160;
const POP_BOTTOM_MARGIN = 16;

export default function ReviewerPicker({ selected, disabled, onToggle, onRemove, candidates, preferredDepartment = null }: ReviewerPickerProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // 정렬 기준이 되는 지정자는 열 때 고정한다. 체크할 때 줄이 움직이면 잘못 누를 수 있다.
  const [pinnedIds, setPinnedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [placement, setPlacement] = useState<"below" | "above">("below");
  const [maxHeight, setMaxHeight] = useState<number | null>(null);
  const pool = useMemo(() => candidates ?? getReviewerCandidates(), [candidates]);
  const byId = useMemo(() => new Map(pool.map((c) => [c.id, c])), [pool]);
  const rows = useMemo(
    () => sortReviewerCandidates(filterReviewerCandidates(pool, query), { pinnedIds, department: preferredDepartment }),
    [pool, query, pinnedIds, preferredDepartment],
  );
  const selectedIds = new Set(selected.map((p) => p.id));
  const searchInput = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  // 열린 다음 프레임에 원래 높이를 재서 방향·최대 높이를 정하고(레퍼런스 popAt), 스크롤 없이 검색칸에 포커스한다.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const trigger = triggerRef.current, surface = surfaceRef.current;
      if (trigger && surface) {
        const r = trigger.getBoundingClientRect();
        const h = surface.scrollHeight;
        const vh = window.innerHeight;
        const overflowsBelow = r.bottom + POP_GAP + h > vh - VIEWPORT_MARGIN;
        if (overflowsBelow && r.top - POP_GAP - h > VIEWPORT_MARGIN) setPlacement("above");
        else if (overflowsBelow) setMaxHeight(Math.max(POP_MIN_HEIGHT, vh - r.bottom - POP_BOTTOM_MARGIN));
      }
      searchInput.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return <div className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:gap-1.5">
    {selected.length > 0 && <ul aria-label="선택한 검토자" className="tw:m-0 tw:flex tw:list-none tw:flex-wrap tw:gap-1.5 tw:p-0">
      {selected.map((person) => <li key={person.id} className="tw:inline-flex tw:h-[30px] tw:items-center tw:gap-1.5 tw:rounded-[15px] tw:border tw:border-solid tw:border-(--kpc-line) tw:bg-(--kpc-card) tw:py-0 tw:pr-1 tw:pl-1.5 tw:text-[11.5px]">
        <PersonAvatar name={person.name} photoUrl={byId.get(person.id)?.photoUrl ?? null} colorId={person.id} size={24} />
        <b className="tw:font-extrabold tw:text-(--kpc-ink)">{person.name}</b>
        <Button className="ghost tw:size-5 tw:rounded-full tw:p-0 tw:text-(--kpc-muted)" aria-label={`${person.name} 검토자에서 빼기`} disabled={disabled} onClick={() => onRemove(person.id)}>
          <Dismiss12Regular aria-hidden="true" />
        </Button>
      </li>)}
    </ul>}
    {/* 열린 직후엔 위치 계산 전이라 기본 자동 포커스가 페이지를 위로 스크롤한다. 끄고 preventScroll로 직접 포커스한다.
        Fluent flip은 bestFit이라 레퍼런스 규칙과 달라 방향을 직접 정하고 flip을 끈다(pinned). */}
    <Popover open={open} trapFocus unstable_disableAutoFocus positioning={{ position: placement, align: "start", offset: POP_GAP, pinned: true }}
      onOpenChange={(_, data) => {
        setOpen(data.open);
        if (data.open) { setPlacement("below"); setMaxHeight(null); setPinnedIds(new Set(selected.map((p) => p.id))); }
        else setQuery("");
      }}>
      <PopoverTrigger disableButtonEnhancement>
        <Button ref={triggerRef} className="tw:h-(--dadam-control-height-compact) tw:text-[12px]" disabled={disabled}><Add12Regular aria-hidden="true" />검토자 추가</Button>
      </PopoverTrigger>
      {/* 레퍼런스 .pop처럼 블록 + 팝오버 전체 스크롤(기본 70vh). 줄어들어도 안쪽 목록(300px)은 같이 줄지 않는다. */}
      <PopoverSurface ref={surfaceRef} aria-label="검토자 선택" style={{ maxHeight: maxHeight ?? "70vh", overflowY: "auto" }}
        className="tw:block tw:w-[320px] tw:max-w-[calc(100vw-32px)] tw:rounded-[12px] tw:p-1.5">
        <p className="tw:m-0 tw:px-[9px] tw:pt-2 tw:pb-1 tw:text-[10px] tw:font-black tw:text-(--kpc-muted)">검토 담당자 지정 · 여러 명 가능</p>
        <div className="tw:mx-1 tw:mb-1.5 tw:flex">
          <DadamInput ref={searchInput} size="small" className="tw:min-w-0 tw:flex-1" contentBefore={<Search16Regular />} placeholder="이름 · 부서 검색" aria-label="검토자 검색" value={query} onChange={(_, data) => setQuery(data.value)} />
        </div>
        <div className="tw:max-h-[300px] tw:overflow-y-auto">
          <PersonCheckList people={rows} selectedIds={selectedIds} max={RFP_REVIEWER_MAX}
            itemLabel={(c) => `${c.name} 검토자 선택`} onToggle={(c) => onToggle({ id: c.id, name: c.name })} />
        </div>
      </PopoverSurface>
    </Popover>
  </div>;
}
