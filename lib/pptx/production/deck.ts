import { z } from "zod";
import type {
  DeckInput,
  DeckResult,
  ExportManifest,
} from "@/types/workspace-production";
import type { ZipLibrary } from "../zip";
import {
  NS,
  all,
  one,
  parseXml,
  relativePart,
  relPath,
  serialize,
  xmlPart,
  openPackage,
} from "../pptx-xml";
import { readTemplate } from "../template-read";
import { checkPptxAbort } from "../errors";
import { workspaceAssert as check } from "@/lib/workspace/production/errors";
import {
  ExportManifestSchema,
  WorkspaceIdSchema,
} from "@/lib/workspace/production/schemas";
import {
  appendRelationship,
  emptyXml,
  PackageGraphCopier,
  validateDeckGraph,
  type PackageSource,
} from "./package-graph";
import { MANIFEST_PATH, setSlideMarker, writeManifest } from "./manifest";

const HeaderSchema = z.strictObject({
  projectId: WorkspaceIdSchema,
  round: z.number().int().positive(),
  inputRevision: z.number().int().positive(),
  exportId: WorkspaceIdSchema,
});
export async function assembleProjectDeck(
  input: DeckInput,
  library: ZipLibrary,
  signal?: AbortSignal,
): Promise<DeckResult> {
  checkPptxAbort(signal);
  const header = HeaderSchema.safeParse({
    projectId: input.projectId,
    round: input.round,
    inputRevision: input.inputRevision,
    exportId: input.exportId,
  });
  check(
    header.success && input.slides.length > 0,
    "VALIDATION",
    "출력할 프로젝트와 슬라이드를 확인해 주세요.",
  );
  check(
    input.slides.length <= 200,
    "LIMIT",
    "한 번에 200장까지 출력할 수 있습니다.",
  );
  check(
    new Set(input.slides.map((s) => s.slideId)).size === input.slides.length,
    "MAPPING",
    "슬라이드 ID가 중복되었습니다.",
  );
  const size = input.slides[0];
  check(
    input.slides.every(
      (s) =>
        Math.abs(s.width - size.width) < 0.00001 &&
        Math.abs(s.height - size.height) < 0.00001,
    ),
    "LAYOUT",
    "서로 다른 페이지 크기를 한 파일로 출력할 수 없습니다. Template 크기를 맞춰 주세요.",
  );
  const sources: PackageSource[] = [],
    warnings = input.slides.flatMap((s) => s.warnings),
    presentations: Document[] = [];
  for (const [index, slide] of input.slides.entries()) {
    checkPptxAbort(signal);
    const zip = await openPackage(slide.bytes, library),
      presentation = await xmlPart(zip, "ppt/presentation.xml"),
      parsed = await readTemplate(slide.bytes, "source.pptx", library, {
        signal,
      });
    check(
      parsed.slides.some((s) => s.path === slide.sourcePath),
      "MAPPING",
      "출력할 원본 슬라이드가 없습니다.",
    );
    check(
      Math.abs(parsed.width - slide.width) < 0.00001 &&
        Math.abs(parsed.height - slide.height) < 0.00001,
      "LAYOUT",
      "원본 페이지 크기가 다릅니다.",
    );
    check(
      !all(presentation, NS.p, "custShowLst").length,
      "MAPPING",
      "사용자 지정 쇼의 연결을 보존할 수 없습니다. 쇼가 없는 사본을 등록해 주세요.",
    );
    sources.push({
      zip,
      pinId: slide.sourcePinId,
      sourcePath: slide.sourcePath,
      outputPath: "ppt/slides/slide" + (index + 1) + ".xml",
      scope: String(index),
      types: await xmlPart(zip, "[Content_Types].xml"),
      local: new Map(),
    });
    presentations.push(presentation);
  }
  const defaults = presentations.map((doc) => {
    const node = one(doc.documentElement, NS.p, "defaultTextStyle");
    return node ? serialize(node) : "";
  });
  check(
    defaults.every((value) => value === defaults[0]),
    "LAYOUT",
    "Template의 공통 텍스트 기본값이 다릅니다. 동일한 기본 스타일을 사용하는 Template으로 맞춰 주세요.",
  );
  const output = library.create(),
    copier = new PackageGraphCopier(output, sources, signal);
  for (const source of sources)
    await copier.copy(source, source.sourcePath, source.outputPath);
  const manifest: ExportManifest = {
    version: 1,
    ...header.data,
    slides: input.slides.map((slide, index) => ({
      id: slide.slideId,
      sectionId: slide.sectionId,
      path: sources[index].outputPath,
      sourcePinId: slide.sourcePinId,
      sourcePath: slide.sourcePath,
      elements: structuredClone(slide.elements),
    })),
  };
  check(
    ExportManifestSchema.safeParse(manifest).success,
    "MAPPING",
    "슬라이드 연결 정보가 올바르지 않습니다.",
  );
  for (const [index, source] of sources.entries()) {
    const doc = await xmlPart(output, source.outputPath);
    setSlideMarker(doc, {
      projectId: input.projectId,
      exportId: input.exportId,
      slideId: manifest.slides[index].id,
    });
    output.file(source.outputPath, serialize(doc));
  }
  const presentation = parseXml(
      '<p:presentation xmlns:p="' +
        NS.p +
        '" xmlns:a="' +
        NS.a +
        '" xmlns:r="' +
        NS.r +
        '"/>',
      "presentation",
    ),
    relations = emptyXml("Relationships", NS.rel);
  let rid = 0;
  const relation = (type: string, path: string) => {
    const id = "rId" + ++rid;
    appendRelationship(relations, id, NS.r + "/" + type, "/" + path);
    return id;
  };
  for (const [suffix, listName, itemName, base] of [
    ["slideMaster", "sldMasterIdLst", "sldMasterId", 2147483648],
    ["notesMaster", "notesMasterIdLst", "notesMasterId", 0],
  ] as const) {
    const parts = [...copier.contentTypes].filter(([, type]) =>
      type.endsWith("." + suffix + "+xml"),
    );
    if (!parts.length) continue;
    const list = presentation.createElementNS(NS.p, "p:" + listName);
    parts.forEach(([path], index) => {
      const item = presentation.createElementNS(NS.p, "p:" + itemName);
      if (base) item.setAttribute("id", String(base + index));
      item.setAttributeNS(NS.r, "r:id", relation(suffix, path));
      list.appendChild(item);
    });
    presentation.documentElement.appendChild(list);
  }
  const list = presentation.createElementNS(NS.p, "p:sldIdLst");
  for (const [index, source] of sources.entries()) {
    const item = presentation.createElementNS(NS.p, "p:sldId");
    item.setAttribute("id", String(256 + index));
    item.setAttributeNS(NS.r, "r:id", relation("slide", source.outputPath));
    list.appendChild(item);
  }
  presentation.documentElement.appendChild(list);
  for (const name of ["sldSz", "notesSz", "defaultTextStyle"]) {
    const node = one(presentations[0].documentElement, NS.p, name);
    if (node)
      presentation.documentElement.appendChild(
        presentation.importNode(node, true),
      );
  }
  // 전역 표 스타일·작성자 연결은 단일 파트만 허용하므로 서로 다른 정의를 조용히 덮지 않는다.
  for (const kind of ["tableStyles", "commentAuthors"]) {
    let content: string | null = null,
      target: string | null = null;
    for (const source of sources) {
      const rels = await xmlPart(source.zip, relPath("ppt/presentation.xml")),
        row = all(rels, NS.rel, "Relationship").find(
          (r) => r.getAttribute("Type") === NS.r + "/" + kind,
        );
      if (!row) continue;
      check(
        row.getAttribute("TargetMode") !== "External",
        "MAPPING",
        "외부 전역 정의는 조립할 수 없습니다.",
      );
      const path = relativePart(
          "ppt/presentation.xml",
          row.getAttribute("Target") ?? "",
        ),
        entry = source.zip.file(path);
      check(!!entry, "MAPPING", "전역 정의 파일이 없습니다.");
      const text = await entry.async("string");
      check(
        content === null || content === text,
        "MAPPING",
        "Template 간 " + kind + " 정의가 달라 원본을 보존할 수 없습니다.",
      );
      if (content === null) {
        content = text;
        target = await copier.copy(source, path);
      }
    }
    if (target) relation(kind, target);
  }
  output.file("ppt/presProps.xml", serialize(emptyXml("presentationPr", NS.p)));
  copier.contentTypes.set(
    "ppt/presProps.xml",
    "application/vnd.openxmlformats-officedocument.presentationml.presProps+xml",
  );
  relation("presProps", "ppt/presProps.xml");
  writeManifest(output, manifest);
  copier.contentTypes.set(MANIFEST_PATH, "application/xml");
  relation("customXml", MANIFEST_PATH);
  output.file("ppt/presentation.xml", serialize(presentation));
  output.file(relPath("ppt/presentation.xml"), serialize(relations));
  copier.contentTypes.set(
    "ppt/presentation.xml",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml",
  );
  const root = emptyXml("Relationships", NS.rel);
  appendRelationship(
    root,
    "rId1",
    NS.r + "/officeDocument",
    "ppt/presentation.xml",
  );
  appendRelationship(
    root,
    "rId2",
    "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties",
    "docProps/core.xml",
  );
  appendRelationship(
    root,
    "rId3",
    NS.r + "/extended-properties",
    "docProps/app.xml",
  );
  output.file("_rels/.rels", serialize(root));
  output.file(
    "docProps/core.xml",
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>프로젝트 제안서</dc:title></cp:coreProperties>',
  );
  output.file(
    "docProps/app.xml",
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>KPC</Application><Slides>' +
      input.slides.length +
      "</Slides></Properties>",
  );
  copier.contentTypes.set(
    "docProps/core.xml",
    "application/vnd.openxmlformats-package.core-properties+xml",
  );
  copier.contentTypes.set(
    "docProps/app.xml",
    "application/vnd.openxmlformats-officedocument.extended-properties+xml",
  );
  const types = emptyXml("Types", NS.ct),
    relType = types.createElementNS(NS.ct, "Default");
  relType.setAttribute("Extension", "rels");
  relType.setAttribute(
    "ContentType",
    "application/vnd.openxmlformats-package.relationships+xml",
  );
  types.documentElement.appendChild(relType);
  for (const [path, type] of copier.contentTypes) {
    const row = types.createElementNS(NS.ct, "Override");
    row.setAttribute("PartName", "/" + path);
    row.setAttribute("ContentType", type);
    types.documentElement.appendChild(row);
  }
  output.file("[Content_Types].xml", serialize(types));
  const bytes = await output.generateAsync(
    { type: "uint8array", compression: "DEFLATE" },
    () => checkPptxAbort(signal),
  );
  await validateDeckGraph(bytes, library, signal);
  const result = await readTemplate(bytes, "proposal.pptx", library, {
    signal,
  });
  check(
    result.slides.length === input.slides.length &&
      result.slides.every((s, i) => s.path === manifest.slides[i].path),
    "MAPPING",
    "출력 슬라이드 순서가 다릅니다.",
  );
  return { bytes, manifest, warnings: [...new Set(warnings)] };
}
