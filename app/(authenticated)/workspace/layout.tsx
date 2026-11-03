import WorkspaceProjectProvider from "@/components/workspace/WorkspaceProjectProvider";
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <WorkspaceProjectProvider>{children}</WorkspaceProjectProvider>;
}
