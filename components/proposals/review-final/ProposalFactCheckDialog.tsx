import { AlertTriangle, SearchCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProposalFactIssue, ProposalSection } from "@/types/proposals";

interface ProposalFactCheckDialogProps {
  open: boolean;
  issues: ProposalFactIssue[];
  sections: ProposalSection[];
  onOpenChange(open: boolean): void;
  onOpenEditor(sectionId: string): void;
}

export default function ProposalFactCheckDialog({ open, issues, sections, onOpenChange, onOpenEditor }: ProposalFactCheckDialogProps): React.ReactElement {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle className="flex items-center gap-2"><SearchCheck className="size-5 text-kpc-red" /> 목업 Fact Check</DialogTitle><DialogDescription>실제 사실 검증이 아닌 명시적 placeholder pattern 검사입니다.</DialogDescription></DialogHeader><div className="space-y-3">{issues.map((issue) => { const section = sections.find((item) => item.id === issue.sectionId); return <article key={issue.id} className="rounded-md border p-4"><div className="flex items-start gap-3"><AlertTriangle className={`mt-0.5 size-4 ${issue.severity === "확인 필요" ? "text-kpc-red" : "text-amber-600"}`} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{issue.severity} · {section?.number} {section?.title}</p><p className="mt-1 text-xs text-[#68696F]">{issue.message}</p><code className="mt-2 block rounded bg-[#F5F6F7] px-2 py-1 text-xs">{issue.excerpt}</code><Button size="sm" variant="outline" className="mt-3" onClick={() => onOpenEditor(issue.sectionId)}>Editor에서 열기</Button></div></div></article>; })}{issues.length === 0 && <p className="py-10 text-center text-sm text-[#727379]">목업 검사 pattern에 해당하는 항목이 없습니다.</p>}</div></DialogContent></Dialog>;
}