import ProposalProjectCard from "@/components/proposals/pipeline/ProposalProjectCard";
import { cn } from "@/lib/utils";
import type { ProposalProject, ProposalStage } from "@/types/proposals";

interface ProposalStageColumnProps {
  stage: ProposalStage;
  projects: ProposalProject[];
  canReview: boolean;
  onOpen(projectId: string): void;
  onMove(projectId: string, stage: ProposalStage): void;
  onOpenWorkspace(projectId: string): void;
}

const stageTone: Record<ProposalStage, { dot: string; badge: string }> = {
  "검토 대기": { dot: "bg-[#A2A3A8]", badge: "bg-[#EEEFF1] text-[#64656B]" },
  "검토 중": { dot: "bg-[#3976D8]", badge: "bg-[#EAF2FF] text-[#2D66BE]" },
  진행: { dot: "bg-kpc-red", badge: "bg-[#FFF1F2] text-kpc-red" },
  "진행 안 함": { dot: "bg-[#64748B]", badge: "bg-[#EEF1F5] text-[#526174]" },
};

export default function ProposalStageColumn({
  stage,
  projects,
  canReview,
  onOpen,
  onMove,
  onOpenWorkspace,
}: ProposalStageColumnProps): React.ReactElement {
  const tone = stageTone[stage];

  return (
    <section
      className="min-w-[280px] snap-start rounded-xl bg-[#F0F1F3] p-3"
      aria-label={`${stage} 제안 ${projects.length}개`}
      onDragOver={(event) => {
        if (canReview) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }
      }}
      onDrop={(event) => {
        if (!canReview) {
          return;
        }

        event.preventDefault();
        const projectId = event.dataTransfer.getData("text/proposal-project-id");
        if (projectId) {
          onMove(projectId, stage);
        }
      }}
    >
      <header className="flex items-center justify-between px-1 pb-3 pt-1">
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", tone.dot)} />
          <h2 className="text-sm font-semibold text-[#3B3C41]">{stage}</h2>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", tone.badge)}>
          {projects.length}
        </span>
      </header>

      <div className="space-y-3">
        {projects.map((project) => (
          <ProposalProjectCard
            key={project.id}
            project={project}
            canReview={canReview}
            onOpen={onOpen}
            onMove={onMove}
            onOpenWorkspace={onOpenWorkspace}
          />
        ))}
        {projects.length === 0 && (
          <div className="rounded-lg border border-dashed border-black/10 px-4 py-8 text-center text-xs text-[#9A9BA0]">
            해당 단계의 제안이 없습니다.
          </div>
        )}
      </div>
    </section>
  );
}
