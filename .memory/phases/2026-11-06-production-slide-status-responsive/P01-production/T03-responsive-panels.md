# Task: T03 반응형 배치·제작 최초 메뉴 접기·사용자 선택 유지

## Status: done

## Goal
제작 컨테이너 폭이 좁아져도 출처가 중앙을 덮지 않도록 한다. 좁은 데스크톱에서는 출처를 자동으로 접고, 사용자가 펼치면 중앙과 좌측 너비를 실제로 재배분한다.
제작 탭 최초 사용 시 앱 메뉴 사이드바는 접고, 사용자가 펼친 뒤에는 같은 브라우저에서 제작 재진입·프로젝트 전환·새로고침에도 그 선택을 유지한다.

## Decision Summary
- 사용자 확정: “출처를 자동으로 접고, 펼치면 중앙 너비도 함께 조정”.
- 현재 원인: ProductionPanels 오른쪽 aside가 761~1179px에서 absolute이고 너비 계산도 이를 중앙 공간에서 빼지 않는다.
- 실제 컨테이너 ResizeObserver 측정값을 단일 기준으로 사용. 최소 중앙 폭 320 CSS px, 760px 이하는 기존 단일 패널 전환.
- 개인별 저장된 패널 열기/너비 선호는 자동 접기와 별개로 유지. 슬라이드 원래 가로세로 비율/내용/Dadam 폰트는 바꾸지 않는다.
- 선행 T01/T02의 개별 상태/잠금 기능을 보존한다.
- 추가 사용자 요청의 “메뉴 사이드바”는 AppShell/NavSidebar의 왼쪽 주 메뉴다. 제작 내부 슬라이드 목록/출처 자동 접기와 별도 상태로 구현한다.

## Implementation

### I01. 순수 패널 배치 계산과 선호 상태
- Related Files:
  - lib/workspace/production/panel-layout.ts :: ProductionPanelState, ProductionPanelLayout, resolveProductionPanelLayout — new
  - hooks/workspace/use-production-panels.ts :: ProductionPanelState, defaults, schema, resolveProductionPanelWidths, useProductionPanels — modify
  - components/workspace/production/ProductionPanels.tsx :: width measurement / effective layout — modify

#### Signatures & Types
~~~typescript
interface ProductionPanelState {
  leftOpen: boolean;
  rightOpen: boolean;
  leftWidth: number;
  rightWidth: number;
  mobilePanel: "slides" | "editor" | "sources";
}
interface ProductionPanelLayout {
  mode: "mobile" | "compact" | "wide";
  leftOpen: boolean;
  rightOpen: boolean;
  left: number;
  right: number;
  leftRail: number;
  rightRail: number;
  leftSplitter: number;
  rightSplitter: number;
  center: number;
}
function resolveProductionPanelLayout(
  state: ProductionPanelState,
  width: number,
  options?: { compactRightOpen?: boolean }
): ProductionPanelLayout;
~~~

#### Data & Schema Fields
- ProductionPanelState를 새 순수 모듈에서 export하고 hook은 type re-export하여 기존 import 호환 유지.
- localStorage key “kpc-production-panels:” + namespace 유지. 저장 shape 및 범위 유지:
  - defaults leftOpen/rightOpen=true, leftWidth=240, rightWidth=360, mobilePanel=editor.
  - left 150~480, right 280~680, 각각 px. persisted 데이터 오류/JSON 오류는 기존 기본값 처리.
- compactRightOpen은 현재 namespace/compact 모드 진입 동안만 유지하는 UI 상태. localStorage에 넣지 않는다.
- layout.mode: width<=760 mobile, 761~1179 compact, width>=1180 wide. 유한하지 않거나 측정 전 width<=0은 0으로 취급해 mobile 안전 배치.
- 실제 배치 값과 저장 선호를 구분한다. 자동 계산된 작은 폭으로 기존 leftWidth/rightWidth를 덮어쓰지 않는다.

