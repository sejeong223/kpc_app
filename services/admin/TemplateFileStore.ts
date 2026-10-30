import { AdminDataError } from "@/lib/admin/errors";
import { checkPptxAbort, PptxError, safePptxFilename } from "@/lib/pptx/errors";
import { TEMPLATE_LIMITS } from "@/lib/pptx/limits";
import type { StagedTemplateSource, TemplateExtraction } from "@/types/admin-assets";
import type { TemplateDocument, TemplateProgress } from "@/types/pptx-template";

interface FileEntry { ownerId: string; document: TemplateDocument; extraction: TemplateExtraction; references: Set<string>; staged: boolean }

export class TemplateFileStore {
  private readonly files = new Map<string, FileEntry>();
  private disposed = false;

  async importFile(ownerId: string, file: File, signal?: AbortSignal, onProgress?: TemplateProgress): Promise<StagedTemplateSource> {
    checkPptxAbort(signal);
    if (this.disposed) throw new PptxError("CANCELLED", "종료된 파일 저장소입니다.");
    if (!/\.(pptx|potx)$/i.test(file.name)) throw new PptxError("UNSUPPORTED", ".pptx 또는 .potx 파일을 선택하세요.");
    if (file.size > TEMPLATE_LIMITS.fileBytes) throw new PptxError("LIMIT", "250 MiB 이하 파일을 선택하세요.");
    if (file.size < 22) throw new PptxError("INVALID_FILE", "PPT 파일이 비어 있거나 손상되었습니다.");
    const [{ readTemplate }, { loadZipLibrary }, { extractTemplateMetadata }] = await Promise.all([import("@/lib/pptx/template-read"), import("@/lib/pptx/zip"), import("@/lib/pptx/extraction")]);
    checkPptxAbort(signal);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const document = await readTemplate(bytes, safePptxFilename(file.name), await loadZipLibrary(), { signal, onProgress });
    const hash = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer);
    const sha256 = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
    const extraction = await extractTemplateMetadata(document, sha256);
    checkPptxAbort(signal);
    if (this.disposed) throw new PptxError("CANCELLED", "종료된 파일 저장소입니다.");
    const id = crypto.randomUUID();
    this.files.set(id, { ownerId, document, extraction, staged: true, references: new Set() });
    return { id, filename: document.filename, byteLength: bytes.byteLength, sha256, extraction: structuredClone(extraction) };
  }

  // 엔진과 권한을 검증한 서비스에서만 사용한다. UI에는 ZIP이나 바이트를 노출하지 않는다.
  getSource(fileRefId: string): Pick<FileEntry, "ownerId" | "document" | "extraction"> {
    const entry = this.files.get(fileRefId);
    if (!entry) throw new AdminDataError("NOT_FOUND", "파일을 찾을 수 없습니다. 다시 업로드해 주세요.");
    return { ownerId: entry.ownerId, document: entry.document, extraction: structuredClone(entry.extraction) };
  }

  retain(fileRefId: string, reference: string): void {
    const entry = this.files.get(fileRefId);
    if (!entry) throw new AdminDataError("NOT_FOUND", "보관할 파일이 없습니다.");
    entry.references.add(reference);
    entry.staged = false;
  }
  isStagedFor(ownerId: string, fileRefId: string): boolean {
    const entry = this.files.get(fileRefId);
    return Boolean(entry?.staged && entry.ownerId === ownerId);
  }
  release(fileRefId: string, reference: string): void {
    const entry = this.files.get(fileRefId);
    if (!entry) return;
    entry.references.delete(reference);
    if (!entry.staged && entry.references.size === 0) this.files.delete(fileRefId);
  }
  discardStaged(ownerId: string, fileRefId: string): void {
    const entry = this.files.get(fileRefId);
    if (!entry) return;
    if (entry.ownerId !== ownerId) throw new AdminDataError("FORBIDDEN", "다른 사용자의 업로드를 취소할 수 없습니다.");
    if (entry.staged && entry.references.size === 0) this.files.delete(fileRefId);
  }
  dispose(): void { this.disposed = true; this.files.clear(); }
}
