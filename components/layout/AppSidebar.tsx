"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  LogOut,
  Languages,
  User as UserIcon,
  Type,
  History,
  Settings,
  BookOpen,
  ShieldCheck,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "next-auth/react";

export default function AppSidebar() {
  const { data: session } = useSession();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const isVisible = useMemo(() => {
    return !pathname.startsWith('/auth');
  }, [pathname]);

  if (!isVisible) return null;

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const menuItems = [
    {
      name: "문서 파일 번역",
      href: "/document-translation",
      icon: FileText,
    },
    {
      name: "텍스트 번역",
      href: "/text-translation",
      icon: Type,
    },
    {
      name: "번역 기록 조회",
      href: "/translation-history",
      icon: History,
    },
  ];

  const adminMenuItems = [
    {
      name: "일반",
      href: "/admin/general",
      icon: Settings,
    },
    {
      name: "용어집",
      href: "/admin/glossary",
      icon: BookOpen,
    },
    {
      name: "권한 관리",
      href: "/admin/permissions",
      icon: ShieldCheck,
    },
  ];

  const renderMenuItem = (item: any) => {
    const isActive = pathname.startsWith(item.href);
    const content = (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative",
          isActive
            ? "bg-sky-50 text-sky-600 shadow-sm"
            : "text-slate-500 hover:bg-sky-50/50 hover:text-sky-500"
        )}
      >
        <item.icon className={cn(
          "w-5 h-5 shrink-0 transition-colors",
          isActive ? "text-sky-600" : "text-slate-400 group-hover:text-sky-500"
        )} />

        {!isCollapsed && (
          <span className="font-medium whitespace-nowrap overflow-hidden">
            {item.name}
          </span>
        )}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.href} delayDuration={0}>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "h-screen bg-white border-r border-sky-100 flex flex-col transition-all duration-300 ease-in-out relative z-20 shadow-sm",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Header / Branding */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sky-100 shrink-0">
          {!isCollapsed && (
            <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
              <div className="p-1.5 bg-sky-50 rounded-lg">
                <Languages className="w-5 h-5 text-sky-600" />
              </div>
              <span className="font-bold text-xl text-slate-800 tracking-tight">DARUDA</span>
            </div>
          )}
          {isCollapsed && (
            <div className="w-fit flex justify-center">
              <Languages className="w-6 h-6 text-sky-600" />
            </div>
          )}

          {!isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="rounded-full hover:bg-sky-50 text-slate-400 hover:text-sky-600 h-8 w-8"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Collapse Button (Floating if collapsed) */}
        {isCollapsed && (
          <div className="absolute -right-3 top-20 z-30">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSidebar}
              className="h-6 w-6 bg-white border border-sky-100 rounded-full shadow-md text-sky-600 hover:bg-sky-50 hover:text-sky-700 p-0"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Menu */}
        <ScrollArea className="flex-1 px-3">
          <div className="py-6 space-y-1">
            {/* Regular Menu */}
            <div className="space-y-1 mb-6">
              {menuItems.map(renderMenuItem)}
            </div>

            {/* Admin Section */}
            <div className="pt-4 border-t border-sky-100">
              {!isCollapsed && (
                <div className="px-3 mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Admin</span>
                </div>
              )}
              <div className="space-y-1">
                {adminMenuItems.map(renderMenuItem)}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-sky-100 bg-white shrink-0">
          <div className={cn(
            "flex items-center gap-3 transition-all duration-300",
            isCollapsed ? "justify-center" : ""
          )}>
            {session ? (
              <Avatar className="w-10 h-10">
                <AvatarImage src="/api/profile-images/me" />
                <AvatarFallback>
                  <User className="w-5 h-5 text-blue-600" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-blue-600" />
              </div>
            )}

            {!isCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold text-sm text-slate-700 truncate">{session?.user.name}</p>
                <p className="text-xs text-slate-400 truncate">{session?.user.upn}</p>
              </div>
            )}

            {!isCollapsed && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-red-400 hover:bg-red-50 rounded-lg h-9 w-9"
                      onClick={() => signOut({ callbackUrl: '/', redirect: true })}
                    >
                      <LogOut className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>로그아웃</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {/* Logout button for collapsed state */}
          {isCollapsed && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-full h-9 text-slate-400 hover:text-red-400 hover:bg-red-50 rounded-lg"
                      onClick={() => signOut({ callbackUrl: '/', redirect: true })}
                    >
                      <LogOut className="w-5 h-5" />
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>로그아웃</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
