# Task: T01 제조업 46장 예시 데이터와 독립 초기 상태

## Status: done

## Goal

기본 HTML 예시를 제조업 PoC로 제공하고, 46장/6섹션/3명 배정과 정확한 문구를 저장소에 최초 한 번 생성한다. 기존 행정업무 예시와 일반 프로젝트의 저장본은 보존한다.

## Decision Summary

- Plan `2026-11-06-workspace-mfg-html-parity`, Phase `P01-header-production`. 이 Task는 새 예시의 1차 작성 상태까지 만든다. 예시 1차 완성본/PPT와 2차 전환은 T05가 담당한다.
- 원본은 `C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html`, SHA256 `3501501DE7DE50A2BE2F7FA06F6ED8B59657CFAC993DD62C5DF7E8BA5270E326`. 아래 부록의 마지막 mfg 리터럴을 사용하며 HTML 스크립트 전체를 실행하지 않는다.
- tests/ 생성·복원, 브라우저/CUA/E2E/dev server/스크린샷, 새 패키지, Cosmos DB, 배포/push 금지. 기존 다른 변경 보존. 이 Task 실행 승인이 있을 때에만 구현한다.

## Implementation

### I01. 고정 fixture와 호환 가능한 모델 확장

- Related Files:
  - `config/production-mfg-demo.ts` :: 제조업 상수·정적 리터럴·조회 함수 — new.
  - `types/workspace-production.ts` :: `Section`, `ProposalSlide`, 신규 `ManufacturingPrompt` — modify.
  - `lib/workspace/production/schemas.ts` :: `SectionSchema`, `ProposalSlideSchema`, 신규 `ManufacturingPromptSchema` — modify.
  - `config/production-html-demo.ts` :: 기존 6장 상수/ID — read-only, 이름 재활용 금지.

#### Details

```typescript
export const MFG_DEMO_PROJECT_ID = "production-html-mfg-demo";
export const MFG_DEMO_REVISION = "mfg-v13-1";
export type ManufacturingSectionId = "s11" | "s21" | "s31" | "s32" | "s33" | "s41";
export type ManufacturingLayout = "cards" | "process" | "kpi" | "table";
export interface ManufacturingPrompt { intro: string; bullets: string[] }
// Section에 demoPrompt?: ManufacturingPrompt 추가. 기존 레코드에서 필수로 요구하지 않는다.
// ProposalSlide에 demoSourceKey?: string 추가. 기존 레코드에서 필수로 요구하지 않는다.
export interface ManufacturingSlideSeed {
  id: string; sectionId: ManufacturingSectionId;
  title: string; lead: string; layout: ManufacturingLayout;
  items: readonly (readonly [string, string])[];
}
export interface ManufacturingFileSeed {
  id: string; round: 1; name: string; type: string; priority: string;
  sizeLabel: string; by: string; at: string; category: "proposal" | "related"; main: boolean;
}
export const MFG_DEMO_SLIDES: readonly ManufacturingSlideSeed[];
export const MFG_DEMO_FILES: readonly ManufacturingFileSeed[];
export function manufacturingSlideSeed(key: string): ManufacturingSlideSeed | null;
export function manufacturingSectionPrompt(sectionId: ManufacturingSectionId): ManufacturingPrompt;
```

- 이름 `제조업 특화 산업 데이터 연계 AI 자율공정 PoC 구축`, 기관 `한국스마트제조혁신추진단`, 마감 `2026-11-25`, 예산 KRW `850000000`, 부서 표시 `생산성본부`, 프로젝트 번호 `HTML-MFG-DEMO`.
- 아래 부록 PAGES의 `t→title`, `k→layout`, `it→items`, `lead` 그대로 변환. ID는 `mfg-s11-1` 등의 원본을 유지한다. 마지막 요약 장까지 포함한 46장이다.
- 새 필드는 optional, 기본값은 없음, nullable로 바꾸지 않는다. schemaVersion 2 및 DB 버전 유지. `ManufacturingPromptSchema`는 strict object, intro 최대 10000자, bullets 최대 12개/각 최대 2000자. demoSourceKey는 기존 WorkspaceIdSchema와 같은 제약. 기존 snapshots/undo body도 같은 Section/Slide schema를 통해 읽힌다.
- `manufacturingSectionPrompt`는 해당 섹션 첫 슬라이드의 lead를 intro, it의 각 `[heading,text]`를 `heading + ': ' + text`로 만든 3 bullets를 반환한다. `SEC_BODY` 행정업무/RAG/CSAP 본문을 복사하지 않는다(사용자 확정).
- layout/출처의 조회는 배열 index가 아닌 안정된 demoSourceKey로 한다. 키가 없거나 유효하지 않으면 null로 돌려 일반 미리보기/출처 경로를 사용한다.

### I02. 팀·헤더 메타데이터·기본 선택

- Related Files:
  - `config/workspace-projects.ts` :: `createWorkspaceProjectCatalog` — modify.
  - `config/workspace-project-metadata.ts` :: `WORKSPACE_PROJECT_METADATA` — modify.
  - `components/workspace/WorkspaceSelectionProvider.tsx` :: 초기 선택 복원 — modify.
  - `lib/workspace/production/routing.ts` :: `resolveWorkspaceSelection` — modify.

#### Details

