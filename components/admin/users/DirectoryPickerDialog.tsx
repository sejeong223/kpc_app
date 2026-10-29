"use client";
import { Badge, Button, Checkbox, Field, Input, Select } from "@fluentui/react-components";
import { useState } from "react";
import ModalFrame from "@/components/ui/ModalFrame";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import AdminTable from "@/components/admin/ui/AdminTable";
import { useAdminAccess, useAdminCommand, useAdminDirectory } from "@/hooks/admin/use-admin-data";
import { ADMIN_ROLES, ADMIN_ROLE_LABELS } from "@/config/admin-permissions";
import { AdminRoleSchema } from "@/lib/admin/schemas";
import type { AdminRole } from "@/types/admin";
interface DirectoryPickerDialogProps { open: boolean; onClose(): void; onDirectRegister(): void }
export default function DirectoryPickerDialog({ open, onClose, onDirectRegister }: DirectoryPickerDialogProps): React.ReactElement {
  const directory = useAdminDirectory(), access = useAdminAccess(), command = useAdminCommand();
  const [search, setSearch] = useState(""), [ids, setIds] = useState<string[]>([]), [role, setRole] = useState<AdminRole>("user"), [invite, setInvite] = useState(true);
  const rows = (directory.data ?? []).filter((d) => (d.name + d.email + (access.data?.departments.find((dept) => dept.id === d.departmentId)?.name ?? "")).toLowerCase().includes(search.trim().toLowerCase()));
  return <ModalFrame open={open} title="사용자 추가" subtitle="조직 디렉터리 예시입니다. 실제 조직 조회나 초대 메일을 보내지 않습니다." width={760} contentKey="directory" onClose={onClose} footer={<><Button onClick={onDirectRegister} disabled={command.isPending}>직접 등록</Button><span className="tw:flex-1" /><Button onClick={onClose}>취소</Button><Button appearance="primary" disabled={!ids.length || command.isPending} onClick={() => command.mutate({ type: "add-directory-users", ids, role, invite }, { onSuccess: onClose })}>{ids.length}명 추가</Button></>}>
    <Input aria-label="디렉터리 검색" placeholder="이름, 이메일, 부서 검색" value={search} onChange={(_, d) => { setSearch(d.value); setIds([]); }} />
    {directory.isError ? <AdminAsyncState state="error" onRetry={() => void directory.refetch()} /> : !directory.data ? <AdminAsyncState state="loading" /> : <AdminTable label="조직 디렉터리" rows={rows} selectedIds={ids} onSelectionChange={setIds} isSelectable={(d) => d.registeredUserId === null && !command.isPending} emptyMessage="검색 결과가 없습니다." columns={[
      { id: "name", label: "이름", render: (d) => d.name }, { id: "email", label: "이메일", render: (d) => d.email },
      { id: "department", label: "부서", render: (d) => access.data?.departments.find((dept) => dept.id === d.departmentId)?.name ?? "미지정" },
      { id: "registered", label: "등록", render: (d) => d.registeredUserId ? <Badge appearance="tint">등록됨</Badge> : "미등록" },
    ]} />}
    <Field label="추가할 역할"><Select value={role} disabled={command.isPending} onChange={(_, d) => { const r = AdminRoleSchema.safeParse(d.value); if (r.success) setRole(r.data); }}>{ADMIN_ROLES.map((r) => <option key={r} value={r}>{ADMIN_ROLE_LABELS[r]}</option>)}</Select></Field>
    <Checkbox label="초대 대기 상태로 등록" checked={invite} disabled={command.isPending} onChange={(_, d) => setInvite(d.checked === true)} />
    {command.error && <p role="alert">{command.error.message}</p>}
  </ModalFrame>;
}
