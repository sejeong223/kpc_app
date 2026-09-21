export function sanitizeCallbackUrl(value?: string | null): string {
  if (
    !value ||
    value.trim() !== value ||
    /\s/.test(value) ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/";
  }

  return value;
}
