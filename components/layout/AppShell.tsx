"use client";

import { makeStyles, mergeClasses, tokens } from "@fluentui/react-components";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useComments } from "@/components/comments/CommentsProvider";
import { ProjectHeaderToaster } from "@/components/common/ProjectHeaderProvider";
import DadamThemeScope from "@/components/providers/DadamThemeScope";
import { WorkspaceNavigationProvider } from "./WorkspaceNavigation";

import NavSidebar from "./NavSidebar";

const SIDEBAR_ID = "workspace-sidebar";

const useStyles = makeStyles({
  root: { "--nav-sidebar-width": "200px", minHeight: "100svh" },
  productionRoot: { height: "100dvh", minHeight: 0 },
  collapsed: { "@media (min-width: 761px)": { "--nav-sidebar-width": "64px" } },
  mainColumn: {
    display: "flex",
    minHeight: "100svh",
    marginLeft: "var(--nav-sidebar-width)",
    flexDirection: "column",
    "@media (max-width: 760px)": { marginLeft: 0 },
  },
  content: {
    width: "100%",
    minWidth: 0,
    maxWidth: "none",
    flex: 1,
    margin: 0,
    padding: "var(--layout-page-inset)",
    ":focus": { outlineStyle: "none" },
  },
  productionColumn: { height: "100%", minHeight: 0 },
  productionContent: {
    maxWidth: "none", margin: 0, padding: 0, width: "100%", display: "flex",
    flexDirection: "column", flex: "1 1 0%", minHeight: 0,
    "@media (max-width: 760px)": { padding: 0 },
  },
  adminContent: { backgroundColor: "var(--kpc-bg)" },
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
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
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
  const isProduction = pathname === "/workspace/write";
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
    <WorkspaceNavigationProvider value={{ sidebarId: SIDEBAR_ID, triggerId: `${SIDEBAR_ID}-trigger`, menuOpen, toggleMenu: () => { controller?.suspendUi(); setMenuOpen(open => !open); } }}>
    <div className={mergeClasses(styles.root, sidebarCollapsed && styles.collapsed, isProduction && styles.productionRoot)}>
      <DadamThemeScope>
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
      </DadamThemeScope>
      <div className={mergeClasses(styles.mainColumn, isProduction && styles.productionColumn)} inert={menuOpen}>
        <main id="main-content" ref={mainRef} className={mergeClasses(
          styles.content,
          ["/workspace/users", "/workspace/policy", "/workspace/audit", "/workspace/dashboard"].includes(pathname) && styles.adminContent,
          isProduction && styles.productionContent,
        )} tabIndex={-1}>{children}</main>
        <ProjectHeaderToaster />
      </div>
    </div>
    </WorkspaceNavigationProvider>
  );
}
