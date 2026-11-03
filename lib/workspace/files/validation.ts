import { ALLOWED_FILE_EXTENSIONS, FILE_LIMITS } from "@/config/workspace-files";
import type { AllowedFileExtension, ReferenceKind } from "@/types/workspace-files";
import { WorkspaceFileError } from "./errors";

export function hasControlCharacters(value: string): boolean {
  return Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
}

export function normalizeWebUrl(raw: string): string {
  const value = raw.trim();
  const invalid = () => new WorkspaceFileError("VALIDATION", "올바른 HTTP 또는 HTTPS 링크를 입력해 주세요.");
  if (!value || value.length > FILE_LIMITS.urlLength || hasControlCharacters(value)) throw invalid();
  const explicitHttp = /^https?:\/\//i.test(value);
  const hostWithPort = /^(?:localhost|(?:[^\s/:?#]+\.)+[^\s/:?#]+):\d+(?:[/?#]|$)/i.test(value);
  if (/^[a-z][a-z\d+.-]*:/i.test(value) && !explicitHttp && !hostWithPort) throw invalid();
  let url: URL;
  try {
    url = new URL(explicitHttp ? value : value.startsWith("//") ? "https:" + value : "https://" + value);
  } catch {
    throw invalid();
  }
  if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password
    || url.href.length > FILE_LIMITS.urlLength) throw invalid();
  return url.href;
}

export function validateUploadFile(file: File): AllowedFileExtension {
  if (typeof File === "undefined" || !(file instanceof File)) {
    throw new WorkspaceFileError("VALIDATION", "업로드할 파일을 다시 선택해 주세요.");
  }
  if (!file.name.trim() || file.name.length > FILE_LIMITS.filenameLength || hasControlCharacters(file.name)) {
    throw new WorkspaceFileError("VALIDATION", "파일 이름은 제어문자 없이 255자 이내여야 합니다.");
  }
  const extension = ALLOWED_FILE_EXTENSIONS.find(value => file.name.toLowerCase().endsWith(value));
  if (!extension) throw new WorkspaceFileError("VALIDATION", "지원하지 않는 파일 형식입니다.");
  if (!Number.isSafeInteger(file.size) || file.size < 1) {
    throw new WorkspaceFileError("VALIDATION", "비어 있는 파일은 등록할 수 없습니다.");
  }
  if (file.size > FILE_LIMITS.fileBytes) throw new WorkspaceFileError("LIMIT", "파일당 50MB 이하로 등록해 주세요.");
  if (!Number.isSafeInteger(file.lastModified) || file.lastModified < 0) {
    throw new WorkspaceFileError("VALIDATION", "파일의 수정 시각을 확인할 수 없습니다.");
  }
  return extension;
}

export function guessReferenceKind(filename: string): ReferenceKind {
  if (/rfp|제안요청|공고/i.test(filename)) return "rfp";
  if (/과업|지시서|요구/i.test(filename)) return "business";
  if (/실적|사례/i.test(filename)) return "case-study";
  if (/소개|회사/i.test(filename)) return "company";
  return "other";
}
