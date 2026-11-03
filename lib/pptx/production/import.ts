import { z } from "zod";
import type {
  ContentBlock,
  ExportManifest,
  ImportMapping,
  PptComparison,
  PptContentChange,
  ProposalSlide,
} from "@/types/workspace-production";
import type { ZipLibrary } from "../zip";
import { readTemplate, textBody } from "../template-read";
import { NS, all, children, xmlPart } from "../pptx-xml";
import { checkPptxAbort } from "../errors";
import { workspaceAssert as check } from "@/lib/workspace/production/errors";
import {
  ContentBlockSchema,
  ExportManifestSchema,
  ProposalSlideSchema,
  WorkspaceIdSchema,
} from "@/lib/workspace/production/schemas";
import { WORKSPACE_LIMITS as L } from "@/config/workspace-production";
import { readManifest, slideMarkers } from "./manifest";

const MappingSchema = z.strictObject({
  externalPath: WorkspaceIdSchema,
  externalShapeId: WorkspaceIdSchema,
  slideId: WorkspaceIdSchema,
  key: WorkspaceIdSchema,
});
const normalize = (text: string) => text.replace(/\r\n?/g, "\n");
const compareValue = (value: ContentBlock | string): string =>
  JSON.stringify(
    typeof value === "string"
      ? normalize(value)
      : value.kind === "text"
        ? { ...value, text: normalize(value.text) }
        : value.kind === "list"
          ? { ...value, items: value.items.map(normalize) }
          : value.kind === "table"
            ? {
                ...value,
                columns: value.columns.map(normalize),
                rows: value.rows.map((r) => r.map(normalize)),
              }
            : value,
  );
