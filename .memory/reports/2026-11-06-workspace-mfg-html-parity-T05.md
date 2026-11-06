# Execution: T05-completion-ppt

- 최종 소스 기준 `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run build`, 지정 eslint, `git diff --check` 통과.
- 청사진의 Node/tsx stdin 명령 통과: 제조업 46장 제목/lead, PPT 46개 slide part, 16:9 치수, SHA256·byteLength 및 양방향 snapshot/PPT 연결.
- 추가 stdin 검증: 동시 최초 load 3회 → snapshot1/version1/current2, 동시 실제 서비스 complete 2회 → 1회만 성공, 실제 downloadPpt → 저장 hash·크기 일치.
- 편집한 2차 본문이 PPT에 반영되고 1차 보관본/PPT는 불변. 재작업 시 3차로 전환하며 작성 완료 2개 섹션만 고정.
- 일반 프로젝트와 이전 행정업무 예시 6장/파일/댓글/PPT deepEqual 보존.
- 초기 생성 중 들어온 현재 편집 유지, 독립 원본 1차 보관본 생성 및 undo의 새 회차 유효성 확인.
- stale revision/fileRevision 거절. 최초 promotion 및 재완성의 실제 IDB Blob add 성공 직후 QUOTA 주입 → 트랜잭션 전체 롤백, 잘못된 보관본/버전/Blob 없음.
- XML parser로 전체 XML/relationship 파싱, 모든 target 존재·shape/relationship ID 유일성·정수 글자 크기·양수 치수 확인. 자유 text/list/table 내용·목차 순서·XML escape 확인.
- template/image/빈 deck은 LAYOUT으로 거절. 비공개 prepared operation의 공개 스키마 차단과 잘못된 버전/파일명/작성자/ID 거절 확인.
- HTML 원본 SHA256은 계획 당시 값과 동일, 파일 수정 없음.

핵심 변경:
- `manufacturing-demo-ppt.ts`는 fixture를 재출력하지 않고 전달된 `body`를 읽는다. 텍스트/표 셀은 편집 가능한 도형이며 Navy 테마·4개 레이아웃·단계 화살표·KPI 숫자를 표현한다.
- `workspace-mfg-demo.ts`는 예시 보관본과 현재 편집본을 분리한다. 현재 본문은 다음 회차로 유지하며 댓글/잠금/undo 표시를 맞춘다.
- `IndexedDbWorkspaceRepository.ts`는 ZIP/해시를 트랜잭션 밖에서 계산하고 최신 revision을 다시 검증한 뒤 Blob/보관본/phase를 함께 저장한다.
- `domain.ts`는 `snapshot("complete"); version.snapshotId = saved.id; state.phase = "completed";`를 같은 mutation에서 실행한다.

계획 대조 중 확인한 보완:
- 실제 `WorkspaceProductionService.execute`는 공개 명령도 `repository.commitPrepared`로 보낸다. 저장소 execute만 처리하면 앱에서 PPT 준비를 건너뛰므로 공통 commitPrepared 진입점에도 제조업 complete 준비를 연결했다. 기존 guard를 끝까지 전달한다.
- 최종 HTML 5646행의 실제 회차 문구는 `1차 작성 중` / `N차 재작업 중`이었다. T03 청사진의 `N차 작업 중` 오기를 원본 기준으로 교정하고 관련 근거 문서도 갱신했다.

알아야 할 점:
- 브라우저 및 Office 렌더링은 실행하지 않았다. XML 구조/내용 검증은 실제 화면·PPT 육안 검증을 대신하지 않는다.
- 생성기는 템플릿·이미지 슬라이드를 지원하지 않아 기존 PPT 내보내기를 안내한다. 실제 자료 파일이 없는 출처는 예시 모달이며, 설정 draft는 실제 권한/알림 저장이 아니다.
- 기존 baseline-browser-mapping 데이터 경고가 빌드에 표시되지만 빌드는 성공했다. 패키지는 변경하지 않았다.

재현 명령:
- `$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8` 후 아래 JavaScript를 PowerShell `@' ... '@ | node --import tsx -`로 실행한다. 별도 검증 파일/디렉토리를 생성하지 않는다.

