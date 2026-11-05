"use client";
import { useState } from "react";
import { useFileWorkspace, useWorkspaceFileHistory } from "@/hooks/workspace/use-workspace-files";
import { selectProductionSources } from "@/lib/workspace/production/presentation";
import type { ProjectView, ProposalSlide } from "@/types/workspace-production";
import type { FileResourceView } from "@/types/workspace-files";
import FilePreviewDialog from "../files/FilePreviewDialog";
import { WorkspaceErrorText } from "../shared/WorkspaceUi";

export default function SourcePanel({ view, slide, snapshotId, number, panelToggle }: {
  view: ProjectView; slide: ProposalSlide | null; snapshotId: string | null; number?: number; panelToggle?: React.ReactNode;
}): React.ReactElement {
  const live = useFileWorkspace(snapshotId ? null : view.project.id), history = useWorkspaceFileHistory(view.project.id, snapshotId), query = snapshotId ? history : live;
  const scope = JSON.stringify([view.project.id, view.state.currentRound, snapshotId, slide?.id]);
  const [preview, setPreview] = useState<{ scope: string; resource: FileResourceView; round: number } | null>(null);
  // A new scope unmounts the old dialog immediately, including while its file is loading.
  if (preview && preview.scope !== scope) setPreview(null);
  const cards = selectProductionSources(view, slide, query.data ?? null), section = view.state.body.sections.find(s => s.id === slide?.sectionId);
  return <section aria-label="슬라이드 출처" className="tw:flex tw:h-full tw:min-h-0 tw:min-w-0 tw:flex-col">
    <header className="tw:flex tw:shrink-0 tw:items-center tw:gap-(--layout-control-gap) tw:border-b tw:border-(--kpc-line) tw:p-(--layout-card-inset)">
      <div className="tw:min-w-0 tw:flex-1"><h2 className="tw:m-0 tw:text-sm tw:font-bold">출처</h2>{slide && <p className="tw:mb-0 tw:mt-1 tw:truncate tw:text-xs tw:text-(--kpc-muted)" title={section?.title}>{number ? `${number}번 슬라이드 · ` : ""}{section?.title}</p>}</div>{panelToggle}
    </header>
    <div className="tw:min-h-0 tw:flex-1 tw:overflow-y-auto tw:overscroll-contain tw:p-(--layout-card-inset)">
    {!slide ? <p className="tw:text-sm">슬라이드를 선택하면 출처를 볼 수 있습니다.</p> : <>
      {query.isPending && <p role="status" className="tw:text-sm">자료 정보를 불러오는 중입니다.</p>}
      <WorkspaceErrorText error={query.error} />
      {(["rfp", "reference"] as const).map(group => {
        const items = cards.filter(c => c.group === group);
        return <section key={group} className="tw:mt-5"><h3 className="tw:text-xs tw:font-semibold">{group === "rfp" ? "RFP 근거" : "참조 자료"} · {items.length}</h3>
          {items.map(card => <article key={card.id} data-comment-control
            role={card.resource && card.round !== null ? "button" : undefined} tabIndex={card.resource && card.round !== null ? 0 : undefined}
            aria-label={card.resource ? `${card.title} 원문 열기` : undefined}
            className={"tw:mb-3 tw:rounded-lg tw:border tw:border-(--kpc-line) tw:bg-(--kpc-bg) tw:p-3 " + (card.resource ? "tw:cursor-pointer tw:hover:border-(--kpc-brand) tw:focus-visible:outline-2 tw:focus-visible:outline-(--kpc-brand)" : "")}
            onClick={() => { if (card.resource && card.round !== null) setPreview({ scope, resource: card.resource, round: card.round }); }}
            onKeyDown={event => { if (card.resource && card.round !== null && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setPreview({ scope, resource: card.resource, round: card.round }); } }}>
            <strong className="tw:break-words tw:text-sm">{card.title}</strong>
            <p className="tw:my-1 tw:text-xs tw:text-(--kpc-muted)">{card.provenance === "mock" && "시연 자료"}{card.provenance === "mock" && card.page !== null && " · "}{card.page !== null && `${card.page}쪽`}</p>
            {card.quote !== null && <blockquote className="tw:mx-0 tw:my-2 tw:whitespace-pre-wrap tw:break-words tw:text-sm">{card.quote}</blockquote>}
            {card.missingReason && <p className="tw:mb-0 tw:text-xs tw:text-(--kpc-muted)">{card.missingReason}</p>}
          </article>)}
          {!items.length && (group === "rfp" || (!query.isPending && !query.error)) && <p className="tw:text-xs tw:text-(--kpc-muted)">연결된 {group === "rfp" ? "RFP 근거가" : "참조 자료가"} 없습니다.</p>}
        </section>;
      })}
    </>}
    </div>
    {preview && preview.scope === scope && <FilePreviewDialog key={`${scope}:${preview.resource.version.id}`} open projectId={view.project.id} resource={preview.resource} round={preview.round} onClose={() => setPreview(null)} />}
  </section>;
}
