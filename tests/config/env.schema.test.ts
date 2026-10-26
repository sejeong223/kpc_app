import { describe, expect, it } from "vitest";

import { parseServerEnv as parseProcessEnv } from "@/config/env.schema";

type TestEnvironment = Record<string, string | undefined>;

function parseServerEnv(source: TestEnvironment) {
  return parseProcessEnv(source as NodeJS.ProcessEnv);
}

function enabledAuthEnv(
  overrides: TestEnvironment = {},
): TestEnvironment {
  return {
    NODE_ENV: "development",
    AUTH_ENABLED: "true",
    NEXTAUTH_URL: "https://app.example.com",
    NEXTAUTH_SECRET: "next-auth-secret",
    MSAL_TENANT_ID: "tenant-id",
    MSAL_CLIENT_ID: "client-id",
    ...overrides,
  };
}

function parseError(source: TestEnvironment): Error {
  try {
    parseServerEnv(source);
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }

    throw error;
  }

  throw new Error("Expected environment parsing to fail");
}

describe("parseServerEnv", () => {
  it("returns safe defaults without Azure or Redis configuration", () => {
    expect(parseServerEnv({})).toEqual({
      nodeEnv: "development",
      appEnv: "local",
      authEnabled: false,
      embeddedMode: false,
      authCacheNamespace: "azure-app-template",
      nextAuthUrl: undefined,
      nextAuthSecret: undefined,
      msalTenantId: undefined,
      msalClientId: undefined,
      msalClientSecret: undefined,
      msalCertPfx: undefined,
      msalCertPassword: undefined,
      redisUrl: undefined,
      redisClusterMode: false,
      azureUseManagedIdentity: false,
      cosmosDbEndpoint: undefined,
      cosmosDbKey: undefined,
      cosmosDbName: undefined,
      blobAccountName: undefined,
      blobAccountKey: undefined,
      iframeAllowedDomains: [],
    });
  });

  it("accepts a project-specific authentication cache namespace", () => {
    expect(
      parseServerEnv({ AUTH_CACHE_NAMESPACE: "my-app" }).authCacheNamespace,
    ).toBe("my-app");
    expect(parseError({ AUTH_CACHE_NAMESPACE: "" }).message).toContain(
      "AUTH_CACHE_NAMESPACE",
    );
  });

  it("accepts certificate authentication", () => {
    const env = parseServerEnv(
      enabledAuthEnv({
        MSAL_CERT_PFX: "base64-certificate",
        MSAL_CERT_PASSWORD: "certificate-password",
      }),
    );

    expect(env.msalCertPfx).toBe("base64-certificate");
    expect(env.msalClientSecret).toBeUndefined();
  });

  it("accepts client secret authentication", () => {
    const env = parseServerEnv(
      enabledAuthEnv({ MSAL_CLIENT_SECRET: "client-secret" }),
    );

    expect(env.msalClientSecret).toBe("client-secret");
    expect(env.msalCertPfx).toBeUndefined();
  });

  it.each([
    ["neither", {}],
    [
      "both",
      {
        MSAL_CLIENT_SECRET: "client-secret",
        MSAL_CERT_PFX: "base64-certificate",
      },
    ],
  ])("rejects %s authentication credential selection", (_, credentials) => {
    const error = parseError(enabledAuthEnv(credentials));

    expect(error.message).toContain("MSAL_CERT_PFX");
    expect(error.message).toContain("MSAL_CLIENT_SECRET");
  });

  it.each([
    "NEXTAUTH_URL",
    "NEXTAUTH_SECRET",
    "MSAL_TENANT_ID",
    "MSAL_CLIENT_ID",
  ])("identifies a missing %s value", (key) => {
    const source = enabledAuthEnv({ MSAL_CLIENT_SECRET: "client-secret" });
    delete source[key];

    expect(parseError(source).message).toContain(key);
  });

  it("requires Redis for production authentication", () => {
    const source = enabledAuthEnv({
      NODE_ENV: "production",
      MSAL_CLIENT_SECRET: "client-secret",
    });

    expect(parseError(source).message).toContain("REDIS_URL");
    expect(
      parseServerEnv({
        ...source,
        REDIS_URL: "redis://cache.example.com:6379",
      }).redisUrl,
    ).toBe("redis://cache.example.com:6379");
  });

  it("allows development authentication without Redis", () => {
    expect(
      parseServerEnv(
        enabledAuthEnv({ MSAL_CLIENT_SECRET: "client-secret" }),
      ).redisUrl,
    ).toBeUndefined();
  });

  it("rejects embedded mode when authentication is disabled", () => {
    const error = parseError({
      AUTH_ENABLED: "false",
      EMBEDDED_MODE: "true",
    });

    expect(error.message).toContain("EMBEDDED_MODE");
    expect(error.message).toContain("AUTH_ENABLED");
  });

  it("trims iframe sources and removes empty entries", () => {
    expect(
      parseServerEnv({
        IFRAME_ALLOWED_DOMAINS:
          "https://portal.example.com, , https://*.example.com",
      }).iframeAllowedDomains,
    ).toEqual(["https://portal.example.com", "https://*.example.com"]);
  });

  it.each([
    "http://example.com",
    "https://exa mple.com",
    "https://example.com/path",
    "https://example.com?query=true",
    "https://example.com#fragment",
    "https://example.com;script-src",
  ])("rejects unsafe iframe source %s", (source) => {
    expect(parseError({ IFRAME_ALLOWED_DOMAINS: source }).message).toContain(
      "IFRAME_ALLOWED_DOMAINS",
    );
  });

  it.each([
    ["AUTH_ENABLED", "0"],
    ["EMBEDDED_MODE", ""],
    ["REDIS_CLUSTER_MODE", "yes"],
    ["AZURE_USE_MANAGED_IDENTITY", "1"],
  ])("rejects invalid Boolean %s=%s", (key, value) => {
    expect(parseError({ [key]: value }).message).toContain(key);
  });

  it.each([
    ["NEXTAUTH_URL", "not-a-url"],
    ["REDIS_URL", "not-a-url"],
    ["COSMOS_DB_ENDPOINT", "not-a-url"],
  ])("rejects invalid URL %s", (key, value) => {
    expect(parseError({ [key]: value }).message).toContain(key);
  });

  it("never includes provided credentials in validation errors", () => {
    const clientSecret = "fake-client-secret-that-must-not-leak";
    const certificate = "fake-pfx-that-must-not-leak";
    const error = parseError(
      enabledAuthEnv({
        MSAL_CLIENT_SECRET: clientSecret,
        MSAL_CERT_PFX: certificate,
      }),
    );

    expect(error.message).not.toContain(clientSecret);
    expect(error.message).not.toContain(certificate);
    expect(error.message).toContain("MSAL_CLIENT_SECRET");
    expect(error.message).toContain("MSAL_CERT_PFX");
  });
});
