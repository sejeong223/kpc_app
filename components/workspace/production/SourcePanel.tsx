"use client";
import { useState } from "react";
import { Document16Regular } from "@fluentui/react-icons";
import { useFileWorkspace, useWorkspaceFileHistory } from "@/hooks/workspace/use-workspace-files";
import { selectProductionSlides, selectProductionSources } from "@/lib/workspace/production/presentation";
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
  if (preview && preview.scope !== scope) setPreview(null);
  const cards = selectProductionSources(view, slide, query.data ?? null);
  const row = selectProductionSlides(view).find(item => item.slide.id === slide?.id);
  const description = row ? `Slide ${number ?? row.number} · ${row.sectionNumber} ${row.section.title}` : "";
  return <section aria-label="슬라이드 출처" className="tw:flex tw:h-full tw:min-h-0 tw:min-w-0 tw:flex-col">
    <header className="tw:flex tw:min-h-11 tw:shrink-0 tw:items-center tw:gap-2 tw:border-b tw:border-(--kpc-line) tw:px-3">
      <h2 className="tw:m-0 tw:shrink-0 tw:text-[13px] tw:font-bold">출처</h2>
      <span className="tw:min-w-0 tw:flex-1 tw:truncate tw:text-xs tw:text-(--kpc-muted)" title={description}>{description}</span>{panelToggle}
    </header>
    <div className="tw:min-h-0 tw:flex-1 tw:overflow-y-auto tw:overscroll-contain tw:p-3">
      {!slide ? <p className="tw:text-sm">슬라이드를 선택하면 출처를 볼 수 있습니다.</p> : <>
        {query.isPending && <p role="status" className="tw:text-xs">자료 정보를 불러오는 중입니다.</p>}
        <WorkspaceErrorText error={query.error} />
        {(["rfp", "reference"] as const).map(group => {
          const items = cards.filter(card => card.group === group);
          return <section key={group} className="tw:mb-4"><h3 className="tw:mb-2 tw:mt-0 tw:flex tw:items-center tw:gap-1.5 tw:text-xs tw:font-semibold">{group === "rfp" ? "RFP" : "참조 자료"}
            <span className="tw:rounded-full tw:bg-(--kpc-bg) tw:px-1.5 tw:text-(--kpc-muted)">{items.length}</span></h3>
            {items.map(card => {
              const canOpen = card.resource !== null && card.round !== null;
              const open = () => { if (card.resource && card.round !== null) setPreview({ scope, resource: card.resource, round: card.round }); };
              return <article key={card.id} data-comment-control role={canOpen ? "button" : undefined} tabIndex={canOpen ? 0 : undefined}
                aria-label={canOpen ? `${card.title} 원문 열기` : undefined}
                className={"tw:mb-2 tw:rounded-[10px] tw:border tw:border-(--kpc-line) tw:bg-(--kpc-card) tw:px-3 tw:py-2.5 " + (canOpen ? "tw:cursor-pointer tw:hover:border-(--dadam-accent) tw:focus-visible:outline-2 tw:focus-visible:outline-(--dadam-accent)" : "")}
                onClick={open} onKeyDown={event => { if (canOpen && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); open(); } }}>
                <div className="tw:flex tw:min-w-0 tw:items-center tw:gap-1.5 tw:text-[12.5px]">
                  <span className={"tw:inline-flex tw:h-5 tw:shrink-0 tw:items-center tw:rounded tw:px-1 tw:text-[10.5px] tw:font-bold " + (group === "rfp" ? "tw:bg-(--dadam-accent-soft) tw:text-(--dadam-accent-ink)" : "tw:bg-(--kpc-bg) tw:text-(--kpc-secondary)")}>
                    {group === "rfp" ? "RFP" : <Document16Regular />}</span>
                  <strong className="tw:min-w-0 tw:break-words">{group === "rfp" ? card.page === null ? "쪽수 미상" : `p.${card.page}` : card.title}</strong>
                </div>
                <p className="tw:mb-0 tw:mt-1 tw:break-words tw:text-[11.5px] tw:leading-normal tw:text-(--kpc-muted)">
                  {group === "rfp" ? card.title : card.page !== null ? `p.${card.page}` : "쪽수 미상"}{card.provenance === "mock" && " · 시연 자료"}
                </p>
                {card.quote !== null && <blockquote className="tw:mx-0 tw:mb-0 tw:mt-1.5 tw:border-l-[3px] tw:border-(--dadam-accent) tw:bg-(--dadam-accent-soft) tw:px-2.5 tw:py-1.5 tw:whitespace-pre-wrap tw:break-words tw:text-xs tw:leading-[1.6]">{card.quote}</blockquote>}
                {card.missingReason && <p className="tw:mb-0 tw:mt-1 tw:text-xs tw:text-(--kpc-muted)">{card.missingReason}</p>}
              </article>;
            })}
            {!items.length && (group === "rfp" || (!query.isPending && !query.error)) && <p className="tw:text-xs tw:text-(--kpc-muted)">{group === "rfp" ? "이 슬라이드에 연결된 RFP 항목이 없습니다" : "참조한 자료가 없습니다"}</p>}
          </section>;
        })}
      </>}
    </div>
    {preview && preview.scope === scope && <FilePreviewDialog key={`${scope}:${preview.resource.version.id}`} open projectId={view.project.id} resource={preview.resource} round={preview.round} onClose={() => setPreview(null)} />}
  </section>;
}
