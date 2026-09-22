"use client";

import type { Session } from "next-auth";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Menu, Settings, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  appConfig,
  getVisibleNavigation,
  type HeaderNavigationItem,
} from "@/config/app";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  authEnabled: boolean;
  session: Session | null;
}

function isNavigationActive(pathname: string, item: HeaderNavigationItem): boolean {
  if (!item.href) {
    return false;
  }

  if (item.href === "/") {
    return pathname === "/";
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function AppHeader({
  authEnabled,
  session,
}: AppHeaderProps): React.ReactElement {
  const pathname = usePathname();
  const profileNavigation = getVisibleNavigation(appConfig.profileNavigation, {
    authEnabled,
    authenticated: session !== null,
    roles: session?.user.roles,
  });
  const adminItem = profileNavigation.find((item) => item.id === "admin");
  const displayName = session?.user.name ?? (authEnabled ? "사용자" : "정소담");
  const displayDetail = session?.user.upn ?? (authEnabled ? "로그인이 필요합니다" : "AI사업본부");
  const displayRole = session?.user.roles.join(", ") || (authEnabled ? "일반 사용자" : "목업 사용자");

  return (
    <header className="fixed top-0 z-40 h-14 w-full border-b border-black/10 bg-white">
      <div className="mx-auto flex h-full w-full max-w-[1920px] items-center px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="KPC AI 홈">
          <span className="flex size-8 items-center justify-center rounded-sm bg-kpc-red text-[10px] font-black tracking-[-0.08em] text-white">
            KPC
          </span>
          <span className="text-[17px] font-bold tracking-tight text-[#171717]">KPC AI</span>
          <span className="hidden rounded-full bg-[#F2F3F5] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#666] sm:inline">
            Enterprise
          </span>
        </Link>

        <nav
          aria-label="KPC AI 주요 메뉴: Knowledge AI, AI Worker, 제안서 AI, Custom AI, AI Agent, AI Community"
          className="ml-auto hidden h-full items-stretch md:flex"
        >
          {appConfig.headerNavigation.map((item) => {
            const isActive = isNavigationActive(pathname, item);
            const className = cn(
              "relative flex h-full items-center px-3.5 text-[13px] font-medium whitespace-nowrap text-[#565656] transition-colors hover:text-[#151515]",
              isActive && "font-semibold text-[#151515]",
            );

            if (item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={className}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute inset-x-3.5 bottom-0 h-[2.5px] bg-kpc-red" />
                  )}
                </Link>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                className={className}
                onClick={() => toast.info("준비 중인 목업 메뉴입니다.")}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <details className="group relative ml-auto md:hidden">
          <summary className="flex size-9 list-none items-center justify-center rounded-md hover:bg-[#F5F5F5] focus-visible:ring-2 focus-visible:ring-kpc-red/30 [&::-webkit-details-marker]:hidden" aria-label="주요 메뉴 열기">
            <Menu className="size-5" />
          </summary>
          <nav aria-label="모바일 KPC AI 주요 메뉴" className="absolute right-0 top-11 w-52 rounded-md border bg-white p-2 shadow-lg">
            {appConfig.headerNavigation.map((item) => item.href ? <Link key={item.id} href={item.href} aria-current={isNavigationActive(pathname, item) ? "page" : undefined} className={cn("block rounded-md px-3 py-2 text-sm", isNavigationActive(pathname, item) ? "bg-[#FFF1F2] font-semibold text-kpc-red" : "hover:bg-[#F5F5F5]")}>{item.label}</Link> : <button key={item.id} type="button" className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#F5F5F5]" onClick={() => toast.info("준비 중인 목업 메뉴입니다.")}>{item.label}</button>)}
          </nav>
        </details>

        <details className="group relative ml-2 md:ml-3">
          <summary className="flex h-9 list-none items-center gap-2 rounded-full px-1.5 outline-none transition-colors hover:bg-[#F5F5F5] focus-visible:ring-2 focus-visible:ring-kpc-red/30 [&::-webkit-details-marker]:hidden">
            <Avatar className="size-8 border border-black/10">
              {authEnabled && session && <AvatarImage src="/api/profile-image" alt="" />}
              <AvatarFallback className="bg-[#F1F2F4] text-xs font-semibold text-[#555]">
                {displayName.slice(0, 1)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-24 truncate text-xs font-medium text-[#333] xl:block">
              {displayName}
            </span>
            <ChevronDown className="size-3.5 text-[#777] transition-transform group-open:rotate-180" />
          </summary>

          <div className="absolute right-0 top-11 w-64 overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_16px_50px_rgba(0,0,0,0.14)]">
            <div className="border-b border-black/8 px-4 py-3.5">
              <p className="truncate text-sm font-semibold text-[#222]">{displayName}</p>
              <p className="mt-0.5 truncate text-xs text-[#777]">{displayDetail}</p>
              <p className="mt-2 inline-flex rounded-full bg-[#F4F4F5] px-2 py-0.5 text-[11px] font-medium text-[#555]">
                {displayRole}
              </p>
            </div>

            <div className="p-1.5 text-sm">
              {adminItem?.href && (
                <Link
                  href={adminItem.href}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[#444] hover:bg-[#F5F5F5]"
                >
                  <ShieldCheck className="size-4" />
                  {adminItem.label}
                </Link>
              )}
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[#444] hover:bg-[#F5F5F5]"
                onClick={() => toast.info("프로필 설정은 준비 중입니다.")}
              >
                <Settings className="size-4" />
                프로필 설정
              </button>
              {authEnabled && session ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[#444] hover:bg-[#FFF1F2] hover:text-kpc-red"
                  onClick={() => void signOut({ callbackUrl: "/", redirect: true })}
                >
                  <LogOut className="size-4" />
                  로그아웃
                </button>
              ) : authEnabled ? (
                <Link
                  href="/auth/login"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[#444] hover:bg-[#F5F5F5]"
                >
                  <User className="size-4" />
                  로그인
                </Link>
              ) : null}
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