#### Execution Flow / Logic
1. mobile: 기존 mobilePanel 하나만 표시. 열린 패널/center의 폭은 실제 측정 폭, rail/splitter=0. 세 패널은 상태 보존을 위해 mount를 유지하고 hidden/display만 제어한다.
2. wide: leftOpen/rightOpen은 저장 선호. compact: leftOpen은 저장 선호, rightOpen은 저장 rightOpen && compactRightOpen. 처음 진입 시 출처 자동 접기.
3. 데스크톱에서 닫힌 측면은 rail=40, 열린 측면은 splitter=6을 예산에 포함한다. 열린 좌측 최소150, 우측 최소280, 중앙 최소320.
4. 명시적으로 출처를 연 뒤 두 측면 최소폭을 수용할 수 없다면 좌측을 임시로 rail로 접는다. 761px에서 150+280+320+12=762이므로 이 경계를 반드시 처리한다. leftOpen 선호값은 바꾸지 않는다.
5. desktop 예산 B=width-320-leftChrome-rightChrome. leftChrome은 좌측 open이면6 아니면40, rightChrome도 동일.
6. 양쪽 open: left=min(savedLeft, max(150, B-280)), right=min(savedRight, B-left).
   - 위 4단계로 최소합이 불가능한 경우는 이미 좌측이 닫혀 있어야 한다.
   - 좌측만 open: left=min(savedLeft,B), right=0. 우측만 open: right=min(savedRight,B), left=0.
   - 닫힌 측면 너비는0. center=width-left-right-leftRail-rightRail-leftSplitter-rightSplitter.
7. 모두 값은 finite/non-negative, desktop center>=320, 전체합<=width. 임의 반올림으로 합이 width를 넘지 않도록 한다. fractional CSS width도 지원.
8. 기존 resolveProductionPanelWidths는 호출부를 새 함수로 전환 후 제거하거나 새 함수의 left/right만 돌려주는 얇은 호환 wrapper로 유지한다. 중복 계산식을 남기지 않는다.
9. viewport/zoom 변화는 root.clientWidth 기반 기존 ResizeObserver/window resize/requestAnimationFrame 경로로 반영한다. 좁은 폭을 window.innerWidth로 판단하지 않는다.

### I02. 출처를 덮는 배치 제거 및 접기/펼치기 조작
- Related Files:
  - components/workspace/production/ProductionPanels.tsx :: panel/rail/splitter/toggle/focus/resizeVisible — modify
  - hooks/workspace/use-production-panels.ts :: update/resize — modify only as required to expose effective layout, 저장 처리 계약 유지

#### Details
1. 오른쪽 aside의 761px absolute/inset-y/right/z-index/shadow overlay 배치를 제거한다. 모든 desktop 패널은 일반 flex/grid 흐름에서 명시 계산 폭을 차지한다.
2. CSS container query와 JS가 서로 다른 mode를 선택하지 않게 한다. root data-production-mode와 계산 layout을 기준으로 표시/폭/splitter/rail을 일치시킨다. 중첩 @container 폭을 잘못 기준 삼지 않는다.
3. center에 min-width:0/min-height:0, flex:1, max-width:100%, box-sizing:border-box. side/rail/splitter는 shrink:0. child overflow를 숨기는 것만으로 가려짐을 해결했다고 하지 않는다.
4. 우측 splitter는 compact에서 출처를 명시적으로 연 경우에도 표시한다. 기존 1180px 이상 전용 조건 제거.
5. rail aria-expanded와 버튼 표시/포커스는 stored s.rightOpen이 아니라 실제 layout.rightOpen을 따른다. 자동 접혀 있는데 버튼이 “접기”로 표시되거나 펼치기 동작이 없는 상태를 없앤다.
6. compact 우측 펼치기: 저장 rightOpen=true + transient compactRightOpen=true. 중앙 폭을 함께 재계산. 닫기: 저장 rightOpen=false + transient=false. 단순 폭 변화에 의한 자동 접기는 저장 선호를 변경하지 않는다.
7. namespace 변경 또는 compact 모드를 나갔다가 재진입하면 transient override를 초기화한다. wide에서는 저장 선호대로 다시 표시한다. 모바일 sources 선택은 독립적이며 저장 mobilePanel을 사용한다.
8. 임시로 접힌 좌측을 펼치려는데 양쪽 최소폭이 불가능한 경우 우측 transient를 해제해 우측을 접고 좌측을 연다. 마지막 명시 조작의 패널을 우선한다.
9. 기존 키보드 좌우10px/Home, 더블클릭 기본폭240/360, pointer capture/취소 유지. 드래그 계산은 saved width가 아닌 실제 displayed width 기준의 기존 보정 유지, 다른 열을 덮지 못하게 clamp.
10. separator aria-valuenow는 실제 폭, 최소/최대도 현재 가용 최대와 일치시킨다. 좁아져서 불가능한 범위를 표시하지 않는다.
11. 명시 접기/펼치기 후 현재 표시되는 대응 버튼/편집 제어로 포커스 복원. 자동 접기로 포커스된 패널이 숨으면 그 rail로 이동하되, 포커스가 다른 곳이면 빼앗지 않는다.
12. 화면 전환 때문에 중앙 편집 component를 unmount하거나 draft를 지우지 않는다. 모바일에서 편집/출처를 전환해도 미저장 초안 유지.