<details><summary>저장소·실제 서비스·다운로드·완료 경쟁·QUOTA 검증</summary>

```javascript
const assert=require('node:assert/strict');
const {createWorkspaceProjectCatalog}=require('./config/workspace-projects.ts');
const {createManufacturingDemoBundle}=require('./services/workspace/workspace-mfg-demo.ts');
const {applyWorkspaceMutation}=require('./lib/workspace/production/domain.ts');
const {selectProjectView}=require('./lib/workspace/production/selectors.ts');
const {selectWorkspaceHeader,getWorkspaceHeaderMetadata,getHeaderRoundLabel}=require('./lib/workspace/production/header-selectors.ts');
const id='production-html-mfg-demo', identity={namespace:'files:preview:sodam',actor:{id:'preview:sodam',name:'정소담',role:'user',isMock:true}};
const cat=createWorkspaceProjectCatalog(identity);let serial=0;
const context={identity,project:cat.get(id),members:cat.members(id),now:'2026-11-06T03:00:00.000Z',newId:()=> 'verify-'+(++serial)};

const { IDBFactory }=require('fake-indexeddb');
const JSZip=require('jszip');
const {IndexedDbWorkspaceRepository,hashWorkspaceBlob}=require('./services/workspace/IndexedDbWorkspaceRepository.ts');
const {WorkspaceDatabase}=require('./services/workspace/WorkspaceDatabase.ts');
const {WorkspaceProductionService}=require('./services/workspace/WorkspaceProductionService.ts');
const {manufacturingSourceCards}=require('./lib/workspace/production/manufacturing-sources.ts');
(async()=>{
 const database=new WorkspaceDatabase({factory:new IDBFactory(),dbName:'mfg-verification'});
 const options={identity,catalog:cat,database,now:()=>context.now,newId:context.newId};
 const repo=new IndexedDbWorkspaceRepository(options), other=new IndexedDbWorkspaceRepository(options);
 const service=new WorkspaceProductionService({identity,catalog:cat,repository:repo,assets:{assertPins:()=>{}},now:()=>context.now,newId:context.newId});
 const first=await Promise.all([repo.load(id),other.load(id),repo.load(id)]);
 first.forEach(b=>{assert.equal(b.state.currentRound,2);assert.equal(b.state.snapshots.length,1);assert.equal(b.state.pptVersions.length,1);assert.equal(b.state.body.slides.length,46);assert.equal(b.state.body.sections.filter(s=>s.locked).length,2)});
 assert.deepEqual(first[0],first[1]);assert.deepEqual(first[0],await repo.load(id));
 const baseline=first[0], snap1=structuredClone(baseline.state.snapshots[0]), v1=structuredClone(baseline.state.pptVersions[0]);
 const request=(b,operation)=>({projectId:id,expectedRevision:b.state.revision,expectedRound:b.state.currentRound,operation});
 const ppt1=await service.downloadPpt(id,v1.id);
 assert.equal(ppt1.filename,'제조업_PoC_1차_완성본.pptx');assert.equal(ppt1.blob.size,v1.byteLength);assert.equal(await hashWorkspaceBlob(ppt1.blob),v1.sha256);
 const old=await repo.load('production-html-demo'), normal=await repo.load('mois');
 assert.equal(old.state.snapshots[0].body.slides.length,6);assert.equal(old.state.pptVersions.length,1);
 const oldPpt=await service.downloadPpt('production-html-demo',old.state.pptVersions[0].id);
 const oldZip=await JSZip.loadAsync(await oldPpt.blob.arrayBuffer());
 assert.equal(Object.keys(oldZip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).length,6);
 await service.execute(request(baseline,{type:'apply-manufacturing-prompt',sectionId:'s31',slideId:'mfg-s31-1',prompt:{intro:'수정 PoC <>& 제목',bullets:['연계: MES와 센서 데이터 수정','정합: 데이터 검증','관제: 작업자 승인']}}));
 let current=await repo.load(id);
 const before=structuredClone(current);
 await assert.rejects(()=>repo.execute(request(baseline,{type:'complete',acknowledged:true,expectedFileRevision:baseline.files.revision})),e=>e.code==='CONFLICT');
 await assert.rejects(()=>repo.execute(request(current,{type:'complete',acknowledged:true,expectedFileRevision:current.files.revision+1})),e=>e.code==='CONFLICT');
 assert.deepEqual(await repo.load(id),before);
 // Both simultaneous user confirmation requests use the actual service path.
 const completion=request(current,{type:'complete',acknowledged:true,expectedFileRevision:current.files.revision});
 const attempts=await Promise.allSettled([service.execute(completion),service.execute(completion)]);
 assert.equal(attempts.filter(a=>a.status==='fulfilled').length,1);assert.equal(attempts.filter(a=>a.status==='rejected'&&a.reason.code==='CONFLICT').length,1);
 current=await repo.load(id);assert.equal(current.state.phase,'completed');assert.equal(current.state.snapshots.length,2);
 assert.deepEqual(current.state.snapshots[0],snap1);assert.deepEqual(current.state.pptVersions[0],v1);
 const snap2=current.state.snapshots[1], v2=current.state.pptVersions[1];
 assert.equal(snap2.pptVersionId,v2.id);assert.equal(v2.snapshotId,snap2.id);assert.equal(v2.inputRevision,before.state.inputRevision);
 const ppt2=await service.downloadPpt(id,v2.id), zip2=await JSZip.loadAsync(await ppt2.blob.arrayBuffer());
 assert.equal(ppt2.blob.size,v2.byteLength);assert.equal(await hashWorkspaceBlob(ppt2.blob),v2.sha256);
 const ordered=snap2.body.chapters.flatMap(c=>snap2.body.sections.filter(s=>s.chapterId===c.id).flatMap(s=>snap2.body.slides.filter(p=>p.sectionId===s.id)));
 const index=ordered.findIndex(s=>s.id==='mfg-s31-1');
 assert((await zip2.file('ppt/slides/slide'+(index+1)+'.xml').async('string')).includes('수정 PoC &lt;&gt;&amp; 제목'));
 await service.execute(request(current,{type:'start-round',acknowledged:true,expectedFileRevision:current.files.revision}));
 current=await repo.load(id);assert.equal(current.state.currentRound,3);assert.equal(current.state.body.sections.filter(s=>s.locked).length,2);
 assert.deepEqual(current.state.snapshots[1],snap2);assert.deepEqual(await repo.load('production-html-demo'),old);assert.deepEqual(await repo.load('mois'),normal);
 // Fail after queuing the real blob/version writes; the entire IDB transaction must roll back.
 const transact=database.transact.bind(database);
 database.transact=(stores,mode,run,signal)=>transact(stores,mode,(tx,done,watch)=>run(tx,done,(request,receive)=>watch(request,value=>{
   receive(value);
   if(stores.includes('workspaceBlobs')&&request.source?.name==='workspaceBlobs'&&Array.isArray(request.result) && request.source.transaction.mode==='readwrite'){
      const e=new Error('verification quota');e.name='QuotaExceededError';throw e;
   }
 })),signal);
 await assert.rejects(()=>service.execute(request(current,{type:'complete',acknowledged:true,expectedFileRevision:current.files.revision})),e=>e.code==='QUOTA');
 database.transact=transact;
 assert.deepEqual(await repo.load(id),current);
 const count=await database.transact(['workspaceBlobs'],'readonly',(tx,done,watch)=>watch(tx.objectStore('workspaceBlobs').getAll(),rows=>done(rows.filter(r=>r.projectId===id).length)));
 assert.equal(count,2);
 repo.close();other.close();database.close();
 console.log('T05 repository: concurrent seed/complete, real service download, edited PPT, history immutable, old/normal preservation, stale/fileRevision and quota rollback passed');
})().catch(e=>{console.error(e);process.exitCode=1});
```

