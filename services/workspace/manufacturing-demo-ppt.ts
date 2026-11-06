import { MFG_DEMO_PROJECT_ID } from "@/config/production-mfg-demo";
import { loadZipLibrary } from "@/lib/pptx/zip";
import { manufacturingLayout } from "@/lib/workspace/production/manufacturing-prompt";
import { workspaceAssert as check } from "@/lib/workspace/production/errors";
import type { ContentBlock, ProposalSlide, RoundBody } from "@/types/workspace-production";
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
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(width)}" cy="${emu(height)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : "<a:noFill/>"}<a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square" lIns="91440" rIns="91440" tIns="45720" bIns="45720"><a:normAutofit/></a:bodyPr><a:lstStyle/>${text.split("\n").map(line => `<a:p><a:pPr><a:lnSpc><a:spcPct val="130000"/></a:lnSpc></a:pPr><a:r><a:rPr lang="ko-KR" sz="${Math.round(size * 100)}" b="${bold ? 1 : 0}"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="맑은 고딕"/><a:ea typeface="맑은 고딕"/></a:rPr><a:t>${xml(line)}</a:t></a:r><a:endParaRPr lang="ko-KR" sz="${Math.round(size * 100)}"/></a:p>`).join("")}</p:txBody></p:sp>`;
}

export interface ManufacturingPptInput { projectName: string; organization: string; round: number; body: RoundBody }
export const manufacturingPptFilename = (round: number) => `제조업_PoC_${round}차_완성본.pptx`;
function slideXml(slide: ProposalSlide, index: number, input: ManufacturingPptInput) {
  const layout = manufacturingLayout(MFG_DEMO_PROJECT_ID, slide);
  let id = 2;
  const shapes = [
    shape(id++, "KPC · 한국생산성본부", .5, .25, 8, .35, 10, "1F3A5F", true),
    shape(id++, slide.content.title, .5, .85, 12.3, .75, 28, "161616", true),
    shape(id++, slide.content.lead, .5, 1.7, 12.3, .8, 15, "475569"),
  ];
  const textParts = (block: ContentBlock): [string, string] => {
    if (block.kind === "text") { const [heading, ...rest] = block.text.split("\n"); return [heading, rest.join("\n")]; }
    if (block.kind === "list") return ["", block.items.map(item => "• " + item).join("\n")];
    return ["", ""];
  };
  const textBox = (text: string, x: number, y: number, w: number, h: number, size=15, bold=false, fill?:string) =>
    shape(id++, text, x, y, w, h, size, bold ? "1F3A5F" : "26282D", bold, fill);
  const drawTable = (block: Extract<ContentBlock,{kind:"table"}>, x:number, y:number, w:number, h:number) => {
    // 각 셀을 독립 텍스트 도형으로 만들어 내용과 배경을 편집할 수 있게 한다.
    const rows = [block.columns, ...block.rows], rowH = h / Math.max(rows.length,1), colW = w / Math.max(block.columns.length,1);
    rows.forEach((row,r) => row.forEach((cell,c) => {
      shapes.push(textBox(cell,x+c*colW,y+r*rowH,colW*.98,rowH*.94,Math.min(15,Math.max(7,rowH*32)),r===0,r===0?"DEE6EF":r%2?"F2F5F9":"F8FAFC"));
    }));
  };
  if (layout && layout !== "table") {
    slide.content.blocks.forEach((block,i) => {
      const [heading,text]=textParts(block), x=.6+i*4.15;
      shapes.push(textBox("",x,2.8,3.85,3.25,14,false,"F2F5F9"));
      shapes.push(textBox(heading,x+.15,3.0,3.55,layout==="kpi"?1.1:.85,layout==="kpi"?32:20,true));
      shapes.push(textBox(text,x+.15,4.15,3.55,1.65,16));
      if(layout==="process" && i<2) shapes.push(textBox("→",x+3.72,3.65,.55,.5,22,true));
    });
  } else if (layout==="table" && slide.content.blocks[0]?.kind==="table") {
    drawTable(slide.content.blocks[0],.6,2.8,12.1,3.55);
  } else {
    // 자유 편집으로 구조가 바뀌어도 모든 text/list/table 블록을 현재 순서로 출력한다.
    const blocks=slide.content.blocks, columns=blocks.length>3?2:1, rows=Math.ceil(blocks.length/columns)||1;
    const h=3.8/rows, w=12.1/columns;
    blocks.forEach((block,i)=>{
      const x=.6+(i%columns)*w, y=2.75+Math.floor(i/columns)*h;
      if(block.kind==="table") drawTable(block,x,y,w*.98,h*.94);
      else { const [heading,text]=textParts(block); shapes.push(textBox([heading,text].filter(Boolean).join("\n"),x,y,w*.98,h*.94,Math.min(16,Math.max(8,h*17)),false,"F2F5F9")); }
    });
  }
  shapes.push(shape(id++,input.projectName+" · "+input.organization+" · "+input.round+"차 완성본",.5,6.85,11.5,.4,9,"64748B"),shape(id++,String(index+2),12.1,6.85,.6,.3,10,"64748B"));
  return documentXml(`<p:sld xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}"><p:cSld name="${xml(slide.content.title)}"><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>${group}${shapes.join("")}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`);
}

