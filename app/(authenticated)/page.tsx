import WorkspaceCard from "@/components/layout/WorkspaceCard";
import WorkspacePage from "@/components/layout/WorkspacePage";

export default function DashboardPage(): React.ReactElement {
  return (
    <WorkspacePage title="홈">
      <WorkspaceCard title="내 워크스페이스" actions={<span className="workspace-home-badge">기본 공간</span>}>
        <p className="tw:text-[11px] tw:text-(--kpc-muted)">업무의 시작과 진행을 이곳에서 확인하세요.</p>
        <div className="workspace-home-empty-state">
          <div className="workspace-home-illustration" aria-hidden="true">
            <div className="workspace-home-back-sheet" />
            <div className="workspace-home-front-sheet">
              <span className="workspace-home-sheet-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M4 10h16M10 10v10" /></svg></span>
              <span className="workspace-home-sheet-line" /><span className="workspace-home-sheet-line-short" />
            </div>
          </div>
          <h3>워크스페이스가 준비되었습니다</h3>
          <p>아직 등록된 콘텐츠가 없습니다.<br />새로운 업무와 자료가 이 공간에 표시됩니다.</p>
        </div>
        <footer className="workspace-home-panel-footer"><span className="workspace-home-status-dot" />모든 업무를 위한 하나의 시작점</footer>
      </WorkspaceCard>
      <div className="workspace-home-caption"><span aria-hidden="true">◇</span><p>왼쪽 메뉴에서 이동하고, 이 공간에서 업무에 집중하세요.</p></div>
      <style>{componentStyles}</style>
    </WorkspacePage>
  );
}

const componentStyles = `
.workspace-home-badge { flex-shrink: 0; padding: 5px 9px; border: 1px solid #e7eaf2; border-radius: 5px; color: #8490a2; background: #fafbfe; font-size: 10px; }
.workspace-home-empty-state { display: flex; min-height: var(--layout-empty-min-height); flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.workspace-home-illustration { position: relative; width: 116px; height: 100px; margin: 0 0 var(--layout-section-gap); }
.workspace-home-back-sheet { position: absolute; top: 8px; left: 26px; width: 76px; height: 80px; border: 1px solid #e6e9f5; border-radius: 10px; background: #f5f6fc; transform: rotate(9deg); }
.workspace-home-front-sheet { position: absolute; top: 14px; left: 10px; display: flex; width: 78px; height: 82px; flex-direction: column; padding: 12px; border: 1px solid #dee3f3; border-radius: 10px; background: #fff; transform: rotate(-6deg); box-shadow: 0 6px 12px #64748b08; }
.workspace-home-sheet-icon { display: inline-flex; margin-bottom: 10px; color: #818cf8; }
.workspace-home-sheet-line, .workspace-home-sheet-line-short { height: 4px; margin-top: 6px; border-radius: 3px; background: #edf0f7; }
.workspace-home-sheet-line-short { width: 65%; }
.workspace-home-empty-state h3 { margin: 0 0 var(--layout-section-gap); color: #475569; font-size: 16px; font-weight: 600; letter-spacing: -.4px; }
.workspace-home-empty-state p { margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.9; }
.workspace-home-panel-footer { display: flex; align-items: center; justify-content: center; gap: var(--layout-control-gap); border-top: 1px solid #f0f2f6; background: #fdfdff; color: #94a3b8; font-size: 10px; }
.workspace-home-status-dot { width: 5px; height: 5px; border-radius: 50%; background: #a5b4fc; }
.workspace-home-caption { display: flex; justify-content: center; align-items: center; gap: var(--layout-control-gap); color: #a0aabd; font-size: 11px; }
.workspace-home-caption p { margin: 0; line-height: 1.7; }

@media (max-width: 760px) {
  .workspace-home-empty-state h3 { font-size: 15px; }
  .workspace-home-caption { font-size: 10px; text-align: center; }
}
`;