- 새 예시의 memberIds는 PM `demo:mfg:lee`, 자기 자신 `identity.actor.id`, 다른 작성자 `demo:mfg:kim` 순서로 3명. names는 각각 이서연/정소담/김민수. 실제 로그인 actor/전역 사용자 테이블을 수정하지 않는다.
- WorkspaceMember의 `adminUserId`는 각각 `u-04`/`u-self`/`u-02`, `email:null`. 부서 ID는 admin seed에서 이름 `생산성본부`를 찾아 사용하고 없으면 null, 표시 departmentName은 `생산성본부`. PM/다른 작성자 role은 user; self는 identity.actor.role 유지. canAccessFileProject의 기존 membership 검증 유지.
- 새 예시를 기존 HTML 예시 앞에 추가. 기존 ID `production-html-demo`는 조회/선택 가능하게 유지하고 picker의 표시명만 `이전 HTML 예시 · 행정업무 AI 에이전트 구축`으로 구분한다. 저장된 본문/이력/파일 이름 변경 없음.
- 명시 URL `?project=...`를 항상 존중한다. URL에 project가 없고 저장된 마지막 ID가 기존 HTML 예시일 때만 신규 예시를 기본 후보로 제시/선택한다. 그 외 마지막 일반 프로젝트 선택을 유지한다. 이동은 기존 선택/초안 보호 경로로 처리한다.
- 새 예시에서 section/slide가 모두 생략되었으면 최초 `s31`/`mfg-s31-1`로 해석한다(HTML last.write). 실제 존재하는 명시 선택/보관본 선택은 우선한다. 누락/삭제 시 기존 첫 유효 항목 fallback 유지.
- 다른 36개 목 프로젝트의 부서·마감일 데이터는 변경하지 않는다.

### I03. 최초 1회 seed와 출처 경계

- Related Files:
  - `services/workspace/workspace-mfg-demo.ts` :: `createManufacturingDemoBundle` — new.
  - `services/workspace/workspace-records.ts` :: `readWorkspaceBundle` — modify.
  - `services/workspace/workspace-demo.ts` :: 기존 행정 예시 — read-only.

#### Details

```typescript
export function createManufacturingDemoBundle(context: WorkspaceContext): WorkspaceBundle | null;
```

1. projectId가 새 예시 ID일 때만 반환한다. `readWorkspaceBundle`에서 files/state가 **둘 다 없는 경우**에만 호출한다. 한쪽만 존재하는 경우 기존 오류/복구 정책 유지, 기존 상태 위에 seed하지 않는다.
2. `createEmptyFileProject`/`createWorkspaceState`를 사용하여 currentRound=1, phase=writing, revision/inputRevision=1, schemaVersion=2. 4 chapters/6 sections, `reviewerIds:[]`, `locked:false`.
3. 섹션: s11/c1/사업 배경 및 목표/이서연/done/8장, s21/c2/PoC 추진 전략/이서연/done/8장, s31/c3/공정 데이터 연계 체계/정소담/writing/8장, s32/c3/AI 자율공정 제어 모델/김민수/writing/8장, s33/c3/현장 실증 및 검증/정소담/writing/7장, s41/c4/추진 일정 및 WBS/이서연/writing/7장. 원본 doing/todo 모두 writing으로 변환한다.
4. 각 Section.demoPrompt는 I01 함수 결과. 각 slide는 revision1/template:null/demoSourceKey=원본id. cards/process/kpi는 `[heading,text].join('\n')` text 블록 3개, table은 columns `[구분,내용]`의 단일 table 블록. 블록 ID는 `${slide.id}-text-${i+1}` 또는 `${slide.id}-table`. usedSettings의 pin/item IDs는 null, prompt 빈 문자열, sources 빈 배열.
5. requirements는 부록 12개 id/section/title/coverage/page를 그대로 대응한다. excerpt/quote는 `${title}을(를) 위한 구체적인 구현 방안과 검증 방법을 제안서에 제시하여야 한다. 제안사는 관련 근거와 수행 일정을 함께 기술한다.`. 각 slide.sources에는 같은 section의 2개 requirement refs를 넣는다(kind=requirement, targetId=요구사항ID, fileRound/versionId=null, provenance=mock).
6. 실제 파일 4개는 첨부되지 않았다. 이들을 실제 FileAsset/버전/Blob으로 위조하지 않는다. 파일명·쪽수·인용을 가진 시연 참조는 고정 fixture와 demoSourceKey로 T02에서 제공한다. FileProjectState의 원본 자산은 비어 있으며 snapshots의 demo 출처도 이 경로로 보여 준다. 실제 파일 업로드는 기존 기능이다.
7. 코멘트 2개: m1/s31/첫 장/이서연/`PoC 범위(공정 2개)를 표로 정리해주세요`, m2/s41/첫 장/김민수/`데이터 연계 일정이 고객사 휴무 기간과 겹칩니다`. 기존 ProjectCommentThread 구조 사용: round1, number1·2, status open, point null, authorId 해당 member ID, revision1, carriedFromId/resolvedBy/resolvedAt null, createdAt/updatedAt `2026-10-20T09:00:00.000Z`. messages 각각 id `${id}-message`, threadId=id, authorName 해당 이름, mentions[], 같은 createdAt, updatedAt/deletedAt null, revision1. nextCommentNumber=3. canvasComments는 기존 empty 값, reviews[] 유지.
8. actor grants `[complete,rework,setup,assign]`로 새 예시의 헤더 시연을 허용한다. 일반 프로젝트 권한과 전역 role은 그대로다. 제작 본문의 담당 표시는 15장으로 유지한다.
9. WorkspaceStateSchema/FileProjectStateSchema parse 후 기존 projects/workspaces 저장 트랜잭션에서 함께 기록한다. 새 demo에는 original Blob이 없으므로 기존 행정 예시의 `demo.original` 저장 코드를 nullable/분기 처리하여 오작동하지 않게 한다. 불완전/QUOTA 저장은 모두 롤백한다.

