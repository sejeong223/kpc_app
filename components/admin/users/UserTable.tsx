"use client";
import { Badge, Button, Select } from "@fluentui/react-components";
import AdminTable, { type AdminColumn } from "@/components/admin/ui/AdminTable";
import { ADMIN_ROLES, ADMIN_ROLE_LABELS } from "@/config/admin-permissions";
import { AdminRoleSchema } from "@/lib/admin/schemas";
import type { AdminAccessView, AdminActor, AdminDepartment, AdminRole, AdminUser } from "@/types/admin";
interface UserTableProps {
  rows: readonly AdminUser[]; departments: readonly AdminDepartment[]; selectedIds: readonly string[]; onSelectionChange(ids: string[]): void;
  actor: AdminActor; grants: AdminAccessView["grants"]; busy: boolean; onEdit(user: AdminUser): void; onRoleChange(user: AdminUser, role: AdminRole): void;
  onDelete(users: readonly AdminUser[]): void; onResend(user: AdminUser): void;
}
export default function UserTable({ rows, departments, selectedIds, onSelectionChange, actor, grants, busy, onEdit, onRoleChange, onDelete, onResend }: UserTableProps): React.ReactElement {
  const columns: AdminColumn<AdminUser>[] = [
    { id: "name", label: "이름 / 직급", render: (u) => <div className="tw:min-w-24"><strong>{u.name}</strong>{u.id === actor.userId && <span className="tw:ml-1 tw:text-(--kpc-brand)">본인</span>}<div className="tw:text-[11px] tw:text-(--kpc-muted)">{u.title}</div></div> },
    { id: "email", label: "이메일", render: (u) => u.email },
    { id: "department", label: "부서", render: (u) => departments.find((d) => d.id === u.departmentId)?.name ?? "소속 미지정" },
    { id: "role", label: "역할", render: (u) => grants.users.update ? <Select size="small" aria-label={u.name + " 역할"} value={u.role} disabled={busy || u.id === actor.userId} title={u.id === actor.userId ? "본인 역할은 변경할 수 없습니다." : undefined} onChange={(_, data) => { const role = AdminRoleSchema.safeParse(data.value); if (role.success) onRoleChange(u, role.data); }}>{ADMIN_ROLES.map((r) => <option key={r} value={r}>{ADMIN_ROLE_LABELS[r]}</option>)}</Select> : ADMIN_ROLE_LABELS[u.role] },
    { id: "status", label: "상태", render: (u) => <Badge appearance="tint" color={u.status === "active" ? "success" : u.status === "locked" ? "danger" : "warning"}>{u.status === "active" ? "활성" : u.status === "locked" ? "잠김" : "초대 대기"}</Badge> },
    { id: "lastSeen", label: "최근 접속", render: (u) => <span className="tw:whitespace-nowrap">{u.lastSeenAt ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(u.lastSeenAt)) : "—"}</span> },
  ];
  if (grants.users.update || grants.users.delete) columns.push({ id: "manage", label: "관리", render: (u) => <div className="tw:flex tw:gap-1">
    {grants.users.update && <Button size="small" disabled={busy} onClick={() => onEdit(u)}>편집</Button>}
    {grants.users.update && u.status === "invited" && <Button size="small" disabled={busy} onClick={() => onResend(u)}>재초대</Button>}
    {grants.users.delete && <Button size="small" disabled={busy || u.id === actor.userId} title={u.id === actor.userId ? "본인은 삭제할 수 없습니다." : undefined} onClick={() => onDelete([u])}>삭제</Button>}
  </div> });
  return <AdminTable label="사용자 목록" rows={rows} columns={columns} selectedIds={selectedIds} onSelectionChange={grants.users.update || grants.users.delete ? onSelectionChange : undefined} isSelectable={(u) => u.id !== actor.userId && !busy} emptyMessage="조건에 맞는 사용자가 없습니다." />;
}
