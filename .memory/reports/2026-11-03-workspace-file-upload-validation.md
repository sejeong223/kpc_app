# 프로젝트 파일 업로드 자료함 구현·검증 결과

- 날짜: 2026-11-03
- 계획: `2026-11-03-workspace-file-upload`, T01~T06 완료.
- 이번 실행: 기존 T01 커밋 `04adfaf`를 유지하고 T02~T06을 순차 구현·검증한 뒤 한 번에 커밋한다. Push는 수행하지 않는다.
- 기준: 확정 결정 D01~D19, 첨부 기획 HTML의 `wsFiles`, `drawRefModal` 구성을 소스로 읽어 대조했다. HTML은 실행하지 않았다.
- 서버·AI·검색은 연결하지 않았다. 프로젝트/참여자는 기존 RFP mock 카탈로그, 등록한 실제 파일과 설정은 사용자·프로젝트별 IndexedDB에 보관한다.

## 기획 대응

| 항목 | 구현 및 근거 |
| --- | --- |
| 프로젝트 선택·마지막 선택 복원 | `components/workspace/ProjectSelector.tsx`, `FilesWorkspace.tsx`, namespace별 preferences. 다른 탭의 선택 갱신으로 현재 편집 프로젝트를 바꾸지 않는다. |
| 3개 자료 영역·참조 순서·개수 | `FileCategoryPanel.tsx`, `FileRoundSection.tsx`: 제안 관련 자료/유관자료/웹 검색, 분류별 개수, 현재 자료 30개 사용량 표시. |
| 순서 드래그·키보드 이동 | 현재 회차 PM·슈퍼 관리자만 핸들/앞·뒤 버튼 노출. `application/x-kpc-file-category`와 파일 드롭을 구분한다. 성공 전 저장 순서를 바꾸지 않는다. |
| 다중 파일 선택·드롭 | `FileUploadDialog.tsx`: 동일 대기 목록 검증 경로. 잘못된 파일도 이유와 함께 표시하고 제거하도록 한다. 일부 자동 성공 없음. |
| 종류 8개·우선순위 4개 | `config/workspace-files.ts`, `FileReferenceFields.tsx`: 기획의 한글 레이블·순서·우선순위 의미를 재사용한다. |
| 일괄 적용·개별 설정 | 다중 파일의 종류/우선순위를 한 번에 지정한 뒤 각 파일에서 다시 수정할 수 있다. |
| 활용 지침·제안 5개 | 접는 지침 입력, 줄바꿈으로 제안 추가, 4,000자 초과 오류 및 저장 차단. |
| 웹 링크·기간 3개·지침 | `WebReferenceDialog.tsx`: HTTP(S) URL 정규화, 전체/최근 1년/최근 3개월. 웹 조회는 새 탭의 안전한 링크와 저장된 정보만 제공한다. |
| 설정·삭제·되돌리기 | 현재 참조만 새 버전으로 교체. 삭제 확인 후 15초 되돌리기. 서버 검색/분석 실행으로 표현하지 않는다. |
| 회차별 보관·다음 회차 | 현재 회차 우선 펼침, 이전 회차 접힘. 새 회차는 자료·순서를 계승하며 이전 회차는 읽기 전용이다. |
| 자료 상세·실제 원본 | `FilePreviewDialog.tsx`: 실제 PDF/TXT 미리보기, 파일/웹 메타데이터·지침. Office/HWP 등은 원본 다운로드. |
| 디자인 컴포넌트 | WorkspacePage/Card, DadamThemeScope/Controls, SegmentedControl, ModalFrame 재사용. 페이지 여백은 기존 토큰, 1/2/3열 반응형 배치. 중복 메뉴 제목 없음. |

제외 항목은 확정 결정에 따른다. `샘플 추가`, 고정 미리보기 본문, 비활성 검색어·검색 결과·KMS 흐름을 추가하지 않았다. `projMB:300`, 웹 결과 수, KMS 건수는 새 정책으로 채택하지 않았다. 문서당 300쪽은 권장 안내이며 실제 쪽수 분석은 하지 않는다.

## 권한·회차·무결성 검토

