"use client";
import { useState } from "react";
import {
  DadamInput,
  DadamCheckbox,
  DadamButton,
} from "@/components/ui/DadamControls";
import type { WorkspaceMember } from "@/types/workspace-production";
export interface MemberPickerProps {
  members: WorkspaceMember[];
  selected: string[];
  minimum: number;
  label: string;
  disabled?: boolean;
  onChange(ids: string[]): void;
}
export default function MemberPicker({
  members,
  selected,
  minimum,
  label,
  disabled,
  onChange,
}: MemberPickerProps) {
  const [search, setSearch] = useState("");
  return (
    <fieldset
      disabled={disabled}
      className="tw:min-w-0 tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line) tw:p-3"
    >
      <legend>
        {label}
        {minimum > 0 ? " (최소 " + minimum + "명)" : ""}
      </legend>
      <div className="tw:mb-2 tw:flex tw:flex-wrap tw:gap-1">
        {selected.map((id) => (
          <DadamButton
            key={id}
            size="small"
            disabled={disabled || selected.length <= minimum}
            aria-label={
              (members.find((m) => m.id === id)?.name ?? "참여자") +
              " 선택 해제"
            }
            onClick={() => onChange(selected.filter((v) => v !== id))}
          >
            {members.find((m) => m.id === id)?.name ?? "참여자"} ×
          </DadamButton>
        ))}
      </div>
      <DadamInput
        aria-label={label + " 이름·부서 검색"}
        value={search}
        onChange={(_, d) => setSearch(d.value)}
        placeholder="이름 또는 부서"
      />
      <div className="tw:mt-2 tw:max-h-48 tw:overflow-auto">
        {members
          .filter((m) => (m.name + " " + m.departmentName).includes(search))
          .map((m) => (
            <DadamCheckbox
              key={m.id}
              label={
                m.name + (m.departmentName ? " · " + m.departmentName : "")
              }
              checked={selected.includes(m.id)}
              disabled={
                disabled ||
                (selected.includes(m.id) && selected.length <= minimum)
              }
              onChange={(_, d) =>
                onChange(
                  d.checked
                    ? [...selected, m.id]
                    : selected.filter((id) => id !== m.id),
                )
              }
            />
          ))}
      </div>
    </fieldset>
  );
}
