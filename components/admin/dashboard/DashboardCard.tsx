import WorkspaceCard, { type WorkspaceCardProps } from "@/components/layout/WorkspaceCard";

export default function DashboardCard({ className = "", ...props }: WorkspaceCardProps): React.ReactElement {
  return <WorkspaceCard {...props} className={"tw:shadow-sm tw:shadow-black/3 tw:[&>header>h2]:text-sm " + className} />;
}
