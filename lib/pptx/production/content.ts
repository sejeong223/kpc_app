import type {
  ContentBlock,
  ContentSlot,
  ManifestElement,
  RenderedSlide,
  SlideRenderInput,
} from "@/types/workspace-production";
import type {
  TemplateDocument,
  TemplateObject,
  TemplateOptions,
} from "@/types/pptx-template";
import type { ZipArchive, ZipLibrary } from "../zip";
import {
  NS,
  all,
  children,
  ensure,
  one,
  parseXml,
  relPath,
  removeChildren,
  serialize,
  xmlPart,
} from "../pptx-xml";
import { readTemplate, textBody, transform } from "../template-read";
import { applyTemplate } from "../template-apply";
import { toEngineSkill } from "../skill-adapter";
import { textHeightWithFont } from "../text-layout";
import { checkPptxAbort } from "../errors";
import { buildDefaultOptions } from "@/lib/admin/assets/work-policy";
import {
  workspaceAssert as check,
  WorkspaceError,
} from "@/lib/workspace/production/errors";
import { inspectProductionImage, RenderInputSchema } from "./content-schema";

export function inspectContentSlots(
  document: Pick<TemplateDocument, "slides">,
  path: string,
  options: TemplateOptions,
): ContentSlot[] {
  const slide = document.slides.find((s) => s.path === path);
  check(!!slide, "MAPPING", "선택한 Template 슬라이드가 없습니다.");
  const ids = slide.objects.map((o) => o.shapeId);
  return [...slide.objects, ...slide.decorations].map((object) => {
    const role = options.roles[object.id] ?? object.role,
      reasons = [...object.reasons];
    if (object.source !== "slide")
      reasons.push("레이아웃·마스터 요소는 원본을 유지합니다.");
    if (object.merged) reasons.push("병합 표는 내용 교체를 지원하지 않습니다.");
    if (options.excluded.includes(object.id) || role === "keep")
      reasons.push("적용 제외 요소입니다.");
    if (
      !object.shapeId ||
      ids.filter((id) => id === object.shapeId).length !== 1
    )
      reasons.push("원본 요소 ID가 없거나 중복되었습니다.");
    if (
      !(
        (object.kind === "text" && ["title", "sub", "body"].includes(role)) ||
        (object.kind === "table" && role === "table") ||
        (object.kind === "image" && role === "image")
      )
    )
      reasons.push("내용을 입력할 수 없는 요소입니다.");
    return {
      objectId: object.id,
      shapeId: object.shapeId ?? "",
      role,
      kind: object.kind,
      supported: reasons.length === 0,
      reasons,
    };
  });
}
function replaceText(body: Element, text: string, list = false): void {
  const first = one(body, NS.a, "p"),
    ppr = one(first, NS.a, "pPr"),
    rpr = first ? all(first, NS.a, "rPr")[0] : undefined;
  removeChildren(body, NS.a, ["p"]);
  for (const line of text.split("\n")) {
    const paragraph = body.ownerDocument.createElementNS(NS.a, "a:p");
    if (ppr) paragraph.appendChild(ppr.cloneNode(true));
    const props = ensure(paragraph, "a", "pPr", ["pPr", "r"]);
    removeChildren(props, NS.a, ["buNone", "buAutoNum", "buChar", "buBlip"]);
    if (list)
      ensure(props, "a", "buChar", [
        "lnSpc",
        "spcBef",
        "spcAft",
        "buClrTx",
        "buSzTx",
        "buFontTx",
        "buChar",
        "tabLst",
        "defRPr",
        "extLst",
      ]).setAttribute("char", "•");
    else
      ensure(props, "a", "buNone", [
        "lnSpc",
        "spcBef",
        "spcAft",
        "buNone",
        "tabLst",
        "defRPr",
        "extLst",
      ]);
    const run = body.ownerDocument.createElementNS(NS.a, "a:r");
    if (rpr) {
      const copy = rpr.cloneNode(true) as Element;
      removeChildren(copy, NS.a, ["hlinkClick", "hlinkMouseOver"]);
      run.appendChild(copy);
    }
    const value = body.ownerDocument.createElementNS(NS.a, "a:t");
    value.appendChild(body.ownerDocument.createTextNode(line));
    run.appendChild(value);
    paragraph.appendChild(run);
    body.appendChild(paragraph);
  }
}
function fitTable(
  node: Element,
  object: TemplateObject,
  cells: string[][],
): void {
  const table = all(node, NS.a, "tbl")[0];
  check(
    !!table && cells.every((row) => row.length === object.columnWidths.length),
    "MAPPING",
    "원본 표와 열 수가 같아야 합니다.",
  );
  const existing = children(table).filter(
    (e) => e.localName === "tr" && e.namespaceURI === NS.a,
  );
  check(existing.length > 0, "MAPPING", "표의 행이 없습니다.");
  const rows = cells.map((values, index) => {
    const row = existing[Math.min(index, existing.length - 1)].cloneNode(
        true,
      ) as Element,
      cellNodes = children(row).filter(
        (e) => e.localName === "tc" && e.namespaceURI === NS.a,
      );
    check(
      cellNodes.length === values.length,
      "MAPPING",
      "표의 셀 구성이 다릅니다.",
    );
    const heights = values.map((text, ci) => {
      const body = textBody(cellNodes[ci]);
      check(!!body, "MAPPING", "셀의 본문이 없습니다.");
      replaceText(body, text);
      const style =
        object.cellStyles[Math.min(index, object.cellStyles.length - 1)]?.[
          ci
        ] ?? object.style;
      const width = object.columnWidths[ci] - 2 * style.padH;
      check(width > 0, "LAYOUT", "표의 셀 여백이 열 너비보다 큽니다.");
      return textHeightWithFont(text, width, style) + 2 * style.padV;
    });
    return { row, height: Math.max(...heights) };
  });
  const minimum = rows.reduce((sum, r) => sum + r.height, 0);
  check(
    minimum <= object.h + 0.005,
    "LAYOUT",
    "표 내용이 원본 영역을 넘습니다. 행이나 글자 수를 줄여 주세요.",
  );
  removeChildren(table, NS.a, ["tr"]);
  for (const { row, height } of rows) {
    row.setAttribute(
      "h",
      String(
        Math.round((height + (object.h - minimum) / rows.length) * 360000),
      ),
    );
    const last = one(table, NS.a, "extLst");
    table.insertBefore(row, last ?? null);
  }
  const frame = transform(node),
    size = one(frame, NS.a, "ext");
  if (size) {
    size.setAttribute("cx", String(Math.round(object.w * 360000)));
    size.setAttribute("cy", String(Math.round(object.h * 360000)));
  }
}
async function replaceImage(
  zip: ZipArchive,
  path: string,
  node: Element,
  object: TemplateObject,
  block: Extract<ContentBlock, { kind: "image" }>,
  input: SlideRenderInput,
): Promise<void> {
  const image = input.images.get(block.blobId);
  check(!!image, "ORIGINAL_MISSING", "이미지 원본이 없습니다.");
  const size = inspectProductionImage(image.bytes, image.mime);
  check(
    image.mime === block.mime &&
      size.width === block.width &&
      size.height === block.height &&
      size.width === image.width &&
      size.height === image.height,
    "VALIDATION",
    "이미지의 실제 크기 또는 형식이 다릅니다.",
  );
  const filename =
      "kpc-" +
      crypto.randomUUID() +
      (image.mime === "image/png" ? ".png" : ".jpg"),
    media = "ppt/media/" + filename;
  const relationPath = relPath(path),
    entry = zip.file(relationPath),
    rels = entry
      ? parseXml(await entry.async("string"), relationPath)
      : parseXml('<Relationships xmlns="' + NS.rel + '"/>', relationPath);
  const id = "rIdKpc" + crypto.randomUUID().replaceAll("-", ""),
    relationship = rels.createElementNS(NS.rel, "Relationship");
  relationship.setAttribute("Id", id);
  relationship.setAttribute("Type", NS.r + "/image");
  relationship.setAttribute("Target", "/" + media);
  rels.documentElement.appendChild(relationship);
  const blip = all(node, NS.a, "blip")[0],
    fill = one(node, NS.p, "blipFill"),
    frame = transform(node);
  check(
    !!blip && !!fill && !!frame,
    "MAPPING",
    "이미지의 원본 관계 또는 영역을 확인할 수 없습니다.",
  );
  blip.removeAttributeNS(NS.r, "link");
  blip.setAttributeNS(NS.r, "r:embed", id);
  removeChildren(fill, NS.a, ["srcRect", "tile", "stretch"]);
  ensure(ensure(fill, "a", "stretch"), "a", "fillRect");
  const width = Math.min(object.w, (object.h * size.width) / size.height),
    height = (width * size.height) / size.width;
  const off = ensure(frame, "a", "off", ["off", "ext"]),
    ext = ensure(frame, "a", "ext", ["off", "ext"]);
  off.setAttribute(
    "x",
    String(Math.round((object.x + (object.w - width) / 2) * 360000)),
  );
  off.setAttribute(
    "y",
    String(Math.round((object.y + (object.h - height) / 2) * 360000)),
  );
  ext.setAttribute("cx", String(Math.round(width * 360000)));
  ext.setAttribute("cy", String(Math.round(height * 360000)));
  const nv = all(node, NS.p, "cNvPr")[0];
  nv?.setAttribute("descr", block.alt);
  const types = await xmlPart(zip, "[Content_Types].xml"),
    override = types.createElementNS(NS.ct, "Override");
  override.setAttribute("PartName", "/" + media);
  override.setAttribute("ContentType", image.mime);
  types.documentElement.appendChild(override);
  zip.file(media, image.bytes.slice());
  zip.file(relationPath, serialize(rels));
  zip.file("[Content_Types].xml", serialize(types));
}
type Value = {
  key: string;
  kind: ManifestElement["kind"];
  text: string;
  block: ContentBlock | null;
};
function values(input: SlideRenderInput): Value[] {
  const { content } = input.slide;
  return [
    { key: "title", kind: "text", text: content.title, block: null },
    { key: "lead", kind: "text", text: content.lead, block: null },
    ...content.blocks.map((block) => ({
      key: block.id,
      kind: block.kind,
      text:
        block.kind === "text"
          ? block.text
          : block.kind === "list"
            ? block.items.join("\n")
            : "",
      block,
    })),
  ];
}
function assertFits(object: TemplateObject, text: string): void {
  if (!text) return;
  const width = object.w - object.style.padH * 2;
  check(
    width > 0 &&
      textHeightWithFont(text, width, object.style) + 2 * object.style.padV <=
        object.h + 0.005,
    "LAYOUT",
    "텍스트가 원본 영역을 넘습니다. 글자 수를 줄이거나 다른 칸을 선택해 주세요.",
  );
}
export async function renderProposalSlide(
  input: SlideRenderInput,
  library: ZipLibrary,
  signal?: AbortSignal,
): Promise<RenderedSlide> {
  checkPptxAbort(signal);
  const parsed = RenderInputSchema.safeParse({
    slide: input.slide,
    templateFilename: input.templateFilename,
    templateRevision: input.templateRevision,
    skill: input.skill,
  });
  if (!parsed.success)
    throw new WorkspaceError(
      parsed.error.issues.some((i) => i.code === "too_big")
        ? "LIMIT"
        : parsed.error.issues.some((i) => i.path.includes("template"))
          ? "MAPPING"
          : "VALIDATION",
      "슬라이드 내용과 매핑을 확인해 주세요.",
    );
  const template = input.slide.template;
  check(!!template, "MAPPING", "Template 슬라이드와 내용 칸을 연결해 주세요.");
  check(
    input.templateBytes instanceof Uint8Array &&
      input.templateBytes.byteLength ===
        input.templateRevision.definition.extraction.byteLength,
    "MAPPING",
    "Template 원본 크기가 다릅니다.",
  );
  const digest = await crypto.subtle.digest(
      "SHA-256",
      new Uint8Array(input.templateBytes),
    ),
    sha256 = Array.from(new Uint8Array(digest), (n) =>
      n.toString(16).padStart(2, "0"),
    ).join("");
  check(
    sha256 === input.templateRevision.definition.extraction.sha256,
    "MAPPING",
    "Template 원본 내용이 다릅니다.",
  );
  const before = await readTemplate(
      input.templateBytes.slice(),
      input.templateFilename,
      library,
      { signal },
    ),
    options = buildDefaultOptions(input.templateRevision);
  const source = before.slides.find((s) => s.path === template.sourceSlidePath);
  check(!!source, "MAPPING", "원본 슬라이드가 없습니다.");
  const slots = inspectContentSlots(before, source.path, options),
    nodesDoc = await xmlPart(before.zip, source.path),
    tree = all(nodesDoc, NS.p, "spTree")[0];
  check(!!tree, "MAPPING", "슬라이드 요소 목록이 없습니다.");
  const nodes = children(tree).filter(
    (e) => !["nvGrpSpPr", "grpSpPr", "extLst"].includes(e.localName),
  );
  const shapeIds = all(tree, NS.p, "cNvPr").map((e) => e.getAttribute("id"));
  check(
    shapeIds.every((id) => !!id) && new Set(shapeIds).size === shapeIds.length,
    "MAPPING",
    "원본 요소 ID가 없거나 중복되었습니다.",
  );
  const content = values(input),
    elements: ManifestElement[] = [];
  for (const value of content) {
    checkPptxAbort(signal);
    const binding = template.bindings.find((b) => b.key === value.key);
    if (!binding) {
      check(
        (value.kind === "text" && value.text === "") ||
          (value.kind === "list" && value.text === ""),
        "MAPPING",
        "내용이 있는 모든 항목을 Template 칸에 연결해 주세요.",
      );
      continue;
    }
    const slot = slots.find((s) => s.objectId === binding.objectId),
      object = source.objects.find((o) => o.id === binding.objectId);
    check(
      !!slot && !!object && slot.supported,
      "MAPPING",
      slot?.reasons.join(" ") || "지원하지 않는 요소 연결입니다.",
    );
    check(
      value.kind === "text" || value.kind === "list"
        ? slot.kind === "text"
        : slot.kind === value.kind,
      "MAPPING",
      "내용과 칸의 종류가 다릅니다.",
    );
    const node = nodes[object.index];
    check(
      !!node &&
        all(node, NS.p, "cNvPr")[0]?.getAttribute("id") === slot.shapeId,
      "MAPPING",
      "원본 요소 연결이 다릅니다.",
    );
    if (value.block?.kind === "table")
      fitTable(node, object, [value.block.columns, ...value.block.rows]);
    else if (value.block?.kind === "image")
      await replaceImage(
        before.zip,
        source.path,
        node,
        object,
        value.block,
        input,
      );
    else {
      const body = textBody(node);
      check(!!body, "MAPPING", "텍스트 칸이 없습니다.");
      replaceText(body, value.text, value.kind === "list");
    }
    elements.push({
      key: value.key,
      objectId: object.id,
      shapeId: slot.shapeId,
      kind: value.kind,
    });
  }
  before.zip.file(source.path, serialize(nodesDoc));
  let bytes = await before.zip.generateAsync(
    { type: "uint8array", compression: "DEFLATE" },
    () => checkPptxAbort(signal),
  );
  let after = await readTemplate(bytes, input.templateFilename, library, {
    signal,
  });
  const warnings = [
    "구조 미리보기이며 실제 PowerPoint 글꼴·줄바꿈과 다를 수 있습니다.",
  ];
  if (input.skill) {
    const emptyIds = elements
      .filter(
        (e) =>
          (e.kind === "text" || e.kind === "list") &&
          content.find((v) => v.key === e.key)?.text === "",
      )
      .map((e) => e.objectId);
    const result = await applyTemplate(
      after,
      toEngineSkill(input.skill),
      {
        ...options,
        selectedSlides: [source.index],
        excluded: [
          ...new Set([
            ...options.excluded,
            ...emptyIds,
            ...source.objects
              .filter((o) => !elements.some((e) => e.objectId === o.id))
              .map((o) => o.id),
          ]),
        ],
      },
      library,
      undefined,
      signal,
    );
    for (const element of elements) {
      const change = result.changes.find((c) => c.id === element.objectId);
      check(
        !change || change.status !== "skipped",
        "LAYOUT",
        change?.details.join(" ") || "Skill을 원본 영역에 적용할 수 없습니다.",
      );
    }
    after = result.after;
    bytes = result.bytes;
    warnings.push(...result.warnings);
    // Skill이 행 높이를 계산한 뒤에도 원본 표 프레임은 유지한다.
    if (elements.some((e) => e.kind === "table")) {
      const tableDoc = await xmlPart(after.zip, source.path),
        tableTree = all(tableDoc, NS.p, "spTree")[0];
      const tableNodes = children(tableTree).filter(
        (e) => !["nvGrpSpPr", "grpSpPr", "extLst"].includes(e.localName),
      );
      for (const element of elements.filter((e) => e.kind === "table")) {
        const current = after.slides
            .find((s) => s.path === source.path)
            ?.objects.find((o) => o.id === element.objectId),
          original = source.objects.find((o) => o.id === element.objectId);
        check(!!current && !!original, "MAPPING", "표의 원본 영역이 없습니다.");
        fitTable(
          tableNodes[current.index],
          { ...current, w: original.w, h: original.h },
          current.cells,
        );
      }
      after.zip.file(source.path, serialize(tableDoc));
      bytes = await after.zip.generateAsync(
        { type: "uint8array", compression: "DEFLATE" },
        () => checkPptxAbort(signal),
      );
      after = await readTemplate(bytes, input.templateFilename, library, {
        signal,
      });
    }
  }
  const output = after.slides.find((s) => s.path === source.path);
  check(!!output, "MAPPING", "변경 슬라이드를 다시 읽을 수 없습니다.");
  for (const element of elements) {
    const object = output.objects.find((o) => o.id === element.objectId),
      value = content.find((v) => v.key === element.key)!;
    check(
      !!object && object.shapeId === element.shapeId,
      "MAPPING",
      "변경 요소를 다시 확인할 수 없습니다.",
    );
    if (value.block?.kind === "table") {
      check(
        JSON.stringify(object.cells) ===
          JSON.stringify([value.block.columns, ...value.block.rows]),
        "MAPPING",
        "표 내용이 출력에 모두 기록되지 않았습니다.",
      );
      const original = source.objects.find((o) => o.id === element.objectId)!;
      check(
        object.rowHeights.reduce((s, h) => s + h, 0) <= original.h + 0.005 &&
          object.w <= original.w + 0.005 &&
          object.h <= original.h + 0.005,
        "LAYOUT",
        "Skill 표 서식이 원본 영역을 넘습니다.",
      );
    } else if (value.block?.kind === "image")
      check(
        object.imageWidth === value.block.width &&
          object.imageHeight === value.block.height,
        "MAPPING",
        "이미지가 출력에 기록되지 않았습니다.",
      );
    else {
      check(
        object.text === value.text,
        "MAPPING",
        "본문이 출력에 모두 기록되지 않았습니다.",
      );
      assertFits(object, value.text);
    }
  }
  warnings.push(
    ...slots.filter((s) => !s.supported).map((s) => s.reasons.join(" ")),
  );
  checkPptxAbort(signal);
  return {
    slideId: input.slide.id,
    sectionId: input.slide.sectionId,
    sourcePinId: template.pinId,
    sourcePath: source.path,
    bytes,
    width: after.width,
    height: after.height,
    preview: {
      width: after.width,
      height: after.height,
      slides: [output],
      warnings: [...new Set(warnings)],
    },
    elements,
    warnings: [...new Set(warnings)],
  };
}
