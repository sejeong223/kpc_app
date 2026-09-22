import { Eye, FileText, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ProposalDocument } from "@/types/proposals";

interface ProposalDocumentTableProps {
  documents: ProposalDocument[];
  onPreview(document: ProposalDocument): void;
  onRemove(documentId: string): void;
}

export default function ProposalDocumentTable({
  documents,
  onPreview,
  onRemove,
}: ProposalDocumentTableProps): React.ReactElement {
  if (documents.length === 0) {
    return <p className="rounded-md border border-dashed p-5 text-center text-sm text-[#8A8B91]">등록된 문서가 없습니다.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="bg-[#F6F7F8] text-xs text-[#73747A]"><tr><th className="px-4 py-3 font-medium">문서</th><th className="px-3 py-3 font-medium">구분</th><th className="px-3 py-3 font-medium">크기</th><th className="px-3 py-3 font-medium">페이지</th><th className="px-3 py-3 font-medium">상태</th><th className="px-3 py-3 text-right font-medium">작업</th></tr></thead>
        <tbody className="divide-y">
          {documents.map((document) => (
            <tr key={document.id}>
              <td className="px-4 py-3"><span className="flex items-center gap-2 font-medium text-[#34353A]"><FileText className="size-4 text-kpc-red" />{document.name}</span></td>
              <td className="px-3 py-3 text-[#66676D]">{document.isPrimary ? "주 RFP" : document.kind}</td>
              <td className="px-3 py-3 text-[#66676D]">{document.size}</td>
              <td className="px-3 py-3 text-[#66676D]">{document.pageCount ?? "-"}</td>
              <td className="px-3 py-3"><span className="rounded-full bg-[#EEF7F0] px-2 py-1 text-xs font-medium text-[#347344]">{document.status}</span></td>
              <td className="px-3 py-3"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" title="미리보기" onClick={() => onPreview(document)}><Eye className="size-4" /></Button><Button size="icon" variant="ghost" title="삭제" onClick={() => onRemove(document.id)}><Trash2 className="size-4" /></Button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}