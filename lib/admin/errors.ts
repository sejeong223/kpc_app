import { z } from "zod";
import type { AdminErrorCode } from "@/types/admin";

export class AdminDataError extends Error {
  constructor(readonly code: AdminErrorCode, message: string, readonly fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "AdminDataError";
  }
}

export function validationError(error: z.ZodError): AdminDataError {
  return new AdminDataError("VALIDATION", "입력값을 확인해 주세요.", Object.fromEntries(
    error.issues.map((issue) => [issue.path.join("."), "입력 형식 또는 허용 범위를 확인해 주세요."]),
  ));
}
