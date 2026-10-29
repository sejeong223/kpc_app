"use client";

import { Button, makeStyles, mergeClasses } from "@fluentui/react-components";
import { NavigationRegular } from "@fluentui/react-icons";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { appConfig } from "@/config/app";
import { useComments } from "@/components/comments/CommentsProvider";

import NavSidebar from "./NavSidebar";

const SIDEBAR_ID = "workspace-sidebar";

const useStyles = makeStyles({
  root: { "--nav-sidebar-width": "220px", minHeight: "100svh" },
  collapsed: { "@media (min-width: 761px)": { "--nav-sidebar-width": "54px" } },
  mainColumn: {
    display: "flex",
    minHeight: "100svh",
    marginLeft: "var(--nav-sidebar-width)",
    flexDirection: "column",
    "@media (max-width: 760px)": { marginLeft: 0 },
  },
  content: {
    width: "100%",
    maxWidth: "1320px",
    flex: 1,
    margin: "0 auto",
    padding: "40px 38px",
    ":focus": { outlineStyle: "none" },
    "@media (max-width: 760px)": { padding: "64px 20px 30px" },
  },
  productionContent: {
    maxWidth: "none", margin: 0, padding: 0, width: "100%", display: "flex",
    flexDirection: "column", minHeight: "100svh",
    "@media (max-width: 760px)": { padding: 0 },
  },
  menuButton: {
    display: "none", position: "fixed", top: "16px", left: "16px", zIndex: 15,
    width: "40px", minWidth: "40px", height: "40px", padding: 0,
    backgroundColor: "#fff", color: "#475569", border: "1px solid #e6e7eb", borderRadius: "8px",
    "@media (max-width: 760px)": { display: "inline-flex" },
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    padding: "18px 38px",
    color: "#94a3b8",
    fontSize: "10px",
    "@media (max-width: 760px)": { padding: "18px 20px" },
  },
  backdrop: {
    display: "none",
    "@media (max-width: 760px)": {
      position: "fixed",
      display: "block",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 20,
      border: 0,
      backgroundColor: "#0f172a66",
    },
  },
  skipLink: {
    position: "fixed",
    top: "-80px",
    left: "20px",
    zIndex: 100,
    padding: "12px 16px",
    borderRadius: "6px",
    backgroundColor: "#d7192f",
    color: "#fff",
    ":focus": { top: "16px" },
  },
});

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps): React.ReactElement {
  const styles = useStyles();
  const { controller } = useComments();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const mainRef = useRef<HTMLElement>(null);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    requestAnimationFrame(() => document.getElementById(`${SIDEBAR_ID}-trigger`)?.focus());
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const onChange = (event: MediaQueryListEvent) => {
      if (!event.matches) setMenuOpen(false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      mainRef.current?.focus({ preventScroll: true });
    }
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const sidebar = document.getElementById(SIDEBAR_ID);
    sidebar?.querySelector<HTMLElement>("[data-sidebar-close]")?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || sidebar?.querySelector("[data-profile-popover]")
        || document.querySelector("[data-modal-frame]")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
      if (event.key !== "Tab" || !sidebar) return;
      const targets = Array.from(sidebar.querySelectorAll<HTMLElement>(
        "a[href], button, input, select, textarea, [tabindex]",
      )).filter((element) => element.tabIndex >= 0 && !element.matches(":disabled, [aria-disabled='true']") && element.getClientRects().length > 0);
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, closeMenu]);

  const onNavigate = () => {
    if (menuOpen) {
      setMenuOpen(false);
      requestAnimationFrame(() => mainRef.current?.focus({ preventScroll: true }));
    }
  };

  return (
    <div className={mergeClasses(styles.root, sidebarCollapsed && styles.collapsed)}>
      <a className={styles.skipLink} href="#main-content">본문으로 이동</a>
      {menuOpen && (
        <button type="button" className={styles.backdrop} aria-label="메뉴 닫기" tabIndex={-1} onClick={closeMenu} />
      )}
      <NavSidebar
        id={SIDEBAR_ID}
        isOpen={menuOpen}
        isCollapsed={sidebarCollapsed}
        onNavigate={onNavigate}
        onCollapseToggle={() => setSidebarCollapsed((collapsed) => !collapsed)}
        onClose={closeMenu}
      />
      <div className={styles.mainColumn} inert={menuOpen}>
        <Button
          id={`${SIDEBAR_ID}-trigger`} className={styles.menuButton}
          icon={<NavigationRegular />} aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={menuOpen} aria-controls={SIDEBAR_ID}
          onClick={() => { controller?.suspendUi(); setMenuOpen((open) => !open); }}
        />
        <main id="main-content" ref={mainRef} className={mergeClasses(styles.content, pathname === "/workspace/write" && styles.productionContent)} tabIndex={-1}>{children}</main>
        <footer className={styles.footer}>{appConfig.name}<span>나만의 업무 공간</span></footer>
      </div>
    </div>
  );
}