## Acceptance Criteria

- [x] 46장/4 chapters/6 sections/12 requirements/3 members/2 open comments. 담당 장수 정소담15·이서연23·김민수8.
- [x] 제목·lead·items·layout·순서가 아래 원본 리터럴과 동일하다. initial section s31, 첫 슬라이드 `mfg-s31-1`.
- [x] 기존 상태 재조회 시 수정/삭제/댓글/선택을 seed로 되돌리지 않는다. 기존 HTML 예시와 일반 프로젝트는 데이터 변경 없음.
- [x] optional 필드 없는 기존 schema2 및 snapshot/undo도 읽힌다. 파일 바이너리를 위조하지 않는다.

## Validation

- `npm run typecheck`.
- `npx eslint config/production-mfg-demo.ts config/workspace-projects.ts config/workspace-project-metadata.ts types/workspace-production.ts lib/workspace/production/schemas.ts lib/workspace/production/routing.ts components/workspace/WorkspaceSelectionProvider.tsx services/workspace/workspace-mfg-demo.ts services/workspace/workspace-records.ts`.
- `git diff --check`.
- 아래 seed 불변식 검증을 구현 후 실행한다. 계획 단계에서는 실행하지 않는다.

```powershell
$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
@'
const assert = require('node:assert/strict');
const { createWorkspaceProjectCatalog } = require('./config/workspace-projects.ts');
const { createManufacturingDemoBundle } = require('./services/workspace/workspace-mfg-demo.ts');
const { WorkspaceStateSchema } = require('./lib/workspace/production/schemas.ts');
const { MFG_DEMO_PROJECT_ID, MFG_DEMO_SLIDES } = require('./config/production-mfg-demo.ts');
const identity = {namespace:'files:preview:sodam',actor:{id:'preview:sodam',name:'정소담',role:'user',isMock:true}};
const catalog = createWorkspaceProjectCatalog(identity);
let serial=0;
const context={identity,project:catalog.get(MFG_DEMO_PROJECT_ID),members:catalog.members(MFG_DEMO_PROJECT_ID),now:'2026-11-06T00:00:00.000Z',newId:()=>`verify-mfg-${++serial}`};
const bundle=createManufacturingDemoBundle(context);
assert.ok(bundle); WorkspaceStateSchema.parse(bundle.state);
const body=bundle.state.body;
assert.equal(body.slides.length,46); assert.equal(body.chapters.length,4);
assert.equal(body.sections.length,6); assert.equal(body.requirements.length,12);
assert.equal(context.members.length,3); assert.equal(body.threads.length,2);
assert.deepEqual(body.sections.map(s=>body.slides.filter(p=>p.sectionId===s.id).length),[8,8,8,8,7,7]);
assert.equal(body.slides.filter(p=>body.sections.find(s=>s.id===p.sectionId).assigneeIds.includes(identity.actor.id)).length,15);
for (const seed of MFG_DEMO_SLIDES) {
  const slide=body.slides.find(p=>p.id===seed.id);
  assert.equal(slide.content.title,seed.title); assert.equal(slide.content.lead,seed.lead);
  assert.equal(slide.demoSourceKey,seed.id);
}
assert.equal(createManufacturingDemoBundle({...context,project:catalog.get('production-html-demo')}),null);
console.log('제조업 seed 불변식 통과');
'@ | node --import tsx -
```
- 정적 검토: 두 레코드 모두 없는 조건, 기존 original Blob 분기, 명시 URL 우선, 실제 actor/role 불변.

## Commit Message

