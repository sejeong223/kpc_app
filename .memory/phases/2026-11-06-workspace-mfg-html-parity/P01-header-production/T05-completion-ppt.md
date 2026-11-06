# Task: T05 제조업 완성본·PPT 연결과 최종 검증

## Status: done

## Goal

새 제조업 예시에서 1차 46장 완성본을 열고 실제 PPT를 내려받을 수 있게 한다. 현재 작업을 수정하고 다시 완성한 경우에도 그 회차의 내용이 별도 PPT로 보관되도록 한다.

## Decision Summary

- 이전 사용자 요청의 완성본 보기/PPT 시연을 유지한다. 새 예시 `production-html-mfg-demo`에는 예시 1차 snapshot/PPT를 추가하고 현재 작업은 2차로 둔다. 원본 mfg의 1차/이력 없음과 다른 의도적 시연 보강이다.
- 선행 T01: 제조업 46장 fixture/bundle, T02: 편집/출처/레이아웃, T03: header/history, T04: draft settings 완료. 원본 HTML SHA256 `3501501DE7DE50A2BE2F7FA06F6ED8B59657CFAC993DD62C5DF7E8BA5270E326`.
- 기존 `production-html-demo`의6장 PPT 및 일반 프로젝트의 template 기반 export를 바꾸지 않는다. tests/·브라우저/CUA/E2E/dev server/스크린샷·새 패키지·Cosmos·push 금지.

## Implementation

### I01. 제조업 본문을 입력받는 실제 PPT 생성

- Related Files:
  - `services/workspace/manufacturing-demo-ppt.ts` :: OOXML generator — new.
  - `services/workspace/html-demo-ppt.ts` :: 기존 ZIP/shape 작성 패턴 — read-only; MOIS 기본 상수를 교체하지 않는다.
  - `lib/pptx/zip.ts` :: `loadZipLibrary` — read-only.

#### Details

```typescript
export interface ManufacturingPptInput {
  projectName: string; organization: string; round: number; body: RoundBody;
}
export function manufacturingPptFilename(round: number): string;
export function createManufacturingDemoPpt(input: ManufacturingPptInput): Promise<Blob>;
```

- 파일명 `제조업_PoC_${round}차_완성본.pptx`, MIME `application/vnd.openxmlformats-officedocument.presentationml.presentation`. seed는46장이지만 재완성은 실제 body의 장수/순서/본문을 사용한다. 함수 내부에서 fixture46장 내용을 무조건 다시 생성하지 않는다.
- chapters→sections→slides 순서로 export. 16:9 dimensions12192000×6858000 EMU. Navy1F3A5F/white, title/lead/items/표/footer/표시번호(index+2). cards/process/kpi/table의 구조를 구분하고 process는 단계 화살표, KPI는 큰 숫자를 표현한다. body에서 수정된 title/lead/text/table을 그대로 읽는다.
- title, lead, 각 블록을 텍스트 shape 또는 표 셀로 생성. text 블록 첫 줄이 heading, 나머지가 본문. generic list/text/table로 변경된 장도 누락 없이 표현한다. 템플릿 참조 또는 image 블록을 이 단순 생성기가 지원하지 못하면 LAYOUT 오류로 거절하여 잘못된 파일/성공 표시를 만들지 않는다. 이 경우 현재 초안은 보존하고 기존 PPT export 기능을 안내한다.
- 기존 HTML 예시 생성기와 동일한 최소 OOXML package 구성: `[Content_Types].xml`, `_rels/.rels`, `ppt/presentation.xml`, presentation rels, master/layout/theme와 rels, 각 slide XML/slide rels. slideID/relationship/shapeID 중복 금지, XML escape, root xmlns, 한글 폰트 선언. 기존 JSZip만 사용한다.
- PPT는 편집 가능한 도형/텍스트로 만든다. 스크린샷을 삽입하는 방식은 사용하지 않는다. 용량/sha256은 실제 생성 Blob에서 계산한다.

### I02. 최초 예시 보관본과 현재 작업 보존

- Related Files:
  - `services/workspace/workspace-mfg-demo.ts` :: needs/add completion — modify.
  - `services/workspace/IndexedDbWorkspaceRepository.ts` :: `load` — modify.
  - `services/workspace/workspace-demo.ts` :: 기존 promotion — read-only.

