"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useAuthRuntime } from "@/components/providers";
import { appConfig, getVisibleNavigation, type HeaderNavigationItem } from "@/config/app";

import styles from "./AppShell.module.css";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({
  children,
}: AppShellProps): React.ReactElement {
  const { authEnabled, session } = useAuthRuntime();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const context = {
    authEnabled,
    authenticated: session !== null,
    roles: session?.user.roles,
  };
  const navigation = getVisibleNavigation(appConfig.headerNavigation, context);
  const management = getVisibleNavigation(appConfig.profileNavigation, context);
  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
  const currentPage = [...navigation, ...management].find((item) => isActive(item.href))?.label ?? "워크스페이스";
  const displayName = session?.user.name?.trim() || session?.user.email || "내 워크스페이스";

  const renderNavigation = (items: HeaderNavigationItem[]) => items.map((item) => (
    <Link key={item.id} href={item.href} className={`${styles.navLink} ${isActive(item.href) ? styles.active : ""}`} aria-current={isActive(item.href) ? "page" : undefined} onClick={() => setMenuOpen(false)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {item.id === "admin" ? <><path d="m12 3 8 4v5c0 4-5 8-8 9-3-1-8-5-8-9V7z" /><path d="m9 12 2 2 4-4" /></> : <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></>}
      </svg>
      {item.label}
    </Link>
  ));

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">본문으로 이동</a>
      {menuOpen && <button className={styles.backdrop} aria-label="메뉴 닫기" onClick={() => setMenuOpen(false)} />}
      <aside id="workspace-sidebar" className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`} aria-label="워크스페이스 메뉴">
        <Link href="/" className={styles.brand} onClick={() => setMenuOpen(false)}>
          <span className={styles.brandMark} aria-hidden="true"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg></span>
          <span><strong>{appConfig.name}</strong><span className={styles.brandCaption}>Workspace</span></span>
        </Link>
        <nav className={styles.navigation} aria-label="주 메뉴">
          <p className={styles.groupLabel}>워크스페이스</p>
          {renderNavigation(navigation)}
          {management.length > 0 && <><p className={styles.groupLabel}>관리</p>{renderNavigation(management)}</>}
        </nav>
        <div className={styles.sidebarFooter}>
          <span className={styles.avatar} aria-hidden="true">{session ? displayName.slice(0, 1).toUpperCase() : "W"}</span>
          <div className={styles.accountCopy}>
            <strong>{displayName}</strong>
            <span>{session ? "Microsoft 계정" : "Workspace"}</span>
            {authEnabled && session && <Link className={styles.logoutLink} href="/auth/logout">로그아웃</Link>}
          </div>
        </div>
      </aside>
      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <div className={styles.location}>
            <button className={styles.menuButton} type="button" aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"} aria-expanded={menuOpen} aria-controls="workspace-sidebar" onClick={() => setMenuOpen(!menuOpen)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <span className={styles.breadcrumb}>워크스페이스</span><span className={styles.breadcrumbDivider}>/</span><strong>{currentPage}</strong>
          </div>
        </header>
        <main id="main-content" className={styles.content} tabIndex={-1}>{children}</main>
        <footer className={styles.footer}>{appConfig.name}<span>나만의 업무 공간</span></footer>
      </div>
    </div>
  );
}
