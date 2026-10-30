export class PptxError extends Error {
  constructor(readonly code: "VALIDATION" | "INVALID_FILE" | "LIMIT" | "UNSUPPORTED" | "CANCELLED", message: string) {
    super(message);
    this.name = "PptxError";
  }
}

export function checkPptxAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new PptxError("CANCELLED", "파일 처리를 취소했습니다.");
}

export function safePptxFilename(filename: string): string {
  return Array.from(filename).filter(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127 && !"/\\".includes(char)).join("").trim().slice(-255) || "template.pptx";
}
