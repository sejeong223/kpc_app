"use client";
import { Button, Field, Input } from "@fluentui/react-components";
import { useState } from "react";
import { useAdminCommand } from "@/hooks/admin/use-admin-data";
import { AdminCommandSchema } from "@/lib/admin/schemas";
import type { TokenPolicyView } from "@/types/admin";
interface TokenPolicyFormProps { value: TokenPolicyView; canEdit: boolean }
interface PolicyDraft { version: number; monthly: string; personal: string; warning: string; critical: string }
export default function TokenPolicyForm({ value, canEdit }: TokenPolicyFormProps): React.ReactElement {
  const command = useAdminCommand(), [draft, setDraft] = useState<PolicyDraft | null>(null), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const current: PolicyDraft = draft ?? { version: value.version, monthly: String(value.monthlyTokenLimit), personal: String(value.defaultPersonalLimit), warning: String(value.warningPercents[0]), critical: String(value.warningPercents[1]) };
  async function save() {
    if (![current.monthly, current.personal, current.warning, current.critical].every((text) => /^\d+$/.test(text))) { setError("정수로 입력해 주세요."); return; }
    const parsed = AdminCommandSchema.safeParse({ type: "save-token-policy", version: current.version, monthlyTokenLimit: Number(current.monthly), defaultPersonalLimit: Number(current.personal), warningPercents: [Number(current.warning), Number(current.critical)] });
    if (!parsed.success) { setError("한도는 1000~10억 Token, 경고는 1~99%의 오름차순으로 입력해 주세요."); return; }
    setError(""); try { await command.mutateAsync(parsed.data); setDraft(null); setNotice("토큰 정책을 저장했습니다."); } catch { /* 실패한 초안을 유지한다. */ }
  }
  return <><div className="tw:grid tw:gap-3 tw:sm:grid-cols-2 tw:lg:grid-cols-4">{([{ key: "monthly", label: "전사 월 토큰 한도" }, { key: "personal", label: "신규 사용자 기본 한도" }, { key: "warning", label: "1차 경고 (%)" }, { key: "critical", label: "2차 경고 (%)" }] as const).map((item) => <Field key={item.key} label={item.label}>{canEdit ? <Input inputMode="numeric" value={current[item.key]} disabled={command.isPending} onChange={(_, d) => { setDraft({ ...current, [item.key]: d.value }); setNotice(""); }} /> : <strong>{Number(current[item.key]).toLocaleString("ko-KR")}{item.key === "monthly" || item.key === "personal" ? " Token" : "%"}</strong>}</Field>)}</div>
    <p className="tw:text-[11px] tw:text-(--kpc-muted)">기본 한도는 이후 등록되는 사용자에게 적용됩니다. 기존 개인 한도는 변경되지 않습니다.</p>
    {canEdit && <Button appearance="primary" disabled={!draft || command.isPending} onClick={() => void save()}>정책 저장</Button>}
    {notice && <p role="status">{notice}</p>}{(error || command.error) && <p role="alert">{error || command.error?.message}{command.error?.code === "CONFLICT" && <Button onClick={() => { setDraft(null); command.reset(); }}>최신 값으로 다시 불러오기</Button>}</p>}
  </>;
}
