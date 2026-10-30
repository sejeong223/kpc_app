import { TEMPLATE_LIMITS } from "./limits";
import { PptxError } from "./errors";

export interface ZipEntry {
  name: string; dir: boolean;
  async(format: "string"): Promise<string>;
  async(format: "uint8array"): Promise<Uint8Array>;
  async(format: "base64"): Promise<string>;
}
export interface ZipArchive {
  files: Record<string, ZipEntry>;
  file(name: string): ZipEntry | null;
  file(name: string, text: string): ZipArchive;
  generateAsync(options: { type: "uint8array"; compression: "DEFLATE"; streamFiles?: boolean }, onUpdate?: (metadata: { percent: number; currentFile: string | null }) => void): Promise<Uint8Array>;
}
export interface ZipLibrary { loadAsync(bytes: Uint8Array): Promise<ZipArchive> }

export async function loadZipLibrary(): Promise<ZipLibrary> {
  const { default: JSZip } = await import("jszip");
  return {
    async loadAsync(bytes) {
      // 중앙 디렉터리 사전 검증 후 실제 내용의 CRC와 해제 크기도 확인한다.
      const zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
      let total = 0;
      for (const entry of Object.values(zip.files)) {
        if (entry.dir) continue;
        const content = await entry.async("uint8array");
        total += content.byteLength;
        if (content.byteLength > TEMPLATE_LIMITS.partBytes || total > TEMPLATE_LIMITS.expandedBytes) {
          throw new PptxError("LIMIT", "실제 압축 해제 크기가 허용 범위를 초과했습니다.");
        }
      }
      return zip;
    },
  };
}
