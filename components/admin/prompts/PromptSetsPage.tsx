"use client";
import { DadamButton as Button } from "@/components/ui/DadamControls";
import { useEffect, useRef, useState } from "react";
import { useAdminRuntime } from "@/components/admin/AdminRuntimeProvider";
import { AdminPage } from "@/components/admin/ui/AdminPrimitives";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import AssetVisibilityField from "@/components/admin/assets/AssetVisibilityField";
import ModalFrame from "@/components/ui/ModalFrame";
import { usePromptSet, usePromptSets, usePromptAudience, usePromptCommand } from "@/hooks/admin/use-prompt-sets";
import { adminQueryKey } from "@/lib/admin/query-keys";
import type { AssetVisibility } from "@/types/admin-assets";
import type { PromptCommand, PromptDetail, PromptQuery } from "@/types/admin-prompts";
import PromptListPanel from "./PromptListPanel";
import PromptDetailPage from "./PromptDetailPage";
import PromptEditorPage from "./PromptEditorPage";
export const defaultPromptQuery: PromptQuery = { search: "", departmentId: null, visibility: "all", status: "all", page: 1, pageSize: 10, sort: "updatedAt", direction: "desc" };
export default function PromptSetsPage(): React.ReactElement {
  const { access, actor, service, revision, queryClient } = useAdminRuntime(), [query, setQuery] = useState(defaultPromptQuery), list = usePromptSets(query), audience = usePromptAudience(), command = usePromptCommand();
  const [selectedId, setSelectedId] = useState<string | null>(null), detail = usePromptSet(selectedId);
  const [editor, setEditor] = useState<{ detail: PromptDetail | null } | null>(null), [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<{ id: string; version: number } | null>(null), [visibility, setVisibility] = useState<{ value: AssetVisibility; version: number } | null>(null);
  const listRoot = useRef<HTMLDivElement>(null), returnId = useRef<string | null>(null), restoreFocus = useRef(false);
  const openRequest = useRef(0);
  useEffect(() => () => { openRequest.current++; }, []);
  useEffect(() => {
    if (selectedId || editor || !restoreFocus.current || !list.data) return;
    const frame = requestAnimationFrame(() => {
      const target = [...listRoot.current?.querySelectorAll<HTMLButtonElement>("[data-prompt-open]") ?? []].find(button => button.dataset.promptOpen === returnId.current) ?? listRoot.current?.querySelector<HTMLButtonElement>("[data-prompt-create]");
      target?.focus(); restoreFocus.current = false;
    }); return () => cancelAnimationFrame(frame);
  }, [selectedId, editor, list.data]);
  function closeDetail() { openRequest.current++; returnId.current = selectedId; restoreFocus.current = true; setSelectedId(null); command.reset(); }
  async function open(id: string, edit = false) {
    const request = ++openRequest.current; command.reset(); setSelectedId(id);
    if (!edit) return;
    try {
      const result = await queryClient.fetchQuery({ queryKey: adminQueryKey({ actor, revision, kind: "prompt-set", filter: { promptSetId: id } }), queryFn: () => service.getPromptSet(actor, id) });
      if (request === openRequest.current && result.row.capabilities.update) setEditor({ detail: result });
    } catch { /* 상세 조회의 오류·재시도 UI를 유지한다. */ }
  }
  async function execute(value: PromptCommand) {
    if (command.isPending) return;
    try {
      const result = await command.mutateAsync(value);
      setVisibility(null); setDeleting(null);
      if (value.type === "delete-prompt-set") { closeDetail(); setNotice("프롬프트 세트를 삭제했습니다."); }
      else if (value.type === "duplicate-prompt-set") { open(result.id); setNotice("비공개·초안 사본을 만들었습니다."); }
      else setNotice("변경사항을 저장했습니다.");
    } catch { /* 오류를 표시하고 편집 내용을 유지한다. */ }
  }
  if (!access?.grants.promptSets.read) return <AdminPage title="프롬프트 세트"><AdminAsyncState state="forbidden" /></AdminPage>;
  if (editor) return <PromptEditorPage key={editor.detail?.row.id ?? "new"} detail={editor.detail} onClose={() => { setEditor(null); restoreFocus.current = true; }}
    onSaved={id => { setEditor(null); setSelectedId(id); setNotice("프롬프트 세트를 저장했습니다."); }} />;
  if (selectedId) return <>
    {!detail.data ? <AdminPage title="프롬프트 세트" leading={<Button onClick={closeDetail}>← 목록으로</Button>}><AdminAsyncState state={detail.isError ? "error" : "loading"} message={detail.error?.message} onRetry={() => void detail.refetch()} /></AdminPage> :
      <PromptDetailPage key={selectedId} detail={detail.data} audience={audience.data} busy={command.isPending} error={command.error?.message} onClose={closeDetail} onEdit={() => setEditor({ detail: detail.data! })}
        onVisibility={() => { command.reset(); setVisibility({ value: structuredClone(detail.data!.row.visibility), version: detail.data!.row.version }); }}
        onDelete={() => { command.reset(); setDeleting({ id: selectedId, version: detail.data!.row.version }); }} onCommand={value => void execute(value)} />}
    {visibility && detail.data?.row.capabilities.update && <ModalFrame open title="공개 범위" contentKey="prompt-visibility" onClose={() => { if (!command.isPending) setVisibility(null); }}
      footer={<><Button disabled={command.isPending} onClick={() => setVisibility(null)}>취소</Button><Button appearance="primary" disabled={command.isPending || !audience.data} onClick={() => void execute({ type: "set-prompt-visibility", target: { id: selectedId, version: visibility.version }, visibility: visibility.value })}>공개 범위 저장</Button></>}>
      {command.error && <p role="alert">{command.error.message}</p>}<AssetVisibilityField value={visibility.value} candidates={audience.data ?? { departments: [], users: [], groups: [] }} disabled={command.isPending || !audience.data} onChange={value => setVisibility({ ...visibility, value })} />
      {audience.isError && <AdminAsyncState state="error" message={audience.error.message} onRetry={() => void audience.refetch()} />}
    </ModalFrame>}
    {deleting && detail.data?.row.capabilities.delete && <ModalFrame open title="프롬프트 세트 삭제" contentKey="prompt-delete" onClose={() => { if (!command.isPending) setDeleting(null); }} footer={<><Button disabled={command.isPending} onClick={() => setDeleting(null)}>취소</Button><Button appearance="primary" disabled={command.isPending} onClick={() => void execute({ type: "delete-prompt-set", target: deleting })}>삭제 확인</Button></>}>
      <p>{detail.data.row.name}을 목록에서 삭제합니다. 기존 프로젝트의 적용 버전은 유지됩니다.</p>{command.error && <p role="alert">{command.error.message}</p>}
    </ModalFrame>}
  </>;
  return <div ref={listRoot}><AdminPage title="프롬프트 세트">
    {notice && <p role="status">{notice}</p>}{command.error && <p role="alert">{command.error.message}</p>}
    <PromptListPanel query={query} onQueryChange={setQuery} list={list.data} audience={audience.data} loading={list.isPending} error={list.error?.message} busy={command.isPending} canCreate={access.grants.promptSets.create}
      onRetry={() => void list.refetch()} onCreate={() => { command.reset(); setEditor({ detail: null }); }} onOpen={id => open(id)} onEdit={id => open(id, true)} onDuplicate={row => void execute({ type: "duplicate-prompt-set", target: { id: row.id, version: row.version } })} />
  </AdminPage></div>;
}
