const MICROSOFT_FRAME_ANCESTORS = [
  "https://login.microsoftonline.com",
  "https://*.cloud.microsoft",
  "https://teams.microsoft.com",
  "https://*.teams.microsoft.com",
  "https://*.microsoft365.com",
  "https://*.office.com",
  "https://outlook.office.com",
  "https://outlook.office365.com",
] as const;

const hostnameLabel = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";
const safeFrameSource = new RegExp(
  `^https://(?:\\*\\.)?${hostnameLabel}(?:\\.${hostnameLabel})*$`,
  "i",
);

export function isAuthPath(pathname: string): boolean {
  return pathname === "/auth" || pathname.startsWith("/auth/");
}

export function shouldApplyAuthentication(input: {
  authEnabled: boolean;
  pathname: string;
}): boolean {
  return input.authEnabled && !isAuthPath(input.pathname);
}

export function buildFrameAncestors(input: {
  embeddedMode: boolean;
  additionalDomains: readonly string[];
}): string {
  if (!input.embeddedMode) {
    return "frame-ancestors 'self'";
  }

  for (const domain of input.additionalDomains) {
    if (!safeFrameSource.test(domain)) {
      throw new Error("IFRAME_ALLOWED_DOMAINS contains an invalid source");
    }
  }

  return [
    "frame-ancestors 'self'",
    ...MICROSOFT_FRAME_ANCESTORS,
    ...input.additionalDomains,
  ].join(" ");
}
