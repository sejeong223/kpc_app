# 전체 재검증 추가 재현 코드

- 브라우저와 실제 사용자 DB를 사용하지 않는 Node·jsdom·독립 IDB 검증.
- 기존 회귀 코드와 함께 각 javascript 블록을 `node --require tsx/cjs -` 표준 입력으로 실행한다.
- 새 테스트 폴더·테스트 파일을 만들지 않는다.

## 목차·체크리스트·회차 도메인

```javascript
const assert=require("node:assert/strict");
const {createWorkspaceState,applyWorkspaceMutation}=require("./lib/workspace/production/domain.ts");
const {createEmptyFileProject}=require("./lib/workspace/files/domain.ts");
const {projectCanvasSnapshot,canvasCapabilities}=require("./lib/workspace/production/canvas-comments.ts");
const {getCompletionSummary}=require("./lib/workspace/production/selectors.ts");
const ids={pm:"entra:oid:pm",a:"entra:oid:a",b:"entra:oid:b",super:"entra:oid:super"};
let seq=0;
const project={id:"p",number:"P",name:"검증",departmentId:null,pmId:ids.pm,pmName:"PM",memberIds:Object.values(ids)};
const members=Object.values(ids).map(id=>({id,adminUserId:id,name:id,departmentId:null,departmentName:"",email:null,role:id===ids.super?"super_admin":"user"}));
const context=(who="pm")=>({identity:{namespace:"files:"+ids[who],actor:{id:ids[who],name:ids[who],role:who==="super"?"super_admin":"user",isMock:false}},project,members,now:"2026-11-04T00:00:00.000Z",newId:()=>"generated-"+(++seq)});
let files=createEmptyFileProject(context()), state=createWorkspaceState(context(),files);
const execute=(who,operation,extra={})=>{
 const result=applyWorkspaceMutation(state,{projectId:"p",expectedRevision:state.revision,expectedRound:state.currentRound,operation,...extra},context(who),files);
 state=result.receipt.state;files=result.files;return result.receipt;
};

assert.throws(()=>execute('a',{type:'add-chapter',title:'금지',afterId:null}),e=>e.code==='FORBIDDEN');
execute('pm',{type:'add-chapter',title:'첫 목차',afterId:null});
const first=state.body.chapters[0].id;
execute('pm',{type:'add-chapter',title:'둘째 목차',afterId:first});
const second=state.body.chapters[1].id;
execute('pm',{type:'add-section',chapterId:first,title:'소목차',afterId:null});
const section=state.body.sections[0].id;
assert.throws(()=>execute('pm',{type:'assign-section',id:section,assigneeIds:[],reviewerIds:[]}),e=>e.code==='VALIDATION');
assert.throws(()=>execute('pm',{type:'assign-section',id:section,assigneeIds:['outside'],reviewerIds:[]}),e=>e.code==='VALIDATION');
execute('pm',{type:'assign-section',id:section,assigneeIds:[ids.a],reviewerIds:[ids.b]});
execute('pm',{type:'move-section',id:section,chapterId:second,beforeId:null});
assert.equal(state.body.sections[0].id,section);assert.equal(state.body.sections[0].chapterId,second);
execute('pm',{type:'move-chapter',id:second,beforeId:first});assert.equal(state.body.chapters[0].id,second);
execute('pm',{type:'add-check',title:'제출 문서',source:'RFP p.3'});
const check=state.body.checklist[0].id;
execute('pm',{type:'assign-check',id:check,assigneeIds:[ids.a]});
assert.throws(()=>execute('b',{type:'check',id:check,done:true}),e=>e.code==='FORBIDDEN');
execute('a',{type:'check',id:check,done:true});
assert.equal(state.body.checklist[0].checkedBy,ids.a);assert.equal(state.body.checklist[0].checkedAt,context().now);
execute('pm',{type:'remove-check',id:check});assert.equal(state.body.checklist.length,0);
execute('pm',{type:'undo',id:state.undo.id});assert.equal(state.body.checklist[0].checkedBy,ids.a);
execute('a',{type:'set-section-state',id:section,state:'done'});
execute('pm',{type:'complete',expectedFileRevision:files.revision,acknowledged:true});
const archived=JSON.stringify(state.snapshots);
execute('pm',{type:'start-round',expectedFileRevision:files.revision,acknowledged:true});
assert.equal(state.currentRound,2);assert.equal(state.body.sections[0].locked,true);
assert.throws(()=>execute('pm',{type:'remove-chapter',id:second}),e=>e.code==='LOCKED');
execute('a',{type:'unlock-section',id:section});
execute('pm',{type:'rename-section',id:section,title:'새 회차 목차'});
assert.equal(JSON.stringify(state.snapshots),archived);
console.log('PASS TOC: CRUD/order/assignment bounds/checklist author+time/undo, completion/rework/lock/snapshot');
```

