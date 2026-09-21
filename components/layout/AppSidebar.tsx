"use client";

import { useState, type ComponentType } from "react";
import type { Session } from "next-auth";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  PanelsTopLeft,
  ShieldCheck,
  User,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  appConfig,
  getVisibleNavigation,
  type NavigationIcon,
  type NavigationItem,
} from "@/config/app";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  authEnabled: boolean;
  session: Session | null;
}

const navigationIcons: Record<
  NavigationIcon,
  ComponentType<{ className?: string }>
> = {
  dashboard: LayoutDashboard,
  admin: ShieldCheck,
};

function isNavigationActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppSidebar({
  authEnabled,
  session,
}: AppSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const navigation = getVisibleNavigation(appConfig.navigation, {
    authEnabled,
    authenticated: session !== null,
    roles: session?.user.roles,
  });

  const renderNavigationItem = (item: NavigationItem) => {
    const Icon = navigationIcons[item.icon];
    const isActive = isNavigationActive(pathname, item.href);
    const link = (
      <Link
        href={item.href}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
        aria-current={isActive ? "page" : undefined}
      >
        <Icon className="size-5 shrink-0" />
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );

    if (!isCollapsed) {
      return <div key={item.id}>{link}</div>;
    }

    return (
      <Tooltip key={item.id}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  };

  const logoutButton = (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      aria-label="로그아웃"
      onClick={() => void signOut({ callbackUrl: "/", redirect: true })}
    >
      <LogOut className="size-5" />
    </Button>
  );

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "relative z-20 flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm transition-[width] duration-300",
          isCollapsed ? "w-20" : "w-64",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="rounded-lg bg-sidebar-primary p-1.5 text-sidebar-primary-foreground">
              <PanelsTopLeft className="size-5" />
            </div>
            {!isCollapsed && (
              <span className="truncate text-lg font-semibold tracking-tight">
                {appConfig.name}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={isCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
            onClick={() => setIsCollapsed((current) => !current)}
          >
            {isCollapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </Button>
        </div>

        <ScrollArea className="flex-1 px-3">
          <nav aria-label="주요 메뉴" className="space-y-1 py-5">
            {navigation.map(renderNavigationItem)}
          </nav>
        </ScrollArea>

        {authEnabled && session && (
          <div
            className={cn(
              "shrink-0 border-t border-sidebar-border p-3",
              isCollapsed ? "space-y-2" : "flex items-center gap-3",
            )}
          >
            <Avatar className="size-10 shrink-0">
              <AvatarImage src="/api/profile-image" alt="" />
              <AvatarFallback>
                <User className="size-5" />
              </AvatarFallback>
            </Avatar>

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {session.user.name ?? "사용자"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {session.user.upn}
                </p>
              </div>
            )}

            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>{logoutButton}</TooltipTrigger>
                <TooltipContent side="right">로그아웃</TooltipContent>
              </Tooltip>
            ) : (
              logoutButton
            )}
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
