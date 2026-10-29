"use client";
import { Badge, Button, Input, ProgressBar } from "@fluentui/react-components";
import { useState } from "react";
import AdminTable, { type AdminColumn } from "@/components/admin/ui/AdminTable";
import type { AdminCommand, TokenAccountRow } from "@/types/admin";
interface TokenAccountsTableProps { rows: readonly TokenAccountRow[]; canManage: boolean; busy: boolean; onCommand(command: AdminCommand): Promise<void> }
export default function TokenAccountsTable({ rows, canManage, busy, onCommand }: TokenAccountsTableProps): React.ReactElement {
  const [drafts, setDrafts] = useState<Record<string, { text: string; version: number }>>({}), [error, setError] = useState("");
  function send(command: AdminCommand) { void onCommand(command).catch(() => { /* 상위 패널에서 오류를 표시한다. */ }); }
  function save(row: TokenAccountRow) {
    const draft = drafts[row.id]; if (!draft) return;
    const limit = Number(draft.text);
    if (!/^\d+$/.test(draft.text) || !Number.isSafeInteger(limit) || limit < 1000 || limit > 1_000_000_000) { setError("개인 한도는 1000~10억 사이의 정수 토큰으로 입력해 주세요."); return; }
    setError(""); void onCommand({ type: "set-token-limit", target: { id: row.id, version: draft.version }, limitTokens: limit }).then(() => setDrafts((old) => { const next = { ...old }; delete next[row.id]; return next; })).catch(() => {});
  }
  const columns: AdminColumn<TokenAccountRow>[] = [
    { id: "name", label: "사용자", render: (r) => <div><strong>{r.name}</strong><div className="tw:text-[11px] tw:text-(--kpc-muted)">{r.title}</div></div> }, { id: "dept", label: "부서", render: (r) => r.departmentName },
    { id: "usage", label: "이번 달 사용량 / 한도", render: (r) => <div className="tw:min-w-32"><div className="tw:mb-1 tw:flex tw:justify-between tw:gap-2"><span>{r.usedTokens.toLocaleString("ko-KR")} / {r.limitTokens.toLocaleString("ko-KR")}</span><strong>{Math.round(r.usedTokens / r.limitTokens * 100)}%</strong></div><ProgressBar aria-label={r.name + " 토큰 사용률"} value={Math.min(1, r.usedTokens / r.limitTokens)} color={r.status === "over" ? "error" : r.status === "warning" ? "warning" : "success"} /></div> },
    { id: "limit", label: "개인 한도 (Token)", render: (r) => canManage ? <Input size="small" aria-label={r.name + " 개인 한도"} inputMode="numeric" value={drafts[r.id]?.text ?? String(r.limitTokens)} disabled={busy} onChange={(_, d) => setDrafts({ ...drafts, [r.id]: { text: d.value, version: drafts[r.id]?.version ?? r.version } })} /> : r.limitTokens.toLocaleString("ko-KR") },
    { id: "status", label: "상태", render: (r) => <Badge appearance="tint" color={r.status === "over" ? "danger" : r.status === "warning" ? "warning" : r.status === "normal" ? "success" : "subtle"}>{{ normal: "정상", warning: "경고", over: "초과", paused: "정지" }[r.status]}</Badge> },
  ];
  if (canManage) columns.push({ id: "manage", label: "관리", render: (r) => <div className="tw:flex tw:flex-wrap tw:gap-1"><Button size="small" disabled={busy || !drafts[r.id]} onClick={() => save(r)}>저장</Button><Button size="small" disabled={busy || r.limitTokens > 999950000} onClick={() => send({ type: "set-token-limit", target: { id: r.id, version: r.version }, limitTokens: r.limitTokens + 50000 })}>+50K</Button><Button size="small" disabled={busy} onClick={() => send({ type: "set-token-paused", target: { id: r.id, version: r.version }, paused: !r.paused })}>{r.paused ? "재개" : "정지"}</Button></div> });
  return <>{error && <p role="alert">{error}</p>}<AdminTable label="개인별 토큰 사용량" rows={rows} columns={columns} emptyMessage="조건에 맞는 사용자가 없습니다." /></>;
}
