"use client";
import { Button, Checkbox } from "@fluentui/react-components";
import { Fragment, useId } from "react";

export interface AdminColumn<Row extends { id: string }> { id: string; label: string; render(row: Row): React.ReactNode; width?: string; align?: "start" | "end"; sortable?: boolean }
interface AdminTableProps<Row extends { id: string }> {
  label: string; rows: readonly Row[]; columns: readonly AdminColumn<Row>[]; selectedIds?: readonly string[]; onSelectionChange?: (ids: string[]) => void;
  expandedId?: string | null; onExpand?: (id: string | null) => void; renderExpanded?: (row: Row) => React.ReactNode; emptyMessage: string;
  sort?: { columnId: string; direction: "asc" | "desc" }; onSort?: (columnId: string) => void;
  isSelectable?: (row: Row) => boolean;
}
export default function AdminTable<Row extends { id: string }>({ label, rows, columns, selectedIds = [], onSelectionChange, expandedId, onExpand, renderExpanded, emptyMessage, sort, onSort, isSelectable }: AdminTableProps<Row>): React.ReactElement {
  const id = useId(), selectable = rows.filter((r) => !isSelectable || isSelectable(r)), selected = selectable.filter((r) => selectedIds.includes(r.id));
  const cell = "tw:border-0 tw:border-b tw:border-solid tw:border-(--kpc-line-soft) tw:px-3 tw:py-3 tw:text-left tw:align-middle";
  return <div className="tw:max-w-full tw:overflow-x-auto" role="region" aria-label={label} tabIndex={0}>
    <table className="tw:w-full tw:border-collapse tw:text-[12px]" aria-label={label}>
      <thead className="tw:bg-(--kpc-bg) tw:text-[11px] tw:text-(--kpc-secondary)"><tr>
        {onSelectionChange && <th className={cell} scope="col"><Checkbox aria-label="현재 페이지 전체 선택" disabled={!selectable.length} checked={selected.length === selectable.length && selectable.length > 0 ? true : selected.length ? "mixed" : false} onChange={(_, data) => onSelectionChange(data.checked === true ? selectable.map((r) => r.id) : [])} /></th>}
        {onExpand && <th className={cell} scope="col">상세</th>}
        {columns.map((column) => <th className={cell} scope="col" key={column.id} style={{ width: column.width, textAlign: column.align === "end" ? "right" : "left" }} aria-sort={sort?.columnId === column.id ? sort.direction === "asc" ? "ascending" : "descending" : column.sortable ? "none" : undefined}>
          {column.sortable && onSort ? <Button appearance="transparent" size="small" onClick={() => onSort(column.id)}>{column.label}{sort?.columnId === column.id ? sort.direction === "asc" ? " ↑" : " ↓" : " ↕"}</Button> : column.label}
        </th>)}
      </tr></thead>
      <tbody>{rows.length === 0 ? <tr><td className={cell} colSpan={columns.length + Number(Boolean(onSelectionChange)) + Number(Boolean(onExpand))}><p className="tw:my-6 tw:text-center tw:text-(--kpc-muted)">{emptyMessage}</p></td></tr> : rows.map((row, index) => <Fragment key={row.id}><tr className="tw:hover:bg-(--kpc-bg)">
        {onSelectionChange && <td className={cell}><Checkbox aria-label={label + " " + (index + 1) + "행 선택"} disabled={isSelectable && !isSelectable(row)} checked={selectedIds.includes(row.id)} onChange={(_, data) => onSelectionChange(data.checked === true ? [...new Set([...selected.map((r) => r.id), row.id])] : selected.filter((r) => r.id !== row.id).map((r) => r.id))} /></td>}
        {onExpand && <td className={cell}><Button size="small" appearance="subtle" aria-expanded={expandedId === row.id} aria-controls={id + "-" + index} aria-label={(index + 1) + "행 상세 " + (expandedId === row.id ? "닫기" : "보기")} onClick={() => onExpand(expandedId === row.id ? null : row.id)}>{expandedId === row.id ? "−" : "+"}</Button></td>}
        {columns.map((column) => <td key={column.id} className={cell} style={{ textAlign: column.align === "end" ? "right" : "left" }}>{column.render(row)}</td>)}
      </tr>{expandedId === row.id && renderExpanded && <tr><td id={id + "-" + index} className={cell + " tw:bg-(--kpc-bg)"} colSpan={columns.length + Number(Boolean(onSelectionChange)) + Number(Boolean(onExpand))}>{renderExpanded(row)}</td></tr>}</Fragment>)}</tbody>
    </table>
  </div>;
}
