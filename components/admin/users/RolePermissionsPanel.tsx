"use client";
import { Button, Checkbox } from "@fluentui/react-components";
import { useState } from "react";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import { ADMIN_RESOURCES, ADMIN_RESOURCE_LABELS, ADMIN_ROLE_LABELS, CRUD_ACTIONS, CRUD_CEILING } from "@/config/admin-permissions";
import { useAdminAccess, useAdminCommand, useAdminGrants } from "@/hooks/admin/use-admin-data";
import type { AdminResource, AdminRole, CrudAction, RoleGrants } from "@/types/admin";

export default function RolePermissionsPanel(): React.ReactElement {
  const query = useAdminGrants(), access = useAdminAccess(), command = useAdminCommand();
  const [draft, setDraft] = useState<{ rows: RoleGrants[]; revision: number } | null>(null), [notice, setNotice] = useState("");
  const rows = draft?.rows ?? query.data;
  function change(role: AdminRole, resource: AdminResource, action: CrudAction, checked: boolean) {
    if (!rows || !access.data) return;
    const copy = structuredClone(rows), grants = copy.find((r) => r.role === role)!.grants[resource];
    grants[action] = checked;
    if (action === "read" && !checked) { grants.create = false; grants.update = false; grants.delete = false; }
    setDraft({ rows: copy, revision: draft?.revision ?? access.data.permissionRevision }); setNotice("");
  }
  if (!access.data?.grants.permissions.read) return <AdminAsyncState state="forbidden" />;
  return <AdminCard title="역할별 CRUD 권한" actions={<div className="tw:flex tw:gap-2"><Button disabled={command.isPending} onClick={() => { setDraft(null); command.reset(); void query.refetch(); }}>다시 불러오기</Button>{access.data.grants.permissions.update && <Button appearance="primary" disabled={!draft || command.isPending} onClick={() => { if (draft) command.mutate({ type: "save-grants", permissionRevision: draft.revision, rows: draft.rows }, { onSuccess: () => { setDraft(null); setNotice("역할별 권한을 저장했습니다."); } }); }}>변경 저장</Button>}</div>}>
    <p className="tw:mt-0 tw:text-(--kpc-secondary)">역할에 허용된 범위 안에서 설정합니다. 조회를 해제하면 같은 항목의 생성·수정·삭제도 해제됩니다.</p>
    {notice && <p role="status">{notice}</p>}{command.error && <p role="alert">{command.error.message} 입력값은 유지됩니다.</p>}
    {!rows ? <AdminAsyncState state={query.isError ? "error" : "loading"} onRetry={() => void query.refetch()} /> : rows.map((row) => <section key={row.role} className="tw:mb-5 tw:overflow-x-auto">
      <h3 className="tw:text-[13px]">{ADMIN_ROLE_LABELS[row.role]}{draft && <span className="tw:ml-2 tw:text-[11px] tw:text-(--kpc-brand)">미저장 변경</span>}</h3>
      <table className="tw:w-full tw:border-collapse tw:text-[12px]"><caption className="tw:sr-only">{ADMIN_ROLE_LABELS[row.role]}의 리소스별 권한</caption><thead><tr className="tw:bg-(--kpc-bg)"><th className="tw:p-2 tw:text-left" scope="col">메뉴 / 기능</th>{CRUD_ACTIONS.map((a) => <th key={a} scope="col">{{ create: "생성", read: "조회", update: "수정", delete: "삭제" }[a]}</th>)}</tr></thead>
        <tbody>{ADMIN_RESOURCES.map((resource) => <tr key={resource} className="tw:border-0 tw:border-b tw:border-solid tw:border-(--kpc-line-soft)"><th scope="row" className="tw:p-2 tw:text-left tw:font-normal">{ADMIN_RESOURCE_LABELS[resource]}</th>{CRUD_ACTIONS.map((action) => {
          const ceiling = CRUD_CEILING.find((c) => c.role === row.role)!.grants[resource][action], fixed = row.role === "super_admin" && resource === "permissions" && ["read", "update"].includes(action);
          return <td key={action} className="tw:text-center">{ceiling ? <Checkbox aria-label={ADMIN_ROLE_LABELS[row.role] + " " + ADMIN_RESOURCE_LABELS[resource] + " " + action} title={fixed ? "관리자 잠금 방지를 위해 고정된 권한입니다." : action !== "read" && !row.grants[resource].read ? "조회 권한을 먼저 선택해 주세요." : undefined} checked={row.grants[resource][action]} disabled={fixed || command.isPending || !access.data?.grants.permissions.update || (action !== "read" && !row.grants[resource].read)} onChange={(_, d) => change(row.role, resource, action, d.checked === true)} /> : <span title="이 역할에서 허용되지 않는 작업입니다.">—</span>}</td>;
        })}</tr>)}</tbody>
      </table>
    </section>)}
  </AdminCard>;
}
