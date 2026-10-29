"use client";
import { Button, Input } from "@fluentui/react-components";
import { useState } from "react";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import AdminPager from "@/components/admin/ui/AdminPager";
import AdminTable from "@/components/admin/ui/AdminTable";
import ModalFrame from "@/components/ui/ModalFrame";
import { useAdminAccess, useAdminCommand, useAdminGroups } from "@/hooks/admin/use-admin-data";
import type { AdminGroup, AdminGroupRow } from "@/types/admin";
import GroupEditorDialog from "./GroupEditorDialog";

export default function GroupsPanel(): React.ReactElement {
  const [query, setQuery] = useState({ search: "", page: 1, pageSize: 20 as const });
  const groups = useAdminGroups(query), access = useAdminAccess(), command = useAdminCommand();
  const [editor, setEditor] = useState<{ group: AdminGroupRow | null } | null>(null), [deleting, setDeleting] = useState<AdminGroup | null>(null), [undo, setUndo] = useState<string | null>(null), [notice, setNotice] = useState("");
  const grants = access.data?.grants;
  if (!grants?.groups.read) return <AdminAsyncState state="forbidden" />;
  return <AdminCard title="그룹 관리" actions={grants.groups.create && grants.users.read ? <Button appearance="primary" onClick={() => setEditor({ group: null })}>그룹 추가</Button> : undefined}>
    <Input aria-label="그룹 검색" placeholder="그룹 이름 검색" value={query.search} onChange={(_, d) => setQuery({ ...query, search: d.value, page: 1 })} />
    {notice && <p role="status">{notice}{undo && <Button size="small" disabled={command.isPending} onClick={() => command.mutate({ type: "undo-delete", undoToken: undo }, { onSuccess: () => { setUndo(null); setNotice("그룹을 복구했습니다."); } })}>되돌리기</Button>}</p>}
    {command.error && <p role="alert">{command.error.message}</p>}
    {groups.isError ? <AdminAsyncState state="error" onRetry={() => void groups.refetch()} /> : !groups.data ? <AdminAsyncState state="loading" /> : <><AdminTable label="그룹 목록" rows={groups.data.items} emptyMessage="등록된 그룹이 없습니다." columns={[
      { id: "name", label: "그룹", render: (g) => <strong>{g.name}</strong> }, { id: "members", label: "구성원", render: (g) => <span title={g.members.map((m) => m.name).join(", ")}>{g.members.length}명 · {g.members.slice(0, 3).map((m) => m.name).join(", ")}</span> },
      { id: "owner", label: "소유자", render: (g) => g.ownerName }, { id: "updated", label: "수정일", render: (g) => g.updatedAt.slice(0, 10) },
      ...(grants.groups.update || grants.groups.delete ? [{ id: "actions", label: "관리", render: (g: AdminGroupRow) => <div className="tw:flex tw:gap-1">{grants.groups.update && grants.users.read && <Button size="small" onClick={() => setEditor({ group: g })}>편집</Button>}{grants.groups.delete && <Button size="small" onClick={() => setDeleting(g)}>삭제</Button>}</div> }] : []),
    ]} /><AdminPager {...groups.data} onChange={(page) => setQuery({ ...query, page })} /></>}
    {editor && <GroupEditorDialog open group={editor.group} onClose={() => setEditor(null)} />}
    {deleting && <ModalFrame open title="그룹 삭제" contentKey="delete-group" onClose={() => setDeleting(null)} footer={<><Button onClick={() => setDeleting(null)}>취소</Button><Button appearance="primary" disabled={command.isPending} onClick={() => command.mutate({ type: "delete-group", target: { id: deleting.id, version: deleting.version } }, { onSuccess: (r) => { setUndo(r.undoToken); setNotice("그룹을 삭제했습니다. 사용자 계정은 유지됩니다."); setDeleting(null); } })}>삭제</Button></>}><p>{deleting.name} 그룹을 삭제합니다. 이번 세션에서 되돌릴 수 있습니다.</p>{command.error && <p role="alert">{command.error.message}</p>}</ModalFrame>}
  </AdminCard>;
}
