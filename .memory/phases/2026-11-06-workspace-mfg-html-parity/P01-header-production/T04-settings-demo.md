# Task: T04 프로젝트 설정 4탭의 HTML 시연 동작

## Status: done

## Goal

설정 버튼을 눌렀을 때 기본정보·권한·알림·로그를 HTML과 같은 내용과 구조로 보여 주고, 창 안에서 조작한 값은 닫을 때 폐기한다.

## Decision Summary

- 사용자가 이번 계획에서 **HTML처럼 설정창 내부 시연으로 통일**하기로 직접 선택했다. 기존 권한 저장 버튼을 유지하는 방식이 아니다. 체크를 바꿔도 실제 grant를 저장/변경하지 않는다.
- 최종 HTML `C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html`의 `HEADER_PERMISSION_COLUMNS`, `HEADER_NOTIFICATION_FIELDS`, `headerSettingsDraft`, `drawerHtml`, `bindHeaderSettings`(5736~5770), `.phs-*`(2683~2719) 기준.
- T01 새 예시 ID `production-html-mfg-demo`, 팀 이서연(PM)/정소담(actor)/김민수. T03 공통 헤더에서 이 drawer를 열며 실제 권한 모델은 outline/assign/setup/complete/rework 다섯 가지를 그대로 유지한다.
- tests/·브라우저/CUA/E2E/dev server/스크린샷·패키지 추가·Cosmos·push 금지. 일반 프로젝트 원본 데이터/실제 권한 보존.

## Implementation

### I01. 저장하지 않는 설정 draft

- Related Files:
  - `types/workspace-header.ts` :: 신규 draft/view types — modify.
  - `lib/workspace/production/header-settings-demo.ts` :: draft 생성·UI 권한 매핑 — new.
  - `components/common/ProjectSettingsDrawer.tsx` :: useProjectPermissions 의존 제거/임시 상태 — modify.
  - `hooks/workspace/use-project-permissions.ts`, `lib/workspace/production/permissions.ts` :: 기존 실제 저장 기능 — read-only, 삭제 금지.

#### Details

```typescript
export type HeaderSettingsTab = "info" | "perm" | "noti" | "log";
export type HeaderPermissionKey = "done" | "redo" | "setup" | "assign" | "grant";
export type HeaderNotificationKey = "deadline" | "complete" | "rework" | "comment" | "inApp" | "email";
export interface HeaderSettingsDraft {
  projectId: string;
  name: string; organization: string; budgetEok: string; dueDate: string;
  permissionsByMember: Record<string, HeaderPermissionKey[]>; // key=member ID
  notifications: Record<HeaderNotificationKey, boolean>;
}
export interface HeaderSettingsLogRow {
  id: string; name: string; department: string; role: string; detail: string; at: string;
}
export function createHeaderSettingsDraft(project: WorkspaceHeaderModel, view: ProjectView): HeaderSettingsDraft;
export function canEditHeaderPermissionDraft(project: WorkspaceHeaderModel, view: ProjectView): boolean;
export function headerSettingsDemoLogs(projectId: string): readonly HeaderSettingsLogRow[];
```

- 초기값: name=model.name, organization=model.organization 또는 빈 문자열, budgetEok=budgetKrw가 null이면 빈 문자열/그 외 `budgetKrw / 100000000 + '억원'`, dueDate=ISO date 또는 빈 문자열. 예산을 저장하거나 환산하여 실제 사업 데이터를 변경하지 않는다.
- UI key 매핑: complete→done, rework→redo, setup→setup, assign→assign. 실제 outline은 표시하지 않되 실제 저장에서 제거하지 않는다. grant는 PM/super_admin에만 기본 checked; 새 제조업 예시 actor는 시연용으로 checked하여 권한 조작 시연 가능하게 한다. PM 행 전체 checked/disabled. 일반 non-PM 편집은 실제 manage 권한을 판별한다. draft의 grant를 조작해 실제 관리 권한을 획득하게 하지 않는다.
- notifications 6개 기본값 true, drawer 메모리에만 저장. 현재 영속 알림 설정 API가 없으므로 저장·발송 성공이라고 표시하지 않는다.
- drawer mount 시 fresh deep draft 생성. 탭 변경 동안 값 유지, close/Escape/backdrop/project/snapshot 변경 시 폐기. 다시 열면 baseline 복원. dirty save guard/저장/다시 불러오기/footer 제거. 실제 useProjectPermissions의 save/set-grants-batch를 이 컴포넌트에서 호출하지 않는다.
- readonly는 snapshot 선택 여부로 판단한다. 현재 완료 회차에서의 임시 입력은 HTML처럼 허용하되 실제 저장은 없다. snapshot은 기본정보 readonly, 권한·알림 disabled.

