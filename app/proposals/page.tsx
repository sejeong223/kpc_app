import ProposalWorkspace from "@/components/proposals/ProposalWorkspace";
import { APP_ROLES, hasRole } from "@/lib/auth/roles";
import AuthService from "@/services/AuthService";

export default async function ProposalPage(): Promise<React.ReactElement> {
  const authService = new AuthService();
  const authEnabled = authService.isEnabled();
  const session = authEnabled ? await authService.getSession() : null;
  const canReview =
    !authEnabled || hasRole(session?.user.roles, APP_ROLES.ADMIN);

  return <ProposalWorkspace canReview={canReview} />;
}
