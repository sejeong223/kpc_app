"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import type { ProposalDocument, ProposalLibraryItem, SectionReferenceConfig } from "@/types/proposals";

interface SectionReferenceDialogProps {
  open: boolean;
  documents: ProposalDocument[];
  libraryItems: ProposalLibraryItem[];
  initialConfig: SectionReferenceConfig;
  onOpenChange(open: boolean): void;
  onSave(config: SectionReferenceConfig): void;
}

export default function SectionReferenceDialog({ open, documents, libraryItems, initialConfig, onOpenChange, onSave }: SectionReferenceDialogProps): React.ReactElement {
  const [config, setConfig] = useState(initialConfig);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const toggle = (key: "documentIds" | "libraryItemIds", id: string) => setConfig((current) => ({ ...current, [key]: current[key].includes(id) ? current[key].filter((itemId) => itemId !== id) : [...current[key], id] }));
  const addUrl = () => {
    const normalized = url.trim();
    if (!normalized.startsWith("https://")) {
      setError("https://로 시작하는 URL만 추가할 수 있습니다.");
      return;
    }
    if (!config.includeUrls.includes(normalized)) setConfig((current) => ({ ...current, includeUrls: [...current.includeUrls, normalized] }));
    setUrl("");
    setError("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Section 출처 설정</DialogTitle><DialogDescription>AI 작성 보조가 참고할 mock 출처를 선택합니다.</DialogDescription></DialogHeader>
        <section><h3 className="text-sm font-semibold">프로젝트 문서</h3><div className="mt-2 grid gap-2 sm:grid-cols-2">{documents.map((document) => <label key={document.id} className="flex items-center gap-2 rounded-md border p-3 text-sm"><input type="checkbox" checked={config.documentIds.includes(document.id)} onChange={() => toggle("documentIds", document.id)} /> <span className="truncate">{document.name}</span></label>)}</div></section>
        <section><h3 className="text-sm font-semibold">자료 라이브러리</h3><div className="mt-2 grid gap-2 sm:grid-cols-2">{libraryItems.map((item) => <label key={item.id} className="flex items-center gap-2 rounded-md border p-3 text-sm"><input type="checkbox" checked={config.libraryItemIds.includes(item.id)} onChange={() => toggle("libraryItemIds", item.id)} /> <span className="truncate">{item.title}</span></label>)}</div></section>
        <section className="rounded-md border p-3"><label className="flex items-center justify-between text-sm font-medium">웹 검색 참고<Switch checked={config.webSearchEnabled} onCheckedChange={(webSearchEnabled) => setConfig((current) => ({ ...current, webSearchEnabled }))} /></label><div className="mt-3 flex gap-2"><Input value={url} onChange={(event) => { setUrl(event.target.value); setError(""); }} placeholder="https://example.com/reference" /><Button type="button" size="icon" variant="outline" title="URL 추가" onClick={addUrl}><Plus className="size-4" /></Button></div>{error && <p className="mt-1 text-xs text-kpc-red">{error}</p>}<div className="mt-2 space-y-1">{config.includeUrls.map((item) => <div key={item} className="flex items-center justify-between rounded bg-[#F5F6F7] px-2 py-1 text-xs"><span className="truncate">{item}</span><Button type="button" size="icon" variant="ghost" className="size-6" title="URL 제거" onClick={() => setConfig((current) => ({ ...current, includeUrls: current.includeUrls.filter((value) => value !== item) }))}><X className="size-3" /></Button></div>)}</div></section>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button><Button className="bg-kpc-red text-white hover:bg-[#CA0010]" onClick={() => { onSave(config); onOpenChange(false); }}>출처 저장</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}