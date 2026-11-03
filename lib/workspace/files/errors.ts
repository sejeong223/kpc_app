import type { FileErrorCode } from "@/types/workspace-files";

export class WorkspaceFileError extends Error {
  constructor(readonly code: FileErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "WorkspaceFileError";
  }
}