```text
feat(workspace): 제조업 PoC 46장 예시와 담당 데이터를 분리 구성

Plan: 2026-11-06-workspace-mfg-html-parity
Phase: P01-header-production
Task: T01-manufacturing-fixture

- 제조업 목차·슬라이드·배정·근거를 최종 HTML 데이터에 맞춤
- 이전 예시와 현재 프로젝트 저장 데이터를 보존
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task 식별자의 한국어 커밋에 포함

## Appendix: 최종 HTML 제조업 리터럴

다음 데이터는 원본의 마지막 대입에서 추출한다. 임의 재작성하거나 앞쪽 DECK 데이터로 대체하지 않는다.

### TOCS.mfg (HTML 5404행)

```json
{
  "ch": [
    {
      "id": "c1",
      "t": "사업 이해"
    },
    {
      "id": "c2",
      "t": "추진 전략"
    },
    {
      "id": "c3",
      "t": "기술 부문"
    },
    {
      "id": "c4",
      "t": "사업 관리"
    }
  ],
  "secs": [
    {
      "id": "s11",
      "ch": "c1",
      "t": "사업 배경 및 목표"
    },
    {
      "id": "s21",
      "ch": "c2",
      "t": "PoC 추진 전략"
    },
    {
      "id": "s31",
      "ch": "c3",
      "t": "공정 데이터 연계 체계"
    },
    {
      "id": "s32",
      "ch": "c3",
      "t": "AI 자율공정 제어 모델"
    },
    {
      "id": "s33",
      "ch": "c3",
      "t": "현장 실증 및 검증"
    },
    {
      "id": "s41",
      "ch": "c4",
      "t": "추진 일정 및 WBS"
    }
  ]
}
```

### SEC_STATE.mfg (HTML 5405행)

```json
{
  "s11": [
    "done",
    "이서연"
  ],
  "s21": [
    "done",
    "이서연"
  ],
  "s31": [
    "doing",
    "정소담"
  ],
  "s32": [
    "doing",
    "김민수"
  ],
  "s33": [
    "todo",
    "정소담"
  ],
  "s41": [
    "todo",
    "이서연"
  ]
}
```

### PAGES.mfg (HTML 5406행)

```json
{
  "s11": [
    {
      "id": "mfg-s11-1",
      "d": {
        "t": "사업 추진 배경",
        "lead": "제조 현장의 숙련 인력 감소와 품질 편차가 생산성 저하의 핵심 원인입니다",
        "k": "cards",
        "it": [
          [
            "인력 구조",
            "숙련공 고령화로 공정 노하우 단절 위험 확대"
          ],
          [
            "품질 편차",
            "작업자별 설정값 차이로 불량률 3~5% 변동"
          ],
          [
            "데이터 활용",
            "설비 데이터 수집은 늘었으나 분석 · 제어 연계 부족"
          ]
        ]
      }
    },
    {
      "id": "mfg-s11-2",
      "d": {
        "t": "현황 및 문제점",
        "lead": "참여기업 3사의 공정 데이터는 설비별로 흩어져 있어 실시간 활용이 어렵습니다",
        "k": "table",
        "it": [
          [
            "데이터 수집",
            "PLC · MES · 검사장비 데이터가 서로 다른 형식으로 저장"
          ],
          [
            "공정 제어",
            "설정값 변경이 작업자 경험에 의존"
          ],
          [
            "품질 관리",
            "불량 발생 후 사후 분석 중심"
          ]
        ]
      }
    },
    {
      "id": "mfg-s11-3",
      "d": {
        "t": "사업 목표",
        "lead": "데이터 연계부터 AI 제어 · 실증까지 하나의 PoC로 검증합니다",
        "k": "process",
        "it": [
          [
            "연계",
            "3사 공정 데이터를 표준 플랫폼으로 수집"
          ],
          [
            "학습",
            "공정 조건 · 품질 상관관계 AI 모델 학습"
          ],
          [
            "제어",
            "최적 설정값 자동 추천 및 반자율 제어"
          ]
        ]
      }
    },
    {
      "id": "mfg-s11-4",
      "d": {
        "t": "기대 효과",
        "lead": "불량률과 에너지 사용량을 함께 낮추는 것을 목표로 합니다",
        "k": "kpi",
        "it": [
          [
            "20%",
            "공정 불량률 감소 목표"
          ],
          [
            "15%",
            "에너지 사용량 절감 목표"
          ],
          [
            "3사",
            "실증 참여 제조기업"
          ]
        ]
      }
    },
    {
      "id": "mfg-s11-5",
      "d": {
        "t": "RFP 핵심 요구 분석",
        "lead": "데이터 표준 준수와 현장 실증 결과가 평가의 핵심입니다",
        "k": "table",
        "it": [
          [
            "SFR-001~008",
            "공정 데이터 수집 · 정제 · 저장 기능"
          ],
          [
            "SFR-009~014",
            "AI 모델 학습 · 추론 · 제어 연계"
          ],
          [
            "PMR-001~004",
            "실증 계획 · 성과 측정 · 확산 방안"
          ]
        ]
      }
    },
    {
      "id": "mfg-s11-6",
      "d": {
        "t": "사업 범위",
        "lead": "플랫폼 구축 · 모델 개발 · 현장 실증 3개 영역으로 구성됩니다",
        "k": "cards",
        "it": [
          [
            "플랫폼",
            "공정 데이터 연계 플랫폼 구축"
          ],
          [
            "모델",
            "품질 예측 · 설정값 최적화 모델 개발"
          ],
          [
            "실증",
            "3사 현장 적용 및 효과 검증"
          ]
        ]
      }
    },
    {
      "id": "mfg-s11-7",
      "d": {
        "t": "정책 연계",
        "lead": "제조 AI 전환 정책과 스마트공장 고도화 사업 방향에 부합합니다",
        "k": "cards",
        "it": [
          [
            "제조 AI 전환",
            "산업 AI 내재화 전략 핵심 과제"
          ],
          [
            "스마트공장",
            "고도화 단계 기업 대상 AI 적용 확산"
          ],
          [
            "표준화",
            "제조 데이터 표준 기반 확산 모델 제시"
          ]
        ]
      }
    },
    {
      "id": "mfg-s11-8",
      "d": {
        "t": "사업 배경 및 목표 요약",
        "lead": "제조 현장의 숙련 인력 감소와 품질 편차가 생산성 저하의 핵심 원인입니다",
        "k": "cards",
        "it": [
          [
            "사업 추진 배경",
            "숙련공 고령화로 공정 노하우 단절 위험 확대"
          ],
          [
            "현황 및 문제점",
            "PLC · MES · 검사장비 데이터가 서로 다른 형식으로 저장"
          ],
          [
            "사업 목표",
            "3사 공정 데이터를 표준 플랫폼으로 수집"
          ]
        ]
      }
    }
  ],
  "s21": [
    {
      "id": "mfg-s21-1",
      "d": {
        "t": "추진 전략 개요",
        "lead": "표준 기반 · 단계적 확대 · 현장 중심의 3대 전략으로 추진합니다",
        "k": "cards",
        "it": [
          [
            "표준 기반",
            "KS X 9101 데이터 모델로 확장성 확보"
          ],
          [
            "단계적 확대",
            "1개 라인 실증 후 3사 전체로 확대"
          ],
          [
            "현장 중심",
            "작업자 참여형 모델 검증"
          ]
        ]
      }
    },
    {
      "id": "mfg-s21-2",
      "d": {
        "t": "단계별 추진 로드맵",
        "lead": "진단 → 구축 → 실증 → 확산 4단계로 진행합니다",
        "k": "process",
        "it": [
          [
            "진단",
            "3사 공정 · 데이터 현황 분석"
          ],
          [
            "구축",
            "연계 플랫폼 · AI 모델 개발"
          ],
          [
            "실증",
            "라인 적용 및 성과 측정"
          ]
        ]
      }
    },
    {
      "id": "mfg-s21-3",
      "d": {
        "t": "추진 체계",
        "lead": "발주기관 · 수행사 · 참여기업이 함께하는 실증 협의체를 운영합니다",
        "k": "table",
        "it": [
          [
            "발주기관",
            "사업 총괄 · 성과 점검"
          ],
          [
            "KPC",
            "플랫폼 구축 · AI 모델 · 실증 운영"
          ],
          [
            "참여기업 3사",
            "현장 데이터 제공 · 실증 참여"
          ]
        ]
      }
    },
    {
      "id": "mfg-s21-4",
      "d": {
        "t": "차별화 전략",
        "lead": "공정 컨설팅과 AI 기술을 결합한 실행 중심 PoC를 제시합니다",
        "k": "cards",
        "it": [
          [
            "공정 진단 역량",
            "생산성 컨설팅 기반 병목 공정 선정"
          ],
          [
            "AI 기술",
            "품질 예측 모델 실증 경험 보유"
          ],
          [
            "확산 모델",
            "업종별 적용 가이드 제공"
          ]
        ]
      }
    },
    {
      "id": "mfg-s21-5",
      "d": {
        "t": "핵심 성과지표",
        "lead": "정량 지표로 PoC 효과를 객관적으로 검증합니다",
        "k": "kpi",
        "it": [
          [
            "20%",
            "불량률 감소"
          ],
          [
            "15%",
            "에너지 절감"
          ],
          [
            "90%",
            "설정값 추천 채택률 목표"
          ]
        ]
      }
    },
    {
      "id": "mfg-s21-6",
      "d": {
        "t": "리스크 관리 방안",
        "lead": "데이터 품질과 현장 수용성 리스크를 사전에 관리합니다",
        "k": "table",
        "it": [
          [
            "데이터 품질",
            "수집 초기 2주간 정합성 점검"
          ],
          [
            "현장 수용성",
            "작업자 교육 및 피드백 반영"
          ],
          [
            "일정 지연",
            "라인 가동 일정 사전 협의"
          ]
        ]
      }
    },
    {
      "id": "mfg-s21-7",
      "d": {
        "t": "확산 전략",
        "lead": "실증 결과를 업종별 표준 모델로 정리해 확산합니다",
        "k": "process",
        "it": [
          [
            "정리",
            "실증 결과 · 모델 문서화"
          ],
          [
            "표준화",
            "업종별 적용 가이드 작성"
          ],
          [
            "확산",
            "유사 업종 기업 대상 설명회"
          ]
        ]
      }
    },
    {
      "id": "mfg-s21-8",
      "d": {
        "t": "PoC 추진 전략 요약",
        "lead": "표준 기반 · 단계적 확대 · 현장 중심의 3대 전략으로 추진합니다",
        "k": "cards",
        "it": [
          [
            "추진 전략 개요",
            "KS X 9101 데이터 모델로 확장성 확보"
          ],
          [
            "단계별 추진 로드맵",
            "3사 공정 · 데이터 현황 분석"
          ],
          [
            "추진 체계",
            "사업 총괄 · 성과 점검"
          ]
        ]
      }
    }
  ],
  "s31": [
    {
      "id": "mfg-s31-1",
      "d": {
        "t": "데이터 연계 체계 개요",
        "lead": "설비 · 시스템 · 검사 데이터를 하나의 플랫폼으로 연계합니다",
        "k": "process",
        "it": [
          [
            "수집",
            "PLC · MES · 검사장비 데이터 수집"
          ],
          [
            "정제",
            "결측 · 이상치 처리 및 표준화"
          ],
          [
            "저장",
            "시계열 DB 기반 통합 저장"
          ]
        ]
      }
    },
    {
      "id": "mfg-s31-2",
      "d": {
        "t": "연계 대상 데이터",
        "lead": "3사 공정에서 12종의 핵심 데이터를 연계합니다",
        "k": "table",
        "it": [
          [
            "설비 데이터",
            "온도 · 압력 · 속도 등 공정 조건 8종"
          ],
          [
            "품질 데이터",
            "검사 결과 · 불량 유형 3종"
          ],
          [
            "운영 데이터",
            "작업 지시 · 생산 실적"
          ]
        ]
      }
    },
    {
      "id": "mfg-s31-3",
      "d": {
        "t": "데이터 표준 모델",
        "lead": "KS X 9101 기반 공통 데이터 모델을 적용합니다",
        "k": "cards",
        "it": [
          [
            "공통 모델",
            "설비 · 공정 · 품질 엔터티 정의"
          ],
          [
            "메타데이터",
            "태그 명명 규칙 표준화"
          ],
          [
            "확장성",
            "신규 설비 추가 시 설정만으로 연계"
          ]
        ]
      }
    },
    {
      "id": "mfg-s31-4",
      "d": {
        "t": "수집 아키텍처",
        "lead": "엣지 게이트웨이로 현장 데이터를 안전하게 수집합니다",
        "k": "process",
        "it": [
          [
            "엣지",
            "현장 게이트웨이에서 1초 주기 수집"
          ],
          [
            "전송",
            "암호화 구간으로 플랫폼 전송"
          ],
          [
            "저장",
            "시계열 DB · 데이터 레이크 이중 저장"
          ]
        ]
      }
    },
    {
      "id": "mfg-s31-5",
      "d": {
        "t": "데이터 품질 관리",
        "lead": "수집 단계부터 품질을 자동 점검합니다",
        "k": "table",
        "it": [
          [
            "정합성",
            "센서 범위 · 단위 자동 검증"
          ],
          [
            "완전성",
            "결측 구간 탐지 및 보정"
          ],
          [
            "적시성",
            "수집 지연 실시간 모니터링"
          ]
        ]
      }
    },
    {
      "id": "mfg-s31-6",
      "d": {
        "t": "연계 성능 목표",
        "lead": "실시간 제어를 위한 수집 · 처리 성능을 확보합니다",
        "k": "kpi",
        "it": [
          [
            "1초",
            "데이터 수집 주기"
          ],
          [
            "99.5%",
            "수집 성공률 목표"
          ],
          [
            "12종",
            "연계 데이터 유형"
          ]
        ]
      }
    },
    {
      "id": "mfg-s31-7",
      "d": {
        "t": "데이터 보안",
        "lead": "공정 데이터 외부 유출을 막는 보안 체계를 적용합니다",
        "k": "cards",
        "it": [
          [
            "접근 통제",
            "역할 기반 권한 관리"
          ],
          [
            "암호화",
            "전송 · 저장 구간 암호화"
          ],
          [
            "감사 로그",
            "데이터 조회 이력 1년 보관"
          ]
        ]
      }
    },
    {
      "id": "mfg-s31-8",
      "d": {
        "t": "공정 데이터 연계 체계 요약",
        "lead": "설비 · 시스템 · 검사 데이터를 하나의 플랫폼으로 연계합니다",
        "k": "cards",
        "it": [
          [
            "데이터 연계 체계 개요",
            "PLC · MES · 검사장비 데이터 수집"
          ],
          [
            "연계 대상 데이터",
            "온도 · 압력 · 속도 등 공정 조건 8종"
          ],
          [
            "데이터 표준 모델",
            "설비 · 공정 · 품질 엔터티 정의"
          ]
        ]
      }
    }
  ],
  "s32": [
    {
      "id": "mfg-s32-1",
      "d": {
        "t": "AI 모델 개요",
        "lead": "품질 예측과 설정값 최적화 두 가지 모델을 개발합니다",
        "k": "cards",
        "it": [
          [
            "품질 예측",
            "공정 조건으로 불량 발생 확률 예측"
          ],
          [
            "설정값 최적화",
            "목표 품질을 위한 최적 조건 추천"
          ],
          [
            "이상 감지",
            "설비 이상 징후 조기 탐지"
          ]
        ]
      }
    },
    {
      "id": "mfg-s32-2",
      "d": {
        "t": "모델 개발 절차",
        "lead": "데이터 분석부터 현장 배포까지 단계별로 검증합니다",
        "k": "process",
        "it": [
          [
            "분석",
            "공정 변수 · 품질 상관관계 분석"
          ],
          [
            "학습",
            "예측 · 최적화 모델 학습"
          ],
          [
            "배포",
            "현장 엣지 환경 배포"
          ]
        ]
      }
    },
    {
      "id": "mfg-s32-3",
      "d": {
        "t": "품질 예측 모델",
        "lead": "공정 조건 변화에 따른 불량 가능성을 실시간으로 예측합니다",
        "k": "table",
        "it": [
          [
            "입력",
            "온도 · 압력 · 속도 등 8개 공정 변수"
          ],
          [
            "출력",
            "불량 확률 및 주요 원인 변수"
          ],
          [
            "목표",
            "예측 정확도 90% 이상"
          ]
        ]
      }
    },
    {
      "id": "mfg-s32-4",
      "d": {
        "t": "설정값 최적화",
        "lead": "목표 품질을 만족하는 공정 조건을 자동으로 추천합니다",
        "k": "cards",
        "it": [
          [
            "최적화 기법",
            "베이지안 최적화 기반 탐색"
          ],
          [
            "제약 조건",
            "설비 허용 범위 내 추천"
          ],
          [
            "설명 가능성",
            "추천 근거 변수 함께 제시"
          ]
        ]
      }
    },
    {
      "id": "mfg-s32-5",
      "d": {
        "t": "반자율 제어 연계",
        "lead": "작업자 승인 후 설정값이 적용되는 반자율 방식으로 운영합니다",
        "k": "process",
        "it": [
          [
            "추천",
            "AI가 최적 설정값 제시"
          ],
          [
            "승인",
            "작업자 확인 및 승인"
          ],
          [
            "적용",
            "PLC 설정값 자동 반영"
          ]
        ]
      }
    },
    {
      "id": "mfg-s32-6",
      "d": {
        "t": "모델 성능 목표",
        "lead": "현장 적용 가능한 수준의 성능을 목표로 합니다",
        "k": "kpi",
        "it": [
          [
            "90%",
            "불량 예측 정확도"
          ],
          [
            "1초",
            "추론 응답 시간"
          ],
          [
            "월 1회",
            "모델 재학습 주기"
          ]
        ]
      }
    },
    {
      "id": "mfg-s32-7",
      "d": {
        "t": "모델 운영 관리",
        "lead": "성능 저하를 감지해 재학습하는 MLOps 체계를 갖춥니다",
        "k": "table",
        "it": [
          [
            "모니터링",
            "예측 정확도 일 단위 추적"
          ],
          [
            "재학습",
            "성능 저하 시 자동 재학습"
          ],
          [
            "버전 관리",
            "모델 이력 · 롤백 지원"
          ]
        ]
      }
    },
    {
      "id": "mfg-s32-8",
      "d": {
        "t": "AI 자율공정 제어 모델 요약",
        "lead": "품질 예측과 설정값 최적화 두 가지 모델을 개발합니다",
        "k": "cards",
        "it": [
          [
            "AI 모델 개요",
            "공정 조건으로 불량 발생 확률 예측"
          ],
          [
            "모델 개발 절차",
            "공정 변수 · 품질 상관관계 분석"
          ],
          [
            "품질 예측 모델",
            "온도 · 압력 · 속도 등 8개 공정 변수"
          ]
        ]
      }
    }
  ],
  "s33": [
    {
      "id": "mfg-s33-1",
      "d": {
        "t": "실증 계획 개요",
        "lead": "3사 핵심 라인에서 단계적으로 실증합니다",
        "k": "process",
        "it": [
          [
            "1단계",
            "A사 사출 라인 실증"
          ],
          [
            "2단계",
            "B사 · C사 라인 확대"
          ],
          [
            "3단계",
            "성과 분석 및 개선"
          ]
        ]
      }
    },
    {
      "id": "mfg-s33-2",
      "d": {
        "t": "실증 대상 공정",
        "lead": "불량률이 높고 데이터 확보가 쉬운 공정을 우선 선정합니다",
        "k": "table",
        "it": [
          [
            "A사",
            "사출 성형 공정 (불량률 4.2%)"
          ],
          [
            "B사",
            "도장 공정 (불량률 3.6%)"
          ],
          [
            "C사",
            "가공 공정 (불량률 3.1%)"
          ]
        ]
      }
    },
    {
      "id": "mfg-s33-3",
      "d": {
        "t": "성과 측정 방법",
        "lead": "실증 전후 동일 기간을 비교해 효과를 검증합니다",
        "k": "cards",
        "it": [
          [
            "비교 기간",
            "실증 전후 각 4주"
          ],
          [
            "측정 지표",
            "불량률 · 에너지 · 생산량"
          ],
          [
            "검증 주체",
            "발주기관 · 외부 전문가 공동 검증"
          ]
        ]
      }
    },
    {
      "id": "mfg-s33-4",
      "d": {
        "t": "현장 운영 체계",
        "lead": "작업자 교육과 현장 지원 인력을 함께 운영합니다",
        "k": "cards",
        "it": [
          [
            "교육",
            "작업자 대상 사용 교육 2회"
          ],
          [
            "현장 지원",
            "실증 기간 상주 엔지니어 배치"
          ],
          [
            "피드백",
            "주간 현장 협의회 운영"
          ]
        ]
      }
    },
    {
      "id": "mfg-s33-5",
      "d": {
        "t": "실증 성과 목표",
        "lead": "정량 성과를 실증 보고서로 제시합니다",
        "k": "kpi",
        "it": [
          [
            "20%",
            "불량률 감소"
          ],
          [
            "15%",
            "에너지 절감"
          ],
          [
            "3건",
            "업종별 적용 사례"
          ]
        ]
      }
    },
    {
      "id": "mfg-s33-6",
      "d": {
        "t": "실증 결과 보고",
        "lead": "실증 결과를 표준 보고서와 적용 가이드로 정리합니다",
        "k": "process",
        "it": [
          [
            "분석",
            "공정별 효과 분석"
          ],
          [
            "보고",
            "실증 결과 보고서 작성"
          ],
          [
            "가이드",
            "업종별 적용 가이드 제공"
          ]
        ]
      }
    },
    {
      "id": "mfg-s33-7",
      "d": {
        "t": "현장 실증 및 검증 요약",
        "lead": "3사 핵심 라인에서 단계적으로 실증합니다",
        "k": "cards",
        "it": [
          [
            "실증 계획 개요",
            "A사 사출 라인 실증"
          ],
          [
            "실증 대상 공정",
            "사출 성형 공정 (불량률 4.2%)"
          ],
          [
            "성과 측정 방법",
            "실증 전후 각 4주"
          ]
        ]
      }
    }
  ],
  "s41": [
    {
      "id": "mfg-s41-1",
      "d": {
        "t": "추진 일정 총괄",
        "lead": "8개월 동안 4단계로 수행합니다",
        "k": "process",
        "it": [
          [
            "진단 · 설계 (2개월)",
            "현황 분석 · 플랫폼 설계"
          ],
          [
            "구축 · 개발 (3개월)",
            "연계 플랫폼 · AI 모델"
          ],
          [
            "실증 · 확산 (3개월)",
            "현장 실증 · 결과 보고"
          ]
        ]
      }
    },
    {
      "id": "mfg-s41-2",
      "d": {
        "t": "WBS 상세",
        "lead": "단계별 산출물과 검토 시점을 명확히 정의합니다",
        "k": "table",
        "it": [
          [
            "진단 · 설계",
            "착수계, 현황 분석서, 설계서"
          ],
          [
            "구축 · 개발",
            "플랫폼 · 모델 개발 결과서"
          ],
          [
            "실증 · 확산",
            "실증 결과 보고서, 적용 가이드"
          ]
        ]
      }
    },
    {
      "id": "mfg-s41-3",
      "d": {
        "t": "투입 인력 계획",
        "lead": "단계별 핵심 인력을 집중 투입합니다",
        "k": "table",
        "it": [
          [
            "PM",
            "이서연 (생산성 컨설팅 15년)"
          ],
          [
            "데이터 엔지니어",
            "2명 (제조 데이터 연계)"
          ],
          [
            "AI 엔지니어",
            "2명 (품질 예측 모델)"
          ]
        ]
      }
    },
    {
      "id": "mfg-s41-4",
      "d": {
        "t": "품질 관리 계획",
        "lead": "단계별 품질 검토로 산출물 품질을 보장합니다",
        "k": "cards",
        "it": [
          [
            "단계 검토",
            "단계 종료 시 품질 검토 회의"
          ],
          [
            "테스트",
            "기능 · 성능 · 보안 테스트"
          ],
          [
            "외부 검증",
            "실증 결과 외부 전문가 검토"
          ]
        ]
      }
    },
    {
      "id": "mfg-s41-5",
      "d": {
        "t": "보고 체계",
        "lead": "정기 보고와 수시 보고로 진행 상황을 공유합니다",
        "k": "table",
        "it": [
          [
            "주간 보고",
            "진척 · 이슈 공유"
          ],
          [
            "월간 보고",
            "성과 · 리스크 점검"
          ],
          [
            "단계 보고",
            "단계 종료 시 결과 보고"
          ]
        ]
      }
    },
    {
      "id": "mfg-s41-6",
      "d": {
        "t": "사업 관리 지표",
        "lead": "일정 · 품질 · 성과를 정량 지표로 관리합니다",
        "k": "kpi",
        "it": [
          [
            "100%",
            "일정 준수 목표"
          ],
          [
            "0건",
            "중대 결함 목표"
          ],
          [
            "4회",
            "단계별 보고"
          ]
        ]
      }
    },
    {
      "id": "mfg-s41-7",
      "d": {
        "t": "추진 일정 및 WBS 요약",
        "lead": "8개월 동안 4단계로 수행합니다",
        "k": "cards",
        "it": [
          [
            "추진 일정 총괄",
            "현황 분석 · 플랫폼 설계"
          ],
          [
            "WBS 상세",
            "착수계, 현황 분석서, 설계서"
          ],
          [
            "투입 인력 계획",
            "이서연 (생산성 컨설팅 15년)"
          ]
        ]
      }
    }
  ]
}
```

### FILES_BY.mfg (HTML 5407행)

```json
[
  {
    "id": "mfgf1",
    "rd": 1,
    "via": "파일",
    "name": "제조 AI 자율공정 PoC 제안요청서.pdf",
    "type": "RFP (공고문)",
    "pri": "필수 참조",
    "prompt": "",
    "size": "4.2 MB",
    "by": "정소담",
    "at": "2026.10.12",
    "main": true
  },
  {
    "id": "mfgf2",
    "rd": 1,
    "via": "파일",
    "name": "스마트공장 데이터 표준(KS X 9101) 요약.pdf",
    "type": "기술자료",
    "pri": "우선 참조",
    "prompt": "",
    "size": "1.8 MB",
    "by": "정소담",
    "at": "2026.10.13",
    "cat": "rel"
  },
  {
    "id": "mfgf3",
    "rd": 1,
    "via": "파일",
    "name": "참여기업 3사 공정 현황 조사표.xlsx",
    "type": "고객 제공자료",
    "pri": "우선 참조",
    "prompt": "",
    "size": "0.6 MB",
    "by": "정소담",
    "at": "2026.10.14"
  },
  {
    "id": "mfgf4",
    "rd": 1,
    "via": "파일",
    "name": "제조 AI 실증 수행사례 정리.docx",
    "type": "수행 사례",
    "pri": "일반 참조",
    "prompt": "",
    "size": "2.4 MB",
    "by": "정소담",
    "at": "2026.10.15",
    "cat": "rel"
  }
]
```

### REQS_P.mfg (HTML 5408행)

```json
[
  {
    "id": "SFR-001",
    "t": "숙련공 고령화로 공정 노하우 단절 위험 확대",
    "sec": "s11",
    "cov": "full",
    "page": 3
  },
  {
    "id": "SFR-002",
    "t": "작업자별 설정값 차이로 불량률 3~5% 변동",
    "sec": "s11",
    "cov": "full",
    "page": 6
  },
  {
    "id": "SFR-003",
    "t": "KS X 9101 데이터 모델로 확장성 확보",
    "sec": "s21",
    "cov": "full",
    "page": 9
  },
  {
    "id": "SFR-004",
    "t": "1개 라인 실증 후 3사 전체로 확대",
    "sec": "s21",
    "cov": "full",
    "page": 12
  },
  {
    "id": "SFR-005",
    "t": "PLC · MES · 검사장비 데이터 수집",
    "sec": "s31",
    "cov": "partial",
    "page": 15
  },
  {
    "id": "SFR-006",
    "t": "결측 · 이상치 처리 및 표준화",
    "sec": "s31",
    "cov": "partial",
    "page": 18
  },
  {
    "id": "SFR-007",
    "t": "공정 조건으로 불량 발생 확률 예측",
    "sec": "s32",
    "cov": "partial",
    "page": 21
  },
  {
    "id": "SFR-008",
    "t": "목표 품질을 위한 최적 조건 추천",
    "sec": "s32",
    "cov": "partial",
    "page": 24
  },
  {
    "id": "SER-001",
    "t": "A사 사출 라인 실증",
    "sec": "s33",
    "cov": "partial",
    "page": 27
  },
  {
    "id": "SER-002",
    "t": "B사 · C사 라인 확대",
    "sec": "s33",
    "cov": "partial",
    "page": 30
  },
  {
    "id": "PMR-001",
    "t": "현황 분석 · 플랫폼 설계",
    "sec": "s41",
    "cov": "partial",
    "page": 33
  },
  {
    "id": "PMR-002",
    "t": "연계 플랫폼 · AI 모델",
    "sec": "s41",
    "cov": "partial",
    "page": 36
  }
]
```
