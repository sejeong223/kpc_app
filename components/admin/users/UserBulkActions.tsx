"use client";
import { Button, Select } from "@fluentui/react-components";
import { useState } from "react";
import { ADMIN_ROLES, ADMIN_ROLE_LABELS } from "@/config/admin-permissions";
import { AdminRoleSchema } from "@/lib/admin/schemas";
import { useAdminAccess } from "@/hooks/admin/use-admin-data";
import type { AdminCommand, AdminRole, AdminUser } from "@/types/admin";
interface UserBulkActionsProps { users: readonly AdminUser[]; busy: boolean; onClear(): void; onCommand(command: AdminCommand): Promise<void> }
export default function UserBulkActions({ users, busy, onClear, onCommand }: UserBulkActionsProps): React.ReactElement | null {
  const access = useAdminAccess(), [role, setRole] = useState<AdminRole>("user");
  if (!users.length || !access.data) return null;
  const targets = users.map(({ id, version }) => ({ id, version }));
  return <div className="tw:mb-3 tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:rounded-lg tw:bg-(--kpc-brand-soft) tw:p-3">
    <strong>{users.length}명 선택</strong>{access.data.grants.users.update && <>
      <Select aria-label="일괄 변경할 역할" size="small" value={role} disabled={busy} onChange={(_, d) => { const result = AdminRoleSchema.safeParse(d.value); if (result.success) setRole(result.data); }}>{ADMIN_ROLES.map((r) => <option key={r} value={r}>{ADMIN_ROLE_LABELS[r]}</option>)}</Select>
      <Button size="small" disabled={busy} onClick={() => void onCommand({ type: "change-user-role", targets, role })}>역할 적용</Button>
      <Button size="small" disabled={busy} onClick={() => void onCommand({ type: "set-user-status", targets, status: "locked" })}>잠금</Button>
      <Button size="small" disabled={busy} onClick={() => void onCommand({ type: "set-user-status", targets, status: "active" })}>잠금 해제</Button>
    </>}{access.data.grants.users.delete && <Button size="small" disabled={busy} onClick={() => void onCommand({ type: "delete-users", targets })}>선택 삭제</Button>}
    <Button size="small" appearance="subtle" disabled={busy} onClick={onClear}>선택 해제</Button><span className="tw:text-[11px]">한 명이라도 처리할 수 없으면 전체 변경이 취소됩니다.</span>
  </div>;
}
