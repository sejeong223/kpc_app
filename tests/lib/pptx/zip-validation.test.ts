import JSZip from "jszip";
import { expect, it } from "vitest";
import { parseXml, relativePart, validateZip, openPackage } from "@/lib/pptx/pptx-xml";
import { loadZipLibrary } from "@/lib/pptx/zip";
import { alteredFixture, fixtureBytes, setupXmlDom } from "./fixture";

setupXmlDom();
it("경로 이탈·DTD·잘못된 ZIP을 거절한다", () => {
  expect(() => relativePart("ppt/slide.xml", "../../secret")).toThrow();
  expect(() => relativePart("ppt/slide.xml", "https://example.invalid")).toThrow();
  expect(() => parseXml('<!DOCTYPE a [<!ENTITY b "x">]><a/>', "검증")).toThrow("DTD");
  expect(() => validateZip(new Uint8Array([1, 2, 3]))).toThrow("ZIP");
});
it("중앙 디렉터리의 파트 한도를 큰 파일 할당 없이 검사한다", async () => {
  const bytes = await fixtureBytes(), view = new DataView(bytes.buffer);
  const end = bytes.length - 22, central = view.getUint32(end + 16, true);
  view.setUint32(central + 24, 256 * 1024 * 1024 + 1, true);
  expect(() => validateZip(bytes)).toThrow("단일");
});
it("전자서명·VBA·지원하지 않는 타입을 거절한다", async () => {
  for (const part of ["_xmlsignatures/sig1.xml", "ppt/vbaProject.bin"]) {
    const bytes = await alteredFixture(zip => { zip.file(part, "검증"); });
    await expect(openPackage(bytes, await loadZipLibrary())).rejects.toThrow("서명");
  }
  const bytes = await alteredFixture(async zip => { zip.file("[Content_Types].xml", (await zip.file("[Content_Types].xml")!.async("string")).replaceAll("presentationml.presentation.main+xml", "unsupported")); });
  await expect(openPackage(bytes, await loadZipLibrary())).rejects.toThrow("형식");
});
it("ZIP CRC 손상을 검사한다", async () => {
  const zip = new JSZip(); zip.file("payload.txt", "정상 내용");
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "STORE" });
  const view = new DataView(bytes.buffer), offset = 30 + view.getUint16(26, true) + view.getUint16(28, true);
  bytes[offset] ^= 1;
  await expect((await loadZipLibrary()).loadAsync(bytes)).rejects.toThrow("CRC32");
});
