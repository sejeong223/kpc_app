"use client";

import { usePathname } from "next/navigation";

import { appConfig } from "@/config/app";

interface AppHeaderProps {
  sidebarId: string;
  isMenuOpen: boolean;
  onMenuToggle(): void;
}

export default function AppHeader({
  sidebarId,
  isMenuOpen,
  onMenuToggle,
}: AppHeaderProps): React.ReactElement {
  const pathname = usePathname();
  const currentPage = [
    ...appConfig.headerNavigation,
    ...appConfig.profileNavigation,
  ].find((item) =>
    pathname === item.href ||
    (item.href !== "/" && pathname.startsWith(`${item.href}/`)),
  )?.label ?? "워크스페이스";

  return (
    <header className="app-header">
      <div className="app-header-location">
        <button
          className="app-header-menu-button"
          type="button"
          aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={isMenuOpen}
          aria-controls={sidebarId}
          onClick={onMenuToggle}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="app-header-breadcrumb">워크스페이스</span>
        <span className="app-header-breadcrumb-divider">/</span>
        <strong>{currentPage}</strong>
      </div>
      <style>{componentStyles}</style>
    </header>
  );
}

const componentStyles = `
.app-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; height: 72px; padding: 0 38px; border-bottom: 1px solid #e6e9f0; background: #fff; }
.app-header-location { display: flex; align-items: center; gap: 14px; font-size: 12px; }
.app-header-location strong { color: #475569; font-weight: 500; }
.app-header-breadcrumb { color: #94a3b8; }
.app-header-breadcrumb-divider { color: #cbd5e1; }
.app-header-menu-button { display: none; padding: 4px; border: 0; background: transparent; color: #475569; }

@media (max-width: 760px) {
  .app-header { height: 64px; padding: 0 20px; }
  .app-header-location { gap: 10px; }
  .app-header-breadcrumb, .app-header-breadcrumb-divider { display: none; }
  .app-header-menu-button { display: flex; }
}
`;