#### Details

```typescript
export function needsManufacturingDemoCompletion(bundle: WorkspaceBundle): boolean;
export function addManufacturingDemoCompletion(
  source: WorkspaceBundle, context: WorkspaceContext,
  ppt: {blob: Blob; sha256: string}
): {bundle: WorkspaceBundle; original: StoredWorkspaceBlob};
```

1. 대상은 새 project ID + currentRound1 + phase writing + snapshots.length0인 경우뿐이다. 기존 행정 예시의 needs/add 함수는 그대로 사용한다. 프로젝트별 Promise 캐시를 분리하여 MOIS6장 Blob을 제조업에 공유하지 않는다.
2. 1차 snapshot.body는 `createManufacturingDemoBundle(context)`의 원본46장 body를 deepClone한다. 상태는 최초 작성 완료2/작성 중4 그대로(완성은 전 섹션 done을 강제하지 않는 기존 정책), 댓글2/출처/배정/prompt를 보존한다. snapshot.kind complete, createdBy=PM 이서연 ID, createdAt=context.now, round1, inputRevision1, fileEntries[], fileRevision=source.files.revision.
3. 새로운 snapshot/version/blob ID 생성. PptVersion kind generated, index=max(index)+1, round1, snapshotId=방금 snapshot, pinIds[], manifest:null, baseVersionId:null, inputRevision1, createdAt=context.now, createdBy=PM ID, 실제 Blob byteLength/sha256/파일명. snapshot.pptVersionId로 양방향 연결.
4. 현재 사용자 body는 source에서 복제하여 유지한다. `advanceFileRound`로 files/currentRound2, workspace.currentRound도2. 현재 done 섹션 locked=true/나머지 false. 기존 본문/slide IDs/sources/demoPrompt/demoSourceKey/댓글메시지 수정 금지. body.threads round만2, 열린 canvas comment의 회차 변경은 기존 carry 규칙을 적용한다. undo가 유효하면 round/afterRevision을 조정하고 previousBody의 thread round/locked도 새 current 회차 규칙과 맞춘다. 파일 removals를 이전처럼 새 회차로 옮기고 삭제 의도를 보존한다.
5. state revision/inputRevision 증가 및 최종 두 schema 검사. snapshot body에는 live 변화가 새지 않아야 한다. 새 예시의 고정 참조 메타데이터는 file Blob에 의존하지 않으므로 보관본 출처를 제거하지 않는다.
6. 기존 load 패턴처럼 ZIP 생성/해시는 **IDB 트랜잭션 밖**에서 수행한다. 후속 readwrite 트랜잭션에서 최신 bundle을 재조회/needs 조건 재확인 후 projects/workspaces/workspaceBlobs를 한 번에 저장. 동시 탭에서 이미 seed했으면 추가하지 않고 최신 상태 반환. QUOTA/해시/DB 실패 시 부분 snapshot/version 저장 없음.

### I03. 편집 후 완성에서도 해당 내용 PPT를 원자적으로 보관

- Related Files:
  - `types/workspace-production.ts` :: `PreparedWorkspaceOperation` — modify.
  - `lib/workspace/production/schemas.ts` :: prepared operation schema — modify.
  - `lib/workspace/production/domain.ts` :: 새 prepared 완료 case — modify.
  - `services/workspace/IndexedDbWorkspaceRepository.ts` :: `execute` 제조업 complete 준비 — modify.
  - `hooks/workspace/use-project-round.ts` :: 기존 complete 호출/에러 경로 — 검토, 필요 시 modify.

#### Details

```typescript
export interface PreparedManufacturingCompletion {
  type: "complete-manufacturing-demo";
  expectedFileRevision: number;
  acknowledged: boolean;
  version: PptVersion;
}
// PreparedWorkspaceOperation에만 추가. 공개 WorkspaceOperation에는 추가하지 않는다.
```