## 인증 세션 자동 갱신

```javascript
const assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<html><body><div id="root"></div></body></html>');
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.React=require('react');
const {createElement:h,act}=React,{createRoot}=require('react-dom/client'),Module=require('module'),original=Module._load;
const old={user:{id:'a',name:'최초',roles:['User']},expires:'2099-01-01'};
let result={data:old,status:'authenticated'},value;
Module._load=function(id,...rest){if(id==='next-auth/react')return{SessionProvider:({children})=>children,useSession:()=>result};return original.call(this,id,...rest)};
const {default:Providers,useAuthRuntime}=require('./components/providers.tsx');
function Probe(){value=useAuthRuntime();return null}
const root=createRoot(document.getElementById('root'));
const render=async(enabled=true)=>{await act(async()=>root.render(h(Providers,{authEnabled:enabled,session:old},h(Probe))))};
(async()=>{
await render();assert.equal(value.session,old);
result={data:{...old,user:{...old.user,name:'갱신',roles:['Admin']}},status:'authenticated'};await render();assert.equal(value.session.user.name,'갱신');assert.deepEqual(value.session.user.roles,['Admin']);
result={data:null,status:'unauthenticated'};await render();assert.equal(value.session,null);
result={data:{...old,error:'RefreshAccessTokenError'},status:'authenticated'};await render();assert.equal(value.session,null);
result={data:old,status:'authenticated'};await render(false);assert.equal(value.session,null);
await act(async()=>root.unmount());dom.window.close();console.log('PASS Auth bridge: session refresh, logout, token error, preview separation');
})().catch(e=>{console.error(e);process.exitCode=1});
```


## 제작 화면 외부 회차 변경 시 권한 초안

