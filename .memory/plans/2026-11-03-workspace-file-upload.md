# Plan: 프로젝트 파일 업로드 자료함

- Date: 2026-11-03
- Status: done
- Decisions: [확정 결정](../decisions/2026-11-03-workspace-file-upload.md), D01~D19
- 작업 시작 기준: `dev`, HEAD `b2781b8`, origin/dev 대비 ahead 5. 기존 결정 문서만 untracked이며 구현 변경 없음.

## Goal

`/workspace/files`에서 프로젝트를 선택해 실제 문서와 웹 링크를 관리한다. 파일당 50MB·현재 목록 30개, IndexedDB 재접속 복원, 이전 회차 읽기 전용 보관, 최신 버전 참조, 참여자/PM/슈퍼 관리자 권한, PDF·TXT 미리보기와 원본 다운로드를 제공한다. 공통 인증 세션 자동 갱신도 Context에 반영한다. 기획의 3열 자료 구조를 Dadam 공통 UI로 구현한다.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 파일 자료함과 공통 인증 연결, 완료 6/6 | [P01](../phases/2026-11-03-workspace-file-upload/P01-file-workspace/phase.md) |

## Task 구조와 의존성

| Task | 결과 | 주요 변경 경로 | 선행 |
| --- | --- | --- | --- |
| T01 | 타입·Zod·권한·자료 버전 및 회차 전이 계약 | `types/workspace-files.ts`, `config/workspace-files.ts`, `config/workspace-projects.ts`, `lib/workspace/files/*` | 확정 결정 |
| T02 | 원본 Blob과 메타데이터를 함께 저장하는 IndexedDB 저장소·서비스 | `services/workspace/*`, `types/workspace-files.ts` | T01 |
| T03 | 최초 세션이 아닌 SessionProvider 최신 값 제공 | `components/providers.tsx` | T02 이후 순차 실행, 기능 자체는 독립 |
| T04 | 사용자별 런타임·Query·프로젝트 선택·읽기 가능한 자료함 | `hooks/workspace/*`, `components/workspace/*`, workspace route | T01~T03 |
| T05 | 다중 파일·웹 링크·설정·삭제/복원·회차/순서 변경 | 파일 자료함의 편집 컴포넌트·훅 | T04 |
| T06 | 실제 미리보기·다운로드·오류 처리·기획 대응 검증 | 파일 미리보기 컴포넌트·유틸, 검증 보고서 | T05 |

데이터 전이와 저장소를 UI 전에 고정한다. 화면·편집·미리보기는 각각 타입 검사 가능한 단위로 나눈다. 인증 수정은 기존 여러 화면에 영향을 주므로 독립 Task로 검증한다. 같은 파일 자료함을 구현하는 연속 작업이며 외부 서비스 승인·배포 경계가 없으므로 Phase는 하나만 둔다.

## 설계 핵심

- 사용자 namespace + 프로젝트 ID로 저장 범위를 고정한다. 관리자 mock의 고정 `u-self`를 영속 키로 사용하지 않는다.
- 프로젝트 상태 aggregate는 회차별 자료 목록과 불변 자료 버전을 보관하고 원본 Blob은 별도 object store에서 공유한다. 원본 50MB를 회차마다 복제하지 않는다.
- 변경 명령은 프로젝트 revision과 현재 회차를 검사한다. 두 탭에서 오래된 화면으로 저장하면 충돌을 알려주고 임의 재시도하지 않는다.
- 새 회차는 이전 유효 목록과 분류 순서를 계승한다. 삭제는 현재 목록에서 제거하는 작업이며 과거 회차의 참조는 남긴다.
- 동일 논리 자료당 현재 버전 한 개만 집계한다. 웹 링크·참조 제외 자료도 30개 한도에 포함한다.
- 조회/업로드는 참여자, 개별 편집은 소유자 또는 PM/슈퍼 관리자, 회차 생성·분류 순서 변경은 PM/슈퍼 관리자다. 과거 회차는 누구에게나 읽기 전용이다.
- 파일 선택과 드롭은 같은 검증 경로를 사용한다. 잘못된 파일을 알리지 않고 일부만 성공시키지 않는다.
- UI는 공통 Workspace 구성·Dadam 입력·SegmentedControl·ModalFrame을 사용한다. 중복 메뉴 제목과 시연 버튼을 추가하지 않는다.
- 후속 서버 연결을 위해 저장 계약을 분리하되 서버 권한·이관·Cosmos/Blob 설정은 이번에 수행하지 않는다.

## 기획 대응 및 제외 범위

포함: 3개 자료 영역, 분류 참조 순서, 다중 선택/드롭, 8종 자료 종류, 4종 참조 우선순위, 선택적 AI 지침/제안 문구, 종류·우선순위 일괄 적용, 설정/삭제/되돌리기, 회차 접기, 프로젝트 선택, 파일 정보·미리보기·다운로드, 링크/기간/활용 지침.

제외: 실제 검색·본문 수집·색인·AI 분석, KMS 연결, 실제 서버 저장·로컬 데이터 이관, Office/HWP 전체 미리보기, 실제 문서 쪽수 계산, 제작 완성본/리뷰/인용 흐름, 공유 프로젝트 참여자 관리 UI. 공통 인증 세션 연결은 사용자 추가 승인 D19에 따라 포함한다.

## Validation Policy

- 구현 시 각 Task의 정확한 명령과 정적 검토 기준을 따른다. 기본 `npm run typecheck`, `npm run lint`, 필요 경계에서 `npm run build`, `git diff --check`.
- `tests/` 생성·복원 금지. 기존 테스트를 삭제하지 않는다.
- 브라우저·CUA·E2E·스크린샷·브라우저 검증용 dev server 실행 제외. PDF 뷰어 호환성이나 시각 검증을 수행한 것으로 보고하지 않는다.
- 이 계획 단계에서는 명령을 실행하여 앱을 검증한 것이 아니다. 문서 링크·계약·경로·포인터만 검토한다.

## Commit / 실행 정책

- 실행 정책: 2026-11-03 사용자 지시에 따라 기존 T01 커밋은 유지하고 T02~T06은 완료 후 한 번에 커밋한다. Push 없음.
- 다음 `/memory-execute`에서 기본 프로젝트 순차 실행 규칙을 따르되, 사용자가 모든 Task 후 단일 커밋 등 방식을 지정하면 그 지시가 우선한다. 과거 다른 기능의 push 요청을 이번 변경의 push 승인으로 확대하지 않는다.
- 완료된 기존 계획 `2026-11-03-dashboard-bar-density`와 커밋 `b2781b8`은 보존한다. 새 current 포인터만 T01로 이동한다.

## Progress

- done: 6/6
- active: 없음 (전체 완료)
- T01: 자료 모델·권한·회차 전이 구현 완료. typecheck/lint 및 인라인 78개 경계 확인 통과.
- T02~T06: 저장소·인증·Query/화면·편집·미리보기 구현 및 검증 완료. 검증 보고서: ../reports/2026-11-03-workspace-file-upload-validation.md.
