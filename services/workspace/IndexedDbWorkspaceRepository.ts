import type {
  WorkspaceRepository,
  WorkspaceRepositoryOptions,
  WorkspaceContext,
  WorkspaceBundle,
  WorkspaceMutation,
  PreparedWorkspaceMutation,
  WorkspaceBlobInput,
  StoredWorkspaceBlob,
  WorkspaceReceipt,
  PptVersion,
} from "@/types/workspace-production";
import { FileIdentitySchema } from "@/lib/workspace/files/schemas";
import { requireFileProjectAccess } from "@/lib/workspace/files/permissions";
import {
  WorkspaceError,
  workspaceAssert as check,
} from "@/lib/workspace/production/errors";
import {
  WorkspaceIdSchema,
  WorkspaceMutationSchema,
  PreparedWorkspaceMutationSchema,
} from "@/lib/workspace/production/schemas";
import {
  WorkspaceBlobRecordSchema,
  WorkspacePreferenceSchema,
} from "@/lib/workspace/production/storage-schemas";
import { applyWorkspaceMutation } from "@/lib/workspace/production/domain";
import { WorkspaceDatabase } from "./WorkspaceDatabase";
import {
  readWorkspaceBundle,
  workspaceBlobReferences,
} from "./workspace-records";
import { addHtmlDemoCompletion, needsHtmlDemoCompletion } from "./workspace-demo";
import { createHtmlDemoPpt } from "./html-demo-ppt";
import { addManufacturingDemoCompletion, createManufacturingDemoBundle, needsManufacturingDemoCompletion } from "./workspace-mfg-demo";
import { createManufacturingDemoPpt, manufacturingPptFilename } from "./manufacturing-demo-ppt";
import { MFG_DEMO_PROJECT_ID, MFG_DEMO_ORGANIZATION } from "@/config/production-mfg-demo";
import { canProjectAction } from "@/lib/workspace/production/permissions";

