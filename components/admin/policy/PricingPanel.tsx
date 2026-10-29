"use client";
import { Button, Field, Input } from "@fluentui/react-components";
import { useState } from "react";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import AdminTable from "@/components/admin/ui/AdminTable";
import { useAdminAccess, useAdminCommand, useAdminPricing } from "@/hooks/admin/use-admin-data";
import { parseFx, parseUsdRate } from "@/lib/admin/cost";
import type { AdminPrice } from "@/types/admin";
interface PriceDraft { priceId: string; version: number; inputUsd: string; outputUsd: string }
interface FxDraft { version: number; krwPerUsd: string }
export default function PricingPanel(): React.ReactElement {
  const query = useAdminPricing(), access = useAdminAccess(), command = useAdminCommand();
  const [drafts, setDrafts] = useState<Record<string, PriceDraft>>({}), [fx, setFx] = useState<FxDraft | null>(null), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const canEdit = Boolean(access.data?.grants.pricing.update);
  const priceDraft = (p: AdminPrice): PriceDraft => drafts[p.id] ?? { priceId: p.id, version: p.version, inputUsd: String(p.inputUsdMicrosPerMillion / 1000000), outputUsd: String(p.outputUsdMicrosPerMillion / 1000000) };
  async function savePrice(price: AdminPrice) {
    const d = priceDraft(price), input = parseUsdRate(d.inputUsd), output = parseUsdRate(d.outputUsd);
    if (input === null || output === null) { setError("단가는 0~1000 USD, 소수 6자리까지 입력해 주세요."); return; }
    setError(""); try { await command.mutateAsync({ type: "save-price", target: { id: d.priceId, version: d.version }, inputUsdMicrosPerMillion: input, outputUsdMicrosPerMillion: output }); setDrafts((old) => { const copy = { ...old }; delete copy[d.priceId]; return copy; }); setNotice("모델 단가를 저장했습니다."); } catch { /* 다른 행의 초안을 유지한다. */ }
  }
  async function saveFx() {
    if (!fx) return; const parsed = parseFx(fx.krwPerUsd);
    if (parsed === null) { setError("환율은 0보다 크고 10000 이하, 소수 6자리까지 입력해 주세요."); return; }
    setError(""); try { await command.mutateAsync({ type: "save-fx", version: fx.version, krwMicrosPerUsd: parsed }); setFx(null); setNotice("환율을 저장했습니다."); } catch { /* 초안과 버전을 유지한다. */ }
  }
  return <AdminCard title="모델별 단가와 환율">
    <p className="tw:mt-0 tw:text-(--kpc-secondary)">변경한 단가·환율은 이후 사용분부터 적용됩니다. 기존 사용분은 사용 당시 단가로 보존됩니다.</p>
    {!query.data ? <AdminAsyncState state={query.isError ? "error" : "loading"} onRetry={() => void query.refetch()} /> : <>
      <AdminTable label="모델 단가" rows={query.data.prices} emptyMessage="등록된 모델 단가가 없습니다." columns={[
        { id: "model", label: "모델", render: (p) => query.data!.models.find((m) => m.id === p.modelId)?.name },
        { id: "input", label: "입력 USD / 100만 토큰", render: (p) => canEdit ? <Input aria-label={p.modelId + " 입력 단가"} size="small" inputMode="decimal" value={priceDraft(p).inputUsd} disabled={command.isPending} onChange={(_, d) => setDrafts({ ...drafts, [p.id]: { ...priceDraft(p), inputUsd: d.value } })} /> : String(p.inputUsdMicrosPerMillion / 1000000) },
        { id: "output", label: "출력 USD / 100만 토큰", render: (p) => canEdit ? <Input aria-label={p.modelId + " 출력 단가"} size="small" inputMode="decimal" value={priceDraft(p).outputUsd} disabled={command.isPending} onChange={(_, d) => setDrafts({ ...drafts, [p.id]: { ...priceDraft(p), outputUsd: d.value } })} /> : String(p.outputUsdMicrosPerMillion / 1000000) },
        { id: "updated", label: "변경일", render: (p) => p.updatedAt.slice(0, 10) },
        ...(canEdit ? [{ id: "save", label: "관리", render: (p: AdminPrice) => <Button size="small" disabled={!drafts[p.id] || command.isPending} onClick={() => void savePrice(p)}>저장</Button> }] : []),
      ]} />
      <div className="tw:mt-4 tw:flex tw:flex-wrap tw:items-end tw:gap-2"><Field label="원화 환율 (KRW / 1 USD)">{canEdit ? <Input inputMode="decimal" value={fx?.krwPerUsd ?? String(query.data.krwMicrosPerUsd / 1000000)} disabled={command.isPending} onChange={(_, d) => setFx({ version: fx?.version ?? query.data!.version, krwPerUsd: d.value })} /> : <strong>{query.data.krwMicrosPerUsd / 1000000} KRW</strong>}</Field>{canEdit && <Button disabled={!fx || command.isPending} onClick={() => void saveFx()}>환율 저장</Button>}</div>
    </>}
    {notice && <p role="status">{notice}</p>}{(error || command.error) && <p role="alert">{error || command.error?.message}{command.error?.code === "CONFLICT" && <Button onClick={() => { setDrafts({}); setFx(null); command.reset(); void query.refetch(); }}>최신 값으로 다시 불러오기</Button>}</p>}
  </AdminCard>;
}