function compatibleManifest(
  external: ExportManifest,
  base: ExportManifest,
): boolean {
  return (
    external.projectId === base.projectId &&
    external.exportId === base.exportId &&
    external.round === base.round &&
    external.inputRevision === base.inputRevision &&
    external.slides.length === base.slides.length &&
    external.slides.every((s) => {
      const old = base.slides.find((o) => o.id === s.id);
      return (
        !!old &&
        old.sectionId === s.sectionId &&
        old.sourcePinId === s.sourcePinId &&
        old.sourcePath === s.sourcePath &&
        JSON.stringify(old.elements) === JSON.stringify(s.elements)
      );
    })
  );
}
export async function compareExternalDeck(
  input: {
    bytes: Uint8Array;
    filename: string;
    currentSlides: ProposalSlide[];
    baseManifest: ExportManifest | null;
    mapping: ImportMapping[];
  },
  library: ZipLibrary,
  signal?: AbortSignal,
): Promise<PptComparison> {
  checkPptxAbort(signal);
  check(
    /\.pptx$/i.test(input.filename),
    "VALIDATION",
    "외부 수정본은 .pptx 파일만 등록할 수 있습니다.",
  );
  check(
    z.array(ProposalSlideSchema).max(200).safeParse(input.currentSlides)
      .success &&
      new Set(input.currentSlides.map((s) => s.id)).size ===
        input.currentSlides.length,
    "VALIDATION",
    "현재 슬라이드 정보를 확인해 주세요.",
  );
  check(
    z.array(MappingSchema).max(20400).safeParse(input.mapping).success,
    "MAPPING",
    "수정본 연결 정보를 확인해 주세요.",
  );
  if (input.baseManifest)
    check(
      ExportManifestSchema.safeParse(input.baseManifest).success,
      "MAPPING",
      "저장된 출력 연결 정보가 올바르지 않습니다.",
    );
  const document = await readTemplate(
      input.bytes.slice(),
      input.filename,
      library,
      { signal },
    ),
    result: PptComparison = {
      changes: [],
      issues: [],
      matchedSlideIds: [],
      externalSlideCount: document.slides.length,
      externalShapes: document.slides.flatMap((s) =>
        s.objects.map((o) => ({
          path: s.path,
          slideName: s.name,
          shapeId: o.shapeId ?? "",
          name: o.name,
          kind: o.kind,
          excerpt: (o.kind === "table"
            ? o.cells.map((row) => row.join(" | ")).join("\n")
            : o.text
          ).slice(0, 2000),
          reasons: [
            ...o.reasons,
            ...(o.merged ? ["병합 표"] : []),
            ...(!o.shapeId ? ["원본 요소 ID 없음"] : []),
          ],
        })),
      ),
    };
  const issue = (
    code: PptComparison["issues"][number]["code"],
    message: string,
    externalPath: string | null = null,
    slideId: string | null = null,
  ) => result.issues.push({ code, message, externalPath, slideId });
  let metadata: ExportManifest | null = null;
  try {
    metadata = await readManifest(document.zip);
  } catch {
    issue("unmatched", "출력 식별 정보를 읽을 수 없어 수동 연결이 필요합니다.");
  }
  const automatic =
    !!metadata &&
    !!input.baseManifest &&
    compatibleManifest(metadata, input.baseManifest);
  if (!automatic)
    issue(
      "unmatched",
      "저장된 출력본과 식별 정보가 일치하지 않습니다. 내용 연결을 직접 확인해 주세요.",
    );
  const rows = await Promise.all(
    document.slides.map(async (slide) => {
      const xml = await xmlPart(document.zip, slide.path);
      let markers: ReturnType<typeof slideMarkers> = [];
      try {
        markers = slideMarkers(xml);
      } catch {
        issue("ambiguous", "슬라이드 식별 정보가 손상되었습니다.", slide.path);
      }
      const tree = all(xml, NS.p, "spTree")[0],
        nodes = tree
          ? children(tree).filter(
              (e) => !["nvGrpSpPr", "grpSpPr", "extLst"].includes(e.localName),
            )
          : [];
      return { slide, markers, nodes };
    }),
  );
  const mappings: ImportMapping[] = [...input.mapping];
  for (const row of rows) {
    checkPptxAbort(signal);
    const marker = row.markers[0],
      matching =
        marker &&
        input.baseManifest?.slides.find((s) => s.id === marker.slideId);
    const sameMarkers = marker
      ? rows.filter((other) =>
          other.markers.some(
            (m) =>
              m.slideId === marker.slideId &&
              m.exportId === marker.exportId &&
              m.projectId === marker.projectId,
          ),
        )
      : [];
    if (row.markers.length > 1 || sameMarkers.length > 1) {
      issue(
        "ambiguous",
        "중복된 슬라이드 식별 정보입니다. 자동 연결하지 않습니다.",
        row.slide.path,
        marker?.slideId ?? null,
      );
      continue;
    }
    if (
      automatic &&
      marker &&
      matching &&
      marker.exportId === input.baseManifest!.exportId &&
      marker.projectId === input.baseManifest!.projectId &&
      input.currentSlides.some((s) => s.id === matching.id)
    ) {
      mappings.push(
        ...matching.elements.map((e) => ({
          externalPath: row.slide.path,
          externalShapeId: e.shapeId,
          slideId: matching.id,
          key: e.key,
        })),
      );
    } else if (!input.mapping.some((m) => m.externalPath === row.slide.path))
      issue(
        "unmatched",
        "현재 목차에 연결되지 않은 슬라이드입니다.",
        row.slide.path,
      );
  }
  const unique = [
    ...new Map(mappings.map((m) => [JSON.stringify(m), m])).values(),
  ];
  for (const mapping of unique) {
    checkPptxAbort(signal);
    const row = rows.find((r) => r.slide.path === mapping.externalPath),
      slide = input.currentSlides.find((s) => s.id === mapping.slideId);
    const targets = unique.filter(
        (m) => m.slideId === mapping.slideId && m.key === mapping.key,
      ),
      origins = unique.filter(
        (m) =>
          m.externalPath === mapping.externalPath &&
          m.externalShapeId === mapping.externalShapeId,
      );
    if (targets.length !== 1 || origins.length !== 1) {
      issue(
        "ambiguous",
        "같은 요소 또는 본문에 여러 연결이 지정되었습니다.",
        mapping.externalPath,
        mapping.slideId,
      );
      continue;
    }
    if (!row || !slide) {
      issue(
        "missing",
        "연결된 슬라이드를 찾을 수 없습니다.",
        mapping.externalPath,
        mapping.slideId,
      );
      continue;
    }
    const objects = row.slide.objects.filter(
      (o) => o.shapeId === mapping.externalShapeId,
    );
    const nodeIds = row.nodes.flatMap((n) =>
      all(n, NS.p, "cNvPr").map((e) => e.getAttribute("id")),
    );
    if (
      objects.length !== 1 ||
      nodeIds.filter((id) => id === mapping.externalShapeId).length !== 1
    ) {
      issue(
        objects.length === 0 ? "missing" : "ambiguous",
        "요소 ID가 없거나 중복되었습니다.",
        mapping.externalPath,
        mapping.slideId,
      );
      continue;
    }
    const object = objects[0],
      block = slide.content.blocks.find((b) => b.id === mapping.key);
    const before =
      mapping.key === "title"
        ? slide.content.title
        : mapping.key === "lead"
          ? slide.content.lead
          : block;
    if (before === undefined) {
      issue(
        "unmatched",
        "현재 본문에 없는 항목입니다.",
        mapping.externalPath,
        mapping.slideId,
      );
      continue;
    }
    const kind = typeof before === "string" ? "text" : before.kind;
    const textual =
      (kind === "text" || kind === "list") &&
      (object.kind === "text" ||
        (object.kind === "shape" && !!textBody(row.nodes[object.index])));
    if (
      object.reasons.length ||
      object.merged ||
      kind === "image" ||
      !(textual || (kind === "table" && object.kind === "table"))
    ) {
      issue(
        "unsupported",
        object.reasons.join(" ") ||
          "이미지·병합 표·유형이 바뀐 요소는 원본 PPT에 보존하며 웹 내용으로 반영하지 않습니다.",
        mapping.externalPath,
        mapping.slideId,
      );
      continue;
    }
    let after: ContentBlock | string;
    if (typeof before === "string") after = normalize(object.text);
    else if (before.kind === "text")
      after = { ...before, text: normalize(object.text) };
    else if (before.kind === "list")
      after = { ...before, items: normalize(object.text).split("\n") };
    else if (before.kind === "table")
      after = {
        ...before,
        columns: (object.cells[0] ?? []).map(normalize),
        rows: object.cells.slice(1).map((r) => r.map(normalize)),
      };
    else continue;
    if (
      typeof after === "string"
        ? after.length > (mapping.key === "title" ? L.title : L.lead)
        : !ContentBlockSchema.safeParse(after).success
    ) {
      issue(
        "layout",
        "내용이 편집 한계를 넘거나 표 구조가 다릅니다. 원본을 확인해 주세요.",
        mapping.externalPath,
        mapping.slideId,
      );
      continue;
    }
    if (!result.matchedSlideIds.includes(slide.id))
      result.matchedSlideIds.push(slide.id);
    if (compareValue(before) !== compareValue(after)) {
      const change: PptContentChange = {
        id: [
          slide.id,
          mapping.key,
          mapping.externalPath,
          mapping.externalShapeId,
        ]
          .map(encodeURIComponent)
          .join("|"),
        slideId: slide.id,
        key: mapping.key,
        kind: kind as PptContentChange["kind"],
        before: structuredClone(before),
        after,
        externalPath: mapping.externalPath,
        externalShapeId: mapping.externalShapeId,
      };
      result.changes.push(change);
    }
  }
  for (const slide of input.currentSlides)
    if (
      !rows.some((r) =>
        r.markers.some((m) => automatic && m.slideId === slide.id),
      ) &&
      !input.mapping.some((m) => m.slideId === slide.id)
    )
      issue(
        "missing",
        "수정본에 대응 슬라이드가 없습니다. 웹 슬라이드는 유지합니다.",
        null,
        slide.id,
      );
  for (const row of rows) {
    if (
      row.slide.objects.some(
        (o) => o.reasons.length || o.merged || o.kind === "unsupported",
      )
    )
      issue(
        "unsupported",
        "차트·그룹·회전·병합 등 지원 제외 요소는 업로드 원본에 보존됩니다.",
        row.slide.path,
      );
    issue(
      "layout",
      "배치·색상·서식·이미지는 웹 내용에 덮어쓰지 않습니다. 업로드한 원본에서 확인할 수 있습니다.",
      row.slide.path,
    );
  }
  checkPptxAbort(signal);
  return result;
}
