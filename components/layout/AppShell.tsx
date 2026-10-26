"use client";

import { useState } from "react";

import { appConfig } from "@/config/app";

import AppHeader from "./AppHeader";
import NavSidebar from "./NavSidebar";
import styles from "./AppShell.module.css";

const SIDEBAR_ID = "workspace-sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({
  children,
}: AppShellProps): React.ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">본문으로 이동</a>
      {menuOpen && <button className={styles.backdrop} aria-label="메뉴 닫기" onClick={() => setMenuOpen(false)} />}
      <NavSidebar
        id={SIDEBAR_ID}
        isOpen={menuOpen}
        onNavigate={() => setMenuOpen(false)}
      />
      <div className={styles.mainColumn}>
        <AppHeader
          sidebarId={SIDEBAR_ID}
          isMenuOpen={menuOpen}
          onMenuToggle={() => setMenuOpen((open) => !open)}
        />
        <main id="main-content" className={styles.content} tabIndex={-1}>{children}</main>
        <footer className={styles.footer}>{appConfig.name}<span>나만의 업무 공간</span></footer>
      </div>
    </div>
  );
}
