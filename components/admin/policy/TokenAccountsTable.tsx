"use client";
import { Avatar, Badge, ProgressBar } from "@fluentui/react-components";
import { DadamButton as Button, DadamInput as Input, DadamSelect as Select } from "@/components/ui/DadamControls";
import { useState } from "react";
import AdminTable, { type AdminColumn } from "@/components/admin/ui/AdminTable";
import type { AdminCommand, TokenAccountRow } from "@/types/admin";
interface TokenAccountsTableProps { rows: readonly TokenAccountRow[]; canManage: boolean; busy: boolean; onCommand(command: AdminCommand): Promise<void> }
interface LimitDraft { text: string; version: number; custom: boolean }
const limitPresets = [50000, 100000, 150000, 200000, 300000];
export default function TokenAccountsTable({ rows, canManage, busy, onCommand }: TokenAccountsTableProps): React.ReactElement {
  const [drafts, setDrafts] = useState<Record<string, LimitDraft>>({}), [error, setError] = useState("");
  function clearDraft(id: string) { setDrafts((old) => { const next = { ...old }; delete next[id]; return next; }); setError(""); }
  function send(command: AdminCommand) { void onCommand(command).catch(() => { /* 상위 패널에서 오류를 표시한다. */ }); }
  function save(row: TokenAccountRow) {
    const draft = drafts[row.id]; if (!draft) return;
    const limit = Number(draft.text);
    if (!/^\d+$/.test(draft.text) || !Number.isSafeInteger(limit) || limit < 1000 || limit > 1_000_000_000) { setError("개인 한도는 1000~10억 사이의 정수 토큰으로 입력해 주세요."); return; }
    setError(""); void onCommand({ type: "set-token-limit", target: { id: row.id, version: draft.version }, limitTokens: limit }).then(() => clearDraft(row.id)).catch(() => { /* 저장 실패 시 초안을 유지한다. */ });
  }
  const columns: AdminColumn<TokenAccountRow>[] = [
    { id: "name", label: "사용자", render: (r) => <div className="tw:flex tw:items-center tw:gap-(--layout-control-gap) tw:whitespace-nowrap"><Avatar name={r.name} size={32} color="colorful" aria-hidden="true" /><div><strong>{r.name}</strong><div className="tw:text-[11px] tw:text-(--kpc-muted)">{r.title}</div></div></div> }, { id: "dept", label: "부서", render: (r) => r.departmentName },
    { id: "usage", label: "이번 달 사용량 / 한도", render: (r) => <div className="tw:min-w-32"><div className="tw:mb-(--layout-inline-gap) tw:flex tw:justify-between tw:gap-(--layout-control-gap)"><span>{r.usedTokens.toLocaleString("ko-KR")} / {r.limitTokens.toLocaleString("ko-KR")}</span><strong>{Math.round(r.usedTokens / r.limitTokens * 100)}%</strong></div><ProgressBar aria-label={r.name + " 토큰 사용률"} value={Math.min(1, r.usedTokens / r.limitTokens)} color={r.status === "over" ? "error" : r.status === "warning" ? "warning" : "success"} /></div> },
    { id: "limit", label: "개인 한도 (Token)", render: (r) => {
      if (!canManage) return r.limitTokens.toLocaleString("ko-KR");
      const draft = drafts[r.id], options = [...new Set([...limitPresets, r.limitTokens, ...(draft && !draft.custom ? [Number(draft.text)] : [])])].sort((a, b) => a - b);
      return <div className="tw:flex tw:min-w-32 tw:max-w-44 tw:flex-col tw:gap-(--layout-inline-gap)">
        <Select size="small" aria-label={r.name + " 개인 한도"} value={draft?.custom ? "custom" : draft?.text ?? String(r.limitTokens)} disabled={busy} onChange={(_, d) => setDrafts({ ...drafts, [r.id]: { text: d.value === "custom" ? draft?.text ?? String(r.limitTokens) : d.value, version: draft?.version ?? r.version, custom: d.value === "custom" } })}>
          {options.map((limit) => <option key={limit} value={limit}>{limit.toLocaleString("ko-KR")}</option>)}<option value="custom">직접 입력</option>
        </Select>
        {draft?.custom && <Input size="small" aria-label={r.name + " 개인 한도 직접 입력"} inputMode="numeric" value={draft.text} disabled={busy} onChange={(_, d) => setDrafts({ ...drafts, [r.id]: { ...draft, text: d.value } })} />}
        {draft && draft.version !== r.version && <span role="status" className="tw:text-[11px] tw:text-(--kpc-warning)">다른 변경이 있습니다. 최신 값을 확인해 주세요.</span>}
      </div>;
    } },
    { id: "status", label: "상태", render: (r) => <Badge appearance="tint" color={r.status === "over" ? "danger" : r.status === "warning" ? "warning" : r.status === "normal" ? "success" : "subtle"}>{{ normal: "정상", warning: "경고", over: "초과", paused: "정지" }[r.status]}</Badge> },
  ];
  if (canManage) columns.push({ id: "manage", label: "관리", render: (r) => <div className="tw:flex tw:flex-wrap tw:gap-(--layout-inline-gap)">
    <Button size="small" aria-label={r.name + " 한도 저장"} disabled={busy || !drafts[r.id]} onClick={() => save(r)}>저장</Button>
    {drafts[r.id] && <Button size="small" aria-label={r.name + " 한도 최신 값"} disabled={busy} onClick={() => clearDraft(r.id)}>최신 값</Button>}
    <Button size="small" aria-label={r.name + " 한도 50K 추가"} disabled={busy || Boolean(drafts[r.id]) || r.limitTokens > 999950000} onClick={() => send({ type: "set-token-limit", target: { id: r.id, version: r.version }, limitTokens: r.limitTokens + 50000 })}>+50K</Button>
    <Button size="small" aria-label={r.name + (r.paused ? " 토큰 사용 재개" : " 토큰 사용 정지")} disabled={busy || Boolean(drafts[r.id])} onClick={() => send({ type: "set-token-paused", target: { id: r.id, version: r.version }, paused: !r.paused })}>{r.paused ? "재개" : "정지"}</Button>
  </div> });
  return <>{error && <p role="alert">{error}</p>}<AdminTable label="개인별 토큰 사용량" rows={rows} columns={columns} emptyMessage="조건에 맞는 사용자가 없습니다." /></>;
}
