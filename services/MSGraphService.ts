import "server-only";

import type { TokenCredential } from "@azure/core-auth";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";

import { createGraphTokenCredential } from "@/lib/auth/credentials";

const GRAPH_SCOPES = ["https://graph.microsoft.com/.default"];

export default class MSGraphService {
  constructor(
    private readonly credential: TokenCredential =
      createGraphTokenCredential(),
  ) {}

  getMSGraphClient(): Client {
    const authProvider = new TokenCredentialAuthenticationProvider(
      this.credential,
      { scopes: GRAPH_SCOPES },
    );

    return Client.initWithMiddleware({ authProvider });
  }
}