```javascript
const assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),{IDBFactory}=require('fake-indexeddb');
const dom=new JSDOM('<html><body><div id="root"></div></body></html>',{url:'http://localhost/workspace/write',pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','Element','Event','navigator'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.React=require('react');
const {act,createElement:h,StrictMode}=React,{createRoot}=require('react-dom/client'),{QueryClient,QueryClientProvider}=require('@tanstack/react-query');
const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0},mutations:{gcTime:0}}});
const {createWorkspaceRuntime}=require('./services/workspace/createWorkspaceRuntime.ts');
const actor={id:'entra:oid:pm',name:'PM',role:'user',isMock:false},identity={namespace:'files:'+actor.id,actor};
const project={id:'p',number:'P',name:'검증',departmentId:null,pmId:actor.id,pmName:actor.name,memberIds:[actor.id,'entra:oid:writer']};
const members=project.memberIds.map(id=>({id,adminUserId:id,name:id,departmentId:null,departmentName:'',email:null,role:'user'}));
const catalog={list:()=>[project,{...project,id:'q'}],get:id=>['p','q'].includes(id)?{...project,id}:null,members:()=>members};
const scope=createWorkspaceRuntime({identity,catalog,host:{subscribe:()=>()=>{},getRevision:()=>1,checkWorkspaceAsset:()=>({allowed:true})},getActor:()=>({}),client,instanceId:'regression',reconnect(){},factory:new IDBFactory(),dbName:'isolated-hooks'});
const runtime=scope.runtime;const release=scope.retain();let path='/workspace/write',params=new URLSearchParams('project=p'),choice,comments,guard,readFailure=false,failAfterCommit=false;
const originalRead=runtime.service.load.bind(runtime.service);runtime.service.load=async(...args)=>{if(readFailure)throw new Error('재조회 실패');return originalRead(...args)};
const originalExecute=runtime.service.execute.bind(runtime.service);runtime.service.execute=async(...args)=>{const result=await originalExecute(...args);if(failAfterCommit)readFailure=true;return result};
const router={replace:href=>{const u=new URL(href,'http://localhost');path=u.pathname;params=u.searchParams},push(){}};

for(const key of ['CustomEvent','MouseEvent','HTMLInputElement','HTMLTextAreaElement','Node','NodeFilter','MutationObserver','FocusEvent','KeyboardEvent'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);globalThis.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);
globalThis.ResizeObserver=class{observe(){} unobserve(){} disconnect(){}};
window.matchMedia=q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return false}});
const Module=require('module'),load=Module._load;const mocks={
'next/navigation':{useRouter:()=>router,usePathname:()=>path,useSearchParams:()=>params},
'./WorkspaceProjectProvider':{useOptionalWorkspaceRuntime:()=>runtime},
'@/components/workspace/WorkspaceProjectProvider':{useWorkspaceRuntime:()=>runtime,useOptionalWorkspaceRuntime:()=>runtime},
'@/components/admin/AdminRuntimeProvider':{useAdminRuntime:()=>({revision:1})},
'@/components/workspace/files/FileRuntimeProvider':{useFileRuntime:()=>runtime.fileRuntime},
'@/components/providers':{useAuthRuntime:()=>({authEnabled:false,session:null})},
'@/components/profile/ProfilePreviewProvider':{useProfilePreview:()=>({profile:{name:'PM'}})},
};
Module._load=function(id,...args){return mocks[id]?{__esModule:true,...mocks[id]}:load.call(this,id,...args)};
const {default:Selection,useWorkspaceSelectionContext}=require('./components/workspace/WorkspaceSelectionProvider.tsx');
const Header=require('./components/common/ProjectHeaderProvider.tsx').default,Comments=require('./components/comments/CommentsProvider.tsx').default;
const Files=require('./components/comments/CommentsWorkspace.tsx').default,{FluentProvider,webLightTheme}=require('@fluentui/react-components');
function Probe(){choice=useWorkspaceSelectionContext();return h(Files,{onReconnect(){}})}
const root=createRoot(document.getElementById('root'));
const render=()=>root.render(h(StrictMode,null,h(QueryClientProvider,{client},h(FluentProvider,{theme:webLightTheme},h(Selection,null,h(Comments,null,h(Header,null,h(Probe))))))));
const settle=async()=>{for(let i=0;i<12;i++)await act(async()=>{await new Promise(r=>setTimeout(r,5))})};
const button=label=>{const found=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===label||(b.getAttribute('role')==='tab'&&b.textContent.trim()===label+label));assert.ok(found,label);return found};
const click=async(label)=>{await act(async()=>button(label).click());await settle()};
const type=async(input,value)=>{await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}))});await settle()};
(async()=>{
await act(async()=>render());await settle();assert.equal(choice.error,null);assert.equal(choice.selection.projectId,'p');
await click('설정');await click('권한');
const checkbox=[...document.querySelectorAll('input[type=checkbox]')].find(el=>!el.disabled);assert.ok(checkbox);
await act(async()=>checkbox.click());await settle();assert.equal(checkbox.checked,true);
let bundle=await originalRead('p');await act(async()=>{await runtime.service.execute({projectId:'p',expectedRevision:bundle.state.revision,expectedRound:1,operation:{type:'start-round',expectedFileRevision:bundle.files.revision,acknowledged:true}});await runtime.invalidateProject('p')});await settle();
assert.equal(document.querySelector('input[type=checkbox]'),checkbox);assert.equal(checkbox.checked,true);assert.equal(button('변경 저장').disabled,true);
await click('다시 불러오기');assert.ok(button('계속 편집'));await click('계속 편집');assert.equal(checkbox.checked,true);
await click('다시 불러오기');await click('버리고 계속');await settle();
assert.equal(document.querySelector('input[type=checkbox]').checked,false);
await act(async()=>document.querySelector('input[type=checkbox]').click());await settle();await click('변경 저장');
assert.equal((await originalRead('p')).state.grants.length,1);
console.log('PASS actual permission drawer: remote round preserves draft, conflict/reload/batch save');
await act(async()=>root.unmount());release();client.clear();dom.window.close();
})().catch(async e=>{console.error(e);await act(async()=>root.unmount());release();client.clear();dom.window.close();process.exitCode=1});
```

## 제작 코멘트 외부 회차 변경과 초안 복구

