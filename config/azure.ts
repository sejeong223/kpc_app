import { parseServerEnv, type ServerEnv } from "./env.schema";

export type CosmosConfig = {
  endpoint: string;
  databaseName: string;
} &
  (
    | { authMode: "managed-identity" }
    | { authMode: "key"; key: string }
  );

export type BlobConfig = {
  accountName: string;
  serviceUrl: string;
} &
  (
    | { authMode: "managed-identity" }
    | { authMode: "shared-key"; accountKey: string }
  );

type AzureService = "Cosmos DB" | "Blob Storage";

export class AzureIntegrationConfigurationError extends Error {
  constructor(service: AzureService, missingKeys: readonly string[]) {
    super(`${service} configuration is missing: ${missingKeys.join(", ")}`);
    this.name = "AzureIntegrationConfigurationError";
  }
}

function requireValues(
  service: AzureService,
  entries: ReadonlyArray<readonly [key: string, value: string | undefined]>,
): Record<string, string> {
  const missingKeys = entries
    .filter(([, value]) => value === undefined || value.trim().length === 0)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    throw new AzureIntegrationConfigurationError(service, missingKeys);
  }

  return Object.fromEntries(
    entries.map(([key, value]) => [key, value?.trim() ?? ""]),
  );
}

export function getCosmosConfig(
  env: ServerEnv = parseServerEnv(process.env),
): CosmosConfig {
  const requiredEntries: Array<readonly [string, string | undefined]> = [
    ["COSMOS_DB_ENDPOINT", env.cosmosDbEndpoint],
    ["COSMOS_DB_NAME", env.cosmosDbName],
  ];

  if (!env.azureUseManagedIdentity) {
    requiredEntries.push(["COSMOS_DB_KEY", env.cosmosDbKey]);
  }

  const values = requireValues("Cosmos DB", requiredEntries);
  const base = {
    endpoint: values.COSMOS_DB_ENDPOINT,
    databaseName: values.COSMOS_DB_NAME,
  };

  if (env.azureUseManagedIdentity) {
    return { ...base, authMode: "managed-identity" };
  }

  return { ...base, authMode: "key", key: values.COSMOS_DB_KEY };
}

export function getBlobConfig(
  env: ServerEnv = parseServerEnv(process.env),
): BlobConfig {
  const requiredEntries: Array<readonly [string, string | undefined]> = [
    ["BLOB_ACCOUNT_NAME", env.blobAccountName],
  ];

  if (!env.azureUseManagedIdentity) {
    requiredEntries.push(["BLOB_ACCOUNT_KEY", env.blobAccountKey]);
  }

  const values = requireValues("Blob Storage", requiredEntries);
  const accountName = values.BLOB_ACCOUNT_NAME;
  const base = {
    accountName,
    serviceUrl: `https://${accountName}.blob.core.windows.net`,
  };

  if (env.azureUseManagedIdentity) {
    return { ...base, authMode: "managed-identity" };
  }

  return {
    ...base,
    authMode: "shared-key",
    accountKey: values.BLOB_ACCOUNT_KEY,
  };
}
