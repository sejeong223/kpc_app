import type { Metadata } from "next";

import { appConfig } from "@/config/app";
import { serverEnv } from "@/config/env";
import Providers from "@/components/providers";
import AuthService from "@/services/AuthService";

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
      <body>
        <Providers authEnabled={authEnabled} session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
