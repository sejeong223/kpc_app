"use client";
import { Button, Spinner } from "@fluentui/react-components";
interface AdminAsyncStateProps { state: "loading" | "error" | "forbidden" | "empty"; message?: string; onRetry?: () => void }
const labels = { loading: "불러오는 중입니다.", error: "데이터를 불러오지 못했습니다.", forbidden: "이 화면에 접근할 권한이 없습니다.", empty: "조건에 맞는 결과가 없습니다." };
export default function AdminAsyncState({ state, message, onRetry }: AdminAsyncStateProps): React.ReactElement {
  return <div className="tw:flex tw:min-h-40 tw:flex-col tw:items-center tw:justify-center tw:gap-3 tw:p-6 tw:text-(--kpc-secondary)" role={state === "error" ? "alert" : "status"}>
    {state === "loading" ? <Spinner size="small" label={message ?? labels[state]} /> : <p className="tw:m-0">{message ?? labels[state]}</p>}
    {state === "error" && onRetry && <Button onClick={onRetry}>다시 시도</Button>}
  </div>;
}
