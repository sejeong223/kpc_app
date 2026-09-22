import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { countKoreanCharacters } from "@/lib/proposals/editor-mocks";
import type { ProposalSection } from "@/types/proposals";

interface ProposalContentEditorProps {
  section: ProposalSection;
  draft: string;
  people: string[];
  saved: boolean;
  onDraftChange(value: string): void;
  onMetadataChange(changes: Partial<ProposalSection>): void;
  onSave(): void;
}

export default function ProposalContentEditor({ section, draft, people, saved, onDraftChange, onMetadataChange, onSave }: ProposalContentEditorProps): React.ReactElement {
  const characterCount = countKoreanCharacters(draft);
  const progress = Math.min(100, Math.round((characterCount / section.targetCharacters) * 100));

  return (
    <main className="flex min-h-0 min-w-[560px] flex-col bg-[#F8F9FA]">
      <header className="border-b bg-white px-5 py-4"><p className="text-xs text-[#85868B]">04 제안서 작성 / {section.number}</p><div className="mt-2 flex items-start justify-between gap-3"><div><h1 className="text-lg font-bold">{section.title}</h1><p className="mt-1 text-xs text-[#898A90]">{saved ? `저장됨 · ${section.updatedAt}` : "저장되지 않은 변경사항"}</p></div><Button className="bg-kpc-red text-white hover:bg-[#CA0010]" onClick={onSave} disabled={saved}><Save className="size-4" /> 저장</Button></div><div className="mt-4 grid grid-cols-3 gap-2"><MetaSelect label="상태" value={section.status} options={["작성 대기", "작성 중", "검토 요청", "완료"]} onChange={(status) => onMetadataChange({ status: status as ProposalSection["status"] })} /><MetaSelect label="담당자" value={section.assignee} options={people} onChange={(assignee) => onMetadataChange({ assignee })} /><MetaSelect label="검토자" value={section.reviewer} options={people} onChange={(reviewer) => onMetadataChange({ reviewer })} /></div></header>
      <div className="min-h-0 flex-1 overflow-y-auto p-5"><Textarea className="min-h-[520px] resize-none border-black/10 bg-white p-6 text-[15px] leading-8 shadow-sm" value={draft} onChange={(event) => onDraftChange(event.target.value)} aria-label={`${section.title} 본문`} /><div className="mt-3 flex items-center gap-3"><Progress className="flex-1" value={progress} /><span className="text-xs tabular-nums text-[#696A70]">{characterCount.toLocaleString()} / {section.targetCharacters.toLocaleString()}자</span></div></div>
    </main>
  );
}

function MetaSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange(value: string): void }): React.ReactElement {
  return <label className="text-[11px] text-[#77787D]">{label}<select className="mt-1 h-8 w-full rounded-md border bg-white px-2 text-xs text-[#35363B]" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}