export async function hashWorkspaceBlob(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await blob.arrayBuffer(),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export class IndexedDbWorkspaceRepository implements WorkspaceRepository {
  private readonly database: WorkspaceDatabase;
  private readonly signal = new AbortController();
  private readonly identity;
  private readonly demoPpts = new Map<string, Promise<{ blob: Blob; sha256: string }>>();
  constructor(private readonly options: WorkspaceRepositoryOptions) {
    const identity = FileIdentitySchema.safeParse(options.identity);
    check(identity.success, "FORBIDDEN", "사용자 정보를 확인해 주세요.");
    this.identity = identity.data;
    this.database = options.database ?? new WorkspaceDatabase(options);
  }
  private context(projectId: string): WorkspaceContext {
    check(
      !this.signal.signal.aborted,
      "CANCELLED",
      "작업 화면을 다시 불러와 주세요.",
    );
    check(
      WorkspaceIdSchema.safeParse(projectId).success,
      "VALIDATION",
      "프로젝트를 확인해 주세요.",
    );
    const project = this.options.catalog.get(projectId);
    check(!!project, "NOT_FOUND", "접근 가능한 프로젝트가 없습니다.");
    try {
      requireFileProjectAccess(this.identity, project);
    } catch (cause) {
      throw new WorkspaceError("FORBIDDEN", "프로젝트 접근 권한이 없습니다.", {
        cause,
      });
    }
    return {
      identity: this.identity,
      project,
      members: this.options.catalog.members(projectId),
      now: (this.options.now ?? (() => new Date().toISOString()))(),
      newId: this.options.newId ?? (() => crypto.randomUUID()),
    };
  }
  async load(projectId: string): Promise<WorkspaceBundle> {
    const context = this.context(projectId);
    const bundle = await this.database.transact<WorkspaceBundle>(
      ["projects", "workspaces", "blobs"],
      "readwrite",
      (tx, done, watch) =>
        readWorkspaceBundle(tx, context, watch, (value) => {
          this.context(projectId);
          done(value);
        }),
      this.signal.signal,
    );
    const manufacturing = projectId === MFG_DEMO_PROJECT_ID;
    const needsCompletion = manufacturing ? needsManufacturingDemoCompletion : needsHtmlDemoCompletion;
    if (!needsCompletion(bundle)) return bundle;
    if (!this.demoPpts.has(projectId)) {
      const generated = manufacturing ? createManufacturingDemoPpt({ projectName: context.project.name, organization: MFG_DEMO_ORGANIZATION,
        round: 1, body: createManufacturingDemoBundle(context)!.state.body }) : createHtmlDemoPpt();
      this.demoPpts.set(projectId, generated.then(async blob => ({ blob, sha256: await hashWorkspaceBlob(blob) })).catch(error => {
        this.demoPpts.delete(projectId); throw error;
      }));
    }
    // ZIP 생성과 해시는 IDB 트랜잭션 밖에서 끝내야 트랜잭션이 중간에 종료되지 않는다.
    const ppt = await this.demoPpts.get(projectId)!;
    this.context(projectId);
    return this.database.transact<WorkspaceBundle>(["projects", "workspaces", "workspaceBlobs"], "readwrite", (tx, done, watch) => {
      readWorkspaceBundle(tx, context, watch, latest => {
        const current = this.context(projectId);
        if (!needsCompletion(latest)) { done(latest); return; }
        const next = manufacturing ? addManufacturingDemoCompletion(latest, current, ppt) : addHtmlDemoCompletion(latest, current, ppt);
        const original = WorkspaceBlobRecordSchema.parse(next.original);
        watch(tx.objectStore("workspaceBlobs").add(original), () => {});
        watch(tx.objectStore("projects").put({ namespace: this.identity.namespace, projectId, state: next.bundle.files }), () => {});
        watch(tx.objectStore("workspaces").put({ namespace: this.identity.namespace, projectId, state: next.bundle.state }), () => {});
        done(next.bundle);
      }, false);
    }, this.signal.signal);
  }
  async execute(input: WorkspaceMutation): Promise<WorkspaceReceipt> {
    const parsed = WorkspaceMutationSchema.safeParse(input);
    check(parsed.success, "VALIDATION", "작업 요청을 확인해 주세요.");
    return this.commitPrepared(parsed.data, [], () => {});
  }
  private async completeManufacturing(input: WorkspaceMutation, assertAccess: () => void): Promise<WorkspaceReceipt> {
    const parsed = WorkspaceMutationSchema.safeParse(input);
    check(parsed.success, "VALIDATION", "작업 요청을 확인해 주세요.");
    assertAccess();
    if (parsed.data.projectId === MFG_DEMO_PROJECT_ID && parsed.data.operation.type === "complete") {
      const request = parsed.data, operation = parsed.data.operation;
      const bundle = await this.load(request.projectId), context = this.context(request.projectId);
      check(bundle.state.revision === request.expectedRevision && bundle.state.currentRound === request.expectedRound &&
        bundle.files.revision === operation.expectedFileRevision, "CONFLICT", "확인한 본문 또는 자료가 변경되었습니다. 다시 불러와 주세요.");
      check(canProjectAction(context, bundle.state, "complete"), "FORBIDDEN", "완성 처리 권한이 없습니다.");
      check(operation.acknowledged, "VALIDATION", "완성 내용을 확인해 주세요.");
      const blob = await createManufacturingDemoPpt({ projectName: context.project.name, organization: MFG_DEMO_ORGANIZATION,
        round: bundle.state.currentRound, body: structuredClone(bundle.state.body) });
      const sha256 = await hashWorkspaceBlob(blob), filename = manufacturingPptFilename(bundle.state.currentRound);
      const version: PptVersion = { id: context.newId(), index: Math.max(0, ...bundle.state.pptVersions.map(v => v.index)) + 1,
        round: bundle.state.currentRound, snapshotId: null, kind: "generated", pinIds: [], blobId: context.newId(), filename,
        byteLength: blob.size, sha256, createdAt: context.now, createdBy: context.identity.actor.id,
        inputRevision: bundle.state.inputRevision, baseVersionId: null, manifest: null };
      return this.commitPrepared({ ...request, operation: { ...operation, type: "complete-manufacturing-demo", version } },
        [{ id: version.blobId, kind: "ppt", blob, filename, sha256 }], assertAccess);
    }
    throw new WorkspaceError("VALIDATION", "제조업 완성 요청을 확인해 주세요.");
  }
  async commitPrepared(
    input: PreparedWorkspaceMutation,
    blobs: readonly WorkspaceBlobInput[],
    assertAccess: () => void,
  ): Promise<WorkspaceReceipt> {
    const parsed = PreparedWorkspaceMutationSchema.safeParse(input);
    check(parsed.success, "VALIDATION", "저장 요청을 확인해 주세요.");
    // 서비스는 공개 명령도 commitPrepared로 전달하므로 두 진입 경로에서 같은 준비를 거친다.
    if (parsed.data.projectId === MFG_DEMO_PROJECT_ID && parsed.data.operation.type === "complete") {
      check(blobs.length === 0, "VALIDATION", "완성 요청에는 준비된 원본을 직접 전달할 수 없습니다.");
      return this.completeManufacturing({ ...parsed.data, operation: parsed.data.operation }, assertAccess);
    }
    const context = this.context(parsed.data.projectId),
      namespace = this.identity.namespace,
      projectId = context.project.id;
    const originals: StoredWorkspaceBlob[] = [];
    if (parsed.data.operation.type === "complete-manufacturing-demo") {
      const version = parsed.data.operation.version, blob = blobs.find(b => b.id === version.blobId);
      check(!!blob && blob.kind === "ppt" && blob.filename === version.filename && blob.sha256 === version.sha256 &&
        blob.blob.size === version.byteLength, "VALIDATION", "완성본과 PPT 원본 정보가 다릅니다.");
    }
    check(
      new Set(blobs.map((b) => b.id)).size === blobs.length,
      "VALIDATION",
      "원본 식별자가 중복되었습니다.",
    );
    for (const blob of blobs) {
      const record = WorkspaceBlobRecordSchema.safeParse({
        ...blob,
        namespace,
        projectId,
        byteLength: blob.blob.size,
        createdAt: context.now,
      });
      check(record.success, "VALIDATION", "원본 정보를 확인해 주세요.");
      check(
        (await hashWorkspaceBlob(blob.blob)) === blob.sha256,
        "VALIDATION",
        "원본 내용이 변경되었습니다.",
      );
      originals.push(record.data);
    }
    this.context(projectId);
    assertAccess();
    return this.database.transact(
      ["projects", "workspaces", "workspaceBlobs", "blobs"],
      "readwrite",
      (tx, done, watch) => {
        readWorkspaceBundle(tx, context, watch, (bundle) => {
          const current = this.context(projectId);
          assertAccess();
          const next = applyWorkspaceMutation(
              bundle.state,
              parsed.data,
              current,
              bundle.files,
            ),
            refs = workspaceBlobReferences(next.receipt.state);
          const store = tx.objectStore("workspaceBlobs"),
            newBlobs = new Map(originals.map((b) => [b.id, b]));
          for (const b of originals)
            check(
              refs.get(b.id) === b.kind,
              "VALIDATION",
              "작업에 연결되지 않은 원본입니다.",
            );
          const save = () => {
            this.context(projectId);
            assertAccess();
            for (const b of originals) watch(store.add(b), () => {});
            watch(
              tx
                .objectStore("projects")
                .put({ namespace, projectId, state: next.files }),
              () => {},
            );
            watch(
              tx
                .objectStore("workspaces")
                .put({ namespace, projectId, state: next.receipt.state }),
              () => {},
            );
            done(next.receipt);
          };
          const existing = [...refs].filter(([id]) => !newBlobs.has(id));
          let remaining = existing.length;
          if (!remaining) save();
          else
            for (const [id, kind] of existing)
              watch(store.get([namespace, projectId, id]), (value) => {
                const record = WorkspaceBlobRecordSchema.safeParse(value);
                check(
                  value !== undefined,
                  "ORIGINAL_MISSING",
                  "연결된 원본이 없습니다. 다시 등록해 주세요.",
                );
                check(
                  record.success &&
                    record.data.namespace === namespace &&
                    record.data.projectId === projectId &&
                    record.data.id === id &&
                    record.data.kind === kind,
                  "STORAGE",
                  "원본 범위가 올바르지 않습니다.",
                );
                if (--remaining === 0) save();
              });
        });
      },
      this.signal.signal,
    );
  }
  async readBlob(
    projectId: string,
    blobId: string,
  ): Promise<StoredWorkspaceBlob> {
    const context = this.context(projectId);
    check(
      WorkspaceIdSchema.safeParse(blobId).success,
      "VALIDATION",
      "원본 식별자를 확인해 주세요.",
    );
    const record = await this.database.transact<StoredWorkspaceBlob>(
      ["projects", "workspaces", "workspaceBlobs"],
      "readonly",
      (tx, done, watch) => {
        readWorkspaceBundle(
          tx,
          context,
          watch,
          (bundle) => {
            this.context(projectId);
            const kind = workspaceBlobReferences(bundle.state).get(blobId);
            check(!!kind, "NOT_FOUND", "이 작업에서 사용하는 원본이 아닙니다.");
            watch(
              tx
                .objectStore("workspaceBlobs")
                .get([this.identity.namespace, projectId, blobId]),
              (value) => {
                check(
                  value !== undefined,
                  "ORIGINAL_MISSING",
                  "원본 파일이 없습니다. 다시 등록해 주세요.",
                );
                const parsed = WorkspaceBlobRecordSchema.safeParse(value);
                check(
                  parsed.success &&
                    parsed.data.namespace === this.identity.namespace &&
                    parsed.data.projectId === projectId &&
                    parsed.data.id === blobId &&
                    parsed.data.kind === kind,
                  "STORAGE",
                  "원본 정보가 다릅니다.",
                );
                done(parsed.data);
              },
            );
          },
          false,
        );
      },
      this.signal.signal,
    );
    check(
      (await hashWorkspaceBlob(record.blob)) === record.sha256,
      "STORAGE",
      "원본 파일의 검증값이 다릅니다.",
    );
    this.context(projectId);
    return record;
  }
  readSelection(): Promise<string | null> {
    check(!this.signal.signal.aborted, "CANCELLED", "저장소가 닫혔습니다.");
    return this.database.transact(
      ["preferences"],
      "readonly",
      (tx, done, watch) => {
        watch(
          tx
            .objectStore("preferences")
            .get([this.identity.namespace, "selected-project"]),
          (value) => {
            if (value === undefined) {
              done(null);
              return;
            }
            const parsed = WorkspacePreferenceSchema.safeParse(value);
            check(
              parsed.success &&
                parsed.data.namespace === this.identity.namespace,
              "STORAGE",
              "선택 정보를 확인해 주세요.",
            );
            try {
              done(this.context(parsed.data.projectId).project.id);
            } catch (error) {
              if (
                error instanceof WorkspaceError &&
                (error.code === "FORBIDDEN" || error.code === "NOT_FOUND")
              )
                done(null);
              else throw error;
            }
          },
        );
      },
      this.signal.signal,
    );
  }
  saveSelection(projectId: string): Promise<void> {
    this.context(projectId);
    return this.database.transact(
      ["preferences"],
      "readwrite",
      (tx, done, watch) => {
        this.context(projectId);
        watch(
          tx
            .objectStore("preferences")
            .put({
              namespace: this.identity.namespace,
              key: "selected-project",
              projectId,
            }),
          () => done(),
        );
      },
      this.signal.signal,
    );
  }
  close(): void {
    this.signal.abort();
    if (!this.options.database) this.database.close();
  }
}
