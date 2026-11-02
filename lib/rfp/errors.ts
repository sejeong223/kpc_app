export type RfpErrorCode = "invalid" | "unidentified" | "forbidden" | "conflict" | "db_unavailable" | "db_blocked" | "storage";

export class RfpError extends Error {
  constructor(readonly code: RfpErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RfpError";
  }
}
