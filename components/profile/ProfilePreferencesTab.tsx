"use client";

import { Field, makeStyles, Select } from "@fluentui/react-components";

import SegmentedControl from "@/components/ui/SegmentedControl";
import ToggleSwitch from "@/components/ui/ToggleSwitch";
import type { ProfilePreferences } from "@/config/profile-preview";

import { useProfilePreview } from "./ProfilePreviewProvider";

export interface ProfilePreferencesTabProps {
  onNotice(message: string): void;
}

const notificationSettings = [
  { key: "comments", label: "의견 · 멘션", description: "내 섹션에 달린 의견, @멘션" },
  { key: "reviews", label: "검수 요청 · 완료" },
  { key: "deadlines", label: "마감 임박", description: "D-7 · D-3 · D-1" },
  { key: "aiJobs", label: "AI 작업 완료", description: "분석 · 초안 · 슬라이드 생성" },
  { key: "tokenWarnings", label: "토큰 사용량 경고", description: "한도의 70% · 100% 도달 시" },
] as const;

const useStyles = makeStyles({
  root: { display: "flex", flexDirection: "column", gap: "12px" },
  card: { padding: "12px", border: "1px solid #e6e7eb", borderRadius: "12px", backgroundColor: "#fff" },
  heading: { display: "flex", alignItems: "center", margin: "0 0 8px", color: "#34363c", fontSize: "11.5px", lineHeight: "18px", fontWeight: 850 },
  switchRow: { padding: "7px 0", borderTop: "1px solid #eff0f3", ":first-child": { paddingTop: 0, borderTopWidth: 0 } },
  digest: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "7px 0", borderTop: "1px solid #eff0f3" },
  label: { margin: 0, padding: 0, fontFamily: "inherit", fontSize: "12px", lineHeight: "18px", fontWeight: 700 },
  select: { height: "28px", minWidth: 0, maxWidth: "150px" },
  selectInput: { height: "26px", minWidth: 0, fontFamily: "inherit", fontSize: "11.5px" },
  row: { display: "flex", alignItems: "center", gap: "10px", padding: "5px 0" },
  rowLabel: { width: "62px", flexShrink: 0, fontSize: "12px", fontWeight: 700 },
  control: { flex: 1, minWidth: 0 },
  note: { margin: 0, color: "#74747d", fontSize: "10.5px", lineHeight: "16px" },
});

export default function ProfilePreferencesTab({ onNotice }: ProfilePreferencesTabProps): React.ReactElement {
  const styles = useStyles();
  const { state, dispatch } = useProfilePreview();
  const preferences = state.preferences;
  const announce = () => onNotice("이번 미리보기에 설정을 적용했습니다.");

  return (
    <div className={styles.root}>
      <section className={styles.card} aria-label="알림 받기">
        <h3 className={styles.heading}>알림 받기</h3>
        <div>
          {notificationSettings.map((setting) => (
            <div className={styles.switchRow} key={setting.key}>
              <ToggleSwitch
                label={setting.label} description={"description" in setting ? setting.description : undefined}
                checked={preferences[setting.key]}
                onChange={(value) => { dispatch({ type: "set-preference", key: setting.key, value }); announce(); }}
              />
            </div>
          ))}
        </div>
      </section>
      <section className={styles.card} aria-label="알림 방식">
        <h3 className={styles.heading}>알림 방식</h3>
        <div>
          <div className={styles.switchRow}>
            <ToggleSwitch label="이메일로도 받기" checked={preferences.email} onChange={(value) => { dispatch({ type: "set-preference", key: "email", value }); announce(); }} />
          </div>
          <Field label={{ className: styles.label, children: "요약 메일" }} className={styles.digest}>
            <Select
              value={preferences.digest} className={styles.select} select={{ className: styles.selectInput }}
              onChange={(_, data) => {
                const value = data.value;
                if (value !== "off" && value !== "daily" && value !== "weekly") return;
                dispatch({ type: "set-preference", key: "digest", value }); announce();
              }}
            >
              <option value="off">받지 않음</option><option value="daily">매일 오전 9시</option><option value="weekly">매주 월요일</option>
            </Select>
          </Field>
        </div>
      </section>
      <section className={styles.card} aria-label="화면 기본값">
        <h3 className={styles.heading}>화면 기본값</h3>
        <div className={styles.row}>
          <span className={styles.rowLabel}>시작 화면</span>
          <SegmentedControl<ProfilePreferences["startScreen"]> className={styles.control} fullWidth ariaLabel="시작 화면" value={preferences.startScreen}
            options={[{ value: "pipeline", label: "검토 목록" }, { value: "write", label: "제작" }]}
            onChange={(value) => { dispatch({ type: "set-preference", key: "startScreen", value }); announce(); }} />
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>작성 화면</span>
          <SegmentedControl<ProfilePreferences["editorView"]> className={styles.control} fullWidth ariaLabel="작성 화면" value={preferences.editorView}
            options={[{ value: "doc", label: "본문" }, { value: "slide", label: "슬라이드" }]}
            onChange={(value) => { dispatch({ type: "set-preference", key: "editorView", value }); announce(); }} />
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>목록 보기</span>
          <SegmentedControl<ProfilePreferences["listView"]> className={styles.control} fullWidth ariaLabel="목록 보기" value={preferences.listView}
            options={[{ value: "table", label: "목록" }, { value: "board", label: "보드" }]}
            onChange={(value) => { dispatch({ type: "set-preference", key: "listView", value }); announce(); }} />
        </div>
      </section>
      <p className={styles.note}>미리보기 설정은 새로고침하면 초기화됩니다.</p>
    </div>
  );
}
