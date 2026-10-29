"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { useAuthRuntime } from "@/components/providers";
import { useProfilePreview } from "@/components/profile/ProfilePreviewProvider";
import { createAdminSeed } from "@/config/admin-seed";
import { adminIdentityKey, resolveAdminActor } from "@/lib/admin/runtime-actor";
import { retireAdminQueries } from "@/lib/admin/query-keys";
import { MockAdminDataService } from "@/services/admin/MockAdminDataService";
import type { AdminAccessView, AdminActor, AdminDataService } from "@/types/admin";

interface AdminRuntime { actor: AdminActor; service: AdminDataService; revision: number; queryClient: QueryClient; access: AdminAccessView | null }
const Context = createContext<AdminRuntime | null>(null);
function RuntimeInstance({ children, actor: initialActor }: { children: React.ReactNode; actor: AdminActor }): React.ReactElement {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false }, mutations: { retry: false } } }));
  const [service] = useState(() => new MockAdminDataService({ seed: createAdminSeed({ name: initialActor.name, email: initialActor.email, role: initialActor.role, departmentId: initialActor.departmentId }) }));
  const revision = useSyncExternalStore(service.subscribe, service.getRevision, () => 1);
  const actor = service.getCurrentActor(initialActor);
  let access: AdminAccessView | null = null;
  // 로컬 저장소의 현재 권한만 읽어 변경 순간에도 폼을 불필요하게 재마운트하지 않는다.
  try { access = service.getAccessSnapshot(actor); } catch { /* 상세 오류는 Query의 재시도 UI에서 처리한다. */ }
  useEffect(() => {
    void retireAdminQueries(queryClient, actor, revision);
  }, [actor, revision, queryClient]);
  useEffect(() => () => { queryClient.clear(); }, [queryClient]);
  return <QueryClientProvider client={queryClient}><Context.Provider value={{ actor, service, revision, queryClient, access }}>{children}</Context.Provider></QueryClientProvider>;
}
export default function AdminRuntimeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const { authEnabled, session } = useAuthRuntime(), { state, profile } = useProfilePreview();
  const actor = resolveAdminActor({ authEnabled, session, previewRole: state.previewRole, profile });
  return <RuntimeInstance key={adminIdentityKey(authEnabled, session)} actor={actor}>{children}</RuntimeInstance>;
}
export function useAdminRuntime(): AdminRuntime {
  const context = useContext(Context);
  if (!context) throw new Error("관리자 데이터 공급자가 필요합니다.");
  return context;
}