- 공개 명령은 기존 `{type:'complete',expectedFileRevision,acknowledged:true}` 유지. repository.execute에서 새 제조업 ID의 complete만 load→baseline검증→PPT생성→hash→prepared commit으로 변환한다. 다른 project/명령은 기존 경로 그대로. load 결과가 요청 revision/round/fileRevision과 다르면 생성 전에 CONFLICT.
- 생성 input은 **확인한 현재 body 복제본**이다. PPT 만들던 중 상태가 바뀌면 `commitPrepared`의 expectedRevision/round 및 fileRevision에서 거절한다. 만든 Blob만 다운로드하고 완료로 처리하는 우회 금지. 완료 실패 시 phase writing/이력 count 불변, 입력/모달 보존.
- version은 현재round/current inputRevision/createdBy actor/createdAt context.now, generated, pinIds[], manifest:null, baseVersionId:null, snapshotId:null, index=max+1, 새 id/blobId. `commitPrepared`에 kind=ppt Blob/파일명/해시와 같이 전달하여 기존 해시/참조/원자 저장 검증을 재사용한다.
- domain case는 project가 새 예시인지, canProjectAction complete, acknowledged, current writing, fileRevision, version.round/inputRevision/index/kind/파일명/ID 유일성을 확인한다. version을 추가→기존 snapshot('complete') 호출→생성된 snapshot.id를 해당 version.snapshotId에 대입→phase completed. snapshot은 지금 version ID를 선택해야 한다. 기존 snapshot/버전은 변경하지 않는다. changesInput=false, state.revision만 기존 완료 규칙대로 증가. createIds에는 새 snapshot/version을 일관되게 기록한다.
- 트랜잭션에서 Blob 저장/완료 snapshot/phase 변경이 함께 성공 또는 함께 실패한다. 헤더 hook은 기존 mutation 응답과 invalidate 경로를 사용하므로 완료 통계/버튼/PPT가 갱신된다. promise 진행 중 busy 유지, 완료 후 T03 성공 toast만 표시한다.
- start-round는 기존 domain을 사용한다. 작성 중에서 재작업하면 unfinished 이력만 만들고 PPT를 완료본으로 만들지 않는다. 작성 완료 섹션만 고정하고 리뷰 코멘트를 전달한다.

## Acceptance Criteria

- [x] 새 예시 첫 접근: 2차 현재 작업/1차 완성본1개/양쪽46장. 목록 통계 작성 완료2·작성 중4·46장. 1차 보기/PPT 모두 동작.
- [x] 현재 장을 편집→2차 완성→보기/PPT에서 수정 내용을 확인하고1차는 불변. 다시 재작업하면3차/기존2차 보관본 유지.
- [x] 이미 seed된 재조회/동시 최초 조회가 예시 snapshot/PPT를 중복 생성하지 않는다.
- [x] 기존 행정 예시6장과 일반 프로젝트는 추가 데이터 변경/다른 PPT 반환 없음.
- [x] PPT 생성 실패/CONFLICT/QUOTA는 부분 완료 상태를 남기지 않는다.
- [x] 자료 원문 시연/설정 draft를 실제 파일/실제 권한 저장으로 오인시키지 않는다.

## Validation

- `npm run typecheck`.
- `npx eslint services/workspace/manufacturing-demo-ppt.ts services/workspace/workspace-mfg-demo.ts services/workspace/IndexedDbWorkspaceRepository.ts types/workspace-production.ts lib/workspace/production/schemas.ts lib/workspace/production/domain.ts hooks/workspace/use-project-round.ts`.
- `npm run lint`.
- `npm run build`.
- `git diff --check`.
- 아래는 파일을 만들지 않는 검증 실행 형태다. 기존 설치된 fake-indexeddb/JSZip/tsx만 사용한다.

