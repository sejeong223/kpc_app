import type { TokenCredential } from "@azure/core-auth";
import {
  ClientCertificateCredential,
  ClientSecretCredential,
} from "@azure/identity";
import {
  ConfidentialClientApplication,
  type ICachePlugin,
} from "@azure/msal-node";

import { serverEnv } from "@/config/env";
import type { ServerEnv } from "@/config/env.schema";
import {
  parsePfx,
  type CertificateMaterial,
} from "@/utils/cert";

import { AppConfigurationError } from "./errors";

export type { CertificateMaterial } from "@/utils/cert";

export type EntraCredentialConfig =
  | {
      mode: "certificate";
      tenantId: string;
      clientId: string;
      certificate: CertificateMaterial;
    }
  | {
      mode: "client-secret";
      tenantId: string;
      clientId: string;
      clientSecret: string;
    };

export function getEntraCredentialConfig(
  env: ServerEnv = serverEnv,
): EntraCredentialConfig {
  if (!env.authEnabled) {
    throw new AppConfigurationError("AUTH_ENABLED must be true");
  }

  if (!env.msalTenantId || !env.msalClientId) {
    throw new AppConfigurationError(
      "MSAL_TENANT_ID and MSAL_CLIENT_ID are required",
    );
  }

  const hasCertificate = env.msalCertPfx !== undefined;
  const hasClientSecret = env.msalClientSecret !== undefined;

  if (hasCertificate === hasClientSecret) {
    throw new AppConfigurationError(
      "Exactly one of MSAL_CERT_PFX or MSAL_CLIENT_SECRET is required",
    );
  }

  if (env.msalCertPfx) {
    return {
      mode: "certificate",
      tenantId: env.msalTenantId,
      clientId: env.msalClientId,
      certificate: parsePfx(env.msalCertPfx, env.msalCertPassword),
    };
  }

  if (!env.msalClientSecret) {
    throw new AppConfigurationError("MSAL_CLIENT_SECRET is required");
  }

  return {
    mode: "client-secret",
    tenantId: env.msalTenantId,
    clientId: env.msalClientId,
    clientSecret: env.msalClientSecret,
  };
}

export function createMsalClient(options: {
  env?: ServerEnv;
  cachePlugin?: ICachePlugin;
} = {}): ConfidentialClientApplication {
  const credential = getEntraCredentialConfig(options.env);
  const authority = `https://login.microsoftonline.com/${credential.tenantId}`;
  const cache = options.cachePlugin
    ? { cachePlugin: options.cachePlugin }
    : undefined;

  if (credential.mode === "certificate") {
    return new ConfidentialClientApplication({
      auth: {
        clientId: credential.clientId,
        authority,
        clientCertificate: {
          thumbprint: credential.certificate.thumbprint,
          privateKey: credential.certificate.privateKeyPem,
        },
      },
      cache,
    });
  }

  return new ConfidentialClientApplication({
    auth: {
      clientId: credential.clientId,
      authority,
      clientSecret: credential.clientSecret,
    },
    cache,
  });
}

export function createGraphTokenCredential(
  env: ServerEnv = serverEnv,
): TokenCredential {
  const credential = getEntraCredentialConfig(env);

  if (credential.mode === "certificate") {
    return new ClientCertificateCredential(
      credential.tenantId,
      credential.clientId,
      { certificate: credential.certificate.combinedPem },
    );
  }

  return new ClientSecretCredential(
    credential.tenantId,
    credential.clientId,
    credential.clientSecret,
  );
}
