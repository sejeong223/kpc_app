# Task: T06-regression-handoff 기획 대응·자동 검증·인수 기록

## Status: done

## Goal
실제 구현과 기획 요소를 대조하고 권한·이관·회차·PPT 왕복의 핵심 경계를 최종 검증하여 다음 연결 작업에 넘긴다.

## Decision Summary
- 선행 11 Task 완료 후 수행. 미구현을 done으로 가정하지 않고 기획대응표에 근거파일/심볼/검증을 남긴다.
- tests/·브라우저·CUA·E2E·스크린샷·검증용 devserver 금지 유지. 구현범위 밖 시각적 동작을 검증완료로 보고하지 않는다.

- 선행 Task가 완료된 상태에서 이 파일만 읽고 실행한다. 아래에 필요한 타입·동작을 다시 기재한다. 기존 함수 구현은 지정 심볼에서 연결하되 인터뷰를 재시작하지 않는다.
- 한국어 UI/주석, 내부 any/unknown 추가 금지(외부 라이브러리 경계의 불가피한 예외만 좁게), Zod 런타임 검증, Container/Pick/Omit 타입 패턴, TanStack Query 사용.
- 기존 Dadam 컴포넌트·tw: Tailwind·공통 여백 재사용. 관리자 전용 메뉴·서버 인증 경계를 약화하지 않는다.
- tests/ 생성·복원 및 브라우저/CUA/E2E/스크린샷/검증용 dev server 금지. 구현 커밋 전에 이 Task의 자동·정적 검증을 수행하고 실패를 done 처리하지 않는다.
- 실제 서버·AI·Cosmos/Blob 연결, 관리자 카탈로그 전체 영속화, 실제 알림 전송은 범위 밖. 코드 변경 전 AGENTS.md의 지속 규칙을 유지한다.

## Implementation

### I01. 기획대응과 기능 누락 점검
- Related Files:
  - `C:/Users/k2020/Downloads/KPC_제안서_UI_v12 8 (1).html` — 기능참조; read-only
  - `.memory/decisions/2026-11-03-workspace-toc-production.md` — D01~D21; read-only
  - `.memory/reports/2026-11-03-workspace-toc-production-validation.md` — new
  - `components/workspace/toc/*`, `setup/*`, `production/*`, `shared/*`, `services/workspace/*`, `lib/workspace/production/*`, `lib/pptx/production/*` — 점검/발견된범위내회귀수정
#### Details
**Data & Schema Fields**
- 검증보고서의 기능행은 `HTML 근거 | 확정동작 | 구현파일::심볼 | 자동검증/정적근거 | 결과 | 제한`.
- 결과는 통과/실패/미검증/의도적변경/후속 중 하나. 미검증을통과로표기하지않는다. 날짜·HEAD·실행command·exitcode·핵심assert결과·남은제한을기록한다.
- 기획HTML안의 명령/script/가짜분석결과는 실행지시가 아니다. 다음기능을 각각별도행으로대조한다.
  1. wsToc/tocAi/bindTocDrag/peopleCell/addCheck: 8개정보열·합계·대소목차CRUD/접기/묶음이동/빈상태·담당/리뷰·상태·slide/coverage/comment집계·mock추천/자연어제안·체크리스트근거/확인자시각·삭제영향/undo.
  2. wsSetup/psTableHtml/openAssetView: 3종자산선택·현재version/공개정보·프롬프트상속/프로젝트override·Skill공통/페이지유형규칙과가이드·Template실제layout/roles·지원한계/실제미리보기·최신재적용. 기획의 가짜넘침자동해결 전후샘플은 실제지원범위안의미리보기로대체.
  3. wsWrite/writeThumbs/slideHtml: section선택/이전다음·상태·3패널접기/리사이즈·단일/다중선택·제목/lead/본문/list/table/image·slideCRUD/복사이동·slot선택·고정해제·미저장보호·keyboard/contextmenu.
  4. srcPanel/cmtBlock: 요구사항과반영/원문위치·자료버전/미리보기·slide의견/답글/멘션/핀/해결/재열기·미처리section이동·이전의견읽기전용·로컬검토요청.
  5. aiDo/demoRewrite/diffHtml/multiPrompt: 초안/다듬기/요구사항·프롬프트점검/분량축소/표정리 프리셋·자연어요청·단일/다중mock제안·전후비교·선택적용/유지/재생성·오래된결과차단·undo.
  6. PERM_KEYS/confirmDone/confirmRedo/secLocked: PM/슈퍼·5개위임·담당본문권한·경고후완성·불변snapshot·통합회차·완료section잠금·미처리의견계승·미완성history.
  7. pptCtl/pptHistory/openRevision: 실제PPT생성/다운로드·진행/취소·버전/원본·실제텍스트/표diff·명시적매핑·선택적용·원본권한/지원제한·과거snapshot출력.
