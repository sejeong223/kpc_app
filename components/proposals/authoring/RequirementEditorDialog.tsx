"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProposalRequirement } from "@/types/proposals";

interface RequirementEditorDialogProps {
  open: boolean;
  projectId: string;
  requirement: ProposalRequirement | null;
  onOpenChange(open: boolean): void;
  onSave(requirement: ProposalRequirement): void;
}

const emptyDraft = {
  title: "",
  category: "기능",
  sourcePage: "",
  priority: "보통" as ProposalRequirement["priority"],
  assignee: "",
};

export default function RequirementEditorDialog({
  open,
  projectId,
  requirement,
  onOpenChange,
  onSave,
}: RequirementEditorDialogProps): React.ReactElement {
  const [draft, setDraft] = useState(() =>
    requirement
      ? {
          title: requirement.title,
          category: requirement.category,
          sourcePage: requirement.sourcePage,
          priority: requirement.priority,
          assignee: requirement.assignee,
        }
      : emptyDraft,
  );
  const [error, setError] = useState("");

  const save = () => {
    if (!draft.title.trim() || !draft.category.trim() || !draft.sourcePage.trim() || !draft.assignee.trim()) {
      setError("제목, 분류, RFP 페이지, 담당자를 모두 입력하세요.");
      return;
    }
    onSave({
      id: requirement?.id ?? `requirement-${Date.now()}`,
      projectId,
      title: draft.title.trim(),
      category: draft.category.trim(),
      sourcePage: draft.sourcePage.trim(),
      priority: draft.priority,
      assignee: draft.assignee.trim(),
      status: requirement?.status ?? "미반영",
      checked: requirement?.checked ?? false,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{requirement ? "요구사항 수정" : "요구사항 추가"}</DialogTitle>
          <DialogDescription>RFP 근거와 작성 담당자를 함께 기록합니다.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2"><Label>요구사항 제목</Label><Input className="mt-2" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label>
          <label><Label>분류</Label><Input className="mt-2" value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} /></label>
          <label><Label>RFP 페이지</Label><Input className="mt-2" placeholder="p. 18" value={draft.sourcePage} onChange={(event) => setDraft((current) => ({ ...current, sourcePage: event.target.value }))} /></label>
          <div><Label>우선순위</Label><Select value={draft.priority} onValueChange={(value) => setDraft((current) => ({ ...current, priority: value as ProposalRequirement["priority"] }))}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{["높음", "보통", "낮음"].map((priority) => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}</SelectContent></Select></div>
          <label><Label>담당자</Label><Input className="mt-2" value={draft.assignee} onChange={(event) => setDraft((current) => ({ ...current, assignee: event.target.value }))} /></label>
        </div>
        {error && <p className="text-xs text-kpc-red">{error}</p>}
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button><Button className="bg-kpc-red text-white hover:bg-[#CA0010]" onClick={save}>저장</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}