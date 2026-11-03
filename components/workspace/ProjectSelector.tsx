"use client";
import { useId } from "react";
import { DadamSelect } from "@/components/ui/DadamControls";
import type { WorkspaceProject } from "@/types/workspace-files";
export interface ProjectSelectorProps {
  projects: readonly Pick<WorkspaceProject, "id" | "name" | "number">[];
  value: string | null; disabled?: boolean; onChange(projectId: string): void;
}
export default function ProjectSelector({ projects, value, disabled, onChange }: ProjectSelectorProps): React.ReactElement {
  const id = useId();
  return <div className="tw:flex tw:min-w-0 tw:max-w-full tw:flex-[0_1_42rem] tw:items-center tw:gap-(--layout-control-gap)">
    <label htmlFor={id} className="tw:shrink-0 tw:font-semibold">프로젝트</label>
    <DadamSelect id={id} className="tw:min-w-0 tw:flex-1" value={value ?? ""} disabled={disabled || !projects.length}
      onChange={(_, data) => { if (projects.some(project => project.id === data.value)) onChange(data.value); }}>
      <option value="" disabled>프로젝트 선택</option>
      {projects.map(project => <option key={project.id} value={project.id}>{project.number} · {project.name}</option>)}
    </DadamSelect>
  </div>;
}
