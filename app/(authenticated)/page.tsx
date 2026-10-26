import styles from "./workspace.module.css";

export default function DashboardPage(): React.ReactElement {
  return (
    <div>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>WORKSPACE</p>
        <h1>홈</h1>
        <p className={styles.description}>필요한 업무와 자료를 한곳에서 관리하는 공간입니다.</p>
      </header>
      <section className={styles.panel} aria-labelledby="workspace-content-title">
        <header className={styles.panelHeader}>
          <div><h2 id="workspace-content-title">내 워크스페이스</h2><p>업무의 시작과 진행을 이곳에서 확인하세요.</p></div>
          <span className={styles.badge}>기본 공간</span>
        </header>
        <div className={styles.emptyState}>
          <div className={styles.illustration} aria-hidden="true">
            <div className={styles.backSheet} />
            <div className={styles.frontSheet}>
              <span className={styles.sheetIcon}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M4 10h16M10 10v10" /></svg></span>
              <span className={styles.sheetLine} /><span className={styles.sheetLineShort} />
            </div>
          </div>
          <h3>워크스페이스가 준비되었습니다</h3>
          <p>아직 등록된 콘텐츠가 없습니다.<br />새로운 업무와 자료가 이 공간에 표시됩니다.</p>
        </div>
        <footer className={styles.panelFooter}><span className={styles.statusDot} />모든 업무를 위한 하나의 시작점</footer>
      </section>
      <div className={styles.caption}><span aria-hidden="true">◇</span><p>왼쪽 메뉴에서 이동하고, 이 공간에서 업무에 집중하세요.</p></div>
    </div>
  );
}
