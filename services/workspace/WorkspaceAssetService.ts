import { z } from "zod";
import type {
  AssetPin,
  AssetSelection,
  WorkspaceAssetKind,
  WorkspaceAssetServiceOptions,
  WorkspaceBlobInput,
  WorkspaceContext,
  WorkspaceReceipt,
} from "@/types/workspace-production";
import type { TemplatePreviewData } from "@/types/template-work";
import { requireFileProjectAccess } from "@/lib/workspace/files/permissions";
import {
  workspaceAssert as check,
  WorkspaceError,
} from "@/lib/workspace/production/errors";
import {
  AssetPinSchema,
  WorkspaceIdSchema,
} from "@/lib/workspace/production/schemas";
import {
  canEditSection,
  canProjectAction,
} from "@/lib/workspace/production/permissions";
import { currentSlideSettings } from "@/lib/workspace/production/domain";
import { hashWorkspaceBlob } from "./IndexedDbWorkspaceRepository";

const ApplySchema = z.strictObject({
  projectId: WorkspaceIdSchema,
  expectedRevision: z.number().int().positive(),
  expectedRound: z.number().int().positive(),
  selections: z
    .array(
      z.strictObject({
        kind: z.enum(["prompt", "skill", "template"]),
        assetId: WorkspaceIdSchema,
        revisionId: WorkspaceIdSchema,
      }),
    )
    .min(1)
    .max(3)
    .refine((rows) => new Set(rows.map((r) => r.kind)).size === rows.length),
  replaceSlideIds: z
    .array(WorkspaceIdSchema)
    .max(200)
    .refine((ids) => new Set(ids).size === ids.length),
});
export class WorkspaceAssetService {
  private readonly lifetime = new AbortController();
  constructor(private readonly options: WorkspaceAssetServiceOptions) {}
  private context(projectId: string): WorkspaceContext {
    check(
      !this.lifetime.signal.aborted,
      "CANCELLED",
      "제작 화면을 다시 불러와 주세요.",
    );
    check(
      WorkspaceIdSchema.safeParse(projectId).success,
      "VALIDATION",
      "프로젝트를 확인해 주세요.",
    );
    const project = this.options.catalog.get(projectId);
    check(!!project, "NOT_FOUND", "프로젝트가 없습니다.");
    try {
      requireFileProjectAccess(this.options.identity, project);
    } catch (cause) {
      throw new WorkspaceError("FORBIDDEN", "프로젝트 접근 권한이 없습니다.", {
        cause,
      });
    }
    return {
      identity: this.options.identity,
      project,
      members: this.options.catalog.members(projectId),
      now: new Date().toISOString(),
      newId: () => crypto.randomUUID(),
    };
  }
  async list(projectId: string, kind: WorkspaceAssetKind) {
    this.context(projectId);
    const result = await this.options.host.listWorkspaceAssets(
      this.options.getActor(),
      kind,
    );
    this.context(projectId);
    return result;
  }
  checkPins(projectId: string, pins: readonly AssetPin[]) {
    this.context(projectId);
    return pins.map((pin) => {
      check(
        AssetPinSchema.safeParse(pin).success,
        "VALIDATION",
        "적용 사본을 확인해 주세요.",
      );
      return this.options.host.checkWorkspaceAsset(
        this.options.getActor(),
        pin,
      );
    });
  }
  async describe(projectId: string, selection: AssetSelection) {
    this.context(projectId);
    const revision = this.options.host.getRevision(),
      source = await this.options.host.resolveWorkspaceAsset(
        this.options.getActor(),
        selection.kind,
        selection.assetId,
        selection.revisionId,
        "new",
      );
    this.context(projectId);
    check(
      revision === this.options.host.getRevision(),
      "CONFLICT",
      "자산 정보가 변경되었습니다.",
    );
    return { choice: source.choice, snapshot: source.snapshot };
  }
  assertPins(projectId: string, pins: readonly AssetPin[]): void {
    for (const access of this.checkPins(projectId, pins))
      if (access.status !== "available")
        throw new WorkspaceError(
          access.status === "forbidden" ? "FORBIDDEN" : "ASSET_UNAVAILABLE",
          access.reason,
        );
  }
  async prepareNewPinCheck(
    projectId: string,
    pins: readonly AssetPin[],
  ): Promise<() => void> {
    this.context(projectId);
    const revision = this.options.host.getRevision();
    for (const pin of pins)
      await this.options.host.resolveWorkspaceAsset(
        this.options.getActor(),
        pin.kind,
        pin.assetId,
        pin.revisionId,
        "new",
      );
    const verify = () => {
      this.context(projectId);
      check(
        this.options.host.getRevision() === revision,
        "CONFLICT",
        "자산 정보가 변경되었습니다. 다시 확인해 주세요.",
      );
      this.assertPins(projectId, pins);
    };
    verify();
    return verify;
  }
  async apply(input: {
    projectId: string;
    expectedRevision: number;
    expectedRound: number;
    selections: AssetSelection[];
    replaceSlideIds: string[];
  }): Promise<WorkspaceReceipt> {
    const parsed = ApplySchema.safeParse(input);
    check(parsed.success, "VALIDATION", "선택한 자산을 확인해 주세요.");
    const request = parsed.data,
      context = this.context(request.projectId),
      { state } = await this.options.repository.load(request.projectId);
    check(
      canProjectAction(context, state, "setup"),
      "FORBIDDEN",
      "제작 설정 권한이 필요합니다.",
    );
    check(
      state.revision === request.expectedRevision &&
        state.currentRound === request.expectedRound,
      "CONFLICT",
      "프로젝트가 변경되었습니다. 다시 확인해 주세요.",
    );
    for (const id of request.replaceSlideIds) {
      const slide = state.body.slides.find((s) => s.id === id);
      check(!!slide, "NOT_FOUND", "슬라이드가 없습니다.");
      check(
        canEditSection(context, state, slide.sectionId),
        "FORBIDDEN",
        "고정되었거나 담당자가 아닌 슬라이드는 재적용할 수 없습니다.",
      );
    }
    const catalogRevision = this.options.host.getRevision(),
      pins: AssetPin[] = [],
      blobs: WorkspaceBlobInput[] = [],
      settings = structuredClone(state.body.settings);
    for (const selection of request.selections) {
      const source = await this.options.host.resolveWorkspaceAsset(
        this.options.getActor(),
        selection.kind,
        selection.assetId,
        selection.revisionId,
        "new",
      );
      const base = {
        id: context.newId(),
        assetId: selection.assetId,
        revisionId: selection.revisionId,
        revision: source.snapshot.revision,
        name: source.snapshot.name,
        capturedAt: context.now,
        capturedBy: context.identity.actor.id,
      };
      if ("promptSetId" in source.snapshot) {
        const pin: AssetPin = {
          ...base,
          kind: "prompt",
          snapshot: structuredClone(source.snapshot),
        };
        pins.push(pin);
        settings.promptPinId = pin.id;
        const same =
            state.pins.find((p) => p.id === state.body.settings.promptPinId)
              ?.assetId === pin.assetId,
          itemIds = new Set(source.snapshot.items.map((i) => i.id));
        settings.bindings = same
          ? settings.bindings.filter(
              (b) => b.itemId === null || itemIds.has(b.itemId),
            )
          : [];
        settings.overrides = same
          ? settings.overrides.filter((o) => itemIds.has(o.itemId))
          : [];
      } else if (source.snapshot.kind === "skill") {
        const pin: AssetPin = {
          ...base,
          kind: "skill",
          snapshot: structuredClone(source.snapshot),
        };
        pins.push(pin);
        settings.skillPinId = pin.id;
      } else {
        check(!!source.bytes, "ORIGINAL_MISSING", "Template 원본이 없습니다.");
        const blob = new Blob([new Uint8Array(source.bytes)], {
            type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          }),
          sha256 = await hashWorkspaceBlob(blob);
        check(
          sha256 === source.snapshot.definition.extraction.sha256,
          "STORAGE",
          "Template 원본 내용이 다릅니다.",
        );
        const pin: AssetPin = {
          ...base,
          kind: "template",
          snapshot: structuredClone(source.snapshot),
          blobId: context.newId(),
          sha256,
        };
        pins.push(pin);
        settings.templatePinId = pin.id;
        blobs.push({
          id: pin.blobId,
          kind: "template",
          blob,
          filename: source.snapshot.definition.extraction.filename,
          sha256,
        });
      }
    }
    const next = structuredClone(state);
    next.pins.push(...pins);
    next.body.settings = settings;
    const template = pins.find((p) => p.kind === "template");
    const slides = next.body.slides.map((slide) => {
      if (!request.replaceSlideIds.includes(slide.id)) return slide;
      const oldTemplate = state.pins.find(
        (p) => p.id === slide.template?.pinId,
      );
      if (template?.kind === "template") {
        // 원본 해시가 다른 파일의 요소 ID를 재사용하지 않는다. 새 매핑은 사용자가 확인한다.
        slide.template =
          oldTemplate?.kind === "template" &&
          oldTemplate.sha256 === template.sha256 &&
          slide.template
            ? { ...slide.template, pinId: template.id }
            : null;
      }
      slide.usedSettings = currentSlideSettings(next, slide.sectionId);
      slide.revision++;
      return slide;
    });
    return this.options.repository.commitPrepared(
      {
        projectId: request.projectId,
        expectedRevision: request.expectedRevision,
        expectedRound: request.expectedRound,
        operation: { type: "pin-assets", pins, settings, slides },
      },
      blobs,
      () => {
        this.context(request.projectId);
        check(
          this.options.host.getRevision() === catalogRevision,
          "CONFLICT",
          "자산의 공개 범위 또는 내용이 변경되었습니다. 다시 확인해 주세요.",
        );
        this.assertPins(request.projectId, pins);
      },
    );
  }
  async preview(
    projectId: string,
    pinId: string,
    signal?: AbortSignal,
  ): Promise<TemplatePreviewData> {
    this.context(projectId);
    const { state } = await this.options.repository.load(projectId),
      pin = state.pins.find((p) => p.id === pinId);
    check(pin?.kind === "template", "NOT_FOUND", "Template 사본이 없습니다.");
    this.assertPins(projectId, [pin]);
    const source = await this.options.repository.readBlob(
      projectId,
      pin.blobId,
    );
    const [{ readTemplate }, { loadZipLibrary }] = await Promise.all([
      import("@/lib/pptx/template-read"),
      import("@/lib/pptx/zip"),
    ]);
    const document = await readTemplate(
      new Uint8Array(await source.blob.arrayBuffer()),
      source.filename,
      await loadZipLibrary(),
      {
        signal: signal
          ? AbortSignal.any([signal, this.lifetime.signal])
          : this.lifetime.signal,
      },
    );
    this.assertPins(projectId, [pin]);
    return {
      width: document.width,
      height: document.height,
      slides: document.slides,
      warnings: document.warnings,
    };
  }
  close(): void {
    this.lifetime.abort();
  }
}
