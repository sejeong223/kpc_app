import { requireRole } from "@/lib/auth/guards";
import { APP_ROLES } from "@/lib/auth/roles";

import styles from "../workspace.module.css";

export default async function AdminPage(): Promise<React.ReactElement> {
  await requireRole(APP_ROLES.ADMIN, "/admin");

  return (
    <div>
      <header className={styles.heading}><p className={styles.eyebrow}>ADMINISTRATION</p><h1>관리자</h1><p className={styles.description}>워크스페이스를 관리하는 공간입니다.</p></header>
      <section className={styles.panel}><header className={styles.panelHeader}><h2>관리자 워크스페이스</h2><span className={styles.badge}>Admin</span></header><div className={styles.adminContent}><p>관리자 권한이 확인되었습니다.</p><p>프로젝트에서 사용하는 관리 항목이 이 공간에 표시됩니다.</p></div></section>
    </div>
  );
}
