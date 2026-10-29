"use client";
import { Button, Checkbox, Field, Input } from "@fluentui/react-components";
import { useState } from "react";
import ModalFrame from "@/components/ui/ModalFrame";
import { useAdminCommand, useAdminDirectory, useAdminGroups } from "@/hooks/admin/use-admin-data";
import { GroupDraftSchema } from "@/lib/admin/schemas";
import type { AdminGroupRow, GroupDraft } from "@/types/admin";
interface GroupEditorDialogProps { open: boolean; group: AdminGroupRow | null; onClose(): void }
export default function GroupEditorDialog({ open, group, onClose }: GroupEditorDialogProps): React.ReactElement {
  const command = useAdminCommand(), directory = useAdminDirectory();
  const latest = useAdminGroups({ page: 1, pageSize: 50, search: group?.name ?? "" });
  const [value, setValue] = useState<GroupDraft>({ name: group?.name ?? "", memberIds: group?.members.map((member) => member.id) ?? [] });
  const [version, setVersion] = useState(group?.version ?? 1), [search, setSearch] = useState(""), [error, setError] = useState("");
  async function save() {
    const parsed = GroupDraftSchema.safeParse(value); if (!parsed.success) { setError("그룹 이름과 중복되지 않는 구성원을 확인해 주세요."); return; }
    setError("");
    try { await command.mutateAsync(group ? { type: "update-group", target: { id: group.id, version }, value: parsed.data } : { type: "create-group", value: parsed.data }); onClose(); } catch { /* 입력을 유지한다. */ }
  }
  return <ModalFrame open={open} title={group ? "그룹 편집" : "그룹 추가"} contentKey={group?.id ?? "new-group"} onClose={onClose} footer={<><Button onClick={onClose}>취소</Button><Button appearance="primary" disabled={command.isPending || !directory.data} onClick={() => void save()}>저장</Button></>}>
    <Field label="그룹 이름" validationMessage={error} validationState={error ? "error" : "none"}><Input value={value.name} disabled={command.isPending} onChange={(_, d) => setValue({ ...value, name: d.value })} /></Field>
    <Input aria-label="그룹 구성원 검색" placeholder="구성원 이름 또는 이메일" value={search} onChange={(_, d) => setSearch(d.value)} />
    <div className="tw:flex tw:max-h-64 tw:flex-col tw:overflow-auto">{directory.data?.filter((d) => d.registeredUserId && (d.name + d.email).toLowerCase().includes(search.toLowerCase())).map((d) => <Checkbox key={d.id} label={d.name + " · " + d.email} checked={value.memberIds.includes(d.registeredUserId!)} disabled={command.isPending} onChange={(_, data) => setValue({ ...value, memberIds: data.checked === true ? [...value.memberIds, d.registeredUserId!] : value.memberIds.filter((id) => id !== d.registeredUserId) })} />)}</div>
    {directory.isError && <p role="alert">{directory.error.message}<Button onClick={() => void directory.refetch()}>다시 시도</Button></p>}
    {command.error && <p role="alert">{command.error.message}{command.error.code === "CONFLICT" && <Button onClick={() => { const row = latest.data?.items.find((g) => g.id === group?.id); if (row) { setValue({ name: row.name, memberIds: row.members.map((member) => member.id) }); setVersion(row.version); command.reset(); } else void latest.refetch(); }}>다시 불러오기</Button>}</p>}
  </ModalFrame>;
}
