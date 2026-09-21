import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth/guards";
import { APP_ROLES } from "@/lib/auth/roles";

export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requireRole(APP_ROLES.ADMIN, "/admin/general");
  return children;
}