### I03. 중앙 편집/슬라이드 래퍼의 폭·높이 수용
- Related Files:
  - components/workspace/production/ProductionWorkspace.tsx :: renderCenter/editor header/data-production-scroll — modify
  - components/workspace/production/ProductionToolbar.tsx :: title/control row/popup — modify only where wrap/width propagation is missing
  - components/workspace/production/ManufacturingPromptEditor.tsx :: editable container — modify only width constraints
  - components/workspace/production/SlideContentEditor.tsx :: paper/table/editable — modify only width constraints
  - components/workspace/production/SourcePanel.tsx :: root/scroll/source cards — modify only width constraints
  - components/workspace/production/ProductionPreview.tsx :: root/wrappers — modify only width constraints
  - components/workspace/production/BasicSlidePreview.tsx :: frame/clientWidth scale — read-only, 기존960x540 좌표계 보존
  - components/workspace/production/HtmlDemoSlidePreview.module.css :: slide/container — read-only, 기존16:9/cqw/Dadam 유지
  - components/workspace/production/ProductionScreen.tsx :: flex/min-width/min-height chain — read-only, 이미 존재하는 제한 유지
  - components/comments/SlideCommentSurface.tsx, components/admin/templates/workbench/TemplateSlidePreview.tsx — read-only, 비율/좌표 변환/관리자 화면 동작 유지

#### Details
- 중앙 헤더/본문/프리뷰 wrapper 모두 width:100%/min-width:0/max-width:100%/border-box가 이어지도록 한다.
- 제목이 길어도 버튼/본문이 옆 열을 밀지 않게 title flex item은 min-width:0과 줄바꿈 또는 기존 ellipsis, 버튼 그룹은 필요한 경우 다음 줄로 wrap. 버튼 자체를 축소해 가독성을 낮추지 않는다.
- 긴 URL/텍스트/표 셀은 overflow-wrap:anywhere 또는 기존 fixed table layout 유지. 필요한 경우 표 자체에서만 내부 가로 스크롤을 허용한다.
- 기존 편집 헤더 max-height:55%와 내부 overflow-y:auto, 중앙 preview flex:1/min-height:0/세로 스크롤을 유지한다. 낮은 창에서도 잠금/오류 안내가 넘치면 그 영역 내부로 스크롤 가능해야 한다.
- “화면에 맞춤”은 가로 폭을 맞추고 높이는 필요한 만큼 세로 스크롤하는 의미다. 슬라이드를 찌그러뜨리거나 잘라서 억지로 높이에 맞추지 않는다.
- 제조업/HTML 16:9, 기본960x540 축척, 업로드 Template 원래 aspect ratio를 각각 유지한다. 스크린 확대 비율을 보고 콘텐츠 font-size/좌표 데이터를 변경하지 않는다.
- 레이아웃 폭 변경은 기존 ResizeObserver 기반 미리보기 축척을 갱신한다. 별도 transform을 중복으로 적용하지 않는다.
- SourcePanel도 min-width:0과 단어 줄바꿈을 적용해 카드/첨부 파일명이 중앙을 덮지 않는다.
- 현재 경고의 정확한 가려짐 원인은 right overlay다. 이미 폭 대응하는 미리보기 내부 디자인을 재작성하지 않는다.

