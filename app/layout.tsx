import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { appConfig } from "@/config/app";
import { serverEnv } from "@/config/env";
import AppShell from "@/components/layout/AppShell";
import Providers from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import AuthService from "@/services/AuthService";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased`}
      >
        <Providers authEnabled={authEnabled} session={session}>
          <Toaster />
          <AppShell authEnabled={authEnabled} session={session}>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
