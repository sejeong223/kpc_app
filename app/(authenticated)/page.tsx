export default function DashboardPage(): React.ReactElement {
  return (
    <div>
      <header className="workspace-home-heading">
        <p className="workspace-home-eyebrow">WORKSPACE</p>
        <h1>홈</h1>
        <p className="workspace-home-description">필요한 업무와 자료를 한곳에서 관리하는 공간입니다.</p>
      </header>
      <section className="workspace-home-panel" aria-labelledby="workspace-content-title">
        <header className="workspace-home-panel-header">
          <div><h2 id="workspace-content-title">내 워크스페이스</h2><p>업무의 시작과 진행을 이곳에서 확인하세요.</p></div>
          <span className="workspace-home-badge">기본 공간</span>
        </header>
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
      </section>
      <div className="workspace-home-caption"><span aria-hidden="true">◇</span><p>왼쪽 메뉴에서 이동하고, 이 공간에서 업무에 집중하세요.</p></div>
      <style>{componentStyles}</style>
    </div>
  );
}

const componentStyles = `
.workspace-home-heading { margin-bottom: 30px; }
.workspace-home-eyebrow { margin: 0 0 10px; color: #94a3b8; font-size: 10px; font-weight: 600; letter-spacing: 1.8px; }
.workspace-home-heading h1 { margin: 0; color: #1e293b; font-size: 28px; line-height: 1.3; letter-spacing: -1px; font-weight: 650; }
.workspace-home-description { margin: 11px 0 0; color: #8490a2; font-size: 13px; line-height: 1.7; }
.workspace-home-panel { overflow: hidden; border: 1px solid #e3e7ef; border-radius: 12px; background: #fff; box-shadow: 0 3px 12px #33415503; }
.workspace-home-panel-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 24px 28px; border-bottom: 1px solid #f0f2f6; }
.workspace-home-panel-header h2 { margin: 0; color: #334155; font-size: 14px; font-weight: 600; }
.workspace-home-panel-header p { margin: 7px 0 0; color: #94a3b8; font-size: 11px; line-height: 1.6; }
.workspace-home-badge { flex-shrink: 0; padding: 5px 9px; border: 1px solid #e7eaf2; border-radius: 5px; color: #8490a2; background: #fafbfe; font-size: 10px; }
.workspace-home-empty-state { display: flex; min-height: 400px; padding: 56px 24px; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.workspace-home-illustration { position: relative; width: 116px; height: 100px; margin: 0 0 28px; }
.workspace-home-back-sheet { position: absolute; top: 8px; left: 26px; width: 76px; height: 80px; border: 1px solid #e6e9f5; border-radius: 10px; background: #f5f6fc; transform: rotate(9deg); }
.workspace-home-front-sheet { position: absolute; top: 14px; left: 10px; display: flex; width: 78px; height: 82px; flex-direction: column; padding: 12px; border: 1px solid #dee3f3; border-radius: 10px; background: #fff; transform: rotate(-6deg); box-shadow: 0 6px 12px #64748b08; }
.workspace-home-sheet-icon { display: inline-flex; margin-bottom: 10px; color: #818cf8; }
.workspace-home-sheet-line, .workspace-home-sheet-line-short { height: 4px; margin-top: 6px; border-radius: 3px; background: #edf0f7; }
.workspace-home-sheet-line-short { width: 65%; }
.workspace-home-empty-state h3 { margin: 0 0 12px; color: #475569; font-size: 16px; font-weight: 600; letter-spacing: -.4px; }
.workspace-home-empty-state p { margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.9; }
.workspace-home-panel-footer { display: flex; min-height: 50px; align-items: center; justify-content: center; gap: 7px; border-top: 1px solid #f0f2f6; background: #fdfdff; color: #94a3b8; font-size: 10px; }
.workspace-home-status-dot { width: 5px; height: 5px; border-radius: 50%; background: #a5b4fc; }
.workspace-home-caption { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 22px; color: #a0aabd; font-size: 11px; }
.workspace-home-caption p { margin: 0; line-height: 1.7; }

@media (max-width: 760px) {
  .workspace-home-heading { margin-bottom: 24px; }
  .workspace-home-heading h1 { font-size: 25px; }
  .workspace-home-description { font-size: 12px; }
  .workspace-home-panel-header { padding: 20px; gap: 12px; }
  .workspace-home-panel-header p { max-width: 190px; }
  .workspace-home-empty-state { min-height: 350px; padding: 40px 20px; }
  .workspace-home-empty-state h3 { font-size: 15px; }
  .workspace-home-caption { padding: 0 10px; font-size: 10px; text-align: center; }
}
`;