### I04. 제작 최초 진입의 메뉴 사이드바 기본 접기와 명시적 선택 유지
- Related Files:
  - components/layout/AppShell.tsx :: AppShell, sidebarCollapsed, isProduction, NavSidebar props, onCollapseToggle — modify
  - hooks/workspace/use-production-sidebar.ts :: useProductionSidebar — new
  - components/layout/NavSidebar.tsx :: isCollapsed/onCollapseToggle/aria-expanded — read-only, 기존 제어 props 재사용
  - components/workspace/WorkspaceProjectProvider.tsx :: useOptionalWorkspaceRuntime — read-only, 사용자 namespace 사용
  - components/layout/WorkspaceNavigation.tsx, WorkspaceHeader.tsx :: 모바일 menuOpen/toggleMenu — read-only
  - app/(authenticated)/layout.tsx :: AppShell의 공통 layout 배치 — read-only

#### Signatures & Types
~~~typescript
interface ProductionSidebarPreference {
  version: 1;
  collapsed: boolean;
}
function useProductionSidebar(namespace: string | null): {
  collapsed: boolean;
  ready: boolean;
  setCollapsed(value: boolean): void;
};
~~~

#### Data & Schema Fields
- localStorage key: "kpc-production-menu-sidebar:" + namespace.
- namespace는 useOptionalWorkspaceRuntime()?.identity.namespace ?? null. projectId/round/snapshot/role/queryScope 인스턴스를 키에 포함하지 않는다. 프로젝트 전환이나 재접속으로 사용자 선택이 초기화되면 안 된다.
- 저장 값은 version=1, collapsed boolean의 엄격한 shape. 키가 없거나 잘못된 값은 “명시적 선택 없음”으로 취급하고 제작 기본 collapsed=true.
- collapsed=false도 유효한 저장값이다. truthy 조건으로 검사하지 않고 null/undefined와 구분한다.
- 첫 자동 접기 자체는 저장하지 않는다. 사용자의 펼치기/접기 조작에서만 저장한다. 별도 firstVisit 플래그는 만들지 않는다.
- 제작 이외 화면은 기존 AppShell의 sidebarCollapsed 상태를 계속 사용한다. 제작용 선택은 독립적이다.
- 브라우저 저장 접근이 실패하면 메모리 선택을 유지하며 조작을 막거나 오류 토스트를 띄우지 않는다. 이 경우 새로고침 간 지속성은 보장할 수 없다.

#### Execution Flow / Logic
1. AppShell에서 hook을 조건부 호출하지 않고 항상 호출한다. effectiveCollapsed = isProduction ? productionSidebar.collapsed : sidebarCollapsed로 하나의 표시값을 만든다. isProduction은 기존 pathname==="/workspace/write".
2. 저장된 수동 선택이 없으면 제작 첫 렌더부터 collapsed=true를 사용한다. 직접 URL 진입과 다른 메뉴에서 제작으로 이동하는 경우 모두 포함한다.
3. effect에서 매번 isProduction이면 setSidebarCollapsed(true)를 호출하는 방식은 금지한다. 사용자가 펼친 뒤 렌더/재진입마다 다시 접히는 문제가 발생한다.
4. 제작에서 펼치기 버튼을 누르면 productionSidebar.setCollapsed(false), 이후 접기 버튼은 true를 기록한다. root의 styles.collapsed와 NavSidebar.isCollapsed/아이콘/ARIA 모두 같은 effectiveCollapsed를 사용한다. 기존 200px↔64px CSS 변수 전환을 유지한다.
5. 제작 외 메뉴의 onCollapseToggle은 기존 setSidebarCollapsed만 변경한다. 이 조작으로 제작용 저장 선택을 덮어쓰지 않는다.
6. 사용자 namespace가 준비되면 해당 키의 저장값을 클라이언트에서 읽는다. SSR 중 localStorage를 읽지 않는다. 서버와 최초 hydration의 기본값은 true로 일치시키고 저장값 확인 후 사용자 선택을 적용한다.
7. namespace 변경 시 이전 사용자의 값이 잠시라도 현재 사용자 선택으로 저장되지 않도록 ready/loadedNamespace를 구분한다. null namespace는 저장하지 않으며 사용자별 상태를 섞지 않는다.
8. 저장값 로드보다 사용자 클릭이 먼저 일어나면 같은 namespace의 최신 수동 선택을 우선한다. 초기 로드 effect가 늦게 완료돼 수동 false를 true로 덮어쓰지 않도록 수동 변경 세대값 또는 ref로 보호한다.
9. 저장된 펼침은 제작 재진입/프로젝트·회차·슬라이드 전환/새로고침에도 복원한다. 다시 접으면 그 이후에는 마지막 접기 선택을 유지한다.
10. 메뉴 폭 변경은 기존 제작 root ResizeObserver로 중앙/출처 배치를 재계산한다. 앱 메뉴 폭 200/64를 ProductionPanels 예산에서 다시 빼면 이중 차감이므로 금지한다.
11. 760px 이하 모바일 menuOpen(오버레이 열기)은 desktop collapsed와 별개다. 모바일 메뉴 열기/메뉴 링크 선택에 따른 닫기/ESC/포커스 trap/inert/배경 스크롤 잠금은 그대로 유지한다. 모바일 메뉴를 열었다고 desktop 펼침 선호를 저장하지 않는다.
12. 제작의 폭 변화에 따른 출처 자동 접기와 이 수동 메뉴 선호는 독립적이다. resize/zoom은 명시적인 메뉴 선택을 덮어쓰지 않는다.

