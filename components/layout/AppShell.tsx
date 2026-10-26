"use client";

import { useAuthRuntime } from "@/components/providers";
import { appConfig, getVisibleNavigation } from "@/config/app";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({
  children,
}: AppShellProps): React.ReactElement {
  const { authEnabled, session } = useAuthRuntime();
  const context = {
    authEnabled,
    authenticated: session !== null,
    roles: session?.user.roles,
  };
  const navigation = [
    ...getVisibleNavigation(appConfig.headerNavigation, context),
    ...getVisibleNavigation(appConfig.profileNavigation, context),
  ];

  return (
    <div>
      <header>
        <strong>{appConfig.name}</strong>
        <nav aria-label="주 메뉴">
          {navigation.map((item) => (
            <a key={item.id} href={item.href}>
              {item.label}
            </a>
          ))}
          {authEnabled && session && <a href="/auth/logout">로그아웃</a>}
          {authEnabled && !session && <a href="/auth/login">로그인</a>}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
