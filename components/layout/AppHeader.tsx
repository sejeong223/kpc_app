"use client";

import { usePathname } from "next/navigation";

import { appConfig } from "@/config/app";

import styles from "./AppHeader.module.css";

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
    <header className={styles.topbar}>
      <div className={styles.location}>
        <button
          className={styles.menuButton}
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
        <span className={styles.breadcrumb}>워크스페이스</span>
        <span className={styles.breadcrumbDivider}>/</span>
        <strong>{currentPage}</strong>
      </div>
    </header>
  );
}
