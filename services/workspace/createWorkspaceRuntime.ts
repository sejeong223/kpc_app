import { z } from "zod";
import type { QueryClient } from "@tanstack/react-query";
import type { AdminActor } from "@/types/admin";
import type { FileIdentity } from "@/types/workspace-files";
import type {
  WorkspaceAssetHost,
  WorkspaceProjectDirectory,
  WorkspaceSelection,
} from "@/types/workspace-production";
import type { FileRuntimeValue } from "@/components/workspace/files/FileRuntimeProvider";
import { createWorkspaceProjectCatalog } from "@/config/workspace-projects";
import { createDisposalLease } from "@/lib/admin/runtime-lifetime";
import {
  fileQueryKeys,
  type FileQueryScope,
} from "@/lib/workspace/files/query-keys";
import {
  workspaceQueryKeys,
  type WorkspaceQueryScope,
} from "@/lib/workspace/production/query-keys";
import { workspaceAssert as check } from "@/lib/workspace/production/errors";
import { WorkspaceDatabase } from "./WorkspaceDatabase";
import { IndexedDbFileRepository } from "./IndexedDbFileRepository";
import { IndexedDbWorkspaceRepository } from "./IndexedDbWorkspaceRepository";
import { WorkspaceFileService } from "./WorkspaceFileService";
import { WorkspaceAssetService } from "./WorkspaceAssetService";
import { WorkspaceProductionService } from "./WorkspaceProductionService";

