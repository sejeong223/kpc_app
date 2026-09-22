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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ProposalRejectDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  onConfirm(reason: string): void;
}

export default function ProposalRejectDialog({
  open,
  onOpenChange,
  onConfirm,
}: ProposalRejectDialogProps): React.ReactElement {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const confirm = () => {
    if (!reason.trim()) {
      setError("진행하지 않는 사유를 입력하세요.");
      return;
    }
    onConfirm(reason.trim());
    setReason("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>진행 안 함</DialogTitle>
          <DialogDescription>판단 근거를 남기면 파이프라인에서 함께 확인할 수 있습니다.</DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="rejection-reason">반려 사유</Label>
          <Textarea id="rejection-reason" className="mt-2" value={reason} aria-invalid={Boolean(error)} onChange={(event) => { setReason(event.target.value); setError(""); }} />
          {error && <p className="mt-1 text-xs text-kpc-red">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button variant="destructive" onClick={confirm}>진행 안 함 확정</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}