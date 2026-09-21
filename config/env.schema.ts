import { z } from "zod";

export type NodeEnvironment = "development" | "test" | "production";

export interface ServerEnv {
  nodeEnv: NodeEnvironment;
  appEnv: string;
  authEnabled: boolean;
  embeddedMode: boolean;
  authCacheNamespace: string;
  nextAuthUrl?: string;
  nextAuthSecret?: string;
  msalTenantId?: string;
  msalClientId?: string;
  msalClientSecret?: string;
  msalCertPfx?: string;
  msalCertPassword?: string;
  redisUrl?: string;
  redisClusterMode: boolean;
  azureUseManagedIdentity: boolean;
  cosmosDbEndpoint?: string;
  cosmosDbKey?: string;
  cosmosDbName?: string;
  blobAccountName?: string;
  blobAccountKey?: string;
  iframeAllowedDomains: string[];
}

const nonBlankString = z.string().refine((value) => value.trim().length > 0);

const optionalNonBlankString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  nonBlankString.optional(),
);

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.url().optional(),
);

function booleanFromEnv(defaultValue: boolean) {
  return z.preprocess((value) => {
    if (value === undefined) {
      return defaultValue;
    }

    if (typeof value === "string") {
      const normalized = value.toLowerCase();

      if (normalized === "true") {
        return true;
      }

      if (normalized === "false") {
        return false;
      }
    }

    return value;
  }, z.boolean());
}

const hostnameLabel = "[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?";
const iframeSourcePattern = new RegExp(
  `^https://(?:\\*\\.)?${hostnameLabel}(?:\\.${hostnameLabel})*$`,
  "i",
);

const iframeAllowedDomains = z.preprocess(
  (value) => {
    if (value === undefined || value === "") {
      return [];
    }

    if (typeof value !== "string") {
      return value;
    }

    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  },
  z.array(z.string().regex(iframeSourcePattern)),
);

const rawServerEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    APP_ENV: z.preprocess(
      (value) => (value === undefined ? "local" : value),
      nonBlankString,
    ),
    AUTH_ENABLED: booleanFromEnv(false),
    EMBEDDED_MODE: booleanFromEnv(false),
    AUTH_CACHE_NAMESPACE: z.preprocess(
      (value) => (value === undefined ? "kpc_app" : value),
      nonBlankString,
    ),
    NEXTAUTH_URL: optionalUrl,
    NEXTAUTH_SECRET: optionalNonBlankString,
    MSAL_TENANT_ID: optionalNonBlankString,
    MSAL_CLIENT_ID: optionalNonBlankString,
    MSAL_CLIENT_SECRET: optionalNonBlankString,
    MSAL_CERT_PFX: optionalNonBlankString,
    MSAL_CERT_PASSWORD: optionalNonBlankString,
    REDIS_URL: optionalUrl,
    REDIS_CLUSTER_MODE: booleanFromEnv(false),
    AZURE_USE_MANAGED_IDENTITY: booleanFromEnv(false),
    COSMOS_DB_ENDPOINT: optionalUrl,
    COSMOS_DB_KEY: optionalNonBlankString,
    COSMOS_DB_NAME: optionalNonBlankString,
    BLOB_ACCOUNT_NAME: optionalNonBlankString,
    BLOB_ACCOUNT_KEY: optionalNonBlankString,
    IFRAME_ALLOWED_DOMAINS: iframeAllowedDomains,
  })
  .superRefine((env, context) => {
    const addIssue = (key: keyof NodeJS.ProcessEnv) => {
      context.addIssue({
        code: "custom",
        path: [key],
        message: "Invalid environment configuration",
      });
    };

    if (env.AUTH_ENABLED) {
      const requiredAuthFields = [
        ["NEXTAUTH_URL", env.NEXTAUTH_URL],
        ["NEXTAUTH_SECRET", env.NEXTAUTH_SECRET],
        ["MSAL_TENANT_ID", env.MSAL_TENANT_ID],
        ["MSAL_CLIENT_ID", env.MSAL_CLIENT_ID],
      ] as const;

      for (const [key, value] of requiredAuthFields) {
        if (value === undefined) {
          addIssue(key);
        }
      }

      const hasCertificate = env.MSAL_CERT_PFX !== undefined;
      const hasClientSecret = env.MSAL_CLIENT_SECRET !== undefined;

      if (hasCertificate === hasClientSecret) {
        addIssue("MSAL_CERT_PFX");
        addIssue("MSAL_CLIENT_SECRET");
      }

      if (env.NODE_ENV === "production" && env.REDIS_URL === undefined) {
        addIssue("REDIS_URL");
      }
    }

    if (env.EMBEDDED_MODE && !env.AUTH_ENABLED) {
      addIssue("EMBEDDED_MODE");
      addIssue("AUTH_ENABLED");
    }
  });

function environmentError(issues: z.core.$ZodIssue[]): Error {
  const keys = [
    ...new Set(
      issues.map((issue) => {
        const [key] = issue.path;
        return typeof key === "string" ? key : "environment";
      }),
    ),
  ];

  return new Error(`Invalid environment configuration: ${keys.join(", ")}`);
}

export function parseServerEnv(source: NodeJS.ProcessEnv): ServerEnv {
  const result = rawServerEnvSchema.safeParse(source);

  if (!result.success) {
    throw environmentError(result.error.issues);
  }

  const env = result.data;

  return {
    nodeEnv: env.NODE_ENV,
    appEnv: env.APP_ENV,
    authEnabled: env.AUTH_ENABLED,
    embeddedMode: env.EMBEDDED_MODE,
    authCacheNamespace: env.AUTH_CACHE_NAMESPACE,
    nextAuthUrl: env.NEXTAUTH_URL,
    nextAuthSecret: env.NEXTAUTH_SECRET,
    msalTenantId: env.MSAL_TENANT_ID,
    msalClientId: env.MSAL_CLIENT_ID,
    msalClientSecret: env.MSAL_CLIENT_SECRET,
    msalCertPfx: env.MSAL_CERT_PFX,
    msalCertPassword: env.MSAL_CERT_PASSWORD,
    redisUrl: env.REDIS_URL,
    redisClusterMode: env.REDIS_CLUSTER_MODE,
    azureUseManagedIdentity: env.AZURE_USE_MANAGED_IDENTITY,
    cosmosDbEndpoint: env.COSMOS_DB_ENDPOINT,
    cosmosDbKey: env.COSMOS_DB_KEY,
    cosmosDbName: env.COSMOS_DB_NAME,
    blobAccountName: env.BLOB_ACCOUNT_NAME,
    blobAccountKey: env.BLOB_ACCOUNT_KEY,
    iframeAllowedDomains: env.IFRAME_ALLOWED_DOMAINS,
  };
}