```javascript
const assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),{IDBFactory}=require('fake-indexeddb');
const dom=new JSDOM('<html><body><div id="root"></div></body></html>',{url:'http://localhost/workspace/write',pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','Element','Event','navigator'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.React=require('react');
const {act,createElement:h,StrictMode}=React,{createRoot}=require('react-dom/client'),{QueryClient,QueryClientProvider}=require('@tanstack/react-query');
const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0},mutations:{gcTime:0}}});
const {createWorkspaceRuntime}=require('./services/workspace/createWorkspaceRuntime.ts');
const actor={id:'entra:oid:pm',name:'PM',role:'user',isMock:false},identity={namespace:'files:'+actor.id,actor};
const project={id:'p',number:'P',name:'검증',departmentId:null,pmId:actor.id,pmName:actor.name,memberIds:[actor.id,'entra:oid:writer']};
const members=project.memberIds.map(id=>({id,adminUserId:id,name:id,departmentId:null,departmentName:'',email:null,role:'user'}));
const catalog={list:()=>[project,{...project,id:'q'}],get:id=>['p','q'].includes(id)?{...project,id}:null,members:()=>members};
const scope=createWorkspaceRuntime({identity,catalog,host:{subscribe:()=>()=>{},getRevision:()=>1,checkWorkspaceAsset:()=>({allowed:true})},getActor:()=>({}),client,instanceId:'regression',reconnect(){},factory:new IDBFactory(),dbName:'isolated-hooks'});
const runtime=scope.runtime;const release=scope.retain();let path='/workspace/write',params=new URLSearchParams('project=p'),choice,comments,guard,readFailure=false,failAfterCommit=false;
const originalRead=runtime.service.load.bind(runtime.service);runtime.service.load=async(...args)=>{if(readFailure)throw new Error('재조회 실패');return originalRead(...args)};
const originalExecute=runtime.service.execute.bind(runtime.service);runtime.service.execute=async(...args)=>{const result=await originalExecute(...args);if(failAfterCommit)readFailure=true;return result};
const router={replace:href=>{const u=new URL(href,'http://localhost');path=u.pathname;params=u.searchParams},push(){}};

for(const key of ['CustomEvent','MouseEvent','HTMLInputElement','HTMLTextAreaElement','Node','NodeFilter','MutationObserver','FocusEvent','KeyboardEvent'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);globalThis.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);
globalThis.ResizeObserver=class{observe(){} unobserve(){} disconnect(){}};
window.matchMedia=q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return false}});
const Module=require('module'),load=Module._load;const mocks={
'next/navigation':{useRouter:()=>router,usePathname:()=>path,useSearchParams:()=>params},
'./WorkspaceProjectProvider':{useOptionalWorkspaceRuntime:()=>runtime},
'@/components/workspace/WorkspaceProjectProvider':{useWorkspaceRuntime:()=>runtime,useOptionalWorkspaceRuntime:()=>runtime},
'@/components/admin/AdminRuntimeProvider':{useAdminRuntime:()=>({revision:1})},
'@/components/workspace/files/FileRuntimeProvider':{useFileRuntime:()=>runtime.fileRuntime},
'@/components/providers':{useAuthRuntime:()=>({authEnabled:false,session:null})},
'@/components/profile/ProfilePreviewProvider':{useProfilePreview:()=>({profile:{name:'PM'}})},
};
Module._load=function(id,...args){return mocks[id]?{__esModule:true,...mocks[id]}:load.call(this,id,...args)};

HTMLElement.prototype.getBoundingClientRect=function(){const surface=this.hasAttribute('data-comment-surface');return dom.window.DOMRect.fromRect({x:surface?200:0,y:0,width:surface?1240:360,height:surface?900:360})};
Object.defineProperty(window,'innerWidth',{value:1440,configurable:true});Object.defineProperty(window,'innerHeight',{value:900,configurable:true});
const {default:Selection,useWorkspaceSelectionContext}=require('./components/workspace/WorkspaceSelectionProvider.tsx');
const Header=require('./components/common/ProjectHeaderProvider.tsx').default,{default:Comments,useComments}=require('./components/comments/CommentsProvider.tsx');
const Workspace=require('./components/comments/CommentsWorkspace.tsx').default,{FluentProvider,webLightTheme}=require('@fluentui/react-components');
function Probe(){choice=useWorkspaceSelectionContext();comments=useComments();return h(Workspace)}
const root=createRoot(document.getElementById('root'));
const render=()=>root.render(h(StrictMode,null,h(QueryClientProvider,{client},h(FluentProvider,{theme:webLightTheme},h(Selection,null,h(Comments,null,h(Header,null,h(Probe))))))));
const settle=async()=>{for(let i=0;i<12;i++)await act(async()=>{await new Promise(r=>setTimeout(r,5))})};
const button=label=>{const found=[...document.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')??b.textContent.trim())===label);assert.ok(found,label);return found};
const click=async label=>{await act(async()=>button(label).click());await settle()};
const type=async value=>{const input=document.querySelector('textarea');assert.ok(input);await act(async()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}))});await settle();return input};
(async()=>{
await act(async()=>render());await settle();assert.equal(comments.state.status,'ready');assert.equal(comments.state.snapshot.threads.length,0);
await click('핀 생성');await act(async()=>document.querySelector('[data-comment-surface]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})));await settle();
let input=await type('이전 회차 검토 초안');
const originalController=comments.controller;
let bundle=await originalRead('p');
await act(async()=>{await runtime.service.execute({projectId:'p',expectedRevision:bundle.state.revision,expectedRound:1,operation:{type:'start-round',expectedFileRevision:bundle.files.revision,acknowledged:true}});await runtime.invalidateProject('p')});await settle();
assert.equal(comments.controller,originalController);assert.equal(comments.state.drafts.new.text,'이전 회차 검토 초안');
assert.equal(comments.capabilities.canCreate,false);
assert.ok(document.body.textContent.includes('이전 회차 검토 초안'));
assert.ok(document.body.textContent.includes('현재 작업은 2차로 변경'));
assert.equal([...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='의견 등록'),false);
let rejected;await act(async()=>{rejected=await comments.controller.submitNew()});assert.equal(rejected.ok,false);
assert.equal((await originalRead('p')).state.body.canvasComments.messages.length,0);
await click('최신 회차 불러오기');await click('계속 편집');
assert.equal(comments.state.drafts.new.text,'이전 회차 검토 초안');
await click('최신 회차 불러오기');await click('버리고 계속');await settle();
assert.notEqual(comments.controller,originalController);assert.equal(comments.state.status,'ready');assert.equal(comments.state.drafts.new,undefined);
assert.equal(comments.capabilities.canCreate,true);assert.ok(comments.identity.scope.namespace.includes(',2]'));
await click('핀 생성');await act(async()=>document.querySelector('[data-comment-surface]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})));await settle();
await type('새 회차 의견');await click('의견 등록');
assert.equal((await originalRead('p')).state.body.canvasComments.messages[0].text,'새 회차 의견');
console.log('PASS remote round: old draft retained, stale submit rejected, explicit discard/cancel and new-round save');
await act(async()=>root.unmount());release();client.clear();dom.window.close();
})().catch(async e=>{console.error(e);await act(async()=>root.unmount());release();client.clear();dom.window.close();process.exitCode=1});
```

