import { FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProposalLibraryItem } from "@/types/proposals";

interface ProposalLibraryPreviewDialogProps {
  item: ProposalLibraryItem | null;
  canImport: boolean;
  open: boolean;
  onOpenChange(open: boolean): void;
  onImport(item: ProposalLibraryItem): void;
}

export default function ProposalLibraryPreviewDialog({ item, canImport, open, onOpenChange, onImport }: ProposalLibraryPreviewDialogProps): React.ReactElement {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="size-5 text-kpc-red" />{item?.title ?? "자료 미리보기"}</DialogTitle><DialogDescription>{item?.category} · {item?.department} · {item?.fileFormat}</DialogDescription></DialogHeader>{item && <div className="space-y-4 text-sm"><section><h3 className="font-semibold">요약</h3><p className="mt-2 leading-6 text-[#5D5E64]">{item.description}</p></section><section className="rounded-md bg-[#F5F6F7] p-4"><h3 className="text-xs font-semibold text-kpc-red">핵심 Highlight</h3><p className="mt-2 leading-6">{item.tags.join(", ")} 관점에서 제안서에 재사용할 수 있는 검증된 사내 자료입니다.</p></section><section><h3 className="font-semibold">샘플 본문</h3><p className="mt-2 whitespace-pre-wrap leading-7 text-[#5D5E64]">본 자료는 제안 배경과 수행 접근법, 주요 성과 사례를 일관된 형식으로 정리합니다. 프로젝트 특성에 맞게 근거와 수치를 확인한 뒤 활용하세요.</p></section><dl className="grid grid-cols-3 gap-3 rounded-md border p-3 text-xs"><div><dt className="text-[#8A8B91]">크기</dt><dd className="mt-1 font-medium">{item.size}</dd></div><div><dt className="text-[#8A8B91]">수정일</dt><dd className="mt-1 font-medium">{item.updatedAt}</dd></div><div><dt className="text-[#8A8B91]">사용</dt><dd className="mt-1 font-medium">{item.useCount}회</dd></div></dl></div>}<DialogFooter>{item && canImport && <Button className="bg-kpc-red text-white hover:bg-[#CA0010]" onClick={() => { onImport(item); onOpenChange(false); }}><Plus className="size-4" /> 프로젝트에 추가</Button>}</DialogFooter></DialogContent></Dialog>;
}