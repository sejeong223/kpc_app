import { z } from "zod";
import type { ExportManifest } from "@/types/workspace-production";
import {
  ExportManifestSchema,
  WorkspaceIdSchema,
} from "@/lib/workspace/production/schemas";
import { workspaceAssert as check } from "@/lib/workspace/production/errors";
import type { ZipArchive } from "../zip";
import {
  NS,
  all,
  ensure,
  one,
  parseXml,
  serialize,
  xmlPart,
} from "../pptx-xml";

export const MANIFEST_PATH = "customXml/kpc-manifest.xml";
export const KPC_NS = "urn:kpc:workspace:production:1";
export const MARKER_URI = "{23C910F6-8D4A-4B30-88F0-69B675DCF601}";
export const SlideMarkerSchema = z.strictObject({
  projectId: WorkspaceIdSchema,
  exportId: WorkspaceIdSchema,
  slideId: WorkspaceIdSchema,
});
export function setSlideMarker(
  doc: Document,
  marker: z.infer<typeof SlideMarkerSchema>,
): void {
  const extLst = ensure(doc.documentElement, "p", "extLst", [
    "cSld",
    "clrMapOvr",
    "transition",
    "timing",
    "extLst",
  ]);
  for (const ext of all(extLst, NS.p, "ext").filter(
    (e) => e.getAttribute("uri") === MARKER_URI,
  ))
    ext.remove();
  const ext = doc.createElementNS(NS.p, "p:ext"),
    child = doc.createElementNS(KPC_NS, "kpc:slide");
  ext.setAttribute("uri", MARKER_URI);
  for (const [key, value] of Object.entries(SlideMarkerSchema.parse(marker)))
    child.setAttribute(key, value);
  ext.appendChild(child);
  extLst.appendChild(ext);
}
export function slideMarkers(
  doc: Document,
): Array<z.infer<typeof SlideMarkerSchema>> {
  const extLst = one(doc.documentElement, NS.p, "extLst");
  return extLst
    ? all(extLst, NS.p, "ext")
        .filter((e) => e.getAttribute("uri") === MARKER_URI)
        .flatMap((ext) =>
          all(ext, KPC_NS, "slide").map((e) => {
            const parsed = SlideMarkerSchema.safeParse({
              projectId: e.getAttribute("projectId"),
              exportId: e.getAttribute("exportId"),
              slideId: e.getAttribute("slideId"),
            });
            check(
              parsed.success,
              "MAPPING",
              "슬라이드 식별 정보가 손상되었습니다.",
            );
            return parsed.data;
          }),
        )
    : [];
}
export function writeManifest(zip: ZipArchive, manifest: ExportManifest): void {
  const parsed = ExportManifestSchema.safeParse(manifest);
  check(parsed.success, "MAPPING", "출력 연결 정보가 올바르지 않습니다.");
  const doc = parseXml(
    '<kpc:manifest xmlns:kpc="' + KPC_NS + '"/>',
    MANIFEST_PATH,
  );
  doc.documentElement.appendChild(
    doc.createTextNode(JSON.stringify(parsed.data)),
  );
  zip.file(MANIFEST_PATH, serialize(doc));
}
export async function readManifest(
  zip: ZipArchive,
): Promise<ExportManifest | null> {
  if (!zip.file(MANIFEST_PATH)) return null;
  const doc = await xmlPart(zip, MANIFEST_PATH);
  check(
    doc.documentElement.namespaceURI === KPC_NS &&
      doc.documentElement.localName === "manifest",
    "MAPPING",
    "출력 연결 정보 형식이 다릅니다.",
  );
  const parsed = ExportManifestSchema.safeParse(
    JSON.parse(doc.documentElement.textContent ?? "null"),
  );
  check(parsed.success, "MAPPING", "출력 연결 정보가 손상되었습니다.");
  return parsed.data;
}
