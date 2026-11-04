"use client";
import { useState } from "react";
import ProjectHeader from "@/components/common/ProjectHeader";
import WorkspacePage from "@/components/layout/WorkspacePage";
import { DadamButton } from "@/components/ui/DadamControls";
import type { WorkspaceSceneProps } from "../WorkspaceScreen";
import { WorkspaceLinks } from "../WorkspaceScreen";
import { useWorkspaceRuntime } from "../WorkspaceProjectProvider";
import type { WorkspaceAssetKind } from "@/types/workspace-production";
import AssetSelectionPanel from "./AssetSelectionPanel";
import ProjectPromptEditor from "./ProjectPromptEditor";
export default function SetupWorkspace({
  view,
  selection,
  selector,
}: WorkspaceSceneProps) {
  const [tab, setTab] = useState<WorkspaceAssetKind>("template"),
    runtime = useWorkspaceRuntime();
  return (
    <WorkspacePage headerComponent={ProjectHeader}
      title="제작 설정"
      leading={selector}
      actions={<WorkspaceLinks current="setup" selection={selection} />}
    >
      <div role="tablist" aria-label="제작 자산" className="tw:flex tw:gap-2">
        {(
          [
            ["template", "Template"],
            ["skill", "Skill"],
            ["prompt", "프롬프트 세트"],
          ] as const
        ).map(([kind, label]) => (
          <DadamButton
            key={kind}
            role="tab"
            aria-selected={tab === kind}
            appearance={tab === kind ? "primary" : "subtle"}
            onClick={() => {
              void runtime.navigate(async () => setTab(kind));
            }}
          >
            {label}
          </DadamButton>
        ))}
      </div>
      <AssetSelectionPanel key={tab} view={view} kind={tab} />
      {tab === "prompt" && <ProjectPromptEditor view={view} />}
    </WorkspacePage>
  );
}
