import type { WorkspaceErrorCode } from "@/types/workspace-production";
import { AdminDataError } from "@/lib/admin/errors";
import { WorkspaceFileError } from "@/lib/workspace/files/errors";
import { PptxError } from "@/lib/pptx/errors";
export class WorkspaceError extends Error {
  constructor(
    readonly code: WorkspaceErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "WorkspaceError";
  }
}
export function workspaceAssert(
  condition: boolean,
  code: WorkspaceErrorCode,
  message: string,
): asserts condition {
  if (!condition) throw new WorkspaceError(code, message);
}
export async function workspaceOperation<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof WorkspaceError) throw error;
    if (error instanceof AdminDataError)
      throw new WorkspaceError(
        error.code === "FORBIDDEN" || error.code === "INACTIVE_USER"
          ? "FORBIDDEN"
          : error.code === "CONFLICT"
            ? "CONFLICT"
            : error.code === "NOT_FOUND"
              ? "ASSET_UNAVAILABLE"
              : "VALIDATION",
        error.message,
        { cause: error },
      );
    if (error instanceof PptxError)
      throw new WorkspaceError(
        error.code === "CANCELLED"
          ? "CANCELLED"
          : error.code === "LIMIT"
            ? "LIMIT"
            : "MAPPING",
        error.message,
        { cause: error },
      );
    if (error instanceof WorkspaceFileError)
      throw new WorkspaceError(
        error.code === "UNIDENTIFIED"
          ? "FORBIDDEN"
          : error.code === "DB_BLOCKED"
            ? "DB_BLOCKED"
            : error.code === "DB_UNAVAILABLE"
              ? "DB_UNAVAILABLE"
              : error.code === "CONFLICT"
                ? "CONFLICT"
                : error.code === "CANCELLED"
                  ? "CANCELLED"
                  : error.code === "FORBIDDEN"
                    ? "FORBIDDEN"
                    : error.code === "NOT_FOUND"
                      ? "NOT_FOUND"
                      : "STORAGE",
        error.message,
        { cause: error },
      );
    throw new WorkspaceError(
      error instanceof DOMException && error.name === "AbortError"
        ? "CANCELLED"
        : "STORAGE",
      error instanceof Error ? error.message : "작업을 완료하지 못했습니다.",
      { cause: error },
    );
  }
}
