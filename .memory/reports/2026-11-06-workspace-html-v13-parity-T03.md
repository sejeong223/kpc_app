# T03 제작 중앙 편집·코멘트 도구 결과

- Date: 2026-11-06
- Result: 구현·검증 완료

ProductionToolbar는 대목차 breadcrumb와 소목차 팝오버, 담당자·미처리 의견·작성 상태, 목차 관리 이동을 제공한다. 이동은 기존 navigation guard를 거치고 상태 변경·고정 해제는 기존 권한과 명령을 사용한다. 섹션별 key로 빈 소목차 사이를 이동해도 이전 팝오버가 다시 열리지 않게 했다.

ProductionWorkspace와 ProductionPanels에서 상단 도구·입력 영역과 하단 슬라이드 스크롤을 분리했다. 상단은 최대 높이 55%에서 자체 스크롤하고 하단의 `data-production-scroll`이 실제 슬라이드와 코멘트의 좌표 기준이다. SlideContentEditor의 rich document와 단일 useSlideDraft 소유자를 유지해 제목·리딩·문단·리스트·표·이미지 및 미저장 입력을 보존한다. 다중 선택에서도 dirty editor를 unmount하지 않는다.

CommentCreateButton과 SlideCommentSurface는 생성 도구의 표시 위치만 분리한다. ProductionPreview, BasicSlidePreview, HtmlDemoSlidePreview와 Template 직접 분기 모두 target을 전달한다.

```tsx
{commentCreateTarget && createButton && createPortal(createButton, commentCreateTarget)}
```

버튼은 기존 surface 컴포넌트가 소유하고 상태 선택 왼쪽 슬롯에 표시한다. target의 undefined는 기존 하단 도구, null은 도구 생략, HTMLElement는 상단 portal이다. useId·aria-controls·requestPinMode와 실제 surface의 가시성·권한 검사는 유지한다. 닫기·삭제 후 포커스는 사용 가능한 핀 → 생성 버튼 → 해당 surface 순으로 복귀한다.

다중 선택은 현재 슬라이드를 먼저 표시하고 나머지는 목록 순서를 따른다. 현재 슬라이드만 상단 생성 버튼을 사용한다. 나머지 카드의 선택에서 빼기와 Escape는 기존 guard/선택 경로를 사용한다. ProductionAiPanel은 HTML 문구와 입력 형태를 적용하되 기존 제안 비교·선택 적용을 유지한다.

## Validation

- `npm.cmd run typecheck`: 통과.
- `npm.cmd run lint`: 전체 통과. 최종 섹션 key 보완 후 ProductionWorkspace 대상 lint도 통과.
- `npm.cmd run build`: 통과. 최종 key 보완 후 재빌드도 exit 0으로 완료했다.
- `git diff --check`: 공백 오류 없음.
- 참조 HTML SHA256은 계획 기준과 동일하다. Downloads 원본은 수정하지 않았다.
- tests/ 생성·복원, 브라우저/CUA/E2E/dev server/스크린샷 검증은 하지 않았다. 시각 일치와 실제 마우스 조작을 검증한 것으로 해석하지 않는다.

## 정적 경로 대조

| 경우 | 확인한 코드 계약 |
| :--- | :--- |
| 단일 Basic/HtmlDemo/Template | 세 분기 모두 동일 target 전달, thumbnail에는 surface 없음 |
| 다중 2/3장·현재 항목이 목록 중간 | active-first 정렬, 중복 제거, 나머지 target=null |
| 선택 2→1·Escape | guarded/selectIds/chooseSlide 재사용, 빈 선택 금지, 입력·IME·댓글·메뉴 이벤트 제외 |
| 빈 소목차 | 안내와 목차 관리 경로, 이전 섹션 팝오버 상태 제거 |
| dirty+다중·저장 충돌 | ActiveSlide 단일 소유자, dirty 입력 보존, DraftProtection 및 conflict 검사 유지 |
| IME·붙여넣기·Ctrl+S | 기존 rich editor 파싱/조합 상태와 canSave 유지, 다중 요청은 조합 중 Enter 제외 |
| snapshot·완성·담당 변경 | safeView/can/readOnly/실제 capability를 사용, 버튼 이동으로 쓰기 권한 확대 안 함 |
| 회차 변경·접근 거절 | sessionConflict와 dirty 입력 보관, 미리보기/제안/수정 노출 제한 유지 |
| 핀 생성 중 이동·offscreen | navigation guard와 surface cleanup, visibleBounds·suspendSlide 유지 |
| 팝오버 Escape·삭제 | 실제 핀/버튼 존재·활성 여부 확인 후 포커스 fallback |
| 패널 폭·스크롤 변경 | 기존 ResizeObserver와 새 하단 scroller 관측, 비율 좌표 계산 유지 |

위 표는 소스와 이벤트 경로를 검토한 결과다. 실행 중 UI 조작 검증 결과는 아니다.

## 알아야 할 점

HTML 시연의 예시 데이터·전역 상태·타이머 대신 실제 프로젝트 저장·권한·제안 비교 흐름을 사용한다. 알림/활동 로그와 RFP 원문 신규 연동은 확정한 제외 범위를 유지했다. 서비스·저장 모델·의존 패키지 변경은 없다.

빌드에서 기존 baseline-browser-mapping 데이터 갱신 안내가 출력되었지만 빌드 실패는 없었다. 이 UI 작업 때문에 패키지를 변경하지 않았다. 요청 밖 새 발견사항은 없다.
