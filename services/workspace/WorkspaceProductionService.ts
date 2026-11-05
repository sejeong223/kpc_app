import { z } from "zod";
import { selectFileSnapshot } from "@/lib/workspace/production/file-history";
import type { FileWorkspaceView } from "@/types/workspace-files";
import type {
  AssetPin,
  ExportRequest,
  ImportMapping,
  ImportRequest,
  ImportedPpt,
  MockRequest,
  PptVersion,
  ProjectRequest,
  ProjectWorkspaceState,
  ProposalSlide,
  RoundBody,
  SlideContent,
  SlideTemplateRef,
  WorkspaceBlobInput,
  WorkspaceContext,
  WorkspaceMutation,
  WorkspaceProductionOptions,
  WorkspaceProgress,
  WorkspaceReceipt,
} from "@/types/workspace-production";
import { requireFileProjectAccess } from "@/lib/workspace/files/permissions";
import {
  workspaceAssert as check,
  WorkspaceError,
} from "@/lib/workspace/production/errors";
import {
  MockRequestSchema,
  ProjectRequestSchema,
  ProposalSlideSchema,
  WorkspaceIdSchema,
  WorkspaceMutationSchema,
} from "@/lib/workspace/production/schemas";
import {
  canEditSection,
  canProjectAction,
} from "@/lib/workspace/production/permissions";
import {
  createMockProposal,
  selectedMockChange,
  type MockCandidate,
} from "@/lib/workspace/production/mock-proposals";
import {
  cloneClipboardSlide,
  pinsForSlides,
  slidePinIds,
} from "@/lib/workspace/production/clipboard";
import { inspectProductionImage } from "@/lib/pptx/production/content-schema";
import { renderProposalSlide } from "@/lib/pptx/production/content";
import { assembleProjectDeck } from "@/lib/pptx/production/deck";
import { compareExternalDeck } from "@/lib/pptx/production/import";
import { loadZipLibrary } from "@/lib/pptx/zip";
import { safePptxFilename } from "@/lib/pptx/errors";
import { TEMPLATE_LIMITS } from "@/lib/pptx/limits";
import { WORKSPACE_LIMITS } from "@/config/workspace-production";
import type { SlideBatchRequest } from "@/types/workspace-production";
import { hashWorkspaceBlob } from "./IndexedDbWorkspaceRepository";

interface ImportSession extends ImportedPpt {
  projectId: string;
  round: number;
  actorId: string;
  expiresAt: number;
}
interface ClipboardEntry {
  projectId: string;
  revision: number;
  actorId: string;
  expiresAt: number;
  slides: ProposalSlide[];
  pins: AssetPin[];
}
const Ids = z
  .array(WorkspaceIdSchema)
  .min(1)
  .max(200)
  .refine((ids) => new Set(ids).size === ids.length);
const SelectedIds = z
  .array(z.string().min(1).max(2000))
  .min(1)
  .max(20400)
  .refine((ids) => new Set(ids).size === ids.length);