```powershell
$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
@'
const assert = require('node:assert/strict');
const JSZip = require('jszip');
const { createManufacturingDemoBundle, addManufacturingDemoCompletion, needsManufacturingDemoCompletion } = require('./services/workspace/workspace-mfg-demo.ts');
const { createManufacturingDemoPpt } = require('./services/workspace/manufacturing-demo-ppt.ts');
const { createWorkspaceProjectCatalog } = require('./config/workspace-projects.ts');
const { MFG_DEMO_PROJECT_ID } = require('./config/production-mfg-demo.ts');
const { hashWorkspaceBlob } = require('./services/workspace/IndexedDbWorkspaceRepository.ts');
const identity={namespace:'files:preview:sodam',actor:{id:'preview:sodam',name:'정소담',role:'user',isMock:true}};
const catalog=createWorkspaceProjectCatalog(identity); let serial=0;
const context={identity,project:catalog.get(MFG_DEMO_PROJECT_ID),members:catalog.members(MFG_DEMO_PROJECT_ID),now:'2026-11-06T00:00:00.000Z',newId:()=>`verify-completion-${++serial}`};
(async()=>{
  const seed=createManufacturingDemoBundle(context); assert.ok(seed);
  const originalBody=JSON.stringify(seed.state.body);
  const blob=await createManufacturingDemoPpt({projectName:context.project.name,organization:'한국스마트제조혁신추진단',round:1,body:seed.state.body});
  const zip=await JSZip.loadAsync(await blob.arrayBuffer());
  const names=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n));
  assert.equal(names.length,46);
  const presentation=await zip.file('ppt/presentation.xml').async('string');
  assert.equal((presentation.match(/<p:sldId\b/g)||[]).length,46);
  assert.ok(presentation.includes('12192000')); assert.ok(presentation.includes('6858000'));
  const xmlEscape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  for(let i=0;i<seed.state.body.slides.length;i++){
    const xml=await zip.file(`ppt/slides/slide${i+1}.xml`).async('string');
    assert.ok(xml.includes(xmlEscape(seed.state.body.slides[i].content.title)));
    assert.ok(xml.includes(xmlEscape(seed.state.body.slides[i].content.lead)));
    assert.ok(!xml.includes('행정안전부'));
  }
  const result=addManufacturingDemoCompletion(seed,context,{blob,sha256:await hashWorkspaceBlob(blob)});
  assert.equal(JSON.stringify(seed.state.body),originalBody);
  assert.equal(result.bundle.state.currentRound,2); assert.equal(result.bundle.files.currentRound,2);
  assert.equal(result.bundle.state.snapshots.length,1); assert.equal(result.bundle.state.pptVersions.length,1);
  const snapshot=result.bundle.state.snapshots[0], version=result.bundle.state.pptVersions[0];
  assert.equal(snapshot.body.slides.length,46); assert.equal(snapshot.pptVersionId,version.id);
  assert.equal(version.snapshotId,snapshot.id); assert.equal(version.byteLength,blob.size);
  assert.equal(needsManufacturingDemoCompletion(result.bundle),false);
  console.log('46장 PPT·예시 완성본 불변식 통과');
})().catch(e=>{console.error(e);process.exitCode=1});
'@ | node --import tsx -
```

위 명령은 PPT 구조/문구와 순수 promotion 함수 검증이다. 아래 matrix의 저장소·동시성·실제 다운로드 경로는 별도 Node/tsx stdin 검증으로 보강하고 보고서에 명령/결과를 남긴다. 브라우저/Office에서 열어 본 검증으로 기록하지 않는다.

| 검증 대상 | 기대 결과 |
| :--- | :--- |
| 새 fixture vs 마지막 HTML 리터럴 | 46장 모든 title/lead/items/layout·섹션 배정 deepEqual |
| 최초 load 2회/동시 load | snapshot1/version1, current2, 원본 body와46장 일치 |
| 이전 행정 예시/일반 프로젝트 load 전후 | 저장 body/파일/댓글/완성본/PPT deepEqual |
| 새 예시 생성 도중 현재 본문 수정 | 예시1차와 live2차 분리, live수정 유지 |
| 실제 downloadPpt 반환 Blob | linked version hash/byteLength,46개 slide parts |
| 편집→완성→재작업 | 수정본 PPT 저장, 기존snapshot/PPT불변, done섹션 고정 |
| stale revision/fileRevision·QUOTA | 작성 상태/이력 불변, 잘못된 Blob 참조 없음 |
| 출처/snapshot/설정 draft | 근거 열람 유지, settings 재개방 baseline 복원 |

- 실행 결과는 `.memory/reports/2026-11-06-workspace-mfg-html-parity-T05.md`에 기록한다. 수동/시각 미실시를 명시하고 실제 검증한 범위만 통과 처리한다.

## Commit Message

```text
feat(workspace): 제조업 완성본과 회차별 PPT 시연을 연결

Plan: 2026-11-06-workspace-mfg-html-parity
Phase: P01-header-production
Task: T05-completion-ppt

- 제조업 예시 46장 보관본과 실제 PPT 다운로드 제공
- 편집 후 완성 시 해당 회차 PPT를 원자적으로 저장
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: 이 Task 식별자의 한국어 커밋에 포함
