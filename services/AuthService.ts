import 'server-only';

import {
  AccountInfo,
} from '@azure/msal-node';
import { NextAuthOptions, getServerSession } from 'next-auth';
import type { OAuthConfig } from 'next-auth/providers/index';

import MSGraphService from './MSGraphService';
import { AUTH_TOKEN_VERSION } from '@/const/auth';
import { serverEnv } from '@/config/env';
import { createMsalClient } from '@/lib/auth/credentials';
import { MsalCachePlugin } from '@/lib/auth/msal-cache-plugin';
import {
  buildSessionCacheKey,
  getSessionCache,
} from '@/lib/auth/session-cache';

export interface EntraIDProfile extends Record<string, any> {
  sub: string;
  nickname: string;
  email: string;
  picture: string;
  oid: string;
  account: AccountInfo;
}

export default class AuthService {
  msGraphService: MSGraphService;

  constructor() {
    this.msGraphService = new MSGraphService();
  }

  async getNextAuthOptions() {
    const client = await this.msGraphService.getMSGraphClient();

    let cookies = undefined;

    if (process.env.DARUDA_ENABLE_CROSS_SITE_COOKIE) {
      cookies = {
        sessionToken: {
          name: `__Secure-next-auth.session-token`,
          options: {
            httpOnly: true,
            sameSite: 'None',
            path: '/',
            secure: true,
          },
        },
        callbackUrl: {
          name: `__Secure-next-auth.callback-url`,
          options: {
            sameSite: 'None',
            path: '/',
            secure: true,
          },
        },
        csrfToken: {
          name: `__Host-next-auth.csrf-token`,
          options: {
            httpOnly: true,
            sameSite: 'None',
            path: '/',
            secure: true,
          },
        },
        state: {
          name: `daruda-next-auth.state`,
          options: {
            httpOnly: true,
            sameSite: 'None',
            path: '/',
            secure: true,
            maxAge: 900,
          },
        },
      };
    }

    const options: NextAuthOptions = {
      secret: process.env.NEXTAUTH_SECRET,
      session: {
        strategy: 'jwt',
      },
      cookies: cookies,
      // Configure one or more authentication providers
      providers: [await this.getNextAuthEntraIDProvider()],
      callbacks: {
        jwt: async ({ token, account, profile }) => {
          if (account) {
            token.access_token = account.access_token;
            token.expires_at = account.expires_at;
          }

          if (profile) {
            token.oid = profile.oid;
            token.roles = profile.roles ?? [];
            const user = await client.api(`/users/${token.oid}`).get();
            token.upn = user.userPrincipalName;
            token.roles = [...token.roles]
          }

          if (!token.version) {
            token.version = AUTH_TOKEN_VERSION;
          }

          const now = Math.floor(Date.now() / 1000);

          const bufferSeconds = 60 * 15;

          // 토큰 만료 시점 느슨하게
          if (token.expires_at && token.expires_at - bufferSeconds <= now) {
            try {
              if (!token.oid) {
                throw new Error('Broken session?');
              }

              const msalClient = await this.getMSALClient({
                appEnv: serverEnv.appEnv,
                accountId: token.oid,
              });

              const accountInfo = await msalClient
                .getTokenCache()
                .getAccountByLocalId(token.oid);

              if (!accountInfo) {
                throw new Error(
                  'Account Cache not found in cache, please log in again.',
                );
              }

              const scopes = await this.getAuthScopes([
                'User.Read',
              ]);

              const acquiredToken = await msalClient.acquireTokenSilent({
                scopes: scopes,
                account: accountInfo,
                forceRefresh: true,
              });

              token.access_token = acquiredToken.accessToken;

              if (acquiredToken.expiresOn) {
                token.expires_at = acquiredToken.expiresOn.getTime() / 1000;
              }
            } catch (e) {
              console.error(e);
              throw new Error('Please log in again.');
            }
          }

          return token;
        },
        async session({ session, token }) {
          session.user.access_token = token.access_token;
          session.user.oid = token.oid;
          session.user.upn = token.upn;
          session.user.roles = token.roles;
          return session;
        },
      },
      pages: {
        signIn: '/auth/login',
      },
    };

    return options;
  }

  async getSession() {
    const session = await getServerSession(await this.getNextAuthOptions());
    return session;
  }

  async getCurrentUser() {
    const session = await this.getSession();
    if (session?.user && session?.user?.name && session?.user?.oid && session?.user?.upn) {
      return {
        name: session.user.name,
        oid: session.user.oid,
        upn: session.user.upn,
        roles: session.user.roles ?? []
      }
    }
  }

  async getMSALClient(cacheOption?: CacheOption) {
    let cachePlugin = undefined;

    if (cacheOption) {
      cachePlugin = new MsalCachePlugin({
        cache: getSessionCache(),
        cacheKey: buildSessionCacheKey({
          namespace: serverEnv.authCacheNamespace,
          appEnv: cacheOption.appEnv,
          accountId: cacheOption.accountId,
        }),
      });
    }

    return createMsalClient({ cachePlugin });
  }

  async getAuthScopes(etcScopes: string[]) {
    const scopes = [
      'offline_access',
      'openid',
      'profile',
      'email',
      ...etcScopes,
    ];
    return scopes;
  }

  async getNextAuthEntraIDProvider<P extends EntraIDProfile>() {
    const scopes = await this.getAuthScopes([
      'User.Read',
    ]);

    const tenant = process.env.MSAL_TENANT_ID ?? 'common';

    const provider: OAuthConfig<P> = {
      id: 'azure-ad',
      name: 'Azure Active Directory',
      type: 'oauth',
      wellKnown: `https://login.microsoftonline.com/${tenant}/v2.0/.well-known/openid-configuration?appid=${process.env.MSAL_CLIENT_ID}`,
      authorization: {
        params: {
          scope: scopes.join(' '),
        },
      },
      token: {
        request: async (context) => {
          const cca = await this.getMSALClient();

          const r = await cca.acquireTokenByCode({
            code: context.params.code as string,
            scopes: scopes,
            redirectUri: context.provider.callbackUrl,
          });

          const oid = r.account?.localAccountId;

          if (oid && r.expiresOn) {
            const option = {
              appEnv: serverEnv.appEnv,
              accountId: oid,
            }

            const clientForCache = await this.getMSALClient(option);
            const cache = cca.getTokenCache().serialize()
            clientForCache.getTokenCache().deserialize(cache);
            const sessionCache = getSessionCache();
            const cacheKey = buildSessionCacheKey({
              namespace: serverEnv.authCacheNamespace,
              ...option,
            });
            if (!await sessionCache.get(cacheKey)) {
              await sessionCache.set(cacheKey, cache, 60 * 60 * 24 * 90);
            }
            await clientForCache.getTokenCache().getAllAccounts();
          }

          return {
            tokens: {
              token_type: r.tokenType,
              id_token: r.idToken,
              access_token: r.accessToken,
              scope: r.scopes.join(' '),
              expires_at: (r.expiresOn?.getTime() ?? 0) / 1000,
              session_state: r.state,
            },
          };
        },
      },
      profile: async (profile) => {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
        };
      },
      style: { logo: '/azure.svg', text: '#fff', bg: '#0072c6' },
      clientId: process.env.MSAL_CLIENT_ID,
      clientSecret: '',
    };

    return provider;
  }
}

interface CacheOption {
  appEnv: string;
  accountId: string;
}