## 목차 화면 외부 회차 변경 시 권한 초안

```javascript
const assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),{IDBFactory}=require('fake-indexeddb');
const dom=new JSDOM('<html><body><div id="root"></div></body></html>',{url:'http://localhost/workspace/write',pretendToBeVisual:true});
for(const key of ['window','document','HTMLElement','Element','Event','navigator'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.self=dom.window;globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.React=require('react');
const {act,createElement:h,StrictMode}=React,{createRoot}=require('react-dom/client'),{QueryClient,QueryClientProvider}=require('@tanstack/react-query');
const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0},mutations:{gcTime:0}}});
const {createWorkspaceRuntime}=require('./services/workspace/createWorkspaceRuntime.ts');
const actor={id:'entra:oid:pm',name:'PM',role:'user',isMock:false},identity={namespace:'files:'+actor.id,actor};
const project={id:'p',number:'P',name:'검증',departmentId:null,pmId:actor.id,pmName:actor.name,memberIds:[actor.id,'entra:oid:writer']};
const members=project.memberIds.map(id=>({id,adminUserId:id,name:id,departmentId:null,departmentName:'',email:null,role:'user'}));
const catalog={list:()=>[project,{...project,id:'q'}],get:id=>['p','q'].includes(id)?{...project,id}:null,members:()=>members};
const scope=createWorkspaceRuntime({identity,catalog,host:{subscribe:()=>()=>{},getRevision:()=>1,checkWorkspaceAsset:()=>({allowed:true})},getActor:()=>({}),client,instanceId:'regression',reconnect(){},factory:new IDBFactory(),dbName:'isolated-hooks'});
const runtime=scope.runtime;const release=scope.retain();let path='/workspace/toc',params=new URLSearchParams('project=p'),choice,comments,guard,readFailure=false,failAfterCommit=false;
const originalRead=runtime.service.load.bind(runtime.service);runtime.service.load=async(...args)=>{if(readFailure)throw new Error('재조회 실패');return originalRead(...args)};
const originalExecute=runtime.service.execute.bind(runtime.service);runtime.service.execute=async(...args)=>{const result=await originalExecute(...args);if(failAfterCommit)readFailure=true;return result};
const router={replace:href=>{const u=new URL(href,'http://localhost');path=u.pathname;params=u.searchParams},push(){}};

for(const key of ['CustomEvent','MouseEvent','HTMLInputElement','HTMLTextAreaElement','Node','NodeFilter','MutationObserver','FocusEvent','KeyboardEvent'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.requestAnimationFrame=dom.window.requestAnimationFrame.bind(dom.window);globalThis.cancelAnimationFrame=dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.getComputedStyle=dom.window.getComputedStyle.bind(dom.window);
globalThis.ResizeObserver=class{observe(){} unobserve(){} disconnect(){}};
window.matchMedia=q=>({matches:false,media:q,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return false}});
const Module=require('module'),load=Module._load;const mocks={
'next/navigation':{useRouter:()=>router,usePathname:()=>path,useSearchParams:()=>params},
'./WorkspaceProjectProvider':{useOptionalWorkspaceRuntime:()=>runtime,useWorkspaceRuntime:()=>runtime},
'../WorkspaceProjectProvider':{useOptionalWorkspaceRuntime:()=>runtime,useWorkspaceRuntime:()=>runtime},
'@/components/workspace/WorkspaceProjectProvider':{useWorkspaceRuntime:()=>runtime,useOptionalWorkspaceRuntime:()=>runtime},
'@/components/admin/AdminRuntimeProvider':{useAdminRuntime:()=>({revision:1})},
'@/components/workspace/files/FileRuntimeProvider':{useFileRuntime:()=>runtime.fileRuntime},
'@/components/providers':{useAuthRuntime:()=>({authEnabled:false,session:null})},
'@/components/profile/ProfilePreviewProvider':{useProfilePreview:()=>({profile:{name:'PM'}})},
};
Module._load=function(id,...args){return mocks[id]?{__esModule:true,...mocks[id]}:load.call(this,id,...args)};
const {default:Selection,useWorkspaceSelectionContext}=require('./components/workspace/WorkspaceSelectionProvider.tsx');
const Header=require('./components/common/ProjectHeaderProvider.tsx').default,Comments=require('./components/comments/CommentsProvider.tsx').default;
const Files=require('./components/workspace/WorkspaceScreen.tsx').default,{FluentProvider,webLightTheme}=require('@fluentui/react-components');
function Probe(){choice=useWorkspaceSelectionContext();return h(Files,{screen:'toc'})}
const root=createRoot(document.getElementById('root'));
const render=()=>root.render(h(StrictMode,null,h(QueryClientProvider,{client},h(FluentProvider,{theme:webLightTheme},h(Selection,null,h(Comments,null,h(Header,null,h(Probe))))))));
const settle=async()=>{for(let i=0;i<12;i++)await act(async()=>{await new Promise(r=>setTimeout(r,5))})};
const button=label=>{const found=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===label||(b.getAttribute('role')==='tab'&&b.textContent.trim()===label+label));assert.ok(found,label);return found};
const click=async(label)=>{await act(async()=>button(label).click());await settle()};
const type=async(input,value)=>{await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}))});await settle()};
(async()=>{
await act(async()=>render());await settle();assert.equal(choice.error,null);assert.equal(choice.selection.projectId,'p');
await click('설정');await click('권한');
const checkbox=[...document.querySelectorAll('input[type=checkbox]')].find(el=>!el.disabled);assert.ok(checkbox);
await act(async()=>checkbox.click());await settle();assert.equal(checkbox.checked,true);
let bundle=await originalRead('p');await act(async()=>{await runtime.service.execute({projectId:'p',expectedRevision:bundle.state.revision,expectedRound:1,operation:{type:'start-round',expectedFileRevision:bundle.files.revision,acknowledged:true}});await runtime.invalidateProject('p')});await settle();
assert.equal(document.querySelector('input[type=checkbox]'),checkbox);assert.equal(checkbox.checked,true);assert.equal(button('변경 저장').disabled,true);
await click('다시 불러오기');assert.ok(button('계속 편집'));await click('계속 편집');assert.equal(checkbox.checked,true);
await click('다시 불러오기');await click('버리고 계속');await settle();
assert.equal(document.querySelector('input[type=checkbox]').checked,false);
await act(async()=>document.querySelector('input[type=checkbox]').click());await settle();await click('변경 저장');
assert.equal((await originalRead('p')).state.grants.length,1);
console.log('PASS actual permission drawer: remote round preserves draft, conflict/reload/batch save');
await act(async()=>root.unmount());release();client.clear();dom.window.close();
})().catch(async e=>{console.error(e);await act(async()=>root.unmount());release();client.clear();dom.window.close();process.exitCode=1});
```