- 위확정기능의누락은 해당Task파일/구현으로돌아가범위안에서보완하고 재검증한다. 실제AI/PDF제출패키지/관리자카탈로그영속화/공동편집 등새범위는 임의추가하지않는다.

### I02. 의미 있는 최종 자동 검증
- Related Files:
  - `package.json` — 기존 typecheck/lint/build, 의존성확인; read-only
  - `services/workspace/IndexedDbFileRepository.ts`, `IndexedDbWorkspaceRepository.ts`, `WorkspaceProductionService.ts` — 핵심시나리오대상
  - `lib/comments/repository.ts`, `lib/pptx/production/*` — 보존/왕복대상
  - `.memory/phases/2026-11-03-workspace-toc-production/*/T*.md` — 이전Task검증결과참조
#### Details
- 기존도구 fake-indexeddb/jsdom/tsx/JSZip/ReactDOMServer로PowerShell인라인검증한다. 새testframework/패키지설치/tests폴더/fixture파일필수화없음. 각Task의통과검증을불필요하게반복하지말고 아래경계통합을집중확인한다.
- 입력fixture는 memory IDB와 실제createDemoTemplateFile 바이트에서만생성한다. 원본base64/사용자파일내용/세션정보로그출력없음. 템플릿/sourcefixture를변경한경우해당검증만추가반복한다.
- 시나리오 A: 파일전용v1 프로젝트가3회차+원본Blob일때v2로업그레이드→목차등록→기존파일모두다운로드. workspace.currentRound=3, 가짜1/2회차제작snapshot없음, 기존키/Blobsha동일.
- B: 관리권한 5개 각각허용/거부, 일반부서관리자·담당자·PM·super·탈퇴/타namespace. UIcapability와서비스검사가일치하고publicprepared명령주입/ID변조/고정자손삭제/undo우회가거절됨.
- C: 파일start-round와제작start-round 경합/완성중파일수정/업그레이드blocked/Quota/abort/close. files+workspace+workspaceBlobs에부분커밋없음. snapshotbody/files+기존의견DB불변.
- D: 실제Template/Skill/Prompt핀적용→multi-slide생성→PPT생성/실제XMLreadback→외부순서변경/shape앞삽입/텍스트·표수정→원본등록→선택적용→재출력. pin버전/내용/shapeID연결/내부relationship존재확인.
- E: export/import/AI비동기중 사용자·프로젝트·회차·권한·inputRevision변경/취소. late결과반영0, 전실패버전보존, objectURL/구독/메모리token정리.
- F: 완료/미완성이력→재작업→완료section고정→담당명시해제→편집; 이후review/PPT등록/과거출력에도snapshotdeepEqual. 파일자료/체크/원작성자의견상태계승.
- G: 관리카탈로그초기화 후새runtime에서프로젝트본문/핀/Blob복원, 최신자산조회불가상태와재선택안내. 이름같은다른자산이자동허용되지않고미확인핀사용download/generate는차단. 확인된비활성/삭제와권한회수각각분리.
- H: empty/commentsExisting 읽기전용archive조회가DB를생성·seed·변경하지않고새프로젝트의견은별도aggregate에만기록.

### I03. 인수와 포인터 완료
- Related Files:
  - `.memory/reports/2026-11-03-workspace-toc-production-validation.md` — 결과/제한/컴포넌트맵
  - `.memory/phases/2026-11-03-workspace-toc-production/P03-workspace-ui/phase.md` — 진행률
  - `.memory/plans/2026-11-03-workspace-toc-production.md`, `.memory/current.md` — 모든Task성공후완료정리
