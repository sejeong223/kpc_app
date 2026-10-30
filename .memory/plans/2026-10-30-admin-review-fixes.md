# Plan: 관리자 재검증 발견 사항 개선

## Goal
2026-10-30 재검증의 주요 결함 4개와 추가 개선 2개를 해결하고, 출력 파일·권한·편집 상태·모바일 화면·활동 집계에 대한 반복 가능한 검증을 남긴다.

## Source
- [확정 결정](../decisions/2026-10-30-admin-review-fixes.md)
- [재검증 보고서](../reports/2026-10-30-full-review.md)
- 사용자: 추천 범위 1(6개 개선+재검증, 보안 갱신은 후속) 선택.
- 기준 HEAD: `790835657f82a27871ff5e1ec80632ca115c69c7`. 기존 코드 검사는 57 files / 392 tests 통과했지만 아래 실제 동작 결함이 확인됐다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | 출력 보존·작업 상태·공통 화면 개선과 회귀 검증 | [P01](../phases/2026-10-30-admin-review-fixes/P01-admin-review-fixes/phase.md) |

## 작업 순서
| Task | 대상 | 주 수정 파일 | 완료 판단 |
| --- | --- | --- | --- |
| T01 | F01 같은 파일 최신 적용 | TemplateWorkService, work-policy | 선택하지 않은 슬라이드 XML 보존 |
| T02 | F03 PPT boolean | pptx-xml, template-read | true/1 및 false/0 동등성·상속·보존 |
| T03 | F02 편집 위치·포커스 | use-template-work, TemplateWorkbench, template-work 타입 | 저장·진행 갱신에서 UI 유지, 권한 회수는 즉시 차단 |
| T04 | 추가 관찰: 업로드 취소 | TemplateEditorDialog, import-session | 대기 중 UI 복구, 늦은 응답 무시 |
| T05 | F04 모바일 탭 | AdminTabs | 36개 화면 조합에서 문서 넘침 없음 |
| T06 | 추가 관찰: 활동 표시·집계 | audit-operation, selectors, AuditTable, exportAudit | 한국어 작업명·안정된 집계·원본 정보 보존 |
| T07 | 통합 재검증 | Playwright 설정/spec, 검증 문서·HTML | 전체 자동 검사·브라우저·출력 PPT 검사 후 단일 커밋 |

## 작업 단위의 근거
하나의 관리자 개선 마일스톤이므로 Phase는 하나다. Task는 출력 옵션, XML 판독, Query/뷰 수명, 업로드 수명, 공통 탭, 감사 표시라는 서로 다른 실패 원인으로 나눈다. 각 수정과 해당 단위 검사는 같은 Task에 두고, 실제 화면을 함께 확인하는 검증은 T07에 모은다. T01~T06에서 발견한 브라우저 확인 사항을 기록하고 T07에서 자동화한다.

## 범위와 유지할 계약
- mock 데이터, 실제 PPT 변환, 메모리 수명, 3단계 역할과 현재 ACL(현재 이용 권한) 검사 유지.
- 같은 파일 최신 적용은 작업 슬라이드 선택을 유지하되 등록 매핑은 최신값으로 갱신한다. 파일 교체는 기존 안내대로 초기화한다.
- 등록 자산 수정은 기존 결과를 자동 무효화하지 않는다. 명시적 최신 적용의 성공에만 refs/options/result를 함께 교체한다.
- 공유 디자인 편집은 선택 슬라이드와 무관하게 연결된 페이지에 적용된다. F01 검사에서는 sharedEdits=[]로 일반 요소 선택의 의미를 검증한다.
- 권한 없는 메뉴·버튼·데이터는 조건부 렌더링으로 차단한다. Query 캐시를 유지하기 위해 권한 경계를 완화하지 않는다.
- 기존 `AdminAuditEvent` 저장 구조를 바꾸지 않는다. 원본 detail과 사용자용 표시/집계를 분리한다.
- 보안 패키지 갱신·실제 인증/DB/Blob 연결·일반 제작 연결·브랜드 편집·대용량 엔진 개편은 제외한다.

## 검증 전략
1. 각 Task의 정확한 단위 검사와 typecheck/lint.
2. T07 전체 `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`.
3. 개발 의존성 `@playwright/test@1.64.1`을 추가하고 `npm.cmd run test:admin-review`로 실제 production UI 검사. 기존 node Vitest 검사는 유지한다.
4. 실제 입력/출력 PPT ZIP/XML 비교, 지원 가능한 환경에서는 PowerPoint 읽기 전용 열기·렌더링. 실행하지 못한 검증은 이유와 한계를 기록한다.
5. 6개 메뉴 × 6개 해상도, 키보드·권한 전환·업로드 취소 경합·버전 보존 검증. 필수 회귀 실패를 skip/timeout 증가로 통과 처리하지 않는다.

## 커밋·기존 작업 보존
기존 선호대로 실행 중 중간 커밋은 하지 않고 각 Task에 `commit: deferred (통합 커밋 대기)`를 기록한다. 모든 Task 검증이 끝난 뒤 이번 범위만 한 번 커밋한다. push는 범위 밖이다.

```text
fix(admin): 재검증에서 발견한 PPT 보존·편집 상태·관리 UI 개선

Plan: 2026-10-30-admin-review-fixes
Phase: P01-admin-review-fixes
Tasks: T01-T07

- 최신 적용 범위와 PPT 속성 판독 보완
- 편집 상태·업로드 취소·모바일 탭 개선
- 활동 표시와 집계 통일 및 브라우저 회귀 검사 추가
```

기존 Task 10개에 남은 commit SHA 기록 변경 및 `package-lock.json`의 libc 30줄 삭제는 선행 변경이다. 설치 전에 diff를 기록하고 새 개발 의존성 변경과 구분한다. 기존 lock 변경을 삭제하거나 통합 커밋에 우연히 섞지 않는다. 이전 계획은 done 10/10을 유지하며, 더 이전 관리자 T09는 미완료로 보존한다.

## 후속 관리
- [후속 목록](../reports/2026-10-30-admin-review-followups.md): 보안 의존성 영향 분석·업데이트, 실제 인증, 대용량 성능 등. 이번 Active Task 목록에는 포함하지 않는다.
- [계획 조사·검증 근거](../reports/2026-10-30-admin-review-plan-notes.md).

## 최종 실행 결과
- T01~T07 done 7/7. 중간 커밋 없이 단일 통합 커밋. 실제 SHA는 current의 사후 기록 참조.
- 단위·통합 444개, Chromium 47개, typecheck/lint/build 통과. PPT 8개 PowerPoint 열기·32장 렌더링 통과.
- [검증 보고서](../reports/2026-10-30-admin-review-fixes-validation.md), [디자인 컴포넌트 HTML](../reports/2026-10-30-skill-template-design-components.html).