### I02. 560px drawer 구조와 기본정보·권한

- Related Files:
  - `components/common/ProjectSettingsDrawer.tsx` :: styles/header/tabs/info/permissions — modify.

#### Details

- Fluent OverlayDrawer 유지, width560/max-width96vw/z4300/흰 배경/font14/20. global overlay 토큰 변경 대신 scoped styles 적용. header padding14px16/gap8/border-bottom. gear18, `프로젝트 설정` title14/20/600, projectname subtitle12/16 wrapping, 닫기32px/icon14. title/subtitle aria-labelledby/describedby 연결.
- 탭 순서/문구 `기본정보`/`권한`/`알림`/`로그` (기존 활동 로그 문구 교체). header 아래 tabs padding0 10/gap2, tab height38/padding0 10/font12/16/600; active underline3px/left·right10. body padding16/min-height0/flex1/overflow auto. footer 없음.
- 기본정보2열 grid/gap12px14. 필드 순서 `제안 프로젝트명`, `발주 기관`, `사업 예산`, `제출 마감일`. label gap5/font600, input height32/pad0 10, 원본처럼 입력값을 자유롭게 바꾸는 text input(due는 YYYY-MM-DD 문자열)이다. 실제 서버 validation/save는 하지 않는다.
- 하단 full-width `진행 상태`, live phase writing→`진행 중`, completed→`완료`. 진행 중에서 `진행안함으로 전환` button disabled 유지(HTML도 미작동). 원본에 없는 PM·번호·부서 상세 목록을 기본정보에 추가하지 않는다. 부서는 헤더에 유지한다.
- 권한 표 `이름 | 완성 | 재작업 | 제작 설정 | 담당 지정 | 권한 부여`. name width34%, 나머지 균등/center. avatar22px/원형, 이름600, PM badge. 본문 padding11px12, 헤더9px12/font12/16/600, checkbox16px. PM 맨 위, 나머지는 catalog 순서/중복 ID 제거. empty=`참여자가 없습니다.`.
- column tooltip/aria 설명: 완성=`작성이 끝났다고 보고 완성 처리`; 재작업=`파일 업로드부터 다시 진행 (작성 완료 섹션은 고정)`; 제작 설정=`제작 설정의 프롬프트 세트 · Skill · Template 선택과 프로젝트 프롬프트 수정`; 담당 지정=`목차 담당자 · 리뷰자 지정`; 권한 부여=`이 화면에서 다른 사람에게 권한 부여`.
- 각 checkbox aria-label=`이름 권한명`. 변경은 draft의 해당 member/key만 갱신. disabled/PM/unknown ID/unknown key 이벤트는 무시한다. 프로젝트 실 capability는 변하지 않는다.

### I03. 알림·로그 및 키보드 동작

- Related Files:
  - `components/common/ProjectSettingsDrawer.tsx` :: notification/log panels/focus — modify.
  - `lib/workspace/production/header-settings-demo.ts` :: 5행 로그 예시 — new.

#### Details

| key | 항목 | 설명 |
| :--- | :--- | :--- |
| deadline | 제출 마감 리마인더 | 7일 전 · 3일 전 · 1일 전 · 당일 |
| complete | 완성 알림 | PM 및 프로젝트 참여자에게 |
| rework | 재작업 시작 알림 | 작성 중 섹션 담당자에게 |
| comment | 의견 등록 알림 | 담당 작성자에게 |

