import "server-only";

import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import withAuth, { type NextRequestWithAuth } from "next-auth/middleware";

import { serverEnv } from "./config/env";
import { AUTH_TOKEN_VERSION } from "./const/auth";
import {
  buildFrameAncestors,
  shouldApplyAuthentication,
} from "./lib/auth/proxy-policy";

const authMiddleware = serverEnv.authEnabled
  ? withAuth(
      (request: NextRequestWithAuth) => {
        const token = request.nextauth.token;

        if (
          token &&
          (token.version !== AUTH_TOKEN_VERSION ||
            token.error === "RefreshAccessTokenError")
        ) {
          return NextResponse.redirect(new URL("/auth/logout", request.url));
        }

        return NextResponse.next();
      },
      {
        pages: { signIn: "/auth/login" },
        cookies: serverEnv.embeddedMode
          ? {
              sessionToken: {
                name: "__Secure-next-auth.session-token",
              },
            }
          : undefined,
      },
    )
  : null;

export default async function proxy(
  request: NextRequest,
  event: NextFetchEvent,
): Promise<Response> {
  let response: Response | undefined;

  if (
    authMiddleware &&
    shouldApplyAuthentication({
      authEnabled: serverEnv.authEnabled,
      pathname: request.nextUrl.pathname,
    })
  ) {
    const middlewareResponse = await authMiddleware(
      request as NextRequestWithAuth,
      event,
    );

    if (middlewareResponse instanceof Response) {
      response = middlewareResponse;
    }
  }

  response ??= NextResponse.next();

  if (!response.headers.has("Content-Security-Policy")) {
    response.headers.set(
      "Content-Security-Policy",
      buildFrameAncestors({
        embeddedMode: serverEnv.embeddedMode,
        additionalDomains: serverEnv.iframeAllowedDomains,
      }),
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api(?:/|$)|_next/static|_next/image|favicon.ico).*)",
  ],
};
