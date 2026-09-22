import { FileText } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MOCK_RFP_PREVIEW } from "@/data/proposals/mock-data";
import type { ProposalDocument } from "@/types/proposals";

interface ProposalDocumentPreviewDialogProps {
  document: ProposalDocument | null;
  open: boolean;
  onOpenChange(open: boolean): void;
}

export default function ProposalDocumentPreviewDialog({
  document,
  open,
  onOpenChange,
}: ProposalDocumentPreviewDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            <FileText className="size-5 text-kpc-red" />
            {document?.name ?? "RFP 문서"}
          </DialogTitle>
          <DialogDescription>
            {MOCK_RFP_PREVIEW.pageCount}페이지 · {document?.size ?? "샘플 문서"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm text-[#4B4C52]">
          <section>
            <h3 className="font-semibold text-[#25262A]">문서 요약</h3>
            <p className="mt-2 leading-6">{MOCK_RFP_PREVIEW.summary}</p>
          </section>
          <section>
            <h3 className="font-semibold text-[#25262A]">목차</h3>
            <ol className="mt-2 grid gap-2 sm:grid-cols-2">
              {MOCK_RFP_PREVIEW.tableOfContents.map((item, index) => (
                <li key={item} className="rounded-md bg-[#F5F6F7] px-3 py-2">
                  {index + 1}. {item}
                </li>
              ))}
            </ol>
          </section>
          <section>
            <h3 className="font-semibold text-[#25262A]">샘플 페이지</h3>
            <div className="mt-2 space-y-3">
              {MOCK_RFP_PREVIEW.pages.map((page) => (
                <article key={page.pageNumber} className="rounded-lg border bg-white p-4">
                  <p className="text-xs font-semibold text-kpc-red">
                    p. {page.pageNumber} · {page.title}
                  </p>
                  <p className="mt-2 leading-6">{page.content}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}