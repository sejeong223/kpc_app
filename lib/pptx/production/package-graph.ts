import type { ZipArchive, ZipLibrary } from "../zip";
import {
  NS,
  all,
  parseXml,
  relativePart,
  relPath,
  serialize,
  xmlPart,
  openPackage,
} from "../pptx-xml";
import { checkPptxAbort } from "../errors";
import { readTemplate } from "../template-read";
import {
  workspaceAssert as check,
  WorkspaceError,
} from "@/lib/workspace/production/errors";
import { readManifest, slideMarkers } from "./manifest";

export interface PackageSource {
  zip: ZipArchive;
  pinId: string;
  sourcePath: string;
  outputPath: string;
  scope: string;
  types: Document;
  local: Map<string, string>;
}
export function emptyXml(name: string, namespace: string): Document {
  return parseXml("<" + name + ' xmlns="' + namespace + '"/>', name);
}
export function appendRelationship(
  doc: Document,
  id: string,
  type: string,
  target: string,
): void {
  const row = doc.createElementNS(NS.rel, "Relationship");
  row.setAttribute("Id", id);
  row.setAttribute("Type", type);
  row.setAttribute("Target", target);
  doc.documentElement.appendChild(row);
}
export function partContentType(types: Document, path: string): string | null {
  return (
    all(types, NS.ct, "Override")
      .find((e) => e.getAttribute("PartName") === "/" + path)
      ?.getAttribute("ContentType") ??
    all(types, NS.ct, "Default")
      .find((e) => e.getAttribute("Extension") === path.split(".").at(-1))
      ?.getAttribute("ContentType") ??
    null
  );
}
async function hash(bytes: Uint8Array): Promise<string> {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
export class PackageGraphCopier {
  readonly contentTypes = new Map<string, string>();
  private readonly shared = new Map<string, string>();
  private readonly fingerprints = new Map<
    string,
    Promise<{ digest: string; scoped: boolean }>
  >();
  private nextPart = 0;
  constructor(
    readonly output: ZipArchive,
    private readonly sources: readonly PackageSource[],
    private readonly signal?: AbortSignal,
  ) {}
  private async fingerprint(source: PackageSource, root: string) {
    const key = source.scope + ":" + root,
      cached = this.fingerprints.get(key);
    if (cached) return cached;
    const operation = (async () => {
      const visited = new Set<string>(),
        records: string[] = [];
      let scoped = false;
      const visit = async (path: string): Promise<void> => {
        checkPptxAbort(this.signal);
        if (visited.has(path)) return;
        visited.add(path);
        const entry = source.zip.file(path);
        check(!!entry, "MAPPING", "연결된 원본 파트가 없습니다: " + path);
        records.push(
          path + ":" + (await hash(await entry.async("uint8array"))),
        );
        const relation = source.zip.file(relPath(path));
        if (!relation) return;
        const text = await relation.async("string");
        records.push(relPath(path) + ":" + text);
        for (const r of all(
          parseXml(text, relPath(path)),
          NS.rel,
          "Relationship",
        )) {
          if (r.getAttribute("TargetMode") === "External") continue;
          const target = relativePart(path, r.getAttribute("Target") ?? "");
          if (target === "ppt/presentation.xml")
            throw new WorkspaceError(
              "MAPPING",
              "프레젠테이션 역참조를 포함한 파트는 조립할 수 없습니다: " + path,
            );
          if (target.startsWith("ppt/slides/") && !target.includes("/_rels/")) {
            scoped = true;
            continue;
          }
          await visit(target);
        }
      };
      await visit(root);
      return {
        digest: await hash(new TextEncoder().encode(records.sort().join("\n"))),
        scoped,
      };
    })();
    this.fingerprints.set(key, operation);
    return operation;
  }
  private selectedSlide(source: PackageSource, target: string): string {
    if (target === source.sourcePath) return source.outputPath;
    const matches = this.sources.filter(
      (s) => s.pinId === source.pinId && s.sourcePath === target,
    );
    check(
      matches.length === 1,
      "MAPPING",
      "내부 슬라이드 링크의 대상을 확정할 수 없습니다: " + target,
    );
    return matches[0].outputPath;
  }
  async copy(
    source: PackageSource,
    path: string,
    forcedPath?: string,
  ): Promise<string> {
    checkPptxAbort(this.signal);
    const local = source.local.get(path);
    if (local) return local;
    if (!forcedPath && path.startsWith("ppt/slides/"))
      return this.selectedSlide(source, path);
    check(
      path !== "ppt/presentation.xml",
      "MAPPING",
      "프레젠테이션 역참조는 조립할 수 없습니다.",
    );
    const entry = source.zip.file(path),
      type = partContentType(source.types, path);
    check(
      !!entry && !!type,
      "MAPPING",
      "원본 파트 또는 형식이 없습니다: " + path,
    );
    const fingerprint = forcedPath
        ? null
        : await this.fingerprint(source, path),
      key =
        source.pinId +
        ":" +
        path +
        ":" +
        fingerprint?.digest +
        (fingerprint?.scoped ? ":" + source.scope : "");
    const reused = !forcedPath ? this.shared.get(key) : undefined;
    if (reused) {
      source.local.set(path, reused);
      return reused;
    }
    const slash = path.lastIndexOf("/"),
      extension = path.slice(path.lastIndexOf(".")),
      outputPath =
        forcedPath ??
        path.slice(0, slash + 1) + "kpc-part-" + ++this.nextPart + extension;
    source.local.set(path, outputPath);
    if (!forcedPath) this.shared.set(key, outputPath);
    this.contentTypes.set(outputPath, type);
    this.output.file(outputPath, await entry.async("uint8array"));
    const relation = source.zip.file(relPath(path));
    if (relation) {
      const doc = parseXml(await relation.async("string"), relPath(path));
      for (const r of all(doc, NS.rel, "Relationship")) {
        if (r.getAttribute("TargetMode") === "External") continue;
        const target = relativePart(path, r.getAttribute("Target") ?? "");
        const mapped = target.startsWith("ppt/slides/")
          ? this.selectedSlide(source, target)
          : await this.copy(source, target);
        r.setAttribute("Target", "/" + mapped);
      }
      this.output.file(relPath(outputPath), serialize(doc));
    }
    return outputPath;
  }
}
export async function validateDeckGraph(
  bytes: Uint8Array,
  library: ZipLibrary,
  signal?: AbortSignal,
): Promise<void> {
  checkPptxAbort(signal);
  const zip = await openPackage(bytes, library),
    types = await xmlPart(zip, "[Content_Types].xml");
  for (const path of Object.keys(zip.files).filter((p) => !zip.files[p].dir)) {
    checkPptxAbort(signal);
    if (path.endsWith(".rels")) {
      const owner =
          path === "_rels/.rels"
            ? ""
            : path.replace(/\/_rels\/([^/]+)\.rels$/, "/$1"),
        doc = await xmlPart(zip, path),
        rows = all(doc, NS.rel, "Relationship"),
        ids = rows.map((r) => r.getAttribute("Id"));
      check(
        owner === "" || (owner !== path && !!zip.file(owner)),
        "MAPPING",
        "관계의 소유 파트가 없습니다: " + path,
      );
      check(
        ids.every((id) => !!id) && ids.length === new Set(ids).size,
        "MAPPING",
        "관계 ID가 없거나 중복되었습니다: " + path,
      );
      for (const row of rows) {
        check(
          !!row.getAttribute("Type") && !!row.getAttribute("Target"),
          "MAPPING",
          "관계의 형식 또는 대상이 없습니다: " + path,
        );
        if (row.getAttribute("TargetMode") === "External") continue;
        let target: string;
        try {
          target = relativePart(owner, row.getAttribute("Target")!);
        } catch (cause) {
          throw new WorkspaceError(
            "MAPPING",
            "관계 경로가 올바르지 않습니다: " + path,
            { cause },
          );
        }
        check(
          !!zip.file(target),
          "MAPPING",
          "연결된 출력 파트가 없습니다: " + target,
        );
        const kind = (row.getAttribute("Type") ?? "").split("/").at(-1),
          targetType = partContentType(types, target);
        if (
          kind &&
          [
            "slide",
            "slideLayout",
            "slideMaster",
            "notesSlide",
            "notesMaster",
            "theme",
            "chart",
          ].includes(kind)
        )
          check(
            !!targetType && targetType.endsWith("." + kind + "+xml"),
            "MAPPING",
            "관계와 파트 형식이 다릅니다: " + target,
          );
        if (kind === "image")
          check(
            !!targetType && targetType.startsWith("image/"),
            "MAPPING",
            "이미지 관계의 파트 형식이 다릅니다.",
          );
      }
    } else if (path !== "[Content_Types].xml")
      check(
        !!partContentType(types, path),
        "MAPPING",
        "출력 파트의 형식이 없습니다: " + path,
      );
  }
  for (const row of all(types, NS.ct, "Override"))
    check(
      !!zip.file((row.getAttribute("PartName") ?? "").replace(/^\//, "")),
      "MAPPING",
      "형식 목록에 없는 파일이 연결되었습니다.",
    );
  const root = await xmlPart(zip, "_rels/.rels"),
    office = all(root, NS.rel, "Relationship").filter(
      (r) => r.getAttribute("Type") === NS.r + "/officeDocument",
    );
  check(
    office.length === 1 &&
      relativePart("", office[0].getAttribute("Target") ?? "") ===
        "ppt/presentation.xml",
    "MAPPING",
    "PPT 시작 관계가 올바르지 않습니다.",
  );
  const document = await readTemplate(bytes, "output.pptx", library, {
      signal,
    }),
    manifest = await readManifest(zip);
  if (manifest) {
    check(
      document.slides.length === manifest.slides.length,
      "MAPPING",
      "출력 슬라이드 수와 연결 정보가 다릅니다.",
    );
    for (const slide of document.slides) {
      const record = manifest.slides.find((s) => s.path === slide.path),
        markers = slideMarkers(await xmlPart(zip, slide.path));
      check(
        !!record &&
          markers.length === 1 &&
          markers[0].slideId === record.id &&
          markers[0].projectId === manifest.projectId &&
          markers[0].exportId === manifest.exportId,
        "MAPPING",
        "슬라이드 식별 정보가 다릅니다.",
      );
      const ids = slide.objects.map((o) => o.shapeId);
      check(
        ids.every((id) => !!id) && new Set(ids).size === ids.length,
        "MAPPING",
        "슬라이드 요소 ID가 중복되었습니다.",
      );
      for (const element of record.elements)
        check(
          slide.objects.some((o) => o.shapeId === element.shapeId),
          "MAPPING",
          "본문 연결 요소가 없습니다.",
        );
      for (const field of ["key", "shapeId", "objectId"] as const)
        check(
          new Set(record.elements.map((e) => e[field])).size ===
            record.elements.length,
          "MAPPING",
          "본문 연결 정보가 중복되었습니다.",
        );
    }
  }
}
