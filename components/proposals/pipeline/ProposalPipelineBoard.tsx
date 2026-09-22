import { CalendarClock, ClipboardCheck, FolderKanban, Plus, Search, X } from "lucide-react";

import ProposalStageColumn from "@/components/proposals/pipeline/ProposalStageColumn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  filterProposalProjects,
  groupProjectsByStage,
  type ProposalWorkspaceAction,
} from "@/lib/proposals/workspace";
import type {
  ProposalDepartment,
  ProposalStage,
  ProposalWorkspaceState,
} from "@/types/proposals";

interface ProposalPipelineBoardProps {
  state: ProposalWorkspaceState;
  dispatch: React.Dispatch<ProposalWorkspaceAction>;
  canReview: boolean;
}

const stages: ProposalStage[] = ["검토 대기", "검토 중", "진행", "진행 안 함"];
const departments: ProposalDepartment[] = [
  "전체",
  "AI산업본부",
  "AI사업본부",
  "컨설팅본부",
  "교육사업본부",
  "생산성본부",
  "CX본부",
  "자격사업본부",
];

export default function ProposalPipelineBoard({
  state,
  dispatch,
  canReview,
}: ProposalPipelineBoardProps): React.ReactElement {
  const filteredProjects = filterProposalProjects(state);
  const groupedProjects = groupProjectsByStage(filteredProjects);
  const summaries = [
    { label: "전체 프로젝트", value: state.projects.length, icon: FolderKanban },
    {
      label: "진행 프로젝트",
      value: state.projects.filter((project) => project.stage === "진행").length,
      icon: ClipboardCheck,
    },
    {
      label: "검토 중",
      value: state.projects.filter((project) => project.stage === "검토 중").length,
      icon: Search,
    },
    {
      label: "30일 이내 마감",
      value: state.projects.filter((project) => project.dDay >= 0 && project.dDay <= 30).length,
      icon: CalendarClock,
    },
  ];

  const openProject = (projectId: string) => {
    dispatch({ type: "select-project", projectId });
    dispatch({ type: "navigate", view: "project-review" });
  };

  const openWorkspace = (projectId: string) => {
    dispatch({ type: "select-project", projectId });
    dispatch({ type: "navigate", view: "workspace", step: "setup" });
  };

  const moveProject = (projectId: string, stage: ProposalStage) => {
    dispatch({ type: "update-stage", projectId, stage });
  };

  const clearFilters = () => {
    dispatch({ type: "set-search-query", query: "" });
    dispatch({ type: "set-department", department: "전체" });
  };

  return (
    <section className="min-h-full bg-[#F8F9FA] p-4 lg:p-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#202124]">제안 목록</h1>
          <p className="mt-1 text-sm text-[#77787E]">
            제안 기회를 검토하고 수주 진행 상태를 한눈에 관리합니다.
          </p>
        </div>
        <Button
          className="bg-kpc-red text-white hover:bg-[#CA0010]"
          onClick={() => dispatch({ type: "navigate", view: "register" })}
        >
          <Plus className="size-4" />
          새 프로젝트 등록
        </Button>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {summaries.map((summary) => {
          const Icon = summary.icon;
          return (
            <div
              key={summary.label}
              className="flex items-center gap-3 rounded-xl border border-black/7 bg-white px-4 py-3.5 shadow-[0_2px_10px_rgba(20,20,20,0.03)]"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-[#F5F5F6] text-[#68696F]">
                <Icon className="size-[18px]" />
              </span>
              <div>
                <p className="text-[11px] font-medium text-[#898A90]">{summary.label}</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-[#292A2F]">
                  {summary.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-black/7 bg-white p-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">제안 검색</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#96979C]" />
          <Input
            value={state.searchQuery}
            className="border-black/10 bg-[#FAFAFB] pl-9 shadow-none"
            placeholder="프로젝트, 발주처, 담당자 검색"
            onChange={(event) =>
              dispatch({ type: "set-search-query", query: event.target.value })
            }
          />
        </label>
        <Select
          value={state.selectedDepartment}
          onValueChange={(value) =>
            dispatch({ type: "set-department", department: value as ProposalDepartment })
          }
        >
          <SelectTrigger className="w-full border-black/10 bg-white shadow-none sm:w-44">
            <SelectValue aria-label="담당 본부" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((department) => (
              <SelectItem key={department} value={department}>
                {department}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-black/12 bg-white px-6 py-16 text-center">
          <Search className="mx-auto size-8 text-[#B0B1B5]" />
          <h2 className="mt-4 text-base font-semibold text-[#404146]">조건에 맞는 제안이 없습니다.</h2>
          <p className="mt-1 text-sm text-[#85868B]">검색어 또는 담당 본부를 초기화해 보세요.</p>
          <Button variant="outline" className="mt-5" onClick={clearFilters}>
            <X className="size-4" />
            필터 초기화
          </Button>
        </div>
      ) : (
        <div className="mt-5 grid auto-cols-[minmax(280px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-3 lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible lg:pb-0">
          {stages.map((stage) => (
            <ProposalStageColumn
              key={stage}
              stage={stage}
              projects={groupedProjects[stage]}
              canReview={canReview}
              onOpen={openProject}
              onMove={moveProject}
              onOpenWorkspace={openWorkspace}
            />
          ))}
        </div>
      )}
    </section>
  );
}
