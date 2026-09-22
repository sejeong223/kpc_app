import type { Dispatch } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileCog,
  FilePenLine,
  FolderKanban,
  ListChecks,
  Lock,
  Plus,
  Settings,
  Sparkles,
} from "lucide-react";

import {
  canOpenProposalStep,
  getSelectedProposalProject,
  type ProposalWorkspaceAction,
} from "@/lib/proposals/workspace";
import { cn } from "@/lib/utils";
import type {
  ProposalWorkflowStep,
  ProposalWorkspaceState,
  ProposalWorkspaceView,
} from "@/types/proposals";

interface ProposalSidebarProps {
  state: ProposalWorkspaceState;
  dispatch: Dispatch<ProposalWorkspaceAction>;
}

const mainNavigation: Array<{
  label: string;
  view: ProposalWorkspaceView;
  icon: typeof FolderKanban;
}> = [
  { label: "제안 목록", view: "pipeline", icon: FolderKanban },
  { label: "자료 라이브러리", view: "library", icon: BookOpen },
  { label: "제안 설정", view: "settings", icon: Settings },
];

const projectSteps: Array<{
  step: ProposalWorkflowStep;
  number: string;
  label: string;
  icon: typeof FileCog;
}> = [
  { step: "setup", number: "01", label: "문서 설정", icon: FileCog },
  { step: "analysis", number: "02", label: "AI 분석", icon: Sparkles },
  { step: "requirements", number: "03", label: "요구사항", icon: ListChecks },
  { step: "editor", number: "04", label: "제안서 작성", icon: FilePenLine },
  { step: "review", number: "05", label: "검토 및 완성", icon: CheckCircle2 },
];

export default function ProposalSidebar({
  state,
  dispatch,
}: ProposalSidebarProps): React.ReactElement {
  const selectedProject = getSelectedProposalProject(state);
  const showsProjectNavigation = state.view === "workspace" && selectedProject !== null;

  if (!showsProjectNavigation) {
    return (
      <aside className="flex h-full w-60 shrink-0 flex-col border-r border-black/8 bg-white px-3 py-4">
        <button
          type="button"
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-kpc-red px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#CA0010]"
          onClick={() => dispatch({ type: "navigate", view: "register" })}
        >
          <Plus className="size-4" />
          제안서 생성
        </button>

        <nav aria-label="제안서 메뉴" className="mt-5 space-y-1">
          {mainNavigation.map((item) => {
            const Icon = item.icon;
            const active = state.view === item.view;
            return (
              <button
                key={item.view}
                type="button"
                className={cn(
                  "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors",
                  active
                    ? "bg-[#FFF1F2] font-semibold text-kpc-red"
                    : "text-[#5F6065] hover:bg-[#F6F6F7] hover:text-[#202124]",
                )}
                aria-current={active ? "page" : undefined}
                onClick={() => dispatch({ type: "navigate", view: item.view })}
              >
                <Icon className="size-[18px]" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-black/8 bg-white">
      <div className="border-b border-black/8 px-3 pb-4 pt-3">
        <button
          type="button"
          className="flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-[#707075] hover:bg-[#F5F5F6] hover:text-[#222]"
          onClick={() => dispatch({ type: "navigate", view: "pipeline" })}
        >
          <ArrowLeft className="size-3.5" />
          제안 목록
        </button>
        <div className="mt-3 px-2">
          <p className="line-clamp-2 text-sm font-semibold leading-5 text-[#202124]">
            {selectedProject.title}
          </p>
          <p className="mt-1 truncate text-xs text-[#808086]">{selectedProject.agency}</p>
          <span className="mt-2 inline-flex rounded-full bg-[#FFF1F2] px-2 py-0.5 text-[11px] font-semibold text-kpc-red">
            D-{selectedProject.dDay}
          </span>
        </div>
      </div>

      <nav aria-label="제안서 작성 단계" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {projectSteps.map((item) => {
          const Icon = item.icon;
          const unlocked = canOpenProposalStep(selectedProject, item.step);
          const active = state.activeStep === item.step;
          return (
            <button
              key={item.step}
              type="button"
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left transition-colors",
                active && unlocked
                  ? "bg-[#FFF1F2] text-kpc-red"
                  : unlocked
                    ? "text-[#55565B] hover:bg-[#F6F6F7] hover:text-[#202124]"
                    : "cursor-not-allowed text-[#B2B3B7]",
              )}
              disabled={!unlocked}
              aria-disabled={!unlocked}
              aria-current={active && unlocked ? "step" : undefined}
              title={unlocked ? undefined : "AI 분석 완료 후 열 수 있습니다."}
              onClick={() =>
                dispatch({ type: "navigate", view: "workspace", step: item.step })
              }
            >
              <span className="w-5 text-[10px] font-bold tabular-nums opacity-70">{item.number}</span>
              <Icon className="size-[17px]" />
              <span className="flex-1 text-sm font-medium">{item.label}</span>
              {!unlocked && <Lock className="size-3.5" />}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-black/8 p-3">
        <button
          type="button"
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-[#66676C] hover:bg-[#F6F6F7] hover:text-[#202124]"
          onClick={() => dispatch({ type: "navigate", view: "settings" })}
        >
          <Settings className="size-[17px]" />
          프로젝트 설정
        </button>
      </div>
    </aside>
  );
}
