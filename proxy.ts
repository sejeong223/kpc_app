import 'server-only';

import { NextFetchEvent, NextResponse } from 'next/server';
import withAuth, { NextRequestWithAuth } from 'next-auth/middleware';
import { AUTH_TOKEN_VERSION } from './const/auth';

const IFRAME_ALLOWED_DOMAINS = [
  'https://login.microsoftonline.com',
  '*.cloud.microsoft',
  'teams.microsoft.com',
  '*.teams.microsoft.com',
  '*.microsoft365.com',
  '*.office.com',
  'outlook.office.com',
  'outlook.office365.com',
  'outlook-sdf.office.com',
  'outlook-sdf.office365.com',
];

let cookies = {};

if (process.env.DARUDA_ENABLE_CROSS_SITE_COOKIE) {
  cookies = {
    sessionToken: {
      name: '__Secure-next-auth.session-token',
    },
  };
}

function getFormattedTimestamp(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} ${hh}:${min}:${ss}`;
}

async function proxy(request: NextRequestWithAuth, event: NextFetchEvent) {
  const timestamp = getFormattedTimestamp();
  console.log(
    `${timestamp} [${request.headers.get('host')}] ${request.method} ${request.nextUrl.pathname}`
  );

  if (request.method !== 'GET') {
    return NextResponse.next();
  }
  let response = null;

  if (!request.nextUrl.pathname.startsWith('/auth')) {
    response = await authMiddleware(request, event);
  }

  if (!response) {
    response = NextResponse.next();
  }

  response.headers.append(
    'Content-Security-Policy',
    `frame-ancestors 'self' ${[
      ...IFRAME_ALLOWED_DOMAINS,
      ...(process.env.IFRAME_ALLOWED_DOMAINS ?? '').split(','),
    ].join(' ')};`,
  );

  return response;
}

const authMiddleware = withAuth(
  async (req: NextRequestWithAuth) => {
    if (req.method !== 'GET') {
      return NextResponse.next();
    }

    if (
      req.nextauth.token &&
      req.nextauth.token.version !== AUTH_TOKEN_VERSION
    ) {
      return NextResponse.redirect(new URL('/auth/logout', req.url));
    }


    const path = req.nextUrl.pathname;
    const normalized = path === '/' ? '/' : path.replace(/\/$/, ''); // pathname 마지막 '/' 제거
    let nextUrl = normalized;

    // '/'로 접근 시
    if (req.nextauth.token && ['/'].includes(nextUrl)) {
      nextUrl = '/document-translation'
      return NextResponse.redirect(new URL(nextUrl, req.url));
    }
  },
  {
    pages: {
      signIn: '/auth/login',
    },
    cookies: cookies,
  }
);

export const config = {
  runtime: 'nodejs',
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|raccoon.png|M365.png|file.svg|globe.svg|vercel.svg|window.svg|error_ico.svg).*)',
  ],
};

export default proxy;
