"use client";

import { Button, makeStyles } from "@fluentui/react-components";
import { NavigationRegular } from "@fluentui/react-icons";
import { usePathname } from "next/navigation";

import { getSidebarItemByPathname } from "@/config/sidebar";

const useStyles = makeStyles({
  root: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    height: "72px",
    padding: "0 38px",
    borderBottom: "1px solid #e6e9f0",
    backgroundColor: "#fff",
    "@media (max-width: 760px)": { height: "64px", padding: "0 20px" },
  },
  location: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    fontSize: "12px",
    "@media (max-width: 760px)": { gap: "10px" },
  },
  currentPage: { color: "#475569", fontWeight: 500 },
  breadcrumb: { color: "#94a3b8", "@media (max-width: 760px)": { display: "none" } },
  divider: { color: "#cbd5e1", "@media (max-width: 760px)": { display: "none" } },
  menuButton: {
    display: "none",
    minWidth: "30px",
    padding: "4px",
    color: "#475569",
    "@media (max-width: 760px)": { display: "inline-flex" },
  },
});

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
  const styles = useStyles();
  const pathname = usePathname();
  const currentPage = getSidebarItemByPathname(pathname)?.label
    ?? (pathname === "/" ? "홈" : pathname === "/admin" || pathname.startsWith("/admin/") ? "관리자" : "워크스페이스");

  return (
    <header className={styles.root}>
      <div className={styles.location}>
        <Button
          id={`${sidebarId}-trigger`}
          className={styles.menuButton}
          appearance="subtle"
          icon={<NavigationRegular />}
          aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={isMenuOpen}
          aria-controls={sidebarId}
          onClick={onMenuToggle}
        />
        <span className={styles.breadcrumb}>워크스페이스</span>
        <span className={styles.divider} aria-hidden="true">/</span>
        <strong className={styles.currentPage}>{currentPage}</strong>
      </div>
    </header>
  );
}