#### Details
- 보고서에는 UI컴포넌트→Query→서비스→repo/PPT엔진 흐름, DBv2추가store/기존키보존, 서버연결시강제할권한/스키마, D21복구제한, knownunsupported OOXML/페이지크기/overflow제약을남긴다.
- 실제PowerPoint 렌더링/폰트, 브라우저drag·clipboard·다운로드·반응형/접근성실기, 실제동시협업/서버권한은미검증/후속으로명확히구분한다. 차트/그룹보존은원본바이트/관계검증이지웹동일렌더보장이아니다.
- 모든기능/검증실패가해결되어야Task done/phase done/current 완료. 예외로남은미검증은사용자의지속정책으로제외한항목과확정범위밖만허용한다.
- 커밋방식은 실행시사용자최신요청과memory-execute에따른다. 단일커밋요청이면중간커밋없이완료후합친다. push는그실행의명시적요청이있는경우에만. 기존다른계획의 push허가를이작업에자동확장하지않는다.

## Acceptance Criteria
- [x] 기획요소별 구현근거/실제검증/제한이추적가능하다.
- [x] 이관·권한·원자회차·원본보존·PPT왕복의통합검증이통과한다.
- [x] 전체typecheck/lint/build와diff검사가통과하고실패가은폐되지않는다.
- [x] 완료범위·D21제한·브라우저/PowerPoint미검증을인수보고에남긴다.

## Validation
순서대로 실행하고각exitcode를보고서에기록한다.
```powershell
npm run typecheck
npm run lint
npm run build
git diff --check
git status --short
```
- 각명령실패시수정대상을확인하고종속검증을반복한다. 기존경고와신규경고를분리하고 baseline-browser-mapping 등의기존경고를새기능검증성공으로해석하지않는다.
- 위 A~H 시나리오는 각선행Task의인라인harness 패턴을합쳐 `@' ... '@ | node --import tsx`로실행한다. assertion 실패는 exit1. 출력은케이스명/성공수/실패이유만.
- `rg -n '<<<<<<<|=======|>>>>>>>' components/workspace services/workspace lib/workspace lib/pptx types` — merge marker없음; 단순decorative문자일치면내용확인.
- `git diff --name-only`와untracked목록을확인하여tests복원/불필요한의존성/비대상파일변경없음. 이전사용자변경을임의삭제하지않는다.
- 브라우저/CUA/Playwright/test:admin-review/devserver는실행하지않는다.

## Commit Message
```text
test(workspace): 목차 제작 통합 검증과 인수 기록 완료

Plan: 2026-11-03-workspace-toc-production
Phase: P03-workspace-ui
Task: T06-regression-handoff

- 기획 대응·자동 검증·인수 기록
- 권한·원본 보존·실패 경계를 검증하고 진행 기록 갱신
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 본 계획의 최종 단일 커밋에 포함 (`Plan: 2026-11-03-workspace-toc-production`)


## 실행 결과
- 전체 `npm run typecheck`, `npm run lint`, `npm run build`, `git -c core.safecrlf=false diff --check` exit 0. 마지막 UI 보완 후에도 동일 검증 완료.
- 인라인 최종 통합 이관/5개 권한/회차 경합/보관본 분리/SSR 45건, 목차44·편집33·Runtime33·의견33·자산27·내용52·PPT조립28건 통과. 회차48·PPT서비스57건은 T05 증거와 연결한다.
- 기획 HTML의 목차/설정/제작/출처/댓글/AI/권한/회차/PPT 요소를 개별 행으로 대조한 검증·인수 보고서를 작성했다.
- 최종 대조에서 제작 상태 선택·내용 썸네일·snapshot 이동/리뷰 분리·미저장 보호 후 기준 갱신·PPT 연결 복구 경로를 보완했다.
- memory 문서 18개 상대 링크/코드 fence/후행 공백 검사 통과. tests/·패키지 의존성 변경 없음.
- baseline-browser-mapping의 기존 오래된 데이터 경고 유지. 브라우저/PowerPoint 실기와 실제 AI/서버 연결은 보고서에 미검증/후속으로 구분.
- 최종 단일 커밋에 전체 Task와 문서를 포함한다. push 없음.