## RFP 입력·저장 검증

```javascript
const assert=require('node:assert/strict'),{IDBFactory}=require('fake-indexeddb');
const form=require('./lib/rfp/form.ts'),{RfpRecordSchema}=require('./lib/rfp/schemas.ts'),{IndexedDbRfpRepository}=require('./lib/rfp/repository.ts');
const {RFP_FILE_MAX_BYTES,RFP_FILE_MAX_COUNT,RFP_REVIEWER_MAX}=require('./config/rfp-register.ts');
const identity={namespace:'audit:user-a',actor:{id:'user-a',name:'사용자 A',isMock:false}};
let state=form.createRfpFormState();
assert.equal(form.rfpRequiredProgress(state).done,0);
state=form.rfpFormReducer(state,{type:'start-analysis'});state=form.rfpFormReducer(state,{type:'finish-analysis'});
state=form.rfpFormReducer(state,{type:'toggle-reviewer',person:{id:'user-a',name:'사용자 A'}});
assert.equal(form.rfpRequiredProgress(state).done,5);
assert.ok(state.ai.name);state=form.rfpFormReducer(state,{type:'set-field',field:'name',value:'직접 입력한 제목'});assert.equal(state.ai.name,undefined);
state=form.rfpFormReducer(state,{type:'add-files',files:[{id:'f',name:'RFP.pdf',sizeBytes:RFP_FILE_MAX_BYTES},{id:'large',name:'large.pdf',sizeBytes:RFP_FILE_MAX_BYTES+1}]});
assert.equal(state.files.length,1);assert.ok(state.files[0].isMain);assert.ok(state.fileError);
const record=form.toRfpRecord(state,{id:'r1',namespace:identity.namespace,actor:identity.actor,departmentName:null,now:'2026-11-04T00:00:00.000Z'});
for(const date of ['2026-02-31','2026-13-01','2026-02-29','2026-11-00'])assert.equal(RfpRecordSchema.safeParse({...record,dueDate:date}).success,false,date);
assert.equal(RfpRecordSchema.safeParse({...record,dueDate:'2028-02-29'}).success,true);
assert.equal(RfpRecordSchema.safeParse({...record,reviewers:[]}).success,false);
const factory=new IDBFactory(), repository=new IndexedDbRfpRepository({factory,dbName:'audit-rfp'});
(async()=>{
await repository.create(identity,record);
await assert.rejects(()=>repository.create(identity,{...record,id:'r2',registeredBy:{id:'user-b',name:'사용자 B'}}),e=>e.code==='forbidden');
await assert.rejects(()=>repository.create(identity,{...record,id:'r3',pmId:'user-b'}),e=>e.code==='forbidden');
await assert.rejects(()=>repository.create(identity,{...record,id:'r4',namespace:'audit:user-b'}),e=>e.code==='forbidden');
await assert.rejects(()=>repository.create(identity,record),e=>e.code==='conflict');
assert.equal((await repository.list({namespace:'audit:user-b',actor:{...identity.actor,id:'user-b'}})).length,0);
repository.close();
const fresh=new IndexedDbRfpRepository({factory,dbName:'audit-rfp'});assert.deepEqual(await fresh.list(identity),[record]);fresh.close();
state=form.rfpFormReducer(state,{type:'reset'});state=form.rfpFormReducer(state,{type:'finish-analysis'});assert.equal(state.values.name,'');
console.log('PASS RFP: required fields, sample/edit, file boundary, calendar/leap day, author/PM and namespace isolation, duplicate rejection, reload');
})().catch(e=>{console.error(e);repository.close();process.exitCode=1});
```

