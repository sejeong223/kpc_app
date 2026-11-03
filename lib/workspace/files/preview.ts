import { TXT_PREVIEW_BYTES } from "@/config/workspace-files";
import { validateUploadFile } from "./validation";
import { WorkspaceFileError } from "./errors";

export type FilePreviewContent =
  | { type: "pdf"; url: string }
  | { type: "text"; text: string; truncated: boolean; encoding: "utf-8" | "utf-16le" | "utf-16be" }
  | { type: "metadata"; reason: string };
export interface PreparedFilePreview { content: FilePreviewContent; dispose(): void }
function metadata(reason: string): PreparedFilePreview { return { content: { type: "metadata", reason }, dispose() {} }; }

export async function prepareFilePreview(file: File): Promise<PreparedFilePreview> {
  const extension = validateUploadFile(file);
  if (extension === ".pdf") {
    const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    if (String.fromCharCode(...header) !== "%PDF-") return metadata("PDF 파일의 헤더를 확인할 수 없습니다. 원본을 다운로드해 확인해 주세요.");
    const url = URL.createObjectURL(file.slice(0, file.size, "application/pdf"));
    let disposed = false;
    return { content: { type: "pdf", url }, dispose() { if (!disposed) { disposed = true; URL.revokeObjectURL(url); } } };
  }
  if (extension === ".txt") {
    const bytes = new Uint8Array(await file.slice(0, TXT_PREVIEW_BYTES).arrayBuffer());
    const truncated = file.size > TXT_PREVIEW_BYTES;
    const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? "utf-16le" : bytes[0] === 0xfe && bytes[1] === 0xff ? "utf-16be" : "utf-8";
    try {
      // 잘린 마지막 문자만 보류하고, 실제로 잘못된 바이트는 오류로 구분한다.
      const text = new TextDecoder(encoding, { fatal: true }).decode(bytes, { stream: truncated });
      return { content: { type: "text", text, truncated, encoding }, dispose() {} };
    } catch { return metadata("지원하는 텍스트 인코딩으로 읽을 수 없습니다. UTF-8 또는 BOM이 있는 UTF-16 파일을 사용하거나 원본을 다운로드해 주세요."); }
  }
  return metadata("이 형식은 원본 다운로드로 확인할 수 있습니다.");
}

export function downloadOriginalFile(file: File): () => void {
  if (typeof document === "undefined") throw new WorkspaceFileError("DB_UNAVAILABLE", "브라우저에서 원본을 다운로드해 주세요.");
  const url = URL.createObjectURL(file);
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (timer !== null) clearTimeout(timer);
    URL.revokeObjectURL(url);
  };
  const anchor = document.createElement("a");
  try {
    anchor.href = url;
    anchor.download = Array.from(file.name).map(character => character === "/" || character === "\\" || character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 ? "_" : character).join("") || "자료";
    anchor.hidden = true;
    document.body.appendChild(anchor); anchor.click();
    timer = setTimeout(dispose, 1000);
  } catch (error) {
    dispose();
    throw new WorkspaceFileError("STORAGE", "다운로드를 시작하지 못했습니다. 다시 시도해 주세요.", { cause: error });
  } finally { anchor.remove(); }
  return dispose;
}
