import { CalendarDays, Play, Users } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ProposalProject, ProposalStage } from "@/types/proposals";

interface ProposalProjectCardProps {
  project: ProposalProject;
  canReview: boolean;
  onOpen(projectId: string): void;
  onMove(projectId: string, stage: ProposalStage): void;
  onOpenWorkspace(projectId: string): void;
}

const stages: ProposalStage[] = ["검토 대기", "검토 중", "진행", "진행 안 함"];

function formatBudget(budget: number): string {
  if (budget >= 100_000_000) {
    return `${(budget / 100_000_000).toFixed(1).replace(".0", "")}억원`;
  }

  return `${Math.round(budget / 10_000).toLocaleString("ko-KR")}만원`;
}

export default function ProposalProjectCard({
  project,
  canReview,
  onOpen,
  onMove,
  onOpenWorkspace,
}: ProposalProjectCardProps): React.ReactElement {
  const openProject = () => onOpen(project.id);

  return (
    <article
      role="button"
      tabIndex={0}
      draggable={canReview}
      className="group rounded-xl border border-black/8 bg-white p-4 shadow-[0_2px_10px_rgba(20,20,20,0.04)] outline-none transition hover:-translate-y-0.5 hover:border-black/15 hover:shadow-[0_8px_24px_rgba(20,20,20,0.08)] focus-visible:ring-2 focus-visible:ring-kpc-red/30"
      aria-label={`${project.title} 상세 열기`}
      onClick={openProject}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          openProject();
        }
      }}
      onDragStart={(event) => {
        if (!canReview) {
          event.preventDefault();
          return;
        }

        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/proposal-project-id", project.id);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-[#25262A]">
            {project.title}
          </h3>
          <p className="mt-1 truncate text-xs text-[#82838A]">{project.agency}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#F4F4F5] px-2 py-1 text-[10px] font-semibold text-[#66676C]">
          {formatBudget(project.budget)}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-[#6D6E74]">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5" />
          {project.deadline}
        </span>
        <span
          className={cn(
            "font-semibold tabular-nums",
            project.dDay <= 14 ? "text-kpc-red" : "text-[#56575C]",
          )}
        >
          D-{project.dDay}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-medium text-[#6F7076]">P/Win</span>
          <span className="font-bold tabular-nums text-[#303136]">{project.pWin}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#ECEDEF]">
          <div
            className="h-full rounded-full bg-kpc-red transition-[width]"
            style={{ width: `${project.pWin}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-black/6 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#EEEFF1] text-[11px] font-bold text-[#5B5C62]">
            {project.manager.slice(0, 1)}
          </span>
          <span className="truncate text-xs font-medium text-[#5B5C62]">{project.manager}</span>
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-[#929399]">
            <Users className="size-3" />
            {project.teamMembers.length}
          </span>
        </div>

        {canReview && (
          <div
            className="shrink-0"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Select
              value={project.stage}
              onValueChange={(value) => onMove(project.id, value as ProposalStage)}
            >
              <SelectTrigger
                size="sm"
                className="h-7 max-w-28 border-black/10 bg-white px-2 text-[11px] shadow-none"
                aria-label="단계 변경"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {project.stage === "진행" && (
        <button
          type="button"
          className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-[#FFF1F2] text-xs font-semibold text-kpc-red transition-colors hover:bg-[#FFE4E6]"
          onClick={(event) => {
            event.stopPropagation();
            onOpenWorkspace(project.id);
          }}
        >
          <Play className="size-3.5 fill-current" />
          제안서 작성
        </button>
      )}
    </article>
  );
}