## Acceptance Criteria
- [ ] 761~1179px 첫 진입 시 출처 rail만 보이며 중앙에 출처 overlay가 없음.
- [ ] 출처를 펼치면 우측 실제 열+splitter를 차지하고 중앙 폭도 함께 감소. 761px 경계는 좌측 자동 rail로 전환.
- [ ] 760px 이하에서 슬라이드/편집/출처를 하나씩 볼 수 있고 편집 초안 유지.
- [ ] 넓은 화면 복귀 시 저장된 열기 선호/너비를 다시 사용. 자동 접기로 localStorage 선호가 훼손되지 않음.
- [ ] 모든 desktop 조합에서 center>=320, width 합계가 container 이내, NaN/음수 없음.
- [ ] 제조업/기본/Template 미리보기 비율·글꼴·댓글 위치 유지.
- [ ] 낮은 화면/긴 제목/상태 배너/다중 선택에서도 모든 제어를 스크롤/줄바꿈으로 접근 가능.
- [ ] T02 개별 완료/해제 및 안내 제거 기능 유지.
- [ ] 제작용 저장 선택이 없는 사용자의 첫 진입은 앱 메뉴가 64px로 접힌 상태.
- [ ] 사용자가 펼치면 200px로 바뀌고 재렌더/제작 재진입/프로젝트 전환/같은 브라우저 새로고침에도 유지.
- [ ] 사용자가 다시 접으면 마지막 접기 선택 유지. 저장된 false를 미설정으로 취급하지 않음.
- [ ] 사용자 namespace 변경, 늦은 저장값 로드, localStorage 실패가 사용자 선택을 잘못 덮어쓰지 않음.
- [ ] 다른 메뉴의 기본 동작과 모바일 메뉴 열기/닫기/포커스 처리 유지, 주 메뉴 변경 후 중앙 배치 정상 재계산.

