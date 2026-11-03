# Plan: 프로젝트 목차·제작·회차 통합

- Date: 2026-11-03
- Status: done
- Decisions: [확정 결정](../decisions/2026-11-03-workspace-toc-production.md) D01~D21
- Baseline: 파일 자료함 완료 커밋 `6f517d1`; 이전 완료 계획·검증 기록은 유지한다.
- 실행 완료: 3 Phase·12 Task 구현/검증. [기획 대응·검증·인수 기록](../reports/2026-11-03-workspace-toc-production-validation.md).

## Goal
파일 업로드·목차·제작 설정·제작이 동일한 프로젝트/회차를 사용한다. 실제 편집과 로컬 저장, 등록 Template/Skill 기반 PPTX 출력, 외부 수정본 내용 비교, 완료본 불변 보관과 재작업을 제공한다. AI/요구사항 분석은 mock이며 실제 파일 분석 완료로 표시하지 않는다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 프로젝트 데이터·권한·원자적 저장 | [P01](../phases/2026-11-03-workspace-toc-production/P01-project-foundation/phase.md) |
| P02 | `done` | PPT 제작·왕복 비교 엔진 | [P02](../phases/2026-11-03-workspace-toc-production/P02-pptx-production/phase.md) |
| P03 | `done` | 목차·제작 화면 통합과 검증 | [P03](../phases/2026-11-03-workspace-toc-production/P03-workspace-ui/phase.md) |

## 실행 순서와 분할 근거
1. P01은 UI와 무관한 상태·권한·저장 계약을 완성한다. 기존 파일 DB를 보존하고 파일/제작 회차 변경을 같은 트랜잭션에서 수행한다.
2. P02는 ZIP/XML·템플릿 원본·역할 매핑을 다루는 별도 도메인이다. 가짜 다운로드 없이 실제 PPT 바이트의 생성·왕복 비교를 검증한 뒤 화면에 노출한다.
3. P03은 검증된 서비스에 공통 UI를 연결하고 전체 기능을 확인한다. Phase는 물리적인 데이터/파일 엔진/UI 경계로만 나누며 세부 작업은 Task로 둔다.
- 총 12 Task. 순차 실행하며 선행 Task의 계약은 다음 청사진에 필요한 범위로 다시 적는다.
- 모든 Task done. 현재 활성 Task 없음.
- 실행 시 최신 사용자 요청: 모든 Task 후 단일 커밋. 중간 커밋 없이 함께 기록하며 push하지 않는다.

## 데이터·저장 불변 조건
- 로컬 DB `kpc-workspace-files`를 v2로 확장한다. 기존 `projects/blobs/preferences`를 유지하고 `workspaces/workspaceBlobs`를 추가한다. 기존 파일 원본/키/선택 상태를 지우지 않는다.
- 기존 FileProjectState schemaVersion=1과 현재 파일 회차의 sealedAt=null 규칙을 유지한다. 제작이 completed일 때 파일 변경은 동일 DB의 workspaces 상태로 차단한다. 다음 회차 전환 시 이전 파일 회차를 봉인한다.
- 새 파일/제작 변경은 project revision과 file revision을 필요한 경계에서 함께 확인한다. 메타데이터·Blob·회차 변경은 원자적으로 커밋한다.
- 과거 완료본과 미완성 이력은 구별한다. 과거 자료만 존재하는 회차에 제작 완료본을 소급 생성하지 않는다.
- 기존 `kpc-pin-comments`는 삭제·자동 이관하지 않는다. 이전 의견 조회는 read-only이며 새 사용자에게 seed를 생성하지 않는다.
- 저장된 프로젝트 사본은 유지한다. 관리자 카탈로그 전체 영속화는 제외하며, 원본 자산/현재 권한 미확인 상태에서는 재선택 안내와 제한 상태를 제공한다(D21).