- 각 label flex/start/padding9px2/gap9/bottom border, checkbox16px/margin-top2, 설명12/16. `수신 방식` heading margin16px0 8/font12/600. segment처럼 보이는 `앱 내 알림`/`이메일` 두 버튼은 독립 toggle이다. 둘 다 켜거나 둘 다 끌 수 있음, aria-pressed로 상태 제공. group pad3/gap2/radius8, 버튼 height26/pad0 10/active white+shadow.
- 로그는 원본처럼 `이름 | 권한 | 변경 내역 | 일시` 표, 이름 옆 department 보조 텍스트, table min-width880과 가로스크롤, sticky header. 빈 경우 `변경 내역이 없습니다.`. 실제 감사 로그 API는 만들지 않는다. 예시임을 드러내는 `시연 로그` 설명을 표에 연결한다.
- 일반 프로젝트 예시 로그는 HTML LOGS의5행 그대로 사용: 정소담/수석/작성자/`3.3 보안 체계 본문 수정 (자동 저장)`/2분 전; 김민수/수석/작성자/`의견 등록 · 3.3 보안 체계`/35분 전; 박성훈/책임/작성자/`의견 등록 · 4.1 추진 일정`/2시간 전; 정소담/수석/작성자/`RFP 문서 심층 분석 및 8개 평가 지표 산출 완료`/10.08; 시스템/-/-/`RFP 공고문 업로드 및 프로젝트 초기 등록`/2026.09.18. 실제 발생 사건으로 저장하지 않는다.
- 제조업은 같은5행 구조에서 잘못된 사업 문구를 교정한 예시: 정소담/생산성본부/작성자/`3.1 공정 데이터 연계 체계 본문 수정`/2분 전; 이서연/생산성본부/PM/`의견 등록 · 3.1 공정 데이터 연계 체계`/35분 전; 김민수/생산성본부/작성자/`의견 등록 · 4.1 추진 일정 및 WBS`/2시간 전; 정소담/생산성본부/작성자/`제조업 PoC 요구사항 12건 분석`/10.15; 시스템/-/-/`제조 AI 자율공정 PoC 제안요청서 등록`/2026.10.12. fixture로만 노출한다.
- ARIA tablist/tab/tabpanel, active tab tabindex0/others -1, Left/Right 순환/Home/End 이동 및 해당 탭 focus. tabpanel tabindex0. Escape/backdrop/닫기→draft 폐기→settingsRef focus. 다른 overlay가 열린 뒤 오래된 return focus가 포커스를 빼앗지 않게 처리한다.
- 이 창의 draft는 알림 예약/이메일 발송/실제 권한 부여/프로젝트 이름 변경을 일으키지 않는다. 실제 데이터를 바꿨다는 toast 없음.

## Acceptance Criteria

- [x] 기본정보 입력/권한 표/알림4개+수신2개/로그 표가 HTML 구조·문구·크기와 대응한다.
- [x] 모든 조작은 탭을 오갈 때 유지되고 닫아 재개방하면 원상복구된다.
- [x] PM 고정/snapshot readonly/일반 권한없는 사용자 경계 유지. UI grant를 실제 ProjectPermission에 추가하지 않는다.
- [x] 저장/다시 불러오기/미연결 placeholder 없음. 실제 외부 발송과 set-grants-batch 호출 없음.
- [x] 키보드 탭 이동/닫기/포커스 복귀와 좁은 화면/긴 이름 처리를 갖춘다.

## Validation

- `npm run typecheck`.
- `npx eslint components/common/ProjectSettingsDrawer.tsx lib/workspace/production/header-settings-demo.ts types/workspace-header.ts`.
- `git diff --check`.
- `rg -n 'useProjectPermissions|set-grants-batch|변경 저장|다시 불러오기|아직 연결' components/common/ProjectSettingsDrawer.tsx` — 일치 없음(exit1은 이 검증의 성공).
- `rg -n '기본정보|권한 부여|제출 마감 리마인더|수신 방식|aria-pressed|role="tab|onOpenChange' components/common/ProjectSettingsDrawer.tsx` — 내용 및 이벤트 연결 정적 검토.
- Node/tsx stdin으로 draft를 만들고 임의 입력/checkbox 변경 후 다시 create한 baseline이 원본과 동일하고 view/state를 변경하지 않았는지 deepEqual. PM fixed/check, complete↔done/rework↔redo 매핑도 확인한다. 검증 파일 생성 없음.

## Commit Message

```text
feat(settings): HTML 설정 탭과 임시 조작 시연을 적용

Plan: 2026-11-06-workspace-mfg-html-parity
Phase: P01-header-production
Task: T04-settings-demo

- 기본정보·권한·알림·로그 콘텐츠를 HTML 구조로 구성
- 설정 변경은 창 안에서만 유지하고 닫으면 초기화
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task 식별자의 한국어 커밋에 포함