## Validation
- npm.cmd run typecheck
- npx.cmd eslint lib/workspace/production/panel-layout.ts hooks/workspace/use-production-panels.ts hooks/workspace/use-production-sidebar.ts components/workspace/production components/layout/AppShell.tsx
- 아래 Node stdin 순수 배치 검증. tests/ 또는 검증 파일 생성 금지.
~~~powershell
@'
const assert=require("node:assert/strict");
const {resolveProductionPanelLayout:layout}=require("./lib/workspace/production/panel-layout");
const widths=[0,320,375,640,760,761,761.5,762,800,940,1024,1179,1180,1280,1440,1920];
for(const width of widths)
for(const leftOpen of [false,true])
for(const rightOpen of [false,true])
for(const leftWidth of [150,240,480])
for(const rightWidth of [280,360,680])
for(const compactRightOpen of [false,true]){
 const s={leftOpen,rightOpen,leftWidth,rightWidth,mobilePanel:"editor"};
 const r=layout(s,width,{compactRightOpen});
 for(const k of ["left","right","leftRail","rightRail","leftSplitter","rightSplitter","center"])
  assert(Number.isFinite(r[k])&&r[k]>=0,k+" invalid at "+width);
 if(width<=760){assert.equal(r.mode,"mobile");continue;}
 assert(r.center>=320-0.001);
 assert(Math.abs(r.left+r.right+r.leftRail+r.rightRail+r.leftSplitter+r.rightSplitter+r.center-width)<0.001);
 if(width<1180&&!compactRightOpen)assert.equal(r.rightOpen,false);
 if(r.leftOpen)assert(r.left>=150&&r.left<=leftWidth);
 if(r.rightOpen)assert(r.right>=280&&r.right<=rightWidth);
 assert.deepEqual(s,{leftOpen,rightOpen,leftWidth,rightWidth,mobilePanel:"editor"});
}
const base={leftOpen:true,rightOpen:true,leftWidth:240,rightWidth:360,mobilePanel:"editor"};
assert.equal(layout(base,1024).rightOpen,false);
assert.equal(layout(base,1024,{compactRightOpen:true}).rightOpen,true);
assert.equal(layout(base,761,{compactRightOpen:true}).leftOpen,false);
assert.equal(layout(base,1180).rightOpen,true);
console.log("배치 경계·선호 보존·비중첩 예산 검증 통과");
'@ | node --require tsx/cjs
~~~
- 정적 확인: 우측 aside에 breakpoint absolute overlay가 남지 않았는지, 표시 조건/ARIA/폭 계산이 같은 layout을 쓰는지, compact override가 namespace/모드 변화에서 초기화되는지 검토.
- 메뉴 상태 검증: 미설정→제작 접힘→수동 펼침→제작 재진입/프로젝트 전환→저장 false 복원→수동 접기→저장 true 복원을 확인한다. 새 사용자 namespace에는 이전 사용자 선택을 이식하지 않는다.
- 기존 Node stdin/jsdom 환경에서 hook의 저장 로드와 사용자 클릭 순서를 검증한다. 저장 로드를 기다리는 중의 수동 펼침, read/write 예외, malformed JSON, version 불일치, boolean false를 포함한다. jsdom은 저장/React 상태 검증 용도이며 레이아웃/브라우저 시각 검증으로 취급하지 않는다. tests/ 또는 검증 파일은 만들지 않는다.
- AppShell 정적 검토: 루트 collapsed class와 NavSidebar props가 같은 effectiveCollapsed인지, isProduction/resize마다 강제 접는 effect가 없는지, 모바일 menuOpen에 제작 선호 저장을 연결하지 않았는지 확인한다.
- 주 메뉴가 접혔다 펼쳐질 때의 container 폭 변화도 순수 panel-layout 행렬에 대입한다(예: 가용 폭에서 200px와 64px를 각각 차감한 두 입력). 실제 ProductionPanels에서는 root.clientWidth만 사용하고 추가 차감하지 않는다.
- npm.cmd run build — 최종 통합 검증. type/lint/build가 통과하면 사유 없이 전체 검증을 반복하지 않는다.
- 결과를 .memory/reports/2026-11-06-production-slide-status-responsive-T03.md에 기록. 브라우저/CUA/E2E/dev server/스크린샷을 사용하지 않았으므로 실제 확대/축소 및 시각 확인은 미실시라고 명확히 보고한다. 코드/순수 계산 검증을 실제 화면 검증이라고 표현하지 않는다.

## Commit Message
~~~text
fix(production): 반응형 배치와 제작 메뉴 사이드바 선택 유지

Plan: 2026-11-06-production-slide-status-responsive
Phase: P01-production
Task: T03-responsive-panels

- 좁은 화면의 출처 자동 접기와 실제 패널 너비 재배분
- 중앙 편집과 슬라이드 비율을 유지하며 가려짐 방지
- 제작 최초 메뉴 접기와 수동 펼침·접기 선택 보존
~~~

## Progress
- [x] 구현 완료
- [x] 지정 타입/lint/build 및 stdin 상태·배치 검증 통과
- commit: 본 Task 완료 커밋의 Plan/Phase/Task 식별자로 조회
- 검증 기록: [T03 결과](../../../reports/2026-11-06-production-slide-status-responsive-T03.md)
- Acceptance Criteria는 코드·배치 계산·React 상태 검증으로 확인했다. 실제 브라우저 확대/축소 및 시각 검증은 정책에 따라 미실시.

## Execution Constraints
테두리/폰트/코멘트/설정/회차/기존 HTML 계획의 미커밋 변경 보존. tests/ 생성·복원, 브라우저/CUA/E2E/dev server/스크린샷 검증 금지. 원본 HTML 읽기 전용. 패키지/DB/배포/push 없음. Task에 실제 필요한 파일만 stage, current.md ignore 유지. 완료 시 phase done 3/3 및 current Active Task 없음으로 전진.