const PptMime =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";
export class WorkspaceProductionService {
  private readonly lifetime = new AbortController();
  private readonly proposals = new Map<string, MockCandidate>();
  private readonly imports = new Map<string, ImportSession>();
  private readonly clipboard = new Map<string, ClipboardEntry>();
  constructor(private readonly options: WorkspaceProductionOptions) {}
  private now = () => this.options.now?.() ?? new Date().toISOString();
  private newId = () => this.options.newId?.() ?? crypto.randomUUID();
  private signal(signal?: AbortSignal): AbortSignal {
    return signal
      ? AbortSignal.any([this.lifetime.signal, signal])
      : this.lifetime.signal;
  }
  private alive(signal?: AbortSignal): void {
    check(
      !this.lifetime.signal.aborted && !signal?.aborted,
      "CANCELLED",
      "작업을 취소했습니다.",
    );
  }
  private context(projectId: string): WorkspaceContext {
    this.alive();
    check(
      WorkspaceIdSchema.safeParse(projectId).success,
      "VALIDATION",
      "프로젝트를 확인해 주세요.",
    );
    const project = this.options.catalog.get(projectId);
    check(!!project, "FORBIDDEN", "접근 가능한 프로젝트가 없습니다.");
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
      now: this.now(),
      newId: this.newId,
    };
  }
  async load(projectId: string) {
    this.context(projectId);
    const bundle = await this.options.repository.load(projectId);
    this.context(projectId);
    return bundle;
  }
  async loadFileSnapshot(projectId:string,snapshotId:string):Promise<FileWorkspaceView>{
    check(WorkspaceIdSchema.safeParse(snapshotId).success,"VALIDATION","보관본을 확인해 주세요.");
    const bundle=await this.load(projectId);
    return selectFileSnapshot(bundle,this.context(projectId),snapshotId);
  }
  private async requested(input: ProjectRequest) {
    const parsed = ProjectRequestSchema.safeParse({
      projectId: input.projectId,
      expectedRevision: input.expectedRevision,
      expectedRound: input.expectedRound,
    });
    check(parsed.success, "VALIDATION", "작업 요청을 확인해 주세요.");
    const bundle = await this.load(input.projectId);
    check(
      bundle.state.revision === input.expectedRevision &&
        bundle.state.currentRound === input.expectedRound,
      "CONFLICT",
      "프로젝트가 변경되었습니다. 다시 불러온 뒤 검토해 주세요.",
    );
    return bundle;
  }
  private edit(
    state: ProjectWorkspaceState,
    sectionIds: readonly string[],
  ): void {
    const context = this.context(state.projectId);
    check(
      state.phase === "writing",
      "READ_ONLY",
      "완성본은 수정할 수 없습니다. 재작업을 시작해 주세요.",
    );
    for (const id of sectionIds) {
      const section = state.body.sections.find((s) => s.id === id);
      check(!!section, "NOT_FOUND", "섹션이 없습니다.");
      check(!section.locked, "LOCKED", "고정된 섹션을 먼저 해제해 주세요.");
      check(
        canEditSection(context, state, id),
        "FORBIDDEN",
        "담당 섹션만 변경할 수 있습니다.",
      );
    }
  }
  private guard(
    projectId: string,
    pins: readonly AssetPin[],
    signal?: AbortSignal,
  ): () => void {
    return () => {
      this.alive(signal);
      this.context(projectId);
      this.options.assets.assertPins(projectId, pins);
    };
  }
  private prune<T extends { expiresAt: number }>(map: Map<string, T>): void {
    for (const [id, value] of map)
      if (value.expiresAt <= Date.parse(this.now())) map.delete(id);
    while (map.size >= 20) map.delete(map.keys().next().value!);
  }
  private usedPins(
    state: ProjectWorkspaceState,
    ids: readonly string[],
  ): AssetPin[] {
    return [...new Set(ids)].map((id) => {
      const pin = state.pins.find((p) => p.id === id);
      check(!!pin, "ASSET_UNAVAILABLE", "자산 사본이 없습니다.");
      return pin;
    });
  }
  async execute(input: WorkspaceMutation): Promise<WorkspaceReceipt> {
    const parsed = WorkspaceMutationSchema.safeParse(input);
    check(parsed.success, "VALIDATION", "작업 요청을 확인해 주세요.");
    const request = parsed.data,
      { state } = await this.requested(request),
      op = request.operation;
    let pins: AssetPin[] = [];
    if (op.type === "add-slide")
      pins = this.usedPins(
        state,
        [
          op.template?.pinId,
          state.body.settings.skillPinId,
          state.body.settings.promptPinId,
        ].filter((id): id is string => !!id),
      );
    else if (op.type === "bind-slide" || op.type === "save-slide") {
      const slide = state.body.slides.find((s) => s.id === op.id);
      check(!!slide, "NOT_FOUND", "슬라이드가 없습니다.");
      if (
        op.type === "bind-slide" ||
        JSON.stringify(slide.template) !== JSON.stringify(op.template)
      )
        pins = pinsForSlides(state, [{ ...slide, template: op.template }]);
    } else if (op.type === "duplicate-slide") {
      const slide = state.body.slides.find((s) => s.id === op.id);
      check(!!slide, "NOT_FOUND", "슬라이드가 없습니다.");
      pins = pinsForSlides(state, [slide]);
    }
    return this.options.repository.commitPrepared(
      request,
      [],
      this.guard(request.projectId, pins),
    );
  }
  private target(
    state: ProjectWorkspaceState,
    snapshotId: string | null,
  ): { body: RoundBody; round: number; inputRevision: number } {
    if (snapshotId === null)
      return {
        body: state.body,
        round: state.currentRound,
        inputRevision: state.inputRevision,
      };
    const snapshot = state.snapshots.find((s) => s.id === snapshotId);
    check(!!snapshot, "NOT_FOUND", "보관본이 없습니다.");
    return {
      body: snapshot.body,
      round: snapshot.round,
      inputRevision: snapshot.inputRevision,
    };
  }
  async editSlides(input: SlideBatchRequest): Promise<WorkspaceReceipt> {
    const parsed = ProjectRequestSchema.extend({
      operation: z.enum(["move", "remove"]),
      slideIds: Ids,
      sectionId: WorkspaceIdSchema.nullable(),
      beforeId: WorkspaceIdSchema.nullable(),
    }).safeParse(input);
    check(
      parsed.success,
      "VALIDATION",
      "선택한 슬라이드와 이동 위치를 확인해 주세요.",
    );
    const request = parsed.data,
      { state } = await this.requested(request),
      slides = request.slideIds.map((id) => {
        const slide = state.body.slides.find((s) => s.id === id);
        check(!!slide, "NOT_FOUND", "선택한 슬라이드가 없습니다.");
        return slide;
      });
    this.edit(state, [
      ...new Set([
        ...slides.map((s) => s.sectionId),
        ...(request.operation === "move" && request.sectionId
          ? [request.sectionId]
          : []),
      ]),
    ]);
    return this.options.repository.commitPrepared(
      {
        projectId: request.projectId,
        expectedRevision: request.expectedRevision,
        expectedRound: request.expectedRound,
        operation: {
          type: "batch-slides",
          operation: request.operation,
          slideIds: request.slideIds,
          sectionId: request.sectionId,
          beforeId: request.beforeId,
        },
      },
      [],
      this.guard(request.projectId, []),
    );
  }
  private async render(
    projectId: string,
    state: ProjectWorkspaceState,
    slide: ProposalSlide,
    signal: AbortSignal,
  ) {
    const pins = pinsForSlides(state, [slide]),
      verify = this.guard(projectId, pins, signal);
    verify();
    const template = pins.find((p) => p.id === slide.template?.pinId),
      skill = pins.find((p) => p.id === slide.usedSettings.skillPinId);
    check(
      template?.kind === "template",
      "MAPPING",
      "Template 슬라이드와 내용 칸을 연결해 주세요.",
    );
    check(
      !slide.usedSettings.skillPinId || skill?.kind === "skill",
      "ASSET_UNAVAILABLE",
      "Skill 사본이 없습니다.",
    );
    const source = await this.options.repository.readBlob(
        projectId,
        template.blobId,
      ),
      images = new Map<
        string,
        {
          bytes: Uint8Array;
          mime: "image/png" | "image/jpeg";
          width: number;
          height: number;
        }
      >();
    for (const block of slide.content.blocks)
      if (block.kind === "image") {
        const original = await this.options.repository.readBlob(
          projectId,
          block.blobId,
        );
        verify();
        images.set(block.blobId, {
          bytes: new Uint8Array(await original.blob.arrayBuffer()),
          mime: block.mime,
          width: block.width,
          height: block.height,
        });
      }
    verify();
    const result = await renderProposalSlide(
      {
        slide,
        templateBytes: new Uint8Array(await source.blob.arrayBuffer()),
        templateFilename: source.filename,
        templateRevision: template.snapshot,
        skill: skill?.kind === "skill" ? skill.snapshot : null,
        images,
      },
      await loadZipLibrary(),
      signal,
    );
    verify();
    return result;
  }
  async previewSlide(
    input: {
      projectId: string;
      slideId: string;
      snapshotId: string | null;
      content?: SlideContent;
      template?: SlideTemplateRef;
      expected?: { round: number; slideRevision: number };
    },
    signal?: AbortSignal,
  ) {
    this.validatePreviewTarget(input);
    const combined = this.signal(signal),
      { state } = await this.load(input.projectId),
      target = this.target(state, input.snapshotId),
      stored = target.body.slides.find((s) => s.id === input.slideId);
    check(!!stored, "NOT_FOUND", "슬라이드가 없습니다.");
    if (input.expected) this.checkPreviewVersion(target.round, stored, input.expected);
    if (input.content !== undefined || input.template !== undefined) {
      check(
        input.snapshotId === null,
        "READ_ONLY",
        "보관본은 임시 수정할 수 없습니다.",
      );
      this.edit(state, [stored.sectionId]);
    }
    const parsed = ProposalSlideSchema.safeParse({
      ...stored,
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.template !== undefined ? { template: input.template } : {}),
    });
    check(parsed.success, "VALIDATION", "미리볼 내용과 연결을 확인해 주세요.");
    const result = await this.render(
      input.projectId,
      state,
      parsed.data,
      combined,
    );
    await this.requested({
      projectId: state.projectId,
      expectedRevision: state.revision,
      expectedRound: state.currentRound,
    });
    return { preview: result.preview, warnings: result.warnings };
  }
  private validatePreviewTarget(input: { slideId: string; snapshotId: string | null; expected?: { round: number; slideRevision: number } }) {
    check(z.object({ slideId: WorkspaceIdSchema, snapshotId: WorkspaceIdSchema.nullable(), expected: z.object({ round: z.number().int().positive(), slideRevision: z.number().int().positive() }).optional() }).safeParse(input).success,
      "VALIDATION", "미리보기 대상을 확인해 주세요.");
  }
  private checkPreviewVersion(round: number, slide: ProposalSlide, expected: { round: number; slideRevision: number }) {
    check(round === expected.round && slide.revision === expected.slideRevision, "CONFLICT", "슬라이드가 변경되었습니다. 최신 내용을 불러온 뒤 다시 시도해 주세요.");
  }
  async loadSlideImage(input: {
    projectId: string; slideId: string; blockId: string; snapshotId: string | null;
    expected: { round: number; slideRevision: number };
  }, signal?: AbortSignal): Promise<{ blob: Blob; alt: string; width: number; height: number }> {
    this.validatePreviewTarget(input);
    check(WorkspaceIdSchema.safeParse(input.blockId).success && !!input.expected, "VALIDATION", "이미지 대상을 확인해 주세요.");
    this.alive(signal);
    const { state } = await this.load(input.projectId), target = this.target(state, input.snapshotId);
    const slide = target.body.slides.find(s => s.id === input.slideId);
    check(!!slide, "NOT_FOUND", "슬라이드가 없습니다.");
    this.checkPreviewVersion(target.round, slide, input.expected);
    const block = slide.content.blocks.find(b => b.id === input.blockId);
    check(!!block && block.kind === "image", "NOT_FOUND", "슬라이드의 이미지를 찾을 수 없습니다.");
    const stored = await this.options.repository.readBlob(input.projectId, block.blobId);
    check(stored.projectId === input.projectId && stored.kind === "image" && stored.blob.type === block.mime && stored.blob.size > 0,
      "ORIGINAL_MISSING", "이미지 원본을 확인할 수 없습니다.");
    await this.requested({ projectId: input.projectId, expectedRevision: state.revision, expectedRound: state.currentRound });
    this.context(input.projectId); this.alive(signal);
    return { blob: stored.blob, alt: block.alt, width: block.width, height: block.height };
  }
  async propose(input: MockRequest, signal?: AbortSignal) {
    const parsed = MockRequestSchema.safeParse(input);
    check(parsed.success, "VALIDATION", "요청 내용과 대상을 확인해 주세요.");
    const request = parsed.data,
      { state } = await this.requested(request),
      context = this.context(request.projectId);
    this.alive(signal);
    check(
      request.sectionIds.every((id) =>
        state.body.sections.some((s) => s.id === id),
      ) &&
        request.slideIds.every((id) =>
          state.body.slides.some((s) => s.id === id),
        ),
      "NOT_FOUND",
      "요청 대상이 없습니다.",
    );
    if (request.kind === "recommend-toc" || request.kind === "edit-toc")
      check(
        canProjectAction(context, state, "outline"),
        "FORBIDDEN",
        "목차 관리 권한이 필요합니다.",
      );
    else if (request.kind !== "check") {
      const ids = [
        ...new Set([
          ...request.sectionIds,
          ...state.body.slides
            .filter((s) => request.slideIds.includes(s.id))
            .map((s) => s.sectionId),
        ]),
      ];
      check(
        ids.length > 0,
        "VALIDATION",
        "작성할 섹션 또는 슬라이드를 선택해 주세요.",
      );
      this.edit(state, ids);
    }
    const pins = pinsForSlides(
      state,
      state.body.slides.filter(
        (s) =>
          request.slideIds.includes(s.id) ||
          request.sectionIds.includes(s.sectionId),
      ),
    );
    if (request.kind !== "check")
      pins.push(
        ...this.usedPins(
          state,
          [
            state.body.settings.promptPinId,
            state.body.settings.skillPinId,
          ].filter((id): id is string => !!id),
        ),
      );
    this.options.assets.assertPins(request.projectId, pins);
    const candidate = createMockProposal(state, request, context);
    this.alive(signal);
    await this.requested(request);
    this.options.assets.assertPins(request.projectId, pins);
    this.prune(this.proposals);
    this.proposals.set(candidate.view.id, candidate);
    return structuredClone(candidate.view);
  }
  async applyProposal(
    input: ProjectRequest & { proposalId: string; itemIds: string[] },
  ): Promise<WorkspaceReceipt> {
    check(
      SelectedIds.safeParse(input.itemIds).success,
      "VALIDATION",
      "적용할 제안을 선택해 주세요.",
    );
    const candidate = this.proposals.get(input.proposalId);
    check(
      !!candidate && candidate.expiresAt > Date.parse(this.now()),
      "CONFLICT",
      "제안이 만료되었습니다. 다시 생성해 주세요.",
    );
    check(
      candidate.actorId === this.options.identity.actor.id &&
        candidate.view.projectId === input.projectId,
      "FORBIDDEN",
      "본인 프로젝트의 제안만 적용할 수 있습니다.",
    );
    const { state } = await this.requested(input);
    check(
      candidate.view.baseRevision === state.revision &&
        candidate.view.round === state.currentRound,
      "CONFLICT",
      "제안 이후 내용이 변경되었습니다. 다시 생성해 주세요.",
    );
    check(
      input.itemIds.every((id) => candidate.changes.some((c) => c.id === id)),
      "VALIDATION",
      "알 수 없는 제안 항목입니다.",
    );
    const operation = selectedMockChange(state, candidate, input.itemIds),
      pins = pinsForSlides(
        state,
        (operation.slides ?? []).filter(
          (s) =>
            JSON.stringify(s) !==
            JSON.stringify(state.body.slides.find((old) => old.id === s.id)),
        ),
      );
    const result = await this.options.repository.commitPrepared(
      {
        projectId: input.projectId,
        expectedRevision: input.expectedRevision,
        expectedRound: input.expectedRound,
        operation,
      },
      [],
      this.guard(input.projectId, pins),
    );
    this.proposals.delete(input.proposalId);
    return result;
  }
  discardProposal(proposalId: string): void {
    this.proposals.delete(proposalId);
  }
  private progress(
    callback: ((value: WorkspaceProgress) => void) | undefined,
    jobId: string,
    stage: WorkspaceProgress["stage"],
    completed: number,
    total: number,
    message: string,
  ): void {
    this.alive();
    callback?.({ jobId, stage, completed, total, message });
  }
  async exportPpt(
    input: ExportRequest,
    onProgress?: (value: WorkspaceProgress) => void,
    signal?: AbortSignal,
  ): Promise<PptVersion> {
    const combined = this.signal(signal),
      { state } = await this.requested(input),
      context = this.context(input.projectId),
      target = this.target(state, input.snapshotId),
      slides = target.body.chapters.flatMap((c) =>
        target.body.sections
          .filter((s) => s.chapterId === c.id)
          .flatMap((s) =>
            target.body.slides.filter((sl) => sl.sectionId === s.id),
          ),
      ),
      pins = pinsForSlides(state, slides),
      verify = this.guard(input.projectId, pins, combined);
    verify();
    check(slides.length > 0, "VALIDATION", "출력할 슬라이드가 없습니다.");
    const jobId = this.newId(),
      total = slides.length + 3;
    this.progress(onProgress, jobId, "reading", 1, total, "적용 원본 확인");
    const rendered = [];
    for (const [index, slide] of slides.entries()) {
      rendered.push(await this.render(input.projectId, state, slide, combined));
      this.progress(
        onProgress,
        jobId,
        "rendering",
        index + 2,
        total,
        index + 1 + " / " + slides.length + "장 내용 반영",
      );
    }
    verify();
    this.progress(
      onProgress,
      jobId,
      "assembling",
      slides.length + 2,
      total,
      "슬라이드와 연결 파일 조립",
    );
    const deck = await assembleProjectDeck(
      {
        projectId: input.projectId,
        round: target.round,
        inputRevision: target.inputRevision,
        exportId: jobId,
        slides: rendered,
      },
      await loadZipLibrary(),
      combined,
    );
    verify();
    const blob = new Blob([new Uint8Array(deck.bytes)], { type: PptMime }),
      id = this.newId(),
      blobId = this.newId(),
      index = state.pptVersions.length + 1;
    const version: PptVersion = {
      id,
      index,
      round: target.round,
      snapshotId: input.snapshotId,
      kind: "generated",
      pinIds: pins.map((p) => p.id),
      blobId,
      filename: safePptxFilename(
        context.project.name + "_" + target.round + "회차_v" + index + ".pptx",
      ),
      byteLength: blob.size,
      sha256: await hashWorkspaceBlob(blob),
      createdAt: this.now(),
      createdBy: context.identity.actor.id,
      inputRevision: target.inputRevision,
      baseVersionId: null,
      manifest: deck.manifest,
    };
    await this.options.repository.commitPrepared(
      {
        projectId: input.projectId,
        expectedRevision: input.expectedRevision,
        expectedRound: input.expectedRound,
        operation: { type: "register-ppt", version },
      },
      [
        {
          id: blobId,
          kind: "ppt",
          blob,
          filename: version.filename,
          sha256: version.sha256,
        },
      ],
      verify,
    );
    this.progress(
      onProgress,
      jobId,
      "saving",
      total,
      total,
      "PPT 버전 저장 완료",
    );
    return version;
  }
  private baseVersion(
    state: ProjectWorkspaceState,
    id: string | null,
  ): PptVersion | null {
    if (id === null) return null;
    const version = state.pptVersions.find(
      (v) => v.id === id && v.kind === "generated",
    );
    check(
      !!version,
      "NOT_FOUND",
      "이 프로젝트에서 생성한 기준 PPT 버전이 아닙니다.",
    );
    return version;
  }
  private importPermission(
    state: ProjectWorkspaceState,
    matchedIds: readonly string[],
  ): void {
    const context = this.context(state.projectId);
    check(
      state.phase === "writing",
      "READ_ONLY",
      "완성본에는 수정본을 등록할 수 없습니다.",
    );
    const sections = matchedIds.length
      ? state.body.slides
          .filter((s) => matchedIds.includes(s.id))
          .map((s) => s.sectionId)
      : state.body.sections.map((s) => s.id);
    check(
      sections.some((id) => canEditSection(context, state, id)),
      "FORBIDDEN",
      "수정본을 등록할 수 있는 담당 섹션이 없습니다.",
    );
  }
  private storeImport(
    state: ProjectWorkspaceState,
    versionId: string,
    comparison: ImportedPpt["comparison"],
  ): ImportedPpt {
    const value: ImportSession = {
      sessionId: this.newId(),
      versionId,
      comparison,
      baseRevision: state.revision,
      projectId: state.projectId,
      round: state.currentRound,
      actorId: this.options.identity.actor.id,
      expiresAt: Date.parse(this.now()) + 600000,
    };
    this.prune(this.imports);
    this.imports.set(value.sessionId, value);
    return structuredClone({
      sessionId: value.sessionId,
      versionId,
      comparison,
      baseRevision: value.baseRevision,
    });
  }
  async importPpt(
    input: ImportRequest,
    onProgress?: (value: WorkspaceProgress) => void,
    signal?: AbortSignal,
  ): Promise<ImportedPpt> {
    const combined = this.signal(signal),
      { state } = await this.requested(input);
    this.importPermission(state, []);
    check(
      input.file instanceof File && /\.pptx$/i.test(input.file.name),
      "VALIDATION",
      "수정본은 .pptx 파일을 선택해 주세요.",
    );
    check(
      input.file.size <= TEMPLATE_LIMITS.fileBytes,
      "LIMIT",
      "수정본은 250 MiB 이하여야 합니다.",
    );
    const base = this.baseVersion(state, input.baseVersionId),
      jobId = this.newId();
    this.progress(onProgress, jobId, "reading", 1, 3, "수정본 원본 확인");
    const bytes = new Uint8Array(await input.file.arrayBuffer());
    this.alive(combined);
    const comparison = await compareExternalDeck(
      {
        bytes,
        filename: input.file.name,
        currentSlides: state.body.slides,
        baseManifest: base?.manifest ?? null,
        mapping: input.mapping,
      },
      await loadZipLibrary(),
      combined,
    );
    this.importPermission(state, comparison.matchedSlideIds);
    this.progress(
      onProgress,
      jobId,
      "comparing",
      2,
      3,
      "지원하는 본문 차이 비교 완료",
    );
    const pins = this.usedPins(state, [
        ...(base?.pinIds ?? []),
        ...slidePinIds(
          state.body.slides.filter((s) =>
            comparison.matchedSlideIds.includes(s.id),
          ),
        ),
      ]),
      blob = new Blob([bytes], { type: PptMime }),
      blobId = this.newId();
    const version: PptVersion = {
      id: this.newId(),
      index: state.pptVersions.length + 1,
      round: state.currentRound,
      snapshotId: null,
      kind: "uploaded",
      pinIds: pins.map((p) => p.id),
      blobId,
      filename: safePptxFilename(input.file.name),
      byteLength: blob.size,
      sha256: await hashWorkspaceBlob(blob),
      createdAt: this.now(),
      createdBy: this.options.identity.actor.id,
      inputRevision: state.inputRevision,
      baseVersionId: base?.id ?? null,
      manifest: null,
    };
    const saved = await this.options.repository.commitPrepared(
      {
        projectId: input.projectId,
        expectedRevision: input.expectedRevision,
        expectedRound: input.expectedRound,
        operation: { type: "register-ppt", version },
      },
      [
        {
          id: blobId,
          kind: "ppt",
          blob,
          filename: version.filename,
          sha256: version.sha256,
        },
      ],
      this.guard(input.projectId, pins, combined),
    );
    const session = this.storeImport(saved.state, version.id, comparison);
    this.progress(
      onProgress,
      jobId,
      "saving",
      3,
      3,
      "원본 등록 완료 · 내용 적용은 별도입니다.",
    );
    return session;
  }
  private session(projectId: string, id: string): ImportSession {
    const value = this.imports.get(id);
    check(
      !!value && value.expiresAt > Date.parse(this.now()),
      "CONFLICT",
      "비교가 만료되었습니다. 저장된 원본으로 다시 비교해 주세요.",
    );
    check(
      value.projectId === projectId &&
        value.actorId === this.options.identity.actor.id,
      "FORBIDDEN",
      "이 프로젝트의 비교가 아닙니다.",
    );
    return value;
  }
  async remapImport(
    input: ProjectRequest & { sessionId: string; mapping: ImportMapping[] },
    signal?: AbortSignal,
  ): Promise<ImportedPpt> {
    const combined = this.signal(signal);
    const { state } = await this.requested(input),
      versionId = input.sessionId.startsWith("version:")
        ? input.sessionId.slice(8)
        : this.session(input.projectId, input.sessionId).versionId,
      version = state.pptVersions.find(
        (v) => v.id === versionId && v.kind === "uploaded",
      );
    check(!!version, "NOT_FOUND", "저장된 수정본이 없습니다.");
    this.importPermission(state, []);
    const pins = this.usedPins(state, version.pinIds),
      verify = this.guard(input.projectId, pins, combined);
    verify();
    const original = await this.options.repository.readBlob(
        input.projectId,
        version.blobId,
      ),
      base = this.baseVersion(state, version.baseVersionId);
    const comparison = await compareExternalDeck(
      {
        bytes: new Uint8Array(await original.blob.arrayBuffer()),
        filename: version.filename,
        currentSlides: state.body.slides,
        baseManifest: base?.manifest ?? null,
        mapping: input.mapping,
      },
      await loadZipLibrary(),
      combined,
    );
    verify();
    await this.requested(input);
    this.importPermission(state, comparison.matchedSlideIds);
    const mappedPins = pinsForSlides(
      state,
      state.body.slides.filter((s) =>
        comparison.matchedSlideIds.includes(s.id),
      ),
    );
    this.options.assets.assertPins(input.projectId, mappedPins);
    // 나중에 수동 연결한 자산도 원본 다운로드의 권한 검사에 남긴다. 파일과 생성 이력은 변경하지 않는다.
    let next = state;
    if (mappedPins.some((p) => !version.pinIds.includes(p.id)))
      next = (
        await this.options.repository.commitPrepared(
          {
            projectId: input.projectId,
            expectedRevision: input.expectedRevision,
            expectedRound: input.expectedRound,
            operation: {
              type: "protect-ppt",
              versionId: version.id,
              pinIds: mappedPins.map((p) => p.id),
            },
          },
          [],
          this.guard(input.projectId, [...pins, ...mappedPins], combined),
        )
      ).state;
    if (!input.sessionId.startsWith("version:"))
      this.imports.delete(input.sessionId);
    return this.storeImport(next, version.id, comparison);
  }
  async applyImport(
    input: ProjectRequest & { sessionId: string; changeIds: string[] },
  ): Promise<WorkspaceReceipt> {
    const session = this.session(input.projectId, input.sessionId),
      { state } = await this.requested(input);
    check(
      session.baseRevision === state.revision &&
        session.round === state.currentRound,
      "CONFLICT",
      "비교 이후 내용이 변경되었습니다. 저장된 원본으로 다시 비교해 주세요.",
    );
    check(
      SelectedIds.safeParse(input.changeIds).success &&
        input.changeIds.every((id) =>
          session.comparison.changes.some((c) => c.id === id),
        ),
      "VALIDATION",
      "적용할 변경을 확인해 주세요.",
    );
    const slides = structuredClone(state.body.slides),
      changed = new Set<string>();
    for (const change of session.comparison.changes.filter((c) =>
      input.changeIds.includes(c.id),
    )) {
      const slide = slides.find((s) => s.id === change.slideId);
      check(!!slide, "NOT_FOUND", "변경 대상 슬라이드가 없습니다.");
      if (change.key === "title" || change.key === "lead") {
        check(
          typeof change.after === "string",
          "VALIDATION",
          "제목 또는 리딩 메시지 형식이 다릅니다.",
        );
        slide.content[change.key] = change.after;
      } else {
        check(
          typeof change.after !== "string",
          "VALIDATION",
          "본문 블록 형식이 다릅니다.",
        );
        const index = slide.content.blocks.findIndex(
          (b) => b.id === change.key,
        );
        check(index >= 0, "NOT_FOUND", "변경할 블록이 없습니다.");
        slide.content.blocks[index] = structuredClone(change.after);
      }
      changed.add(slide.id);
    }
    for (const slide of slides)
      if (changed.has(slide.id)) {
        slide.revision++;
        check(
          ProposalSlideSchema.safeParse(slide).success,
          "VALIDATION",
          "수정본 내용과 연결을 확인해 주세요.",
        );
      }
    const sectionIds = [
      ...new Set(
        slides.filter((s) => changed.has(s.id)).map((s) => s.sectionId),
      ),
    ];
    this.edit(state, sectionIds);
    const version = state.pptVersions.find((v) => v.id === session.versionId);
    check(!!version, "NOT_FOUND", "수정본 원본이 없습니다.");
    const pins = this.usedPins(state, [
      ...version.pinIds,
      ...slidePinIds(slides.filter((s) => changed.has(s.id))),
    ]);
    const receipt = await this.options.repository.commitPrepared(
      {
        projectId: input.projectId,
        expectedRevision: input.expectedRevision,
        expectedRound: input.expectedRound,
        operation: { type: "replace-content", sectionIds, slides, pins: [] },
      },
      [],
      this.guard(input.projectId, pins),
    );
    this.imports.delete(input.sessionId);
    return receipt;
  }
  async downloadPpt(
    projectId: string,
    versionId: string,
    signal?: AbortSignal,
  ): Promise<{ blob: Blob; filename: string }> {
    const { state } = await this.load(projectId),
      version = state.pptVersions.find((v) => v.id === versionId);
    check(!!version, "NOT_FOUND", "PPT 버전이 없습니다.");
    const verify = this.guard(
      projectId,
      this.usedPins(state, version.pinIds),
      signal,
    );
    verify();
    const source = await this.options.repository.readBlob(
      projectId,
      version.blobId,
    );
    verify();
    check(
      source.sha256 === version.sha256,
      "ORIGINAL_MISSING",
      "PPT 원본 내용이 다릅니다.",
    );
    return { blob: source.blob, filename: version.filename };
  }
  async copySlides(
    projectId: string,
    slideIds: string[],
  ): Promise<{ token: string; count: number }> {
    check(
      Ids.safeParse(slideIds).success,
      "VALIDATION",
      "복사할 슬라이드를 선택해 주세요.",
    );
    const { state } = await this.load(projectId);
    check(
      slideIds.every((id) => state.body.slides.some((s) => s.id === id)),
      "NOT_FOUND",
      "복사할 슬라이드가 없습니다.",
    );
    const slides = state.body.slides.filter((s) => slideIds.includes(s.id)),
      pins = pinsForSlides(state, slides);
    this.options.assets.assertPins(projectId, pins);
    const token = this.newId();
    this.prune(this.clipboard);
    this.clipboard.set(token, {
      projectId,
      revision: state.revision,
      actorId: this.options.identity.actor.id,
      expiresAt: Date.parse(this.now()) + 600000,
      slides: structuredClone(slides),
      pins: structuredClone(pins),
    });
    return { token, count: slides.length };
  }
  async pasteSlides(
    input: ProjectRequest & {
      token: string;
      sectionId: string;
      afterId: string | null;
    },
  ): Promise<WorkspaceReceipt> {
    const source = this.clipboard.get(input.token);
    check(
      !!source && source.expiresAt > Date.parse(this.now()),
      "CONFLICT",
      "복사 내용이 만료되었습니다. 다시 복사해 주세요.",
    );
    check(
      source.actorId === this.options.identity.actor.id,
      "FORBIDDEN",
      "본인 복사 내용만 붙여넣을 수 있습니다.",
    );
    this.context(source.projectId);
    const { state, files } = await this.requested(input);
    this.edit(state, [input.sectionId]);
    const same = source.projectId === input.projectId,
      pinMap = new Map<string, string>(),
      imageMap = new Map<string, string>(),
      newPins: AssetPin[] = [],
      blobs: WorkspaceBlobInput[] = [],
      newChecks: Array<() => void> = [];
    this.options.assets.assertPins(source.projectId, source.pins);
    for (const pin of source.pins) {
      const existing = state.pins.find(
        (p) =>
          p.kind === pin.kind &&
          p.assetId === pin.assetId &&
          p.revisionId === pin.revisionId &&
          (p.kind !== "template" ||
            (pin.kind === "template" && p.sha256 === pin.sha256)),
      );
      if (existing) {
        this.options.assets.assertPins(input.projectId, [existing]);
        pinMap.set(pin.id, existing.id);
        continue;
      }
      newChecks.push(
        await this.options.assets.prepareNewPinCheck(input.projectId, [pin]),
      );
      const copied = structuredClone(pin);
      copied.id = this.newId();
      copied.capturedAt = this.now();
      copied.capturedBy = this.options.identity.actor.id;
      if (copied.kind === "template" && pin.kind === "template") {
        const original = await this.options.repository.readBlob(
          source.projectId,
          pin.blobId,
        );
        copied.blobId = this.newId();
        blobs.push({
          id: copied.blobId,
          kind: "template",
          blob: original.blob,
          filename: original.filename,
          sha256: original.sha256,
        });
      }
      pinMap.set(pin.id, copied.id);
      newPins.push(copied);
    }
    for (const block of source.slides.flatMap((s) => s.content.blocks))
      if (block.kind === "image" && !imageMap.has(block.blobId)) {
        const original = await this.options.repository.readBlob(
          source.projectId,
          block.blobId,
        );
        if (same) imageMap.set(block.blobId, block.blobId);
        else {
          const id = this.newId();
          imageMap.set(block.blobId, id);
          blobs.push({
            id,
            kind: "image",
            blob: original.blob,
            filename: original.filename,
            sha256: original.sha256,
          });
        }
      }
    let dropped = 0;
    const copies = source.slides.map((s) => {
      const slide = cloneClipboardSlide(
        s,
        input.sectionId,
        this.newId,
        pinMap,
        imageMap,
      );
      slide.sources = slide.sources.filter((ref) => {
        const valid =
          same &&
          (ref.kind === "requirement"
            ? state.body.requirements.some((r) => r.id === ref.targetId)
            : files.versions.some(
                (v) => v.id === ref.versionId && v.assetId === ref.targetId,
              ) && files.rounds.some((r) => r.number === ref.fileRound));
        if (!valid) dropped++;
        return valid;
      });
      return slide;
    });
    const slides = structuredClone(state.body.slides),
      index =
        input.afterId === null
          ? slides.length
          : slides.findIndex(
              (s) => s.id === input.afterId && s.sectionId === input.sectionId,
            );
    check(index >= 0, "NOT_FOUND", "붙여넣을 위치가 없습니다.");
    slides.splice(input.afterId === null ? index : index + 1, 0, ...copies);
    const receipt = await this.options.repository.commitPrepared(
      {
        projectId: input.projectId,
        expectedRevision: input.expectedRevision,
        expectedRound: input.expectedRound,
        operation: {
          type: "replace-content",
          sectionIds: [input.sectionId],
          slides,
          pins: newPins,
        },
      },
      blobs,
      () => {
        this.context(source.projectId);
        this.guard(input.projectId, [
          ...newPins,
          ...state.pins.filter((p) => [...pinMap.values()].includes(p.id)),
        ])();
        this.options.assets.assertPins(source.projectId, source.pins);
        newChecks.forEach((fn) => fn());
      },
    );
    return {
      ...receipt,
      notices: dropped
        ? [dropped + "개 출처는 대상 프로젝트에서 확인할 수 없어 제외했습니다."]
        : [],
    };
  }
  async insertImage(
    input: ProjectRequest & {
      slideId: string;
      file: File;
      afterBlockId: string | null;
    },
  ): Promise<WorkspaceReceipt> {
    const { state } = await this.requested(input),
      slide = state.body.slides.find((s) => s.id === input.slideId);
    check(!!slide, "NOT_FOUND", "슬라이드가 없습니다.");
    this.edit(state, [slide.sectionId]);
    check(
      input.file instanceof File &&
        ["image/png", "image/jpeg"].includes(input.file.type),
      "VALIDATION",
      "PNG 또는 JPEG 파일을 선택해 주세요.",
    );
    check(
      input.file.size > 0 && input.file.size <= WORKSPACE_LIMITS.imageBytes,
      "LIMIT",
      "이미지는 10 MiB 이하여야 합니다.",
    );
    const mime = input.file.type as "image/png" | "image/jpeg",
      bytes = new Uint8Array(await input.file.arrayBuffer()),
      size = inspectProductionImage(bytes, mime),
      blob = new Blob([bytes], { type: mime }),
      blobId = this.newId(),
      slides = structuredClone(state.body.slides),
      target = slides.find((s) => s.id === slide.id)!,
      index =
        input.afterBlockId === null
          ? target.content.blocks.length
          : target.content.blocks.findIndex((b) => b.id === input.afterBlockId);
    check(index >= 0, "NOT_FOUND", "이미지를 넣을 위치가 없습니다.");
    target.content.blocks.splice(
      input.afterBlockId === null ? index : index + 1,
      0,
      {
        id: this.newId(),
        kind: "image",
        blobId,
        alt: input.file.name,
        width: size.width,
        height: size.height,
        mime,
      },
    );
    target.revision++;
    return this.options.repository.commitPrepared(
      {
        projectId: input.projectId,
        expectedRevision: input.expectedRevision,
        expectedRound: input.expectedRound,
        operation: {
          type: "replace-content",
          sectionIds: [slide.sectionId],
          slides,
          pins: [],
        },
      },
      [
        {
          id: blobId,
          kind: "image",
          blob,
          filename: safePptxFilename(input.file.name),
          sha256: await hashWorkspaceBlob(blob),
        },
      ],
      this.guard(input.projectId, []),
    );
  }
  clearProjectSessions(projectId: string): void {
    for (const [id, v] of this.proposals)
      if (v.view.projectId === projectId) this.proposals.delete(id);
    for (const [id, v] of this.imports)
      if (v.projectId === projectId) this.imports.delete(id);
    for (const [id, v] of this.clipboard)
      if (v.projectId === projectId) this.clipboard.delete(id);
  }
  close(): void {
    this.lifetime.abort();
    this.proposals.clear();
    this.imports.clear();
    this.clipboard.clear();
    this.options.repository.close();
  }
}
