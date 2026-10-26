import "server-only";

import { getServerSession, type NextAuthOptions, type Session } from "next-auth";
import type { OAuthConfig } from "next-auth/providers/index";

import { serverEnv } from "@/config/env";
import type { ServerEnv } from "@/config/env.schema";
import { AUTH_TOKEN_VERSION } from "@/const/auth";
import {
  createGraphTokenCredential,
  createMsalClient,
} from "@/lib/auth/credentials";
import { AppConfigurationError } from "@/lib/auth/errors";
import { MsalCachePlugin } from "@/lib/auth/msal-cache-plugin";
import { normalizeRoles, type AppRole } from "@/lib/auth/roles";
import {
  buildSessionCacheKey,
  getSessionCache,
  type SessionCache,
} from "@/lib/auth/session-cache";

import MSGraphService from "./MSGraphService";

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 90;
const REFRESH_BUFFER_SECONDS = 60 * 15;

export interface EntraIDProfile extends Record<string, unknown> {
  sub: string;
  oid?: string;
  name?: string;
  email?: string;
  roles?: unknown;
}

export interface CurrentUser {
  name: string | null;
  oid: string;
  upn: string;
  roles: AppRole[];
}

interface AuthServiceOptions {
  env?: ServerEnv;
  graphService?: MSGraphService;
  sessionCache?: SessionCache;
}

export default class AuthService {
  private readonly env: ServerEnv;
  private graphService?: MSGraphService;
  private sessionCache?: SessionCache;

  constructor(options: AuthServiceOptions = {}) {
    this.env = options.env ?? serverEnv;
    this.graphService = options.graphService;
    this.sessionCache = options.sessionCache;
  }

  isEnabled(): boolean {
    return this.env.authEnabled;
  }

  async getNextAuthOptions(): Promise<NextAuthOptions> {
    if (!this.isEnabled()) {
      throw new AppConfigurationError(
        "AUTH_ENABLED must be true to build NextAuth options",
      );
    }

    const graphClient = this.getGraphService().getMSGraphClient();

    return {
      secret: this.env.nextAuthSecret,
      session: { strategy: "jwt" },
      cookies: this.getEmbeddedCookies(),
      providers: [this.getNextAuthEntraIdProvider()],
      callbacks: {
        jwt: async ({ token, account, profile }) => {
          if (account) {
            token.access_token = account.access_token;
            token.expires_at = account.expires_at;
          }

          if (profile) {
            token.oid = profile.oid;
            token.roles = normalizeRoles(profile.roles);

            if (!token.oid) {
              throw new AppConfigurationError(
                "OID claim is required for authenticated users",
              );
            }

            const graphUser = await graphClient
              .api(`/users/${token.oid}`)
              .get();

            if (!graphUser?.userPrincipalName) {
              throw new AppConfigurationError(
                "Microsoft Graph userPrincipalName is required",
              );
            }

            token.upn = graphUser.userPrincipalName;
          }

          token.version ??= AUTH_TOKEN_VERSION;

          if (this.shouldRefresh(token.expires_at)) {
            try {
              if (!token.oid) {
                throw new AppConfigurationError(
                  "OID claim is required for token refresh",
                );
              }

              const msalClient = this.getMsalClient(token.oid);
              const accountInfo = await msalClient
                .getTokenCache()
                .getAccountByLocalId(token.oid);

              if (!accountInfo) {
                throw new AppConfigurationError(
                  "MSAL account cache is unavailable",
                );
              }

              const refreshed = await msalClient.acquireTokenSilent({
                scopes: this.getAuthScopes(["User.Read"]),
                account: accountInfo,
                forceRefresh: true,
              });

              token.access_token = refreshed.accessToken;
              token.expires_at = refreshed.expiresOn
                ? refreshed.expiresOn.getTime() / 1000
                : token.expires_at;
              token.error = undefined;
            } catch {
              token.error = "RefreshAccessTokenError";
            }
          }

          return token;
        },
        session: async ({ session, token }) => {
          session.user.access_token = token.access_token;
          session.user.oid = token.oid;
          session.user.upn = token.upn;
          session.user.roles = normalizeRoles(token.roles);
          session.error = token.error;
          return session;
        },
      },
      pages: { signIn: "/auth/login" },
    };
  }

