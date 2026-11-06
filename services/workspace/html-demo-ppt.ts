import { HTML_DEMO_PROPOSAL_NAME, HTML_DEMO_SLIDES } from "@/config/production-html-demo";
import { loadZipLibrary } from "@/lib/pptx/zip";

export const HTML_DEMO_PPT_FILENAME = "HTML_예시_1차_완성본.pptx";
const MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const P = "http://schemas.openxmlformats.org/presentationml/2006/main";
const A = "http://schemas.openxmlformats.org/drawingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const xml = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
const emu = (inches: number) => Math.round(inches * 914400);
const documentXml = (body: string) => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + body;
const relations = (items: Array<[string, string, string]>) => documentXml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items.map(([id, type, target]) => `<Relationship Id="${id}" Type="${R}/${type}" Target="${target}"/>`).join("")}</Relationships>`);
const group = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
function shape(id: number, text: string, x: number, y: number, width: number, height: number, size = 14, color = "26282D", bold = false, fill?: string) {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(width)}" cy="${emu(height)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : "<a:noFill/>"}<a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square" lIns="91440" rIns="91440" tIns="45720" bIns="45720"/><a:lstStyle/>${text.split("\n").map(line => `<a:p><a:pPr><a:lnSpc><a:spcPct val="130000"/></a:lnSpc></a:pPr><a:r><a:rPr lang="ko-KR" sz="${size * 100}" b="${bold ? 1 : 0}"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="맑은 고딕"/><a:ea typeface="맑은 고딕"/></a:rPr><a:t>${xml(line)}</a:t></a:r><a:endParaRPr lang="ko-KR" sz="${size * 100}"/></a:p>`).join("")}</p:txBody></p:sp>`;
}
function slideXml(index: number) {
  const slide = HTML_DEMO_SLIDES[index];
  let id = 2;
  const shapes = [
    shape(id++, "KPC · 한국생산성본부", .5, .25, 8, .35, 10, "0F5E63", true),
    shape(id++, slide.title, .5, .85, 12.3, .65, 28, "161616", true),
    shape(id++, slide.lead, .5, 1.6, 12.3, .85, 15, "475569"),
  ];
  slide.items.forEach(([title, body], itemIndex) => {
    if (slide.layout === "table") {
      const y = 2.8 + itemIndex * .9;
      shapes.push(shape(id++, title, .6, y, 3.7, .8, 16, "0F5E63", true, "EAF3F3"), shape(id++, body, 4.35, y, 8.35, .8, 15, "26282D", false, "F7F9FA"));
    } else {
      const x = .6 + itemIndex * 4.15;
      shapes.push(shape(id++, "", x, 2.8, 3.85, 2.8, 14, "26282D", false, "F2F7F7"));
      shapes.push(shape(id++, title, x + .15, 3.05, 3.55, .85, slide.layout === "kpi" ? 32 : 20, "0F5E63", true));
      shapes.push(shape(id++, body, x + .15, 4.05, 3.55, 1.3, 16));
    }
  });
  shapes.push(shape(id++, HTML_DEMO_PROPOSAL_NAME + " · 예시 완성본", .5, 6.85, 11.5, .3, 9, "64748B"), shape(id++, String(index + 1), 12.1, 6.85, .6, .3, 10, "64748B"));
  return documentXml(`<p:sld xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}"><p:cSld name="${xml(slide.title)}"><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>${group}${shapes.join("")}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`);
}

/** HTML 예시 전용 완성본. 사용자의 현재 편집 내용이나 외부 원본을 읽지 않는다. */
export async function createHtmlDemoPpt(): Promise<Blob> {
  const zip = (await loadZipLibrary()).create();
  const count = HTML_DEMO_SLIDES.length;
  zip.file("[Content_Types].xml", documentXml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${HTML_DEMO_SLIDES.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("")}</Types>`));
  zip.file("_rels/.rels", relations([["rId1", "officeDocument", "ppt/presentation.xml"]]));
  zip.file("ppt/presentation.xml", documentXml(`<p:presentation xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${HTML_DEMO_SLIDES.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join("")}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle/></p:presentation>`));
  zip.file("ppt/_rels/presentation.xml.rels", relations([["rId1", "slideMaster", "slideMasters/slideMaster1.xml"], ...HTML_DEMO_SLIDES.map((_, i): [string, string, string] => [`rId${i + 2}`, "slide", `slides/slide${i + 1}.xml`])]));
  zip.file("ppt/slideMasters/slideMaster1.xml", documentXml(`<p:sldMaster xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}"><p:cSld><p:spTree>${group}</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`));
  zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels", relations([["rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"], ["rId2", "theme", "../theme/theme1.xml"]]));
  zip.file("ppt/slideLayouts/slideLayout1.xml", documentXml(`<p:sldLayout xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${group}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`));
  zip.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels", relations([["rId1", "slideMaster", "../slideMasters/slideMaster1.xml"]]));
  const palette = { dk1: "161616", lt1: "FFFFFF", dk2: "475569", lt2: "F2F7F7", accent1: "0F5E63", accent2: "0078D4", accent3: "609B85", accent4: "B48C47", accent5: "725CA4", accent6: "D06C58", hlink: "0078D4", folHlink: "725CA4" };
  const fill = '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';
  zip.file("ppt/theme/theme1.xml", documentXml(`<a:theme xmlns:a="${A}" name="KPC"><a:themeElements><a:clrScheme name="KPC">${Object.entries(palette).map(([key, color]) => `<a:${key}><a:srgbClr val="${color}"/></a:${key}>`).join("")}</a:clrScheme><a:fontScheme name="KPC"><a:majorFont><a:latin typeface="맑은 고딕"/><a:ea typeface="맑은 고딕"/><a:cs typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="맑은 고딕"/><a:ea typeface="맑은 고딕"/><a:cs typeface="Arial"/></a:minorFont></a:fontScheme><a:fmtScheme name="KPC"><a:fillStyleLst>${fill.repeat(3)}</a:fillStyleLst><a:lnStyleLst>${`<a:ln w="9525">${fill}<a:prstDash val="solid"/></a:ln>`.repeat(3)}</a:lnStyleLst><a:effectStyleLst>${"<a:effectStyle><a:effectLst/></a:effectStyle>".repeat(3)}</a:effectStyleLst><a:bgFillStyleLst>${fill.repeat(3)}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`));
  for (let i = 0; i < count; i++) {
    zip.file(`ppt/slides/slide${i + 1}.xml`, slideXml(i));
    zip.file(`ppt/slides/_rels/slide${i + 1}.xml.rels`, relations([["rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"]]));
  }
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return new Blob([new Uint8Array(bytes)], { type: MIME });
}