## 전체 기획 대응
| 영역 | 기능 | 담당 Task |
| --- | --- | --- |
| 목차 | 대/소목차 CRUD·접기·이동·담당/리뷰·상태·집계·AI 제안 | P01-T01, P03-T02 |
| 체크리스트 | 항목/근거/담당·확인자/시간·추가/삭제/undo | P01-T01, P03-T02 |
| 관리 권한 | PM/슈퍼 고정 전체, 참여자별 5개 관리 권한 | P01-T01, P03-T02 |
| 자산 설정 | 공개 자산 사용·버전 고정·최신 재적용·프롬프트 상속/매핑 | P01-T03, P03-T02 |
| 제작 | 제목/본문/목록/표·썸네일·복사/붙여넣기·패널·출처 | P02-T01, P03-T03 |
| AI 비교 | mock 생성·다듬기/점검·다중 요청·적용/유지/재생성 | P02-T03, P03-T05 |
| 의견 | 핀·스레드·답글·멘션·해결/재열기·이전 의견 | P01-T01/T02, P03-T04 |
| 회차 | 경고 후 완성·완성본 보관·통합 재작업·고정 해제 | P01-T01/T02, P03-T05 |
| PPT | 실제 출력·버전·원본 보관·텍스트/표 비교 및 선택 반영 | P02-T01/T02/T03, P03-T05 |
| 기존 파일 | 자료함 기능 유지·공통 프로젝트 선택/회차 전환 | P01-T02, P03-T01/T05 |
| 공통 UX | Dadam 컴포넌트·여백·반응형·미저장 보호·오류/재시도 | P03-T01~T05 |
| 검증 | 이관/권한/불변 보관/충돌/PPT 연결/기획 매핑 | 전 Task, P03-T06 |

## Validation Strategy
- 구현 단계: `npm run typecheck`, 범위별 `npx eslint …`, 마지막 `npm run lint`, `npm run build`, `git diff --check`.
- 기존 tsx/fake-indexeddb/jsdom/JSZip을 이용한 인라인 검증만 필요한 계약에 사용한다. `tests/` 생성·복원 및 새로운 테스트 도구 설치 금지.
- 모든 청사진에 실행할 커맨드와 케이스·성공 조건을 적는다. 브라우저/CUA/E2E/스크린샷/검증용 dev server 실행 제외.
- 실제 PowerPoint·브라우저 동작을 확인했다고 보고하지 않는다. 자동 검증으로 보장한 범위와 남은 시각적 한계를 최종 보고한다.
- 계획 검증은 문서 링크/Task 섹션/상태/현재 포인터/변경 경로 검사뿐이며 앱 테스트 통과로 기록하지 않는다.

## 범위 밖과 발견 사항
- 사용자 추가 답변(D21): 관리자 목록·원본 전체 영속화는 이번에 추가하지 않는다. 프로젝트 사본만으로 최신 권한을 추정하지 않는다.
- 서버/Cosmos/Blob/AI/RAG/실시간 협업/실제 알림·메일 전송, 관리자 카탈로그 전체 영속화, 별도 검토·제출 화면의 PDF·제출 패키지는 후속.
- `AdminRuntimeProvider`의 mock ID와 프로젝트의 실제 사용자 ID가 다르므로 명시적 adapter를 둔다. 관리자 CRUD 권한을 넓혀 해결하지 않는다.
- 기존 CommentScope의 surfaceId 고정과 AppShell 의존을 새 프로젝트 의견 저장 키에 재사용하지 않는다. 새 UI에 필요한 부분만 연결한다.
- 브라우저 검증 제외·tests 생성 금지는 기존 [지속 정책](../decisions/2026-10-30-task-validation-policy.md)을 유지한다.

## 계획 작성 당시 문서 검증 (실행 전 기록)
- 2026-11-03: 결정/로드맵/Phase/Task/current 총 18개 문서, 3 Phase·12 Task의 섹션·상태·커밋 식별자·상대 링크·코드 fence·후행 공백 검사 통과.
- 전체 Task pending, 첫 포인터 P01-T01. current.md는 기존 .gitignore 정책상 로컬 전용이며 정책을 변경하거나 강제 추적하지 않았다.
- 수정 범위는 .memory 문서뿐이다. 앱 테스트·빌드·브라우저 검증을 실행하지 않았으며 실행 단계의 검증 명령만 청사진에 작성했다.


## 실행 완료
- 2026-11-03: 12/12 Task 완료. 전체 typecheck/lint/build/diff 검사 통과. 기획 요소별 자동/정적 검증 근거와 시각 실기 제외 범위를 보고서에 기록했다.
- local current.md는 완료 상태로 갱신하고 기존 ignore 정책을 유지한다. 최종 커밋은 이 계획의 전체 구현/검증/문서를 포함하는 한 개이며 push는 하지 않는다.
