import type { TokenCredential } from "@azure/core-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createGraphTokenCredential: vi.fn(),
  authenticationProvider: vi.fn(),
  initWithMiddleware: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/credentials", () => ({
  createGraphTokenCredential: mocks.createGraphTokenCredential,
}));
vi.mock(
  "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials",
  () => ({
    TokenCredentialAuthenticationProvider: class MockAuthenticationProvider {
      constructor(
        readonly credential: unknown,
        readonly options: { scopes: string[] },
      ) {
        mocks.authenticationProvider(credential, options);
      }
    },
  }),
);
vi.mock("@microsoft/microsoft-graph-client", () => ({
  Client: { initWithMiddleware: mocks.initWithMiddleware },
}));

import MSGraphService from "@/services/MSGraphService";

describe("MSGraphService", () => {
  const defaultCredential = { getToken: vi.fn() } as TokenCredential;
  const injectedCredential = { getToken: vi.fn() } as TokenCredential;
  const graphClient = { kind: "graph-client" };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createGraphTokenCredential.mockReturnValue(defaultCredential);
    mocks.initWithMiddleware.mockReturnValue(graphClient);
  });

  it("uses the shared default credential without making a network call", () => {
    const client = new MSGraphService().getMSGraphClient();

    expect(mocks.createGraphTokenCredential).toHaveBeenCalledOnce();
    expect(mocks.authenticationProvider).toHaveBeenCalledWith(
      defaultCredential,
      { scopes: ["https://graph.microsoft.com/.default"] },
    );
    expect(mocks.initWithMiddleware).toHaveBeenCalledWith({
      authProvider: expect.objectContaining({
        credential: defaultCredential,
        options: { scopes: ["https://graph.microsoft.com/.default"] },
      }),
    });
    expect(client).toBe(graphClient);
  });

  it("accepts an injected credential for isolated tests", () => {
    new MSGraphService(injectedCredential).getMSGraphClient();

    expect(mocks.createGraphTokenCredential).not.toHaveBeenCalled();
    expect(mocks.authenticationProvider).toHaveBeenCalledWith(
      injectedCredential,
      { scopes: ["https://graph.microsoft.com/.default"] },
    );
  });
});
