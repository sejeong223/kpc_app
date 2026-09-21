import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppSidebar from "@/components/layout/AppSidebar";
import { Toaster } from "@/components/ui/sonner";
import AuthService from "@/services/AuthService";
import Providers from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DARUDA",
  description: "문서 번역 서비스",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authService = new AuthService();
  const session = await authService.getSession();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50`}
      >
        <Providers session={session}>
          <Toaster />
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <AppSidebar />

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto transition-all duration-300">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
