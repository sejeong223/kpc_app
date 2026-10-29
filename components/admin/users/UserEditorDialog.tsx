"use client";
import { Button, Checkbox, Field, Input, Select } from "@fluentui/react-components";
import { useState } from "react";
import ModalFrame from "@/components/ui/ModalFrame";
import { ADMIN_ROLES, ADMIN_ROLE_LABELS } from "@/config/admin-permissions";
import { useAdminCommand, useAdminUsers } from "@/hooks/admin/use-admin-data";
import { useAdminRuntime } from "@/components/admin/AdminRuntimeProvider";
import { AdminRoleSchema, NewAdminUserSchema } from "@/lib/admin/schemas";
import type { AdminDepartment, AdminUser, NewAdminUser } from "@/types/admin";
interface UserEditorDialogProps { open: boolean; user: AdminUser | null; departments: readonly AdminDepartment[]; onClose(): void }
export default function UserEditorDialog({ open, user, departments, onClose }: UserEditorDialogProps): React.ReactElement {
  const command = useAdminCommand(), { actor } = useAdminRuntime();
  const [version, setVersion] = useState(user?.version ?? 1);
  const [value, setValue] = useState<NewAdminUser>({ name: user?.name ?? "", email: user?.email ?? "", departmentId: user?.departmentId ?? null, title: user?.title ?? "연구원", role: user?.role ?? "user", invite: true });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const latest = useAdminUsers({ page: 1, pageSize: 20, search: user?.email ?? "", departmentId: null, role: "all", status: "all" });
  async function save() {
    const result = NewAdminUserSchema.safeParse(value);
    if (!result.success) { setErrors(Object.fromEntries(result.error.issues.map((i) => [String(i.path[0]), "입력 형식과 길이를 확인해 주세요."]))); return; }
    if (value.role === "department_admin" && !value.departmentId) { setErrors({ departmentId: "관리자의 소속 부서를 선택해 주세요." }); return; }
    setErrors({});
    try {
      if (user) { const { name, departmentId, title, role } = result.data; await command.mutateAsync({ type: "update-user", target: { id: user.id, version }, value: { name, departmentId, title, role } }); }
      else await command.mutateAsync({ type: "create-user", value: result.data });
      onClose();
    } catch { /* 오류와 입력값을 유지해 다시 확인할 수 있게 한다. */ }
  }
  function reload() { const row = latest.data?.rows.items.find((u) => u.id === user?.id); if (row) { setVersion(row.version); setValue({ name: row.name, email: row.email, departmentId: row.departmentId, title: row.title, role: row.role, invite: true }); command.reset(); } else void latest.refetch(); }
  return <ModalFrame open={open} title={user ? "사용자 편집" : "사용자 직접 등록"} contentKey={user?.id ?? "new-user"} onClose={onClose} footer={<><Button onClick={onClose}>취소</Button><Button appearance="primary" disabled={command.isPending} onClick={() => void save()}>{command.isPending ? "저장 중…" : "저장"}</Button></>}>
    {(["name", "email", "title"] as const).map((field) => <Field key={field} label={{ name: "이름", email: "이메일", title: "직급" }[field]} validationMessage={errors[field]} validationState={errors[field] ? "error" : "none"}><Input value={value[field]} disabled={command.isPending} readOnly={field === "email" && Boolean(user)} onChange={(_, d) => setValue({ ...value, [field]: d.value })} /></Field>)}
    <Field label="부서" validationMessage={errors.departmentId} validationState={errors.departmentId ? "error" : "none"}><Select value={value.departmentId ?? ""} disabled={command.isPending} onChange={(_, d) => setValue({ ...value, departmentId: d.value || null })}><option value="">소속 미지정</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
    <Field label="역할" hint={user?.id === actor.userId ? "본인 역할은 변경할 수 없습니다." : undefined}><Select disabled={command.isPending || user?.id === actor.userId} value={value.role} onChange={(_, d) => { const r = AdminRoleSchema.safeParse(d.value); if (r.success) setValue({ ...value, role: r.data }); }}>{ADMIN_ROLES.map((r) => <option key={r} value={r}>{ADMIN_ROLE_LABELS[r]}</option>)}</Select></Field>
    {!user && <Checkbox label="초대 대기 상태로 등록 (예시 · 메일 발송 없음)" checked={value.invite} disabled={command.isPending} onChange={(_, d) => setValue({ ...value, invite: d.checked === true })} />}
    {command.error && <div role="alert">{command.error.message}{command.error.code === "CONFLICT" && <Button onClick={reload}>다시 불러오기</Button>}</div>}
  </ModalFrame>;
}
