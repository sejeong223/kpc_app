"use client";

import { useState } from "react";

import { appConfig } from "@/config/app";

import AppHeader from "./AppHeader";
import NavSidebar from "./NavSidebar";

const SIDEBAR_ID = "workspace-sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({
  children,
}: AppShellProps): React.ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <a className="app-shell-skip-link" href="#main-content">본문으로 이동</a>
      {menuOpen && <button className="app-shell-backdrop" aria-label="메뉴 닫기" onClick={() => setMenuOpen(false)} />}
      <NavSidebar
        id={SIDEBAR_ID}
        isOpen={menuOpen}
        onNavigate={() => setMenuOpen(false)}
      />
      <div className="app-shell-main-column">
        <AppHeader
          sidebarId={SIDEBAR_ID}
          isMenuOpen={menuOpen}
          onMenuToggle={() => setMenuOpen((open) => !open)}
        />
        <main id="main-content" className="app-shell-content" tabIndex={-1}>{children}</main>
        <footer className="app-shell-footer">{appConfig.name}<span>나만의 업무 공간</span></footer>
      </div>
      <style>{componentStyles}</style>
    </div>
  );
}

const componentStyles = `
.app-shell { --nav-sidebar-width: 248px; min-height: 100svh; }
.app-shell-main-column { display: flex; min-height: 100svh; margin-left: var(--nav-sidebar-width); flex-direction: column; }
.app-shell-content { width: 100%; max-width: 1320px; flex: 1; margin: 0 auto; padding: 40px 38px; }
.app-shell-content:focus { outline: none; }
.app-shell-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 38px; color: #94a3b8; font-size: 10px; }
.app-shell-backdrop { display: none; }
.app-shell-skip-link { position: fixed; top: -80px; left: 20px; z-index: 100; padding: 12px 16px; border-radius: 6px; background: #4f46e5; color: #fff; }
.app-shell-skip-link:focus { top: 16px; }

@media (max-width: 760px) {
  .app-shell-main-column { margin-left: 0; }
  .app-shell-backdrop { position: fixed; display: block; inset: 0; z-index: 20; border: 0; background: #0f172a66; }
  .app-shell-content { padding: 30px 20px; }
  .app-shell-footer { padding: 18px 20px; }
}
`;