type NavigationGuard = (action: () => void, cancel: () => void) => void;
export interface WorkspaceRuntimeValue {
  identity: FileIdentity;
  catalog: WorkspaceProjectDirectory;
  service: WorkspaceProductionService;
  assets: WorkspaceAssetService;
  queryScope: WorkspaceQueryScope;
  fileRuntime: FileRuntimeValue;
  isActive(): boolean;
  invalidateProject(id: string, revision?: number): Promise<void>;
  reconnect(): void;
  selection: {
    get(): WorkspaceSelection | null;
    subscribe(listener: () => void): () => void;
    set(value: WorkspaceSelection): void;
  };
  clipboard: { get(): string | null; set(token: string): void; clear(): void };
  navigate(action: () => Promise<void>): Promise<void>;
  registerGuard(guard: NavigationGuard): () => void;
}
interface RuntimeOptions {
  identity: FileIdentity;
  host: WorkspaceAssetHost;
  getActor(): AdminActor;
  client: QueryClient;
  instanceId: string;
  reconnect(): void;
  catalog?: WorkspaceProjectDirectory;
  factory?: IDBFactory;
  dbName?: string;
}
export const WorkspaceBroadcastSchema = z.strictObject({
  namespace: z.string().min(1).max(500),
  projectId: z.string().min(1).max(400),
  revision: z.number().int().positive(),
  instanceId: z.string().min(1).max(400),
});
export function createWorkspaceRuntime(options: RuntimeOptions): {
  runtime: WorkspaceRuntimeValue;
  retain(): () => void;
} {
  const { identity, client, instanceId } = options,
    catalog = options.catalog ?? createWorkspaceProjectCatalog(identity),
    database = new WorkspaceDatabase(options),
    repository = new IndexedDbWorkspaceRepository({
      identity,
      catalog,
      database,
    }),
    fileRepository = new IndexedDbFileRepository({
      identity,
      catalog,
      database,
    });
  const assets = new WorkspaceAssetService({
      host: options.host,
      getActor: options.getActor,
      identity,
      catalog,
      repository,
    }),
    service = new WorkspaceProductionService({
      identity,
      catalog,
      repository,
      assets,
    }),
    files = new WorkspaceFileService({
      identity,
      catalog,
      repository: fileRepository,
    });
  const queryScope: WorkspaceQueryScope = [
      "workspace-production",
      identity.namespace,
      identity.actor.id,
      identity.actor.role,
      instanceId,
    ],
    fileScope: FileQueryScope = [
      "workspace-files",
      identity.namespace,
      identity.actor.id,
      identity.actor.role,
      instanceId,
    ];
  let clipboardToken: string | null = null;
  let active = true,
    selected: WorkspaceSelection | null = null,
    unsubscribe: (() => void) | null = null,
    channel: BroadcastChannel | null = null;
  const listeners = new Set<() => void>(),
    guards = new Set<NavigationGuard>(),
    pending = new Set<() => void>();
  const invalidate = async (id: string) => {
    if (!active) return;
    await Promise.all([
      client.invalidateQueries({
        queryKey: workspaceQueryKeys(queryScope).project(id),
        exact: false,
      }),
      client.invalidateQueries({
        queryKey: fileQueryKeys(fileScope).project(id),
        exact: true,
      }),
    ]);
  };
  const invalidateProject = async (id: string, revision?: number) => {
    await invalidate(id);
    if (!active) return;
    const current = revision ?? (await service.load(id)).state.revision;
    if (active)
      channel?.postMessage({
        namespace: identity.namespace,
        projectId: id,
        revision: current,
        instanceId,
      });
  };
  const fileRuntime: FileRuntimeValue = {
    identity,
    service: files,
    queryScope: fileScope,
    isActive: () => active,
    onProjectChange: invalidateProject,
  };
  const runtime: WorkspaceRuntimeValue = {
    identity,
    catalog,
    service,
    assets,
    queryScope,
    fileRuntime,
    isActive: () => active,
    invalidateProject,
    reconnect: options.reconnect,
    clipboard: {
      clear: () => {
        clipboardToken = null;
      },
      get: () => clipboardToken,
      set: (token) => {
        check(active, "CANCELLED", "종료된 화면입니다.");
        clipboardToken = token;
      },
    },
    selection: {
      get: () => selected,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      set: (value) => {
        check(active, "CANCELLED", "종료된 화면입니다.");
        selected = structuredClone(value);
        listeners.forEach((listener) => listener());
      },
    },
    registerGuard: (guard) => {
      guards.add(guard);
      return () => {
        guards.delete(guard);
      };
    },
    navigate: (action) =>
      new Promise<void>((resolve, reject) => {
        check(active, "CANCELLED", "종료된 화면입니다.");
        const cancel = () => {
            pending.delete(cancel);
            resolve();
          },
          run = () => {
            pending.delete(cancel);
            if (!active) {
              resolve();
              return;
            }
            void action().then(resolve, reject);
          };
        pending.add(cancel);
        const sequence = [...guards];
        const next = (index: number) => {
          if (!active) {
            cancel();
            return;
          }
          const guard = sequence[index];
          if (guard) guard(() => next(index + 1), cancel);
          else run();
        };
        next(0);
      }),
  };
  const lease = createDisposalLease(() => {
    active = false;
    unsubscribe?.();
    channel?.close();
    pending.forEach((cancel) => cancel());
    guards.clear();
    listeners.clear();
    selected = null;
    clipboardToken = null;
    assets.close();
    service.close();
    files.close();
    database.close();
    for (const scope of [queryScope, fileScope]) {
      void client
        .cancelQueries({ queryKey: scope })
        .then(() => client.removeQueries({ queryKey: scope }));
      for (const mutation of client
        .getMutationCache()
        .findAll({ mutationKey: scope }))
        client.getMutationCache().remove(mutation);
    }
  });
  return {
    runtime,
    retain: () => {
      check(active, "CANCELLED", "종료된 화면은 다시 연결해야 합니다.");
      if (!unsubscribe) {
        unsubscribe = options.host.subscribe(() => {
          if (active)
            void client.invalidateQueries({
              predicate: (q) =>
                q.queryKey.slice(0, 5).every((v, i) => v === queryScope[i]) &&
                ["assets", "project"].includes(String(q.queryKey[5])),
            });
        });
        if (
          typeof window !== "undefined" &&
          typeof BroadcastChannel !== "undefined"
        ) {
          channel = new BroadcastChannel("kpc-workspace-projects");
          channel.onmessage = (event) => {
            const message = WorkspaceBroadcastSchema.safeParse(event.data);
            if (
              message.success &&
              message.data.namespace === identity.namespace &&
              message.data.instanceId !== instanceId &&
              catalog.get(message.data.projectId)
            )
              void invalidate(message.data.projectId);
          };
        }
      }
      return lease();
    },
  };
}
