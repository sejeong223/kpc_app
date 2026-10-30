import { readFile } from "node:fs/promises";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { afterAll, beforeAll, vi } from "vitest";
import JSZip from "jszip";

export function setupXmlDom(): void {
  beforeAll(() => { vi.stubGlobal("DOMParser", DOMParser); vi.stubGlobal("XMLSerializer", XMLSerializer); });
  afterAll(() => vi.unstubAllGlobals());
}
export async function fixtureBytes(name = "native-template.pptx"): Promise<Uint8Array> {
  return new Uint8Array(await readFile(new URL("../../fixtures/pptx/" + name, import.meta.url)));
}
export async function fixtureFile(): Promise<File> {
  return new File([new Uint8Array(await fixtureBytes()).buffer], "검증.pptx");
}
export async function alteredFixture(change: (zip: JSZip) => Promise<void> | void): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(await fixtureBytes());
  await change(zip);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
