import { requireRole } from "@/lib/auth/guards";
import { APP_ROLES } from "@/lib/auth/roles";

export default async function AdminPage(): Promise<React.ReactElement> {
  await requireRole(APP_ROLES.ADMIN, "/admin");

  return (
    <div>
      <header className="workspace-admin-heading"><p className="workspace-admin-eyebrow">ADMINISTRATION</p><h1>관리자</h1><p className="workspace-admin-description">워크스페이스를 관리하는 공간입니다.</p></header>
      <section className="workspace-admin-panel"><header className="workspace-admin-panel-header"><h2>관리자 워크스페이스</h2><span className="workspace-admin-badge">Admin</span></header><div className="workspace-admin-content"><p>관리자 권한이 확인되었습니다.</p><p>프로젝트에서 사용하는 관리 항목이 이 공간에 표시됩니다.</p></div></section>
      <style>{componentStyles}</style>
    </div>
  );
}

const componentStyles = `
.workspace-admin-heading { margin-bottom: 30px; }
.workspace-admin-eyebrow { margin: 0 0 10px; color: #94a3b8; font-size: 10px; font-weight: 600; letter-spacing: 1.8px; }
.workspace-admin-heading h1 { margin: 0; color: #1e293b; font-size: 28px; line-height: 1.3; letter-spacing: -1px; font-weight: 650; }
.workspace-admin-description { margin: 11px 0 0; color: #8490a2; font-size: 13px; line-height: 1.7; }
.workspace-admin-panel { overflow: hidden; border: 1px solid #e3e7ef; border-radius: 12px; background: #fff; box-shadow: 0 3px 12px #33415503; }
.workspace-admin-panel-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 24px 28px; border-bottom: 1px solid #f0f2f6; }
.workspace-admin-panel-header h2 { margin: 0; color: #334155; font-size: 14px; font-weight: 600; }
.workspace-admin-panel-header p { margin: 7px 0 0; color: #94a3b8; font-size: 11px; line-height: 1.6; }
.workspace-admin-badge { flex-shrink: 0; padding: 5px 9px; border: 1px solid #e7eaf2; border-radius: 5px; color: #8490a2; background: #fafbfe; font-size: 10px; }
.workspace-admin-content { padding: 32px 28px; color: #64748b; font-size: 13px; line-height: 1.8; }

@media (max-width: 760px) {
  .workspace-admin-heading { margin-bottom: 24px; }
  .workspace-admin-heading h1 { font-size: 25px; }
  .workspace-admin-description { font-size: 12px; }
  .workspace-admin-panel-header { padding: 20px; gap: 12px; }
  .workspace-admin-panel-header p { max-width: 190px; }
}
`;
