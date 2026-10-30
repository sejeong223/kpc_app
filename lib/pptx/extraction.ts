import { TemplateExtractionSchema } from "@/lib/admin/assets/schemas";
import type { TemplateExtraction } from "@/types/admin-assets";
import type { TemplateDocument } from "@/types/pptx-template";
import { all, children, NS, one, xmlPart } from "./pptx-xml";

export async function extractTemplateMetadata(doc: TemplateDocument, sha256: string): Promise<TemplateExtraction> {
  const themes: TemplateExtraction["themes"] = [];
  for (const path of Object.keys(doc.zip.files).filter(path => /^ppt\/theme\/[^/]+\.xml$/.test(path)).sort()) {
    const xml = await xmlPart(doc.zip, path);
    const scheme = all(xml, NS.a, "clrScheme")[0];
    const font = (tag: string): string | null => {
      const node = all(xml, NS.a, tag)[0];
      return node ? all(node, NS.a, "font").find(child => child.getAttribute("script") === "Hang")?.getAttribute("typeface") || one(node, NS.a, "ea")?.getAttribute("typeface") || one(node, NS.a, "latin")?.getAttribute("typeface") || null : null;
    };
    themes.push({ path, name: xml.documentElement.getAttribute("name") || "", majorFont: font("majorFont"), minorFont: font("minorFont"),
      colors: scheme ? children(scheme).flatMap(slot => {
        const value = children(slot)[0];
        const rgb = value?.localName === "sysClr" ? value.getAttribute("lastClr") : value?.getAttribute("val");
        return rgb && /^[a-f0-9]{6}$/i.test(rgb) ? [{ slot: slot.localName, color: "#" + rgb }] : [];
      }) : [] });
  }
  const layouts: TemplateExtraction["layouts"] = [];
  for (const path of [...new Set(doc.slides.map(slide => slide.layoutPath).filter(Boolean))]) {
    const xml = await xmlPart(doc.zip, path), linked = doc.slides.filter(slide => slide.layoutPath === path);
    layouts.push({ path, name: one(xml.documentElement, NS.p, "cSld")?.getAttribute("name") || xml.documentElement.getAttribute("type") || path,
      masterPath: linked[0]?.masterPath || null, slideIndices: linked.map(slide => slide.index), placeholderCount: all(xml, NS.p, "ph").length });
  }
  const logos = new Map<string, TemplateExtraction["logoCandidates"][number]>();
  for (const slide of doc.slides) for (const object of slide.decorations) {
    if (object.kind !== "image") continue;
    const candidate = logos.get(object.id) ?? { objectId: object.id, sourcePart: object.id.split("#")[0], slideIndices: [] };
    if (!candidate.slideIndices.includes(slide.index)) candidate.slideIndices.push(slide.index);
    logos.set(object.id, candidate);
  }
  return TemplateExtractionSchema.parse({ filename: doc.filename, byteLength: doc.bytes.byteLength, sha256, widthCm: doc.width, heightCm: doc.height, slideCount: doc.slides.length,
    fonts: [...new Set(doc.slides.flatMap(slide => [...slide.objects, ...slide.decorations].map(object => object.style.face)).filter(Boolean))].sort(), themes, layouts, logoCandidates: [...logos.values()],
    slides: doc.slides.map(slide => ({ index: slide.index, name: slide.name, type: slide.type, objectCount: slide.objects.length })), warnings: doc.warnings });
}
