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
      <body className="bg-background text-foreground antialiased">
        <Providers authEnabled={authEnabled} session={session}>
          <Toaster />
          {children}
        </Providers>
      </body>
    </html>
  );
}
