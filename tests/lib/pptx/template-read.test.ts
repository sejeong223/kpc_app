import { expect, it } from "vitest";
import { readTemplate } from "@/lib/pptx/template-read";
import { loadZipLibrary } from "@/lib/pptx/zip";
import { extractTemplateMetadata } from "@/lib/pptx/extraction";
import { alteredFixture, fixtureBytes, setupXmlDom } from "./fixture";

setupXmlDom();
it("실제 파일의 슬라이드·공유 서식·보존 대상을 분석한다", async () => {
  const bytes = await fixtureBytes(), progress: string[] = [];
  const doc = await readTemplate(bytes, "검증.pptx", await loadZipLibrary(), { onProgress: message => progress.push(message) });
  expect(doc.slides).toHaveLength(4);
  expect(doc.width).toBe(25.4);
  expect(doc.slides[0].objects.some(object => object.inherited)).toBe(true);
  expect(doc.slides[2].objects.some(object => object.reasons.some(reason => reason.includes("차트")))).toBe(true);
  expect(doc.slides[3].objects.some(object => object.merged)).toBe(true);
  const metadata = await extractTemplateMetadata(doc, "a".repeat(64));
  expect(metadata.slideCount).toBe(4);
  expect(metadata.layouts.length).toBeGreaterThan(0);
  expect(metadata.themes.length).toBeGreaterThan(0);
  expect(progress.length).toBeGreaterThan(4);
  expect(doc.bytes).toEqual(bytes);
});
it("POTX와 사전 취소를 처리한다", async () => {
  const bytes = await alteredFixture(async zip => { const item = zip.file("[Content_Types].xml")!; zip.file(item.name, (await item.async("string")).replace("presentationml.presentation.main+xml", "presentationml.template.main+xml")); });
  expect((await readTemplate(bytes, "예시.potx", await loadZipLibrary())).slides).toHaveLength(4);
  const controller = new AbortController(); controller.abort();
  await expect(readTemplate(bytes, "검증.potx", await loadZipLibrary(), { signal: controller.signal })).rejects.toMatchObject({ code: "CANCELLED" });
});
it("슬라이드 수·필수 관계 손상은 전체 오류다", async () => {
  for (const count of [0, 201]) {
    const bytes = await alteredFixture(async zip => {
      const xml = await zip.file("ppt/presentation.xml")!.async("string");
      const tag = xml.match(/<p:sldId\b[^>]*\/>/)![0];
      zip.file("ppt/presentation.xml", xml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, "<p:sldIdLst>" + tag.repeat(count) + "</p:sldIdLst>"));
    });
    await expect(readTemplate(bytes, "검증.pptx", await loadZipLibrary())).rejects.toThrow("1~200");
  }
  const missing = await alteredFixture(zip => { zip.remove("ppt/_rels/presentation.xml.rels"); });
  await expect(readTemplate(missing, "검증.pptx", await loadZipLibrary())).rejects.toThrow("관계");
});
it("200장 상한은 허용한다", async () => {
  const bytes = await alteredFixture(async zip => {
    const path = "ppt/presentation.xml", xml = await zip.file(path)!.async("string");
    const tag = xml.match(/<p:sldId\b[^>]*\/>/)![0];
    const tags = Array.from({ length: 200 }, (_, i) => tag.replace(/\bid="\d+"/, `id="${256 + i}"`)).join("");
    zip.file(path, xml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, `<p:sldIdLst>${tags}</p:sldIdLst>`));
  });
  expect((await readTemplate(bytes, "200장.pptx", await loadZipLibrary())).slides).toHaveLength(200);
});
