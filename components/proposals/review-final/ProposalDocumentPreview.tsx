import type { ReactNode } from "react";

import type { ProposalSection } from "@/types/proposals";

interface ProposalDocumentPreviewProps {
  sections: ProposalSection[];
  searchQuery: string;
}

function highlightText(text: string, query: string): ReactNode {
  const normalized = query.trim();
  if (!normalized) return text;
  const lowerText = text.toLocaleLowerCase("ko-KR");
  const lowerQuery = normalized.toLocaleLowerCase("ko-KR");
  const parts: ReactNode[] = [];
  let cursor = 0;
  let index = lowerText.indexOf(lowerQuery);
  while (index >= 0) {
    parts.push(text.slice(cursor, index));
    parts.push(<mark key={`${index}-${cursor}`} className="bg-yellow-200">{text.slice(index, index + normalized.length)}</mark>);
    cursor = index + normalized.length;
    index = lowerText.indexOf(lowerQuery, cursor);
  }
  parts.push(text.slice(cursor));
  return parts;
}

export default function ProposalDocumentPreview({ sections, searchQuery }: ProposalDocumentPreviewProps): React.ReactElement {
  const sorted = [...sections].sort((left, right) => left.number.localeCompare(right.number, "ko-KR", { numeric: true }));
  return (
    <article className="proposal-print-document rounded-md border bg-white px-6 py-8 shadow-sm sm:px-10">
      {sorted.map((section) => <section key={section.id} id={`review-${section.id}`} className="scroll-mt-6 border-b py-8 first:pt-0 last:border-0 last:pb-0"><p className="text-xs font-bold text-kpc-red">{section.number}</p><h2 className="mt-2 text-xl font-bold">{highlightText(section.title, searchQuery)}</h2><p className="mt-5 whitespace-pre-wrap text-sm leading-8 text-[#45464C]">{section.content ? highlightText(section.content, searchQuery) : <span className="text-[#9A9BA0]">작성된 본문이 없습니다.</span>}</p></section>)}
    </article>
  );
}