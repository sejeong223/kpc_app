"use client";
import { Button } from "@fluentui/react-components";
import { getPaginationItems } from "@/lib/pagination";
interface AdminPagerProps { page: number; total: number; pageSize: number; onChange(page: number): void }
export default function AdminPager({ page, total, pageSize, onChange }: AdminPagerProps): React.ReactElement {
  const totalPages = Math.max(1, Math.ceil(total / pageSize)), current = Math.min(Math.max(1, page), totalPages);
  return <nav aria-label="페이지 이동" className="tw:mt-3 tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2">
    <span className="tw:text-[11px] tw:text-(--kpc-muted)">총 {total.toLocaleString("ko-KR")}개 · {current}/{totalPages}페이지</span>
    <div className="tw:flex tw:flex-wrap tw:gap-1"><Button size="small" disabled={current === 1} onClick={() => onChange(current - 1)}>이전</Button>
      {getPaginationItems({ totalPages, currentPage: current }).map((item) => typeof item === "number" ? <Button key={item} size="small" appearance={item === current ? "primary" : "subtle"} aria-current={item === current ? "page" : undefined} onClick={() => onChange(item)}>{item}</Button> : <span key={item} className="tw:p-1">…</span>)}
      <Button size="small" disabled={current === totalPages} onClick={() => onChange(current + 1)}>다음</Button></div>
  </nav>;
}