/** 확인한 현재 본문으로 편집 가능한 제조업 완성본을 만든다. */
export async function createManufacturingDemoPpt(input: ManufacturingPptInput): Promise<Blob> {
  const slides=input.body.chapters.flatMap(chapter=>input.body.sections.filter(section=>section.chapterId===chapter.id).flatMap(section=>input.body.slides.filter(slide=>slide.sectionId===section.id)));
  check(slides.length > 0, "LAYOUT", "완성본으로 저장할 슬라이드가 없습니다.");
  check(slides.length===input.body.slides.length && new Set(slides.map(s=>s.id)).size===slides.length,"LAYOUT","슬라이드의 목차 연결을 확인해 주세요.");
  check(slides.every(s=>!s.template && s.content.blocks.every(b=>b.kind!=="image")),"LAYOUT","이 예시 완성본은 템플릿·이미지를 지원하지 않습니다. 현재 내용은 유지됩니다. 기존 PPT 내보내기를 이용해 주세요.");
  const zip = (await loadZipLibrary()).create();
  const count = slides.length;
  zip.file("[Content_Types].xml", documentXml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("")}</Types>`));
  zip.file("_rels/.rels", relations([["rId1", "officeDocument", "ppt/presentation.xml"]]));
  zip.file("ppt/presentation.xml", documentXml(`<p:presentation xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join("")}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle/></p:presentation>`));
  zip.file("ppt/_rels/presentation.xml.rels", relations([["rId1", "slideMaster", "slideMasters/slideMaster1.xml"], ...slides.map((_, i): [string, string, string] => [`rId${i + 2}`, "slide", `slides/slide${i + 1}.xml`])]));
  zip.file("ppt/slideMasters/slideMaster1.xml", documentXml(`<p:sldMaster xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}"><p:cSld><p:spTree>${group}</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`));
  zip.file("ppt/slideMasters/_rels/slideMaster1.xml.rels", relations([["rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"], ["rId2", "theme", "../theme/theme1.xml"]]));
  zip.file("ppt/slideLayouts/slideLayout1.xml", documentXml(`<p:sldLayout xmlns:p="${P}" xmlns:a="${A}" xmlns:r="${R}" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${group}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`));
  zip.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels", relations([["rId1", "slideMaster", "../slideMasters/slideMaster1.xml"]]));
  const palette = { dk1: "161616", lt1: "FFFFFF", dk2: "475569", lt2: "F2F5F9", accent1: "1F3A5F", accent2: "0078D4", accent3: "609B85", accent4: "B48C47", accent5: "725CA4", accent6: "D06C58", hlink: "0078D4", folHlink: "725CA4" };
  const fill = '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';
  zip.file("ppt/theme/theme1.xml", documentXml(`<a:theme xmlns:a="${A}" name="KPC"><a:themeElements><a:clrScheme name="KPC">${Object.entries(palette).map(([key, color]) => `<a:${key}><a:srgbClr val="${color}"/></a:${key}>`).join("")}</a:clrScheme><a:fontScheme name="KPC"><a:majorFont><a:latin typeface="맑은 고딕"/><a:ea typeface="맑은 고딕"/><a:cs typeface="Arial"/></a:majorFont><a:minorFont><a:latin typeface="맑은 고딕"/><a:ea typeface="맑은 고딕"/><a:cs typeface="Arial"/></a:minorFont></a:fontScheme><a:fmtScheme name="KPC"><a:fillStyleLst>${fill.repeat(3)}</a:fillStyleLst><a:lnStyleLst>${`<a:ln w="9525">${fill}<a:prstDash val="solid"/></a:ln>`.repeat(3)}</a:lnStyleLst><a:effectStyleLst>${"<a:effectStyle><a:effectLst/></a:effectStyle>".repeat(3)}</a:effectStyleLst><a:bgFillStyleLst>${fill.repeat(3)}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`));
  for (let i = 0; i < count; i++) {
    zip.file(`ppt/slides/slide${i + 1}.xml`, slideXml(slides[i], i, input));
    zip.file(`ppt/slides/_rels/slide${i + 1}.xml.rels`, relations([["rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"]]));
  }
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return new Blob([new Uint8Array(bytes)], { type: MIME });
}
