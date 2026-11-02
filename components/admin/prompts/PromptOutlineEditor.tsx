"use client";
import { useRef, useState } from "react";
import { Button, Input, Textarea } from "@fluentui/react-components";
import { ReOrderDotsVerticalRegular } from "@fluentui/react-icons";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import { WorkspaceCardSection } from "@/components/layout/WorkspaceCard";
import ModalFrame from "@/components/ui/ModalFrame";
import { blockEnd, DEFAULT_PROMPT_SOURCES, movePromptBlock, movePromptStep, outlineNumbers, PROMPT_SOURCE_LABELS, removePromptItem, resolvePromptItem } from "@/lib/admin/prompts/outline";
import type { PromptItem } from "@/types/admin-prompts";
interface Props { items: PromptItem[]; disabled: boolean; errors: Record<string, string>; onChange(items: PromptItem[]): void }
export default function PromptOutlineEditor({ items, disabled, errors, onChange }: Props): React.ReactElement {
  const dragged = useRef<string | null>(null), root = useRef<HTMLDivElement>(null);
  const [deletion, setDeletion] = useState<string | null>(null);
  const numbers = outlineNumbers(items);
  const patch = (id: string, value: Partial<PromptItem>) => onChange(items.map(item => item.id === id ? { ...item, ...value } : item));
  function add(level: 1 | 2) {
    const id = crypto.randomUUID();
    onChange([...items, { id, level, title: "", prompt: "", sources: level === 1 ? [...DEFAULT_PROMPT_SOURCES] : null }]);
    requestAnimationFrame(() => [...root.current?.querySelectorAll<HTMLInputElement>("[data-prompt-title]") ?? []].find(input => input.dataset.promptTitle === id)?.focus());
  }
  const cell = "tw:border-0 tw:border-b tw:border-solid tw:border-(--kpc-line-soft) tw:p-(--layout-table-cell-inset) tw:text-left tw:align-top";
  return <AdminCard title="2. 목차별 프롬프트 · 설정" bodyPadding="flush" actions={<span className="tw:text-[11px] tw:text-(--kpc-muted)">대목차는 소목차와 함께 이동합니다.</span>}>
    <div ref={root} role="region" aria-label="목차 편집 표" tabIndex={0} className="tw:overflow-x-auto">
      <table className="tw:w-full tw:min-w-[860px] tw:border-collapse tw:text-[12px]"><thead className="tw:bg-(--kpc-bg)"><tr>{["이동", "구분", "목차명", "프롬프트", "소스 우선순위", "삭제"].map(label => <th key={label} scope="col" className={cell}>{label}</th>)}</tr></thead>
        <tbody>{items.map((item, index) => {
          const effective = resolvePromptItem(items, index);
          return <tr key={item.id} className={item.level === 1 ? "tw:bg-(--kpc-bg)" : ""} onDragOver={event => { if (!disabled && dragged.current) event.preventDefault(); }}
            onDrop={event => { event.preventDefault(); if (!disabled && dragged.current) { const rect = event.currentTarget.getBoundingClientRect(); onChange(movePromptBlock(items, dragged.current, item.id, event.clientY >= rect.top + rect.height / 2)); } dragged.current = null; }}>
            <td className={cell}><div className="tw:flex tw:items-center">
              <Button size="small" appearance="subtle" icon={<ReOrderDotsVerticalRegular />} aria-label={"목차 " + (index + 1) + " 끌어서 이동"} draggable={!disabled} disabled={disabled} onDragStart={event => { dragged.current = item.id; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", item.id); }} onDragEnd={() => { dragged.current = null; }} />
              <div className="tw:flex tw:flex-col">{([-1, 1] as const).map(direction => <Button key={direction} size="small" appearance="subtle" aria-label={"목차 " + (index + 1) + (direction === -1 ? " 위로" : " 아래로")} disabled={disabled || movePromptStep(items, item.id, direction).every((row, i) => row.id === items[i].id)} onClick={() => onChange(movePromptStep(items, item.id, direction))}>{direction === -1 ? "↑" : "↓"}</Button>)}</div>
            </div></td>
            <td className={cell}><Button size="small" disabled={disabled || index === 0} aria-label={"목차 " + (index + 1) + " 구분 전환"} onClick={() => patch(item.id, { level: item.level === 1 ? 2 : 1, sources: item.level === 2 && !item.sources?.length ? [...DEFAULT_PROMPT_SOURCES] : item.sources })}>{item.level === 1 ? "대목차" : "소목차"}</Button><div className="tw:mt-(--layout-inline-gap) tw:text-center tw:text-(--kpc-muted)">{numbers[index]}</div></td>
            <td className={cell}><Input data-prompt-title={item.id} aria-label={"목차명 " + (index + 1)} aria-invalid={Boolean(errors["items." + index + ".title"])} disabled={disabled} maxLength={120} value={item.title} onChange={(_, data) => patch(item.id, { title: data.value })} />{errors["items." + index + ".title"] && <p className="tw:text-(--kpc-danger)">{errors["items." + index + ".title"]}</p>}</td>
            <td className={cell}><Textarea aria-label={"프롬프트 " + (index + 1)} className="tw:w-full tw:min-w-52" rows={3} disabled={disabled} maxLength={10000} value={item.prompt} placeholder={item.level === 2 ? "비워 두면 대목차 프롬프트를 상속합니다." : "목적 · 작성 방향 · 꼭 넣을 내용 · 참고 자료"} onChange={(_, data) => patch(item.id, { prompt: data.value })} />{effective.promptInherited && <p className="tw:mb-0 tw:text-[11px] tw:text-(--kpc-muted)">상속 · {effective.prompt || "대목차에 지정된 프롬프트 없음"}</p>}</td>
            <td className={cell}><div className="tw:flex tw:min-w-44 tw:flex-wrap tw:gap-(--layout-inline-gap)">{DEFAULT_PROMPT_SOURCES.map(source => {
              const rank = item.sources?.indexOf(source) ?? -1;
              return <Button key={source} size="small" appearance={rank >= 0 ? "primary" : "secondary"} aria-label={"목차 " + (index + 1) + " " + PROMPT_SOURCE_LABELS[source]} aria-pressed={rank >= 0} disabled={disabled}
                onClick={() => patch(item.id, { sources: rank >= 0 ? item.sources!.filter(value => value !== source) : [...item.sources ?? [], source] })}>{rank >= 0 ? rank + 1 + ". " : ""}{PROMPT_SOURCE_LABELS[source]}</Button>;
            })}</div>{item.level === 2 && <><Button size="small" appearance="subtle" disabled={disabled || !item.sources?.length} onClick={() => patch(item.id, { sources: null })}>상속으로</Button>{effective.sourcesInherited && <div className="tw:text-[11px] tw:text-(--kpc-muted)">상속 · {effective.sources.map(source => PROMPT_SOURCE_LABELS[source]).join(" → ") || "지정 없음"}</div>}</>}</td>
            <td className={cell}><Button size="small" disabled={disabled} aria-label={"목차 " + (index + 1) + " 삭제"} onClick={() => { if (blockEnd(items, index) > index + 1) setDeletion(item.id); else onChange(removePromptItem(items, item.id)); }}>삭제</Button></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    <WorkspaceCardSection><div className="tw:flex tw:gap-(--layout-control-gap)"><Button disabled={disabled || items.length >= 100} onClick={() => add(1)}>+ 대목차 추가</Button><Button disabled={disabled || !items.length || items.length >= 100} onClick={() => add(2)}>+ 소목차 추가</Button></div><p className="tw:text-[11px] tw:text-(--kpc-muted)">소스를 누른 순서대로 우선순위가 정해집니다. 다시 누르면 제외됩니다. 소목차를 비우면 상위 대목차를 따릅니다.</p></WorkspaceCardSection>
    {deletion && !disabled && <ModalFrame open title="대목차 삭제" contentKey="prompt-outline-delete" onClose={() => setDeletion(null)} footer={<><Button onClick={() => setDeletion(null)}>취소</Button><Button appearance="primary" onClick={() => { onChange(removePromptItem(items, deletion)); setDeletion(null); }}>목차 묶음 삭제</Button></>}><p>이 대목차와 하위 소목차를 함께 삭제합니다.</p></ModalFrame>}
  </AdminCard>;
}