  async getSession(): Promise<Session | null> {
    if (!this.isEnabled()) {
      return null;
    }

    return getServerSession(await this.getNextAuthOptions());
  }

  async getCurrentUser(): Promise<CurrentUser | null> {
    const session = await this.getSession();

    if (!session?.user.oid || !session.user.upn) {
      return null;
    }

    return {
      name: session.user.name ?? null,
      oid: session.user.oid,
      upn: session.user.upn,
      roles: normalizeRoles(session.user.roles),
    };
  }

  getAuthScopes(extraScopes: readonly string[] = []): string[] {
    return [
      ...new Set([
        "offline_access",
        "openid",
        "profile",
        "email",
        ...extraScopes,
      ]),
    ];
  }

  private getGraphService(): MSGraphService {
    this.graphService ??= new MSGraphService(
      createGraphTokenCredential(this.env),
    );
    return this.graphService;
  }

  private getCache(): SessionCache {
    this.sessionCache ??= getSessionCache(this.env);
    return this.sessionCache;
  }

  private getMsalClient(accountId?: string) {
    const cachePlugin = accountId
      ? new MsalCachePlugin({
          cache: this.getCache(),
          cacheKey: buildSessionCacheKey({
            namespace: this.env.authCacheNamespace,
            appEnv: this.env.appEnv,
            accountId,
          }),
        })
      : undefined;

    return createMsalClient({ env: this.env, cachePlugin });
  }

  private getNextAuthEntraIdProvider<P extends EntraIDProfile>(): OAuthConfig<P> {
    const tenantId = this.env.msalTenantId;
    const clientId = this.env.msalClientId;

    if (!tenantId || !clientId) {
      throw new AppConfigurationError(
        "MSAL_TENANT_ID and MSAL_CLIENT_ID are required",
      );
    }

    const scopes = this.getAuthScopes(["User.Read"]);

    return {
      id: "azure-ad",
      name: "Microsoft Entra ID",
      type: "oauth",
      wellKnown: `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration?appid=${clientId}`,
      authorization: { params: { scope: scopes.join(" ") } },
      token: {
        request: async (context) => {
          const msalClient = this.getMsalClient();
          const result = await msalClient.acquireTokenByCode({
            code: context.params.code as string,
            scopes,
            redirectUri: context.provider.callbackUrl,
          });
          const accountId = result.account?.localAccountId;

          if (accountId) {
            await this.getCache().set(
              buildSessionCacheKey({
                namespace: this.env.authCacheNamespace,
                appEnv: this.env.appEnv,
                accountId,
              }),
              msalClient.getTokenCache().serialize(),
              CACHE_TTL_SECONDS,
            );
          }

          return {
            tokens: {
              token_type: result.tokenType,
              id_token: result.idToken,
              access_token: result.accessToken,
              scope: result.scopes.join(" "),
              expires_at: (result.expiresOn?.getTime() ?? 0) / 1000,
              session_state: result.state,
            },
          };
        },
      },
      profile: (profile) => ({
        id: profile.sub,
        name: profile.name,
        email: profile.email,
      }),
      clientId,
      clientSecret: this.env.msalClientSecret ?? "",
    };
  }

  private getEmbeddedCookies(): NextAuthOptions["cookies"] | undefined {
    if (!this.env.embeddedMode) {
      return undefined;
    }

    const sharedOptions = {
      sameSite: "none" as const,
      path: "/",
      secure: true,
    };

    return {
      sessionToken: {
        name: "__Secure-next-auth.session-token",
        options: { ...sharedOptions, httpOnly: true },
      },
      callbackUrl: {
        name: "__Secure-next-auth.callback-url",
        options: sharedOptions,
      },
      csrfToken: {
        name: "__Host-next-auth.csrf-token",
        options: { ...sharedOptions, httpOnly: true },
      },
      state: {
        name: `${this.env.authCacheNamespace}-next-auth.state`,
        options: {
          ...sharedOptions,
          httpOnly: true,
          maxAge: 900,
        },
      },
    };
  }

  private shouldRefresh(expiresAt: number | undefined): boolean {
    if (!expiresAt) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    return expiresAt - REFRESH_BUFFER_SECONDS <= now;
  }
}