</details>

<details><summary>초기 편집 보존·OOXML·초기 promotion 실패 검증</summary>

```javascript
const assert=require('node:assert/strict');
const {createWorkspaceProjectCatalog}=require('./config/workspace-projects.ts');
const {createManufacturingDemoBundle}=require('./services/workspace/workspace-mfg-demo.ts');
const {applyWorkspaceMutation}=require('./lib/workspace/production/domain.ts');
const {selectProjectView}=require('./lib/workspace/production/selectors.ts');
const {selectWorkspaceHeader,getWorkspaceHeaderMetadata,getHeaderRoundLabel}=require('./lib/workspace/production/header-selectors.ts');
const id='production-html-mfg-demo', identity={namespace:'files:preview:sodam',actor:{id:'preview:sodam',name:'정소담',role:'user',isMock:true}};
const cat=createWorkspaceProjectCatalog(identity);let serial=0;
const context={identity,project:cat.get(id),members:cat.members(id),now:'2026-11-06T03:00:00.000Z',newId:()=> 'verify-'+(++serial)};

const {IDBFactory}=require('fake-indexeddb'), JSZip=require('jszip'), path=require('node:path').posix;
const {DOMParser}=require('@xmldom/xmldom');
const {IndexedDbWorkspaceRepository,hashWorkspaceBlob}=require('./services/workspace/IndexedDbWorkspaceRepository.ts');
const {WorkspaceDatabase}=require('./services/workspace/WorkspaceDatabase.ts');
const {createManufacturingDemoPpt}=require('./services/workspace/manufacturing-demo-ppt.ts');
const {addManufacturingDemoCompletion}=require('./services/workspace/workspace-mfg-demo.ts');
(async()=>{
 const database=new WorkspaceDatabase({factory:new IDBFactory(),dbName:'seed-edit'});
 const repo=new IndexedDbWorkspaceRepository({identity,catalog:cat,database,now:()=>context.now,newId:context.newId});
 const transact=database.transact.bind(database);let injected=false;
 database.transact=(stores,mode,run,signal)=>transact(stores,mode,run,signal).then(async result=>{
   if(!injected&&stores.includes('blobs')&&!stores.includes('workspaceBlobs')&&mode==='readwrite'){
    injected=true;
    await repo.execute({projectId:id,expectedRevision:result.state.revision,expectedRound:1,operation:{type:'apply-manufacturing-prompt',sectionId:'s31',slideId:'mfg-s31-1',prompt:{intro:'생성 중 수정 내용',bullets:['보존: 실제 입력']}}});
   }
   return result;
 });
 const promoted=await repo.load(id);
 assert.equal(promoted.state.body.slides.find(s=>s.id==='mfg-s31-1').content.lead,'생성 중 수정 내용');
 assert.notEqual(promoted.state.snapshots[0].body.slides.find(s=>s.id==='mfg-s31-1').content.lead,'생성 중 수정 내용');
 assert.equal(promoted.state.undo.round,2);assert.equal(promoted.state.undo.afterRevision,promoted.state.revision);
 const reverted=await repo.execute({projectId:id,expectedRevision:promoted.state.revision,expectedRound:2,operation:{type:'undo',id:promoted.state.undo.id}});
 assert.equal(reverted.state.body.slides.length,46);
 assert.deepEqual(reverted.state.snapshots,promoted.state.snapshots);
 // Throw during PPT assembly; no storage mutation can have happened yet.
 const base=await repo.load(id), commit=repo.commitPrepared.bind(repo);
 const renderer=require('./services/workspace/manufacturing-demo-ppt.ts');
 // Unsupported template/image input uses the same generator's failure boundary.
 for(const kind of ['template','image']){
   const body=structuredClone(base.state.body);
   if(kind==='template')body.slides[0].template={pinId:'not-supported',sourceSlidePath:'ppt/slides/slide1.xml',bindings:[]};
   else body.slides[0].content.blocks.push({id:'image',kind:'image',blobId:'unused',alt:'image',width:1,height:1,mime:'image/png'});
   await assert.rejects(()=>createManufacturingDemoPpt({projectName:context.project.name,organization:'제조',round:2,body}),e=>e.code==='LAYOUT');
 }
 assert.deepEqual(await repo.load(id),base);
 const original=createManufacturingDemoBundle(context);
 const changed=structuredClone(original.state.body);changed.chapters.reverse();
 changed.slides.find(s=>s.id==='mfg-s31-1').content.blocks=[{id:'list-a',kind:'list',items:['A < B & C','D > E']},{id:'text-a',kind:'text',text:'내용\n다음 줄'}];
 const blob=await createManufacturingDemoPpt({projectName:context.project.name,organization:'한국스마트제조혁신추진단',round:2,body:changed});
 const zip=await JSZip.loadAsync(await blob.arrayBuffer());
 for(const [name,file] of Object.entries(zip.files)){
   if(!name.endsWith('.xml')&&!name.endsWith('.rels'))continue;
   const xml=await file.async('string');
   const doc=new DOMParser({onError:(level,message)=>{throw new Error(name+':'+message)}}).parseFromString(xml,'application/xml');
   assert(doc.documentElement);
   const shapes=Array.from(doc.getElementsByTagName('p:cNvPr')).map(node=>node.getAttribute('id'));assert.equal(new Set(shapes).size,shapes.length);
   for(const node of Array.from(doc.getElementsByTagName('a:rPr')))assert(/^\d+$/.test(node.getAttribute('sz')));
   for(const node of Array.from(doc.getElementsByTagName('a:ext')))assert(Number(node.getAttribute('cx'))>=0&&Number(node.getAttribute('cy'))>=0);
   if(name.endsWith('.rels')){
     const relationships=Array.from(doc.getElementsByTagName('Relationship')), ids=relationships.map(n=>n.getAttribute('Id'));assert.equal(new Set(ids).size,ids.length);
     const baseDir=name==='_rels/.rels'?'':path.dirname(path.dirname(name));
     for(const node of relationships)assert(zip.file(path.normalize(path.join(baseDir,node.getAttribute('Target')))),name+' broken target');
   }
 }
 const firstXml=await zip.file('ppt/slides/slide1.xml').async('string');assert(firstXml.includes(changed.slides.find(s=>s.sectionId===changed.sections.find(s=>s.chapterId===changed.chapters[0].id).id).content.title));
 const allXml=(await Promise.all(Object.values(zip.files).filter(f=>/^ppt\/slides\/slide\d+\.xml$/.test(f.name)).map(f=>f.async('string')))).join('\n');
 assert(allXml.includes('A &lt; B &amp; C'));assert(allXml.includes('D &gt; E'));assert(allXml.includes('다음 줄'));assert(allXml.includes('→'));assert(allXml.includes('sz="3200"'));assert(allXml.includes('1F3A5F'));assert(!allXml.includes('<p:pic>'));
 // Seed promotion rollback after the blob add, before transaction completion.
 const db2=new WorkspaceDatabase({factory:new IDBFactory(),dbName:'seed-quota'}), tx2=db2.transact.bind(db2);
 const repo2=new IndexedDbWorkspaceRepository({identity,catalog:cat,database:db2,now:()=>context.now,newId:context.newId});
 db2.transact=(stores,mode,run,signal)=>tx2(stores,mode,(tx,done,watch)=>run(tx,done,(request,receive)=>watch(request,value=>{
   receive(value);
   if(stores.includes('workspaceBlobs')&&mode==='readwrite'&&request.source?.name==='workspaceBlobs'&&Array.isArray(value)){const e=new Error('quota');e.name='QuotaExceededError';throw e;}
 })),signal);
 await assert.rejects(()=>repo2.load(id),e=>e.code==='QUOTA');
 db2.transact=tx2;
 const raw=await tx2(['workspaces','workspaceBlobs'],'readonly',(tx,done,watch)=>watch(tx.objectStore('workspaces').get([identity.namespace,id]),row=>watch(tx.objectStore('workspaceBlobs').count(),count=>done({state:row.state,count}))));
 assert.equal(raw.state.currentRound,1);assert.equal(raw.state.snapshots.length,0);assert.equal(raw.state.pptVersions.length,0);assert.equal(raw.count,0);
 assert.equal((await repo2.load(id)).state.currentRound,2);
 repo.close();database.close();repo2.close();db2.close();
 console.log('T05: edit during seeding + usable undo, source isolation, unsupported layouts, XML/relations/shape IDs/generic text/order, initial promotion quota rollback passed');
})().catch(e=>{console.error(e);process.exitCode=1});
```

</details>

- 브라우저/CUA/E2E/dev server/스크린샷 검증 미실시(기존 정책). tests/ 생성 없음.
- 범위 밖 발견: 특이사항 없음. 기존 다른 계획의 미커밋 변경을 보존했다.
