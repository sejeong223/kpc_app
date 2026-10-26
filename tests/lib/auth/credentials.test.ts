import type { ICachePlugin } from "@azure/msal-node";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ServerEnv } from "@/config/env.schema";

const mocks = vi.hoisted(() => ({
  parsePfx: vi.fn(),
  msalConstructor: vi.fn(),
  certificateConstructor: vi.fn(),
  secretConstructor: vi.fn(),
}));

vi.mock("@/config/env", () => ({ serverEnv: {} }));
vi.mock("@/utils/cert", () => ({ parsePfx: mocks.parsePfx }));
vi.mock("@azure/msal-node", () => ({
  ConfidentialClientApplication: mocks.msalConstructor,
}));
vi.mock("@azure/identity", () => ({
  ClientCertificateCredential: mocks.certificateConstructor,
  ClientSecretCredential: mocks.secretConstructor,
}));

import {
  createGraphTokenCredential,
  createMsalClient,
  getEntraCredentialConfig,
} from "@/lib/auth/credentials";
import { AppConfigurationError } from "@/lib/auth/errors";

const certificate = {
  certificatePem: "certificate-pem",
  privateKeyPem: "private-key-pem",
  thumbprint: "ABC123",
  combinedPem: "certificate-pem\nprivate-key-pem",
};

function createEnv(overrides: Partial<ServerEnv> = {}): ServerEnv {
  return {
    nodeEnv: "development",
    appEnv: "local",
    authEnabled: true,
    embeddedMode: false,
    authCacheNamespace: "azure-app-template",
    msalTenantId: "tenant-id",
    msalClientId: "client-id",
    msalCertPfx: "base64-pfx",
    redisClusterMode: false,
    azureUseManagedIdentity: false,
    iframeAllowedDomains: [],
    ...overrides,
  };
}

describe("Entra credentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.parsePfx.mockReturnValue(certificate);
  });

  it("selects and parses certificate credentials", () => {
    const env = createEnv({ msalCertPassword: "pfx-password" });

    expect(getEntraCredentialConfig(env)).toEqual({
      mode: "certificate",
      tenantId: "tenant-id",
      clientId: "client-id",
      certificate,
    });
    expect(mocks.parsePfx).toHaveBeenCalledWith(
      "base64-pfx",
      "pfx-password",
    );
  });

  it("selects client secret credentials without parsing a certificate", () => {
    const env = createEnv({
      msalCertPfx: undefined,
      msalClientSecret: "client-secret",
    });

    expect(getEntraCredentialConfig(env)).toEqual({
      mode: "client-secret",
      tenantId: "tenant-id",
      clientId: "client-id",
      clientSecret: "client-secret",
    });
    expect(mocks.parsePfx).not.toHaveBeenCalled();
  });

  it.each([
    { msalCertPfx: undefined, msalClientSecret: undefined },
    { msalCertPfx: "base64-pfx", msalClientSecret: "client-secret" },
  ])("defensively rejects ambiguous credentials", (credentials) => {
    expect(() =>
      getEntraCredentialConfig(createEnv(credentials)),
    ).toThrow(AppConfigurationError);
  });

  it("creates an MSAL certificate client with an optional cache plugin", () => {
    const cachePlugin = {} as ICachePlugin;

    createMsalClient({ env: createEnv(), cachePlugin });

    expect(mocks.msalConstructor).toHaveBeenCalledWith({
      auth: {
        clientId: "client-id",
        authority: "https://login.microsoftonline.com/tenant-id",
        clientCertificate: {
          thumbprint: "ABC123",
          privateKey: "private-key-pem",
        },
      },
      cache: { cachePlugin },
    });
  });

  it("creates an MSAL client-secret client without certificate fields", () => {
    createMsalClient({
      env: createEnv({
        msalCertPfx: undefined,
        msalClientSecret: "client-secret",
      }),
    });

    expect(mocks.msalConstructor).toHaveBeenCalledWith({
      auth: {
        clientId: "client-id",
        authority: "https://login.microsoftonline.com/tenant-id",
        clientSecret: "client-secret",
      },
      cache: undefined,
    });
  });

  it("creates Graph credentials from the same certificate selection", () => {
    createGraphTokenCredential(createEnv());

    expect(mocks.certificateConstructor).toHaveBeenCalledWith(
      "tenant-id",
      "client-id",
      { certificate: "certificate-pem\nprivate-key-pem" },
    );
    expect(mocks.secretConstructor).not.toHaveBeenCalled();
  });

  it("creates Graph credentials from the same client-secret selection", () => {
    createGraphTokenCredential(
      createEnv({
        msalCertPfx: undefined,
        msalClientSecret: "client-secret",
      }),
    );

    expect(mocks.secretConstructor).toHaveBeenCalledWith(
      "tenant-id",
      "client-id",
      "client-secret",
    );
    expect(mocks.certificateConstructor).not.toHaveBeenCalled();
  });
});
