"use client";
import AdminTable from "@/components/admin/ui/AdminTable";
import { formatKrw, formatUsd } from "@/lib/admin/cost";
import type { ModelCostRow, MoneyTotal } from "@/types/admin";
interface ModelCostTableProps { rows: readonly ModelCostRow[]; total: MoneyTotal }
export default function ModelCostTable({ rows, total }: ModelCostTableProps): React.ReactElement {
  return <><AdminTable label="모델별 예상 비용" rows={rows} emptyMessage="선택 기간의 사용량이 없습니다." columns={[
    { id: "model", label: "모델", render: (r) => r.modelName }, { id: "input", label: "입력 토큰", align: "end", render: (r) => r.inputTokens.toLocaleString("ko-KR") },
    { id: "output", label: "출력 토큰", align: "end", render: (r) => r.outputTokens.toLocaleString("ko-KR") }, { id: "tokens", label: "합계 토큰", align: "end", render: (r) => (r.inputTokens + r.outputTokens).toLocaleString("ko-KR") },
    { id: "usd", label: "USD 예상 비용", align: "end", render: (r) => formatUsd(r.usdMicros) }, { id: "krw", label: "원화 예상 비용", align: "end", render: (r) => <strong>{formatKrw(r.krwMicros)}</strong> },
  ]} /><p className="tw:mb-0 tw:text-right">예상 비용 합계 <strong>{formatKrw(total.krwMicros)}</strong> · {formatUsd(total.usdMicros)}</p><p className="tw:mb-0 tw:text-[11px] tw:text-(--kpc-muted)">사용 당시 단가·환율 기준의 예상 비용입니다.</p></>;
}
