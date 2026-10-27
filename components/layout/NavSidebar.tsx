"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuthRuntime } from "@/components/providers";
import {
  appConfig,
  getVisibleNavigation,
  type HeaderNavigationItem,
} from "@/config/app";

interface NavSidebarProps {
  id: string;
  isOpen: boolean;
  onNavigate(): void;
}

export default function NavSidebar({
  id,
  isOpen,
  onNavigate,
}: NavSidebarProps): React.ReactElement {
  const { authEnabled, session } = useAuthRuntime();
  const pathname = usePathname();
  const context = {
    authEnabled,
    authenticated: session !== null,
    roles: session?.user.roles,
  };
  const navigation = getVisibleNavigation(appConfig.headerNavigation, context);
  const management = getVisibleNavigation(appConfig.profileNavigation, context);
  const displayName =
    session?.user.name?.trim() || session?.user.email || "내 워크스페이스";

  const renderNavigation = (items: HeaderNavigationItem[]) =>
    items.map((item) => {
      const isActive =
        pathname === item.href ||
        (item.href !== "/" && pathname.startsWith(`${item.href}/`));

      return (
        <Link
          key={item.id}
          href={item.href}
          className={`nav-sidebar-link ${isActive ? "nav-sidebar-active" : ""}`}
          aria-current={isActive ? "page" : undefined}
          onClick={onNavigate}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {item.id === "admin" ? (
              <>
                <path d="m12 3 8 4v5c0 4-5 8-8 9-3-1-8-5-8-9V7z" />
                <path d="m9 12 2 2 4-4" />
              </>
            ) : (
              <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
            )}
          </svg>
          {item.label}
        </Link>
      );
    });

  return (
    <aside
      id={id}
      className={`nav-sidebar ${isOpen ? "nav-sidebar-open" : ""}`}
      aria-label="워크스페이스 메뉴"
    >
      <Link href="/" className="nav-sidebar-brand" onClick={onNavigate}>
        <span className="nav-sidebar-brand-mark" aria-hidden="true">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        </span>
        <span>
          <strong>{appConfig.name}</strong>
          <span className="nav-sidebar-brand-caption">Workspace</span>
        </span>
      </Link>
      <nav className="nav-sidebar-navigation" aria-label="주 메뉴">
        <p className="nav-sidebar-group-label">워크스페이스</p>
        {renderNavigation(navigation)}
        {management.length > 0 && (
          <>
            <p className="nav-sidebar-group-label">관리</p>
            {renderNavigation(management)}
          </>
        )}
      </nav>
      <div className="nav-sidebar-footer">
        <span className="nav-sidebar-avatar" aria-hidden="true">
          {session ? displayName.slice(0, 1).toUpperCase() : "W"}
        </span>
        <div className="nav-sidebar-account-copy">
          <strong>{displayName}</strong>
          <span>{session ? "Microsoft 계정" : "Workspace"}</span>
          {authEnabled && session && (
            <Link className="nav-sidebar-logout-link" href="/auth/logout">로그아웃</Link>
          )}
        </div>
      </div>
      <style>{componentStyles}</style>
    </aside>
  );
}

const componentStyles = `
.nav-sidebar { position: fixed; inset: 0 auto 0 0; z-index: 30; display: flex; width: var(--nav-sidebar-width, 248px); flex-direction: column; background: #fff; border-right: 1px solid #e6e9f0; }
.nav-sidebar-brand { display: flex; gap: 12px; align-items: center; min-height: 96px; padding: 24px; text-decoration: none; }
.nav-sidebar-brand-mark { display: grid; width: 38px; height: 38px; flex-shrink: 0; place-items: center; color: #4f46e5; background: #eef0ff; border: 1px solid #e5e7ff; border-radius: 11px; }
.nav-sidebar-brand strong { display: block; font-size: 13px; letter-spacing: -.3px; }
.nav-sidebar-brand-caption { display: block; margin-top: 5px; font-size: 11px; color: #94a3b8; letter-spacing: .5px; }
.nav-sidebar-navigation { flex: 1; padding: 16px; }
.nav-sidebar-group-label { margin: 0 12px 12px; color: #94a3b8; font-size: 10px; font-weight: 600; letter-spacing: .8px; }
.nav-sidebar-group-label:not(:first-child) { margin-top: 32px; }
.nav-sidebar-link { display: flex; gap: 12px; min-height: 44px; align-items: center; margin-top: 4px; padding: 10px 13px; border-radius: 8px; color: #64748b; text-decoration: none; font-size: 13px; font-weight: 500; }
.nav-sidebar-link:hover { background: #f8fafc; color: #334155; }
.nav-sidebar-active, .nav-sidebar-active:hover { color: #4f46e5; background: #eef0ff; font-weight: 600; }
.nav-sidebar-footer { display: flex; align-items: center; gap: 11px; margin: 16px; padding: 18px 8px 6px; border-top: 1px solid #edf0f5; }
.nav-sidebar-avatar { display: grid; place-items: center; flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%; border: 1px solid #e2e8f0; background: #f8fafc; color: #64748b; font-size: 12px; font-weight: 600; }
.nav-sidebar-account-copy { min-width: 0; }
.nav-sidebar-account-copy strong { display: block; overflow: hidden; color: #475569; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 600; }
.nav-sidebar-account-copy span { display: block; margin-top: 5px; color: #94a3b8; font-size: 10px; }
.nav-sidebar-logout-link { display: inline-block; margin-top: 9px; color: #64748b; font-size: 10px; text-underline-offset: 3px; }

@media (max-width: 760px) {
  .nav-sidebar { transform: translateX(-100%); transition: transform 180ms ease; }
  .nav-sidebar-open { transform: translateX(0); }
}
`;