| 조건 | 처리 | 검증 방식 |
| --- | --- | --- |
| 비참여 사용자 | 프로젝트 조회/변경/원본 읽기 거부 | T01 인라인 확인, 저장소/서비스 정적 추적 |
| 참여 사용자·다른 참여자 | 읽기/추가 허용, 본인 자료만 관리 | T01 인라인 확인, 액션 조건부 렌더링 검토 |
| PM·슈퍼 관리자 | 모든 자료 관리, 새 회차·분류 순서 변경 | T01 인라인 확인, UI→서비스→도메인 경로 검토 |
| 과거 자료 편집 | 현재 버전이 있으면 해당 버전, 없으면 가장 최근 보관 버전을 새 현재 버전으로 생성. 소유권 유지 | T01 인라인 확인, FilesWorkspace의 편집 대상 선택 검토 |
| 편집·복사 취소 | 입력만 폐기, 저장 명령/원본 생성 없음 | UI 명령 호출 지점 정적 검토 |
| 자료 수 | 파일/웹/참조 제외를 현재 entry 개수로 집계. 과거 버전은 중복 가산하지 않음 | T01 30/31개 경계 확인, T06 31개 batch 거부 확인 |
| 동일 이름 파일 | 별도 asset/Blob ID로 보관, 자동 덮어쓰기 없음 | T06 저장소 인라인 확인 |
| 회차 생성/설정 편집 | 봉인된 회차와 원본 유지. 새 Blob 복제 없이 버전/entry 변경 | T01/T02 인라인 확인 |
| 삭제·undo·GC | 현재 entry 제거, 저장된 삭제 기록으로만 복구. 만료 후 다음 성공 변경에서 미참조 원본 정리 | T01/T06 인라인 확인 |
| 두 탭 저장 | 같은 revision에서 한 번만 성공, 다른 명령은 CONFLICT. 폼 유지, 명시적으로 초안을 버린 뒤 최신 자료 재조회 | T02 동시 요청 자동 확인, UI 정적 검토 |
| 입력 보호 | 모달 닫기/취소, 프로젝트 선택, 앱의 일반 링크, beforeunload 확인. modifier/새 탭/다운로드/같은 페이지 hash는 제외 | 이벤트 및 정리 경로 정적 검토 |

## 저장소·수명·인증 검토

| 경계 | 결과 |
| --- | --- |
| 원자적 저장 | projects+blobs readwrite 트랜잭션. 모든 쓰기/삭제가 성공한 oncomplete에서만 반환. 두 번째 Blob 저장에 QUOTA를 주입해 첫 Blob과 메타데이터도 남지 않는 것을 확인. |
| 재접속 | 저장소 인스턴스를 닫고 다시 생성해 회차/원본 바이트/마지막 프로젝트 선택이 동일함을 확인. |
| 미지원/blocked | DB_UNAVAILABLE, DB_BLOCKED로 구분. blocked 뒤 늦게 열린 연결도 닫는 것을 모의 요청으로 확인. 실제 브라우저 차단 상태 실측은 제외. |
| 손상/누락 | 손상된 project wrapper를 빈 상태로 덮어쓰지 않음. 원본 삭제 후 ORIGINAL_MISSING. 회차에 없는 versionId로 읽기 거부. |
| 선택 저장 실패 | preferences 쓰기 QUOTA 발생 시 기존 선택 유지 확인. |
| 사용자 격리 | `[namespace,projectId]`, `[namespace,projectId,blobId]` 키. 다른 identity의 자료·선택은 분리됨을 확인. |
| 세션 변경·StrictMode | fileIdentityKey 및 useId 기반 Query 범위, createDisposalLease 재사용. 폐기 시 서비스 종료·자신의 query/mutation만 정리. StrictMode의 실제 UI 재마운트는 실행하지 않고 수명 코드를 검토. |
| 미리보기 종료·늦은 응답 | 요청 key 변경 시 File 상태 초기화. effect별 active/generation 검사, 채택되지 않은 PDF URL 폐기, 다운로드 disposer 일괄 해제. 실제 React/브라우저 경합은 정적 검토. |
| 인증 갱신 | SessionProvider 내부 useSession bridge. 정상 최신 data, 역할/ID 변경, null/error 반영. 갱신 중 정상 data가 남아 있으면 유지. 최초 props.session fallback 없음. |
| 인접 기능 | 기존 admin/comment identity 파생·서버 guards·프로필·사이드바 소비 지점 검토. API/서버 claim·CSP·기존 관리자 seed·DB는 변경하지 않음. |

## 실제 실행한 검증

