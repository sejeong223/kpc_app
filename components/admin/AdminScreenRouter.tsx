"use client";
import { useAdminRuntime } from "@/components/admin/AdminRuntimeProvider";
import { useAdminAccess } from "@/hooks/admin/use-admin-data";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import UsersPage from "@/components/admin/users/UsersPage";
import ModelTokenPage from "@/components/admin/policy/ModelTokenPage";
import AuditPage from "@/components/admin/audit/AuditPage";
import DashboardPage from "@/components/admin/dashboard/DashboardPage";

interface AdminScreenRouterProps { screen: "users" | "policy" | "audit" | "dashboard"; requestedTab: "models" | "tokens" | null }
function ScreenContent({ screen, requestedTab }: AdminScreenRouterProps): React.ReactElement {
  const access = useAdminAccess();
  if (access.isError) return <AdminAsyncState state="error" message={access.error.message} onRetry={() => void access.refetch()} />;
  if (!access.data) return <AdminAsyncState state="loading" />;
  const allowed = screen === "policy" ? access.data.grants.modelSettings.read || access.data.grants.pricing.read || access.data.grants.tokenPolicies.read || access.data.grants.tokenRequests.read : screen === "users" ? access.data.grants.users.read || access.data.grants.groups.read || access.data.grants.permissions.read : access.data.grants[screen].read;
  if (!allowed) return <AdminAsyncState state="forbidden" />;
  if (screen === "users") return <UsersPage />;
  if (screen === "policy") return <ModelTokenPage requestedTab={requestedTab} />;
  if (screen === "audit") return <AuditPage />;
  return <DashboardPage />;
}
export default function AdminScreenRouter(props: AdminScreenRouterProps): React.ReactElement {
  const { actor } = useAdminRuntime();
  return <ScreenContent key={[actor.userId, actor.role, actor.departmentId].join(":")} {...props} />;
}
