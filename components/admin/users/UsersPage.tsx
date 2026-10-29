"use client";
import { Button, Input, Select } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import { AdminCard, AdminMetric, AdminPage } from "@/components/admin/ui/AdminPrimitives";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import AdminPager from "@/components/admin/ui/AdminPager";
import AdminTabs from "@/components/admin/ui/AdminTabs";
import ModalFrame from "@/components/ui/ModalFrame";
import { ADMIN_ROLES, ADMIN_ROLE_LABELS } from "@/config/admin-permissions";
import { useAdminAccess, useAdminCommand, useAdminUsers, useExportUsers } from "@/hooks/admin/use-admin-data";
import { downloadCsv } from "@/lib/admin/csv";
import { UserStatusSchema } from "@/lib/admin/schemas";
import type { AdminCommand, AdminUser, UserQuery } from "@/types/admin";
import UserTable from "./UserTable";
import UserBulkActions from "./UserBulkActions";
import UserEditorDialog from "./UserEditorDialog";
import DirectoryPickerDialog from "./DirectoryPickerDialog";
import GroupsPanel from "./GroupsPanel";
import RolePermissionsPanel from "./RolePermissionsPanel";

type UsersTab = "users" | "groups" | "permissions";
export default function UsersPage(): React.ReactElement {
  const access = useAdminAccess(), command = useAdminCommand(), exporting = useExportUsers();
  const [tab, setTab] = useState<UsersTab>("users"), [search, setSearch] = useState("");
  const [query, setQuery] = useState<UserQuery>({ search: "", departmentId: null, role: "all", status: "all", page: 1, pageSize: 20 });
  const list = useAdminUsers(query);
  const [selected, setSelected] = useState<AdminUser[]>([]), [editor, setEditor] = useState<{ user: AdminUser | null } | null>(null), [directory, setDirectory] = useState(false);
  const [deleting, setDeleting] = useState<AdminUser[]>([]), [undo, setUndo] = useState<string | null>(null), [notice, setNotice] = useState("");
  useEffect(() => { const timer = setTimeout(() => { setQuery((q) => q.search === search ? q : { ...q, search, page: 1 }); }, 250); return () => clearTimeout(timer); }, [search]);
  const changeQuery = (next: Partial<UserQuery>) => { setQuery({ ...query, ...next, page: 1 }); setSelected([]); };
  async function execute(value: AdminCommand): Promise<void> {
    if (value.type === "delete-users") { setDeleting(selected.filter((u) => value.targets.some((t) => t.id === u.id))); return; }
    try { await command.mutateAsync(value); setSelected([]); setNotice(value.type === "resend-invite" ? "초대 대기 상태를 예시로 갱신했습니다." : "변경사항을 저장했습니다."); } catch { /* 선택을 유지한다. */ }
  }
  if (!access.data) return <AdminAsyncState state={access.isError ? "error" : "loading"} onRetry={() => void access.refetch()} />;
  const { actor, grants, departments } = access.data;
  const options: { value: UsersTab; label: string }[] = [];
  if (grants.users.read) options.push({ value: "users", label: "사용자" });
  if (grants.groups.read) options.push({ value: "groups", label: "그룹" });
  if (grants.permissions.read) options.push({ value: "permissions", label: "역할별 권한" });
  const currentTab = options.find((o) => o.value === tab)?.value ?? options[0]?.value;
  if (!currentTab) return <AdminAsyncState state="forbidden" />;
  return <AdminPage title="사용자 설정" description={actor.role === "department_admin" ? "소속 부서의 사용자 현황을 확인합니다." : "사용자와 그룹, 역할별 권한을 관리합니다."} actions={currentTab === "users" ? <>
    <Button disabled={exporting.isPending} onClick={() => exporting.mutate(query, { onSuccess: (csv) => downloadCsv("사용자-2026-10-20.csv", csv) })}>목록 내보내기</Button>
    {grants.users.create && <Button appearance="primary" onClick={() => setDirectory(true)}>사용자 추가</Button>}
  </> : undefined}>
    <AdminTabs label="사용자 설정 탭" value={currentTab} options={options} onChange={(value) => { setTab(value); setSelected([]); }} />
    {currentTab === "groups" && <GroupsPanel />}{currentTab === "permissions" && <RolePermissionsPanel />}
    {currentTab === "users" && <>
      {list.data && <div className="tw:grid tw:grid-cols-2 tw:gap-3 tw:lg:grid-cols-4">{(["all", ...ADMIN_ROLES] as const).map((role) => <AdminMetric key={role} label={role === "all" ? "전체 사용자" : ADMIN_ROLE_LABELS[role]} value={String(list.data!.roleCounts[role])} selected={query.role === role} onClick={() => changeQuery({ role: query.role === role ? "all" : role })} tone={role === "super_admin" ? "brand" : "neutral"} />)}</div>}
      <AdminCard title="사용자 목록" actions={list.data && <span className="tw:text-[11px] tw:text-(--kpc-muted)">활성 {list.data.statusCounts.active} · 초대 대기 {list.data.statusCounts.invited} · 잠김 {list.data.statusCounts.locked}</span>}>
        <div className="tw:mb-3 tw:flex tw:flex-wrap tw:gap-2"><Input aria-label="사용자 검색" placeholder="이름 또는 이메일 검색" value={search} onChange={(_, d) => { setSearch(d.value); setSelected([]); }} />
          <Select aria-label="부서 필터" value={actor.role === "department_admin" ? actor.departmentId ?? "" : query.departmentId ?? ""} disabled={actor.role === "department_admin"} onChange={(_, d) => changeQuery({ departmentId: d.value || null })}>{actor.role === "super_admin" && <option value="">전체 부서</option>}{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
          <Select aria-label="사용자 상태" value={query.status} onChange={(_, d) => { const result = UserStatusSchema.safeParse(d.value); changeQuery({ status: result.success ? result.data : "all" }); }}><option value="all">전체 상태</option><option value="active">활성</option><option value="invited">초대 대기</option><option value="locked">잠김</option></Select>
        </div>
        {notice && <p role="status">{notice}{undo && <Button size="small" disabled={command.isPending} onClick={() => command.mutate({ type: "undo-delete", undoToken: undo }, { onSuccess: () => { setUndo(null); setNotice("삭제를 되돌렸습니다."); } })}>되돌리기</Button>}</p>}
        {(command.error || exporting.error) && <p role="alert">{command.error?.message ?? exporting.error?.message}</p>}
        <UserBulkActions users={selected} busy={command.isPending} onClear={() => setSelected([])} onCommand={execute} />
        {list.isError ? <AdminAsyncState state="error" onRetry={() => void list.refetch()} /> : !list.data ? <AdminAsyncState state="loading" /> : <>
          <UserTable rows={list.data.rows.items} departments={departments} actor={actor} grants={grants} busy={command.isPending} selectedIds={selected.map((u) => u.id)} onSelectionChange={(ids) => setSelected(list.data!.rows.items.filter((u) => ids.includes(u.id)))} onEdit={(user) => setEditor({ user })} onRoleChange={(user, role) => void execute({ type: "change-user-role", targets: [{ id: user.id, version: user.version }], role })} onDelete={(users) => setDeleting([...users])} onResend={(user) => void execute({ type: "resend-invite", target: { id: user.id, version: user.version } })} />
          <AdminPager {...list.data.rows} onChange={(page) => { setQuery({ ...query, page }); setSelected([]); }} />
        </>}
      </AdminCard>
    </>}
    {editor && <UserEditorDialog open user={editor.user} departments={departments} onClose={() => { setEditor(null); void list.refetch(); }} />}
    {directory && <DirectoryPickerDialog open onClose={() => setDirectory(false)} onDirectRegister={() => { setDirectory(false); setEditor({ user: null }); }} />}
    {deleting.length > 0 && <ModalFrame open title="사용자 삭제" contentKey="delete-users" onClose={() => setDeleting([])} footer={<><Button onClick={() => setDeleting([])}>취소</Button><Button appearance="primary" disabled={command.isPending} onClick={() => command.mutate({ type: "delete-users", targets: deleting.map(({ id, version }) => ({ id, version })) }, { onSuccess: (receipt) => { setUndo(receipt.undoToken); setDeleting([]); setSelected([]); setNotice("사용자를 삭제했습니다. 기존 활동 이력은 보존됩니다."); } })}>삭제</Button></>}><p>{deleting.map((u) => u.name).join(", ")} · {deleting.length}명을 삭제합니다. 이번 세션에서 되돌릴 수 있습니다.</p>{command.error && <p role="alert">{command.error.message}</p>}</ModalFrame>}
  </AdminPage>;
}