| 실행 | 결과 |
| --- | --- |
| `npm run typecheck` | 최종 코드 통과 |
| `npm run lint` | 최종 코드 오류·경고 없이 통과. 작업 중 발견한 신규 Hook 경고 2건은 수정 후 재검증. |
| `npm run build` | 최종 Next.js 빌드 통과, `/workspace/[screen]` 포함. 기존 baseline-browser-mapping 데이터 노후 경고는 남아 있으며 의존성을 임의 업데이트하지 않음. |
| `git diff --check`, 최종 staged diff 확인 | 공백·변경 범위 확인 |
| Node + 설치된 tsx/fake-indexeddb 인라인 실행 | T02 원본/선택 재접속, 과거 회차 보호, 동시 충돌, 사용자 격리, dispose 및 QUOTA 롤백 확인 통과. |
| 최종 저장소 오류 인라인 21개 조건 | 미지원/blocked·늦은 연결 정리, batch 부분 저장 롤백, 31개/50MiB 제한, 잘못된 입력, 동명 파일 분리, 삭제/undo/만료 GC, 원본 누락, 선택 실패, 손상 row 거부 통과. |
| 미리보기 유틸 인라인 23개 조건 | UTF-8/BOM/UTF-16LE·BE, 잘린 멀티바이트 문자, 잘못된 인코딩, PDF 헤더, 미지원 형식, object URL의 중복 정리, 다운로드 파일명·임시 anchor 정리 통과. DOM 다운로드는 최소 대역 객체로 확인. |
| T01 기존 검증 | 별도 T01 커밋에 기록된 순수 도메인 경계 78개. 이번에는 오류 코드 전달을 보완하고 위 저장소 경계로 확인. |

인라인 검증 코드는 파일로 생성하지 않았다. 확장 검증 스크립트의 비동기 구문 오류 1회는 수정 후 다시 실행해 통과했다. 이를 앱 코드 오류나 통과한 검증으로 혼동하지 않는다. `tests/`, 새 검증 패키지, 브라우저, CUA, Playwright, dev server, 스크린샷은 사용/생성하지 않았다.

## 초급 개발자용 변경 노트

- `IndexedDbFileRepository.ts`: 원본과 메타데이터가 함께 저장되게 한다. request 성공은 트랜잭션 전체 성공이 아니므로, 아래 완료 이벤트에서만 결과를 반환한다.

```ts
tx.oncomplete = () => {
  this.transactions.delete(tx);
  if (generation !== this.generation) reject(cancelled());
  else if (result) resolve(result.value);
  else reject(storageError(null));
};
```

- `WorkspaceFileService.ts`, `use-workspace-files.ts`: UI가 DB를 직접 다루지 않게 경계를 둔다. 목록 Query는 메타데이터만, 실제 File은 수명이 짧은 mutation/모달 상태에서만 다룬다.
- `FilesWorkspace.tsx`와 Dialog/Card/Panel 컴포넌트: 화면 조합과 개별 입력·표현을 나눠 디자인 교체 범위를 줄인다. 편집창을 열 때의 revision/회차를 보관하므로 백그라운드 갱신이 사용자 입력을 덮어쓰지 않는다.
- `components/providers.tsx`: 최초 로그인 정보가 아니라 SessionProvider가 갱신한 세션을 공통 Context로 전달한다.
- `preview.ts`, `use-file-preview.ts`: 읽기 가능한 양만 디코딩하고 모달 종료나 요청 변경 시 URL과 File 참조를 정리한다. PDF 헤더 확인은 전체 파일 검증이나 악성 문서 검사가 아니다.

## 미실시·후속 범위

- 실제 브라우저의 영속성·저장 용량·PDF 뷰어·OS 다운로드, DnD·키보드 포커스·반응형 육안 검증, 실제 로그인/시간 경과/탭 간 인증 갱신은 수행하지 않았다.
- TXT는 UTF-8, UTF-8 BOM, BOM 기반 UTF-16LE/BE를 지원한다. CP949 등 모든 인코딩 지원을 보장하지 않는다.
- 로컬 브라우저 저장 데이터는 공유 서버 데이터가 아니다. 브라우저 데이터 삭제/기기 변경에 따른 손실 방지, 서버 권한, 서버 이관, Cosmos DB·Blob Storage 연결은 후속 작업이다.
- SPA 브라우저 뒤로/앞으로 전체 차단은 구현·검증하지 않았다. 전역 History API나 비공개 Next 라우터를 패치하지 않았다.
- 범위 밖 추가 발견: 기존 baseline-browser-mapping 노후 경고 외 특이사항 없음. 공통 인증 갱신 수정은 승인된 T03 범위 안에서 처리했다.
