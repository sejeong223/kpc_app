import type { Metadata } from "next";

import { appConfig } from "@/config/app";
import { serverEnv } from "@/config/env";
import Providers from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import AuthService from "@/services/AuthService";

import "./globals.css";

export const metadata: Metadata = {
  title: appConfig.name,
  description: appConfig.description,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authEnabled = serverEnv.authEnabled;
  const session = authEnabled ? await new AuthService().getSession() : null;

  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-[#F8F9FA] text-[#111111] antialiased selection:bg-[#E60012]/15 selection:text-[#E60012]">
        <Providers authEnabled={authEnabled} session={session}>
          <Toaster />
          {children}
        </Providers>
      </body>
    </html>
  );
}
