"use client";
import { DadamButton as Button } from "@/components/ui/DadamControls";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import type { TemplateWorkListItem,WorkStatus } from "@/types/template-work";
export const WORK_STATUS:Record<WorkStatus,string>={ready:"적용 대기",running:"적용 중",succeeded:"적용 완료",failed:"적용 실패",cancelled:"취소됨"};
interface TemplateWorkListProps {items:readonly TemplateWorkListItem[];onOpen(id:string):void;onDiscard(id:string):void}
export default function TemplateWorkList({items,onOpen,onDiscard}:TemplateWorkListProps){
  return <AdminCard title="내 적용 작업"><p className="tw:text-[11px] tw:text-(--kpc-muted)">메뉴를 이동해도 유지됩니다. 새로고침하면 초기화됩니다.</p>{!items.length?<p>진행한 적용 작업이 없습니다. 활성 Template에서 적용 테스트를 시작하세요.</p>:<ul className="tw:m-0 tw:list-none tw:p-0">{items.map(item=><li key={item.id} className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-(--layout-control-gap) tw:border-0 tw:border-b tw:border-solid tw:border-(--kpc-line-soft) tw:py-(--layout-card-inset)"><div><strong>{item.templateName} × {item.skillName}</strong><p className="tw:my-(--layout-inline-gap) tw:text-(--kpc-muted)">{WORK_STATUS[item.status]}</p></div><div className="tw:flex tw:gap-(--layout-control-gap)"><Button onClick={()=>onOpen(item.id)}>작업 열기</Button><Button onClick={()=>onDiscard(item.id)}>작업 버리기</Button></div></li>)}</ul>}</AdminCard>;
}
