# Sources: HTML v13 헤더·제조업 예시

## 원본

- 경로: C:/Users/김세정/Downloads/KPC_제안서_UI_v13.html
- SHA256: 3501501DE7DE50A2BE2F7FA06F6ED8B59657CFAC993DD62C5DF7E8BA5270E326
- 마지막 mfg 리터럴: TOCS.mfg @5404, SEC_STATE.mfg @5405, PAGES.mfg @5406, FILES_BY.mfg @5407, REQS_P.mfg @5408
- 최종 장수46(8/8/8/8/7/7), 정소담 담당15, 이서연23, 김민수8. 초기에 대화에서42라고 설명한 수치는 직접 집계 전 오류였고 정정했다.
- HTML 스크립트를 실행하지 않고 단일 JSON 대입 리터럴만 JSON.parse했다. 전체 fixture는 독립 실행을 위해 T01 부록에 수록했다.

## 앱에서 확인한 차이

| 대상 | 현재 코드 | 계획 반영 |
| :--- | :--- | :--- |
| 예시 | config/production-html-demo.ts의 행정업무6장 | 별도 제조업46장 fixture, 기존 저장본 보존 |
| 헤더 round label | 작성 중/재작업 중 구분 | HTML 작업 중 문구 |
| 확인창 | 단락 요약과 필수 checkbox | HTML 통계카드/목록/두 재작업 그룹 |
| 완성본 | 날짜/보기,360px,미완성 상세 | 작성자/통계/300px,완성본 목록 |
| 설정 | 기본정보 dl,실제 grant 저장,알림/로그 placeholder | 사용자 선택에 따라 입력/table/toggle/로그 및 닫기 초기화 |
| 제작 status | applyReceipt 기본 성공 notice | 상태 변경만 silent,오류 유지 |
| 편집 | SlideContent 전체 문서 | 새 예시의 제조업 section prompt |
| 출처 | 실제 FileResourceView만 열림 | 새 예시에 metadata/본문 모달 시연 adapter |
| PPT | 고정 MOIS6장 generator | 제조업 body를 받는 generator/회차별 보관 |

## 확정한 원본 예외

- 제조업 BODY가 없어 SEC_BODY의 행정업무 문구를 읽는다. 사용자가 제조업 내용 교정을 선택했다.
- 설정은 HEADER_UI.settings draft이며 closeDrawer에서 폐기된다. 사용자도 이 시연 방식을 선택했다.
- FILES_BY에는 이름과 메타만 있고 실제 PDF/XLSX/DOCX 바이너리가 없다. 가짜 실제 원본을 만들지 않는다.
- mfg 초기 history는 없다. 이전 완성본/PPT 시연 요청을 유지하기 위해 별도1차 보관본+2차현재 작업을 계획했다.
- 사용자 계정/실제 프로젝트 권한은 바꾸지 않고 새 예시 actor에만 헤더 시연 권한을 부여한다.

## 변경 전 상태

- 이전 workspace-html-v13-parity 계획 완료5/5, HEAD fc936ef. 이전 HTML-only 계획의 dirty 문서/미추적 Task·report는 그대로 보존.
- 이번 단계는 .memory 문서만 변경. typecheck/lint/build는 구현 후 실행하도록 계획했으며 현재 앱 검증 통과를 주장하지 않는다.

## 헤더 CSS · HTML 2533–2553

```text
.ph .ph-row,.ph .ph-lead,.ph .ph-acts{gap:8px}
.ph .ph-sel{display:flex;align-items:center;width:560px;max-width:100%;min-width:0;min-height:40px;height:auto;padding:4px 10px;gap:10px;text-align:left;white-space:normal}
.ph-summary{display:flex;flex:1;min-width:0;flex-direction:column;gap:2px}
.ph-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;line-height:20px;font-weight:500}
.ph-meta{font-size:12px;line-height:16px;font-weight:400;color:var(--kpc-secondary)}
.ph .ph-b{padding:2px 8px;border-radius:999px;background:var(--dadam-accent-soft);color:var(--dadam-accent-ink);white-space:nowrap;flex-shrink:0}
.ph .ph-acts .btn{height:34px;min-height:34px;padding:0 12px;gap:6px}
.ph .ph-acts .ph-icon{width:34px;min-width:34px;padding:0}
.ph-picker{padding:8px;border-radius:8px;max-width:100%;overflow:auto}
.ph-picker h2{margin:4px 8px 8px;font-size:12px;color:var(--kpc-secondary)}
.ph-picker .ph-option{display:flex;width:100%;height:auto;align-items:center;padding:10px;gap:16px;text-align:left;white-space:nowrap;margin-bottom:4px}
.ph-option-body{display:flex;flex:1;min-width:0;flex-direction:column;gap:6px}
.ph-option-name{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
.ph-option-body .ph-meta{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ph-option-status{display:flex;flex:none;align-items:center;gap:8px}
.ph-option-check{display:inline-flex;flex:none;width:16px;color:var(--dadam-accent)}
.ph-option-deadline{flex:none;text-align:right;white-space:nowrap;font-size:12px;line-height:16px;font-weight:600;color:var(--kpc-secondary);font-variant-numeric:tabular-nums}
.ph-option-deadline.urgent{color:var(--kpc-danger)}.ph-option-deadline.overdue{color:var(--kpc-warning)}
.ph-picker .ph-option[aria-pressed=true]{background:var(--dadam-accent-soft)}
.files-workspace>.up-lim{width:100%;flex-wrap:wrap;white-space:normal;min-width:0}
.files-workspace>.up-lim .bar{min-width:0;flex:1 1 0}
```

## 헤더 overlay CSS · HTML 2649–2720

```text
.header-overlay-meta{font-family:var(--dadam-font);font-size:12px;line-height:16px;font-weight:400;color:var(--n-fg3)}
.header-overlay-icon{width:12px;height:12px;flex-shrink:0;display:block}
#admmodal.project-header-modal{font-family:var(--dadam-font);font-size:14px;line-height:20px;font-weight:400;background:#fff}
.project-header-modal .modal-h{padding:16px 18px 12px;gap:10px}
.project-header-modal .modal-b{padding:14px 18px;gap:12px;scrollbar-width:auto}
.project-header-modal .modal-f{padding:12px 18px;gap:8px;justify-content:flex-end}
.project-header-modal .modal-f .btn{height:32px;min-height:32px;padding:0 12px;gap:6px}
.project-header-modal .modal-f .fi{width:12px;height:12px}
.header-round-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0}
.header-round-stats>div{margin:0;padding:10px 12px;border:1px solid var(--n-stroke2);border-radius:6px;background:#fff;min-width:0}
.header-round-stats dd{margin:0;font-size:20px;line-height:28px;font-weight:600}
.project-header-modal .doing{color:var(--kpc-warning)}.project-header-modal .done{color:var(--kpc-success)}
.header-round-progress{display:block;width:100%;height:6px;margin:12px 0;border:0;border-radius:3px;overflow:hidden;background:var(--n-bg3);accent-color:var(--kpc-success)}
.header-round-progress::-webkit-progress-bar{background:var(--n-bg3);border-radius:3px}.header-round-progress::-webkit-progress-value{background:var(--kpc-success);border-radius:3px}.header-round-progress::-moz-progress-bar{background:var(--kpc-success);border-radius:3px}
.header-round-sections{padding:0;margin:0;list-style:none;border:1px solid var(--n-stroke2);border-radius:8px;max-height:260px;overflow-y:auto}
.header-round-sections li{display:flex;align-items:center;gap:8px;padding:7px 10px;border-bottom:1px solid var(--n-stroke2)}
.header-round-sections .section-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.header-round-sections .section-state{margin-left:auto;flex-shrink:0;font-size:12px;line-height:16px;white-space:nowrap}
.header-rework-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.header-rework-groups>section{min-width:0}
.header-rework-groups h3{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin:16px 0 8px;font-size:12px;line-height:16px;font-weight:600}
.header-round-count{display:inline-flex;align-items:center;justify-content:center;min-width:17px;height:17px;padding:0 5px;border-radius:999px;background:var(--dadam-accent);color:#fff;font-size:12px;line-height:16px}
.header-round-count.fixed{background:var(--n-bg3);color:var(--n-fg3)}
.header-rework-groups ul{padding:0;margin:0;list-style:none}.header-rework-groups li{padding:3px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.header-round-warning,.header-round-notice{display:flex;align-items:center;gap:6px;border-radius:4px;font-weight:400}
.header-round-warning{padding:8px 10px;margin:0 0 10px;background:#fff4ce;color:var(--kpc-warning)}
.header-round-notice{padding:10px 12px;margin:0 0 12px;background:var(--dadam-accent-soft);color:var(--dadam-accent-ink)}
.header-round-notice strong{font-weight:600}
#pop.project-header-history{padding:6px;max-width:calc(100vw - 32px);max-height:70vh;border-radius:8px;font-family:var(--dadam-font);font-size:14px;line-height:20px;font-weight:400}
.header-history-content h2{margin:0;padding:8px 9px 4px;font-size:12px;line-height:16px;color:var(--n-fg3);font-weight:600}
.header-history-version{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-top:1px solid var(--n-stroke2)}
.header-history-version>strong{font-weight:600}.header-history-actions{display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin-top:6px}
.header-history-actions .btn{height:22px;min-height:22px;padding:0 7px;gap:6px;font-size:12px;line-height:16px}
.header-history-empty{padding:10px 12px;margin:0}
#drawer.project-header-settings{width:560px;max-width:96vw;z-index:4300;background:#fff;color:var(--n-fg1);font-family:var(--dadam-font);font-size:14px;line-height:20px;font-weight:400;box-shadow:0 8px 16px #00000024,0 0 2px #0000001f}
.phs-layout{display:flex;flex-direction:column;flex:1;min-height:0;min-width:0}
.phs-header{display:flex;align-items:center;padding:14px 16px;gap:8px;border-bottom:1px solid var(--n-stroke2);flex-shrink:0;min-width:0}
.phs-header>.fi{width:18px;height:18px;flex-shrink:0}
.phs-header h2{margin:0;flex-shrink:0;white-space:nowrap;font-size:14px;line-height:20px;font-weight:600}
.phs-project{flex:1;min-width:0;white-space:normal;word-break:keep-all;overflow-wrap:anywhere;color:var(--n-fg3);font-size:12px;line-height:16px}
.phs-header .phs-close{width:32px;min-width:32px;height:32px;padding:0;flex-shrink:0;margin-left:auto}.phs-close>.fi{width:14px;height:14px}
.phs-tabs{display:flex;flex-shrink:0;flex-wrap:wrap;padding:0 10px;gap:2px;border-bottom:1px solid var(--n-stroke2)}
.phs-tab{position:relative;height:38px;padding:0 10px;border:0;background:transparent;color:var(--n-fg2);font:600 12px/16px var(--dadam-font);cursor:pointer}
.phs-tab.on{color:var(--dadam-accent-ink)}.phs-tab.on:after{content:"";position:absolute;bottom:0;left:10px;right:10px;height:3px;background:var(--dadam-accent);border-radius:3px}
.phs-tab:focus-visible,.phs-body [role=tabpanel]:focus-visible{outline:2px solid var(--dadam-accent);outline-offset:-2px}
.phs-body{min-width:0;min-height:0;flex:1;overflow:auto;padding:16px}.phs-body [role=tabpanel]{padding:0;min-width:0}
.phs-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 14px}
.phs-field{display:flex;flex-direction:column;gap:5px;min-width:0}.phs-field>span{font-weight:600}
.phs-field .inp{width:100%;min-width:0;height:32px;min-height:32px;box-sizing:border-box;padding:0 10px;margin:0}
.phs-full{grid-column:1/-1}.phs-state{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.phs-badge{display:inline-flex;align-items:center;flex-shrink:0;height:20px;padding:0 7px;border-radius:4px;background:var(--dadam-accent-soft);color:var(--dadam-accent-ink);font-size:12px;line-height:16px;font-weight:600;white-space:nowrap}
.phs-stage{height:auto;padding:4px 10px}
.phs-state .phs-state-button{height:26px;min-height:26px;padding:0 9px;gap:6px;margin-left:auto;font-size:12px;line-height:16px}
.phs-table-scroll{width:100%;max-width:100%;overflow-x:auto}
.phs-table{border-collapse:collapse;width:100%;font-size:14px;line-height:20px}
.phs-table td,.phs-table tbody th{border-bottom:1px solid var(--n-stroke2);padding:11px 12px;text-align:left;vertical-align:middle;font-weight:400}
.phs-table thead th{position:sticky;top:0;z-index:1;border-bottom:1px solid var(--n-stroke2);padding:9px 12px;text-align:left;font-size:12px;line-height:16px;font-weight:600;white-space:nowrap;background:var(--n-bg2)}
.phs-permissions{min-width:0;table-layout:fixed}.phs-permissions thead th{padding-left:4px;padding-right:4px;white-space:normal;text-align:center}.phs-permissions thead .phs-name-column{width:34%;text-align:left}
.phs-permissions td{text-align:center;padding-left:4px;padding-right:4px}
.phs-person{display:flex;align-items:center;min-width:0;gap:8px;white-space:nowrap}
.phs-avatar{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;width:22px;height:22px;border-radius:999px;border:2px solid #fff;background:var(--dadam-accent);color:#fff;font-size:12px;font-weight:600}
.phs-person strong{min-width:0;overflow:hidden;text-overflow:ellipsis;font-weight:600}
.phs-permissions input[type=checkbox]{width:16px;height:16px;min-height:16px;margin:0;padding:0;vertical-align:middle;accent-color:var(--dadam-accent)}
.phs-notification{display:flex;width:100%;max-width:none;align-items:flex-start;padding:9px 2px;gap:9px;border-bottom:1px solid var(--n-stroke2);border-radius:0;box-sizing:border-box}
.phs-notification input{width:16px;height:16px;flex-shrink:0;margin:2px 0 0;padding:0;accent-color:var(--dadam-accent)}
.phs-notification>span{display:flex;flex-direction:column;min-width:0}.phs-notification strong{font-weight:600}
.phs-delivery-title{margin:16px 0 8px;font-size:12px;line-height:16px;font-weight:600}
.phs-delivery{display:inline-flex;padding:3px;gap:2px;border-radius:8px;background:var(--n-bg3)}
.phs-delivery .btn{height:26px;min-height:26px;padding:0 10px;border:0;background:transparent;color:var(--n-fg3);font-size:12px;line-height:16px}
.phs-delivery .btn.active{background:#fff;color:var(--n-fg1);box-shadow:0 1px 2px #0002}
.phs-logs{min-width:880px}.phs-logs strong{font-weight:600}.phs-nowrap{white-space:nowrap}.phs-log-detail{min-width:160px;overflow-wrap:anywhere}
@media(max-width:480px){.header-rework-groups{grid-template-columns:1fr}}
```

## 제작 UI/권한 · HTML 3440–3494

```text
function productionPromptAllowed(p,sec){return !!p&&!!sec&&!S.snap&&loopOf(p).state!=='done'&&whoOf(p,sec.id).includes(ME);}
function productionMultiPromptAllowed(p,keys=S.tsel||[]){const secs=sectionsOf(p);return keys.length>0&&keys.every(key=>{const [sid,pi]=key.split(':'),sec=secs.find(s=>s.id===sid);return productionPromptAllowed(p,sec)&&!!pagesOf(p,sid)[Number(pi)];});}
function wsWrite(p){
  const secs=sectionsOf(p); const cm=COMMENTS[p.id]||[];
  if(!secs.length) return `<div class="pane-c"><div class="placeholder"><div class="h2">목차가 비어 있습니다</div><p>목차 메뉴에서 대목차를 만들거나 'RFP 기반 목차 추천'을 사용하세요.</p></div></div>`;
  const sec=secs.find(s=>s.id===S.sec)||secs[0]; S.sec=sec.id;
  const pages=pagesOf(p,sec.id); if(S.pgSec!==sec.id){S.pg=0;S.pgSec=sec.id;} if(S.pg>=pages.length) S.pg=pages.length-1;
  const idx=secs.findIndex(s=>s.id===sec.id); const prev=secs[idx-1], next=secs[idx+1];
  const reqs=reqsOf(p).filter(r=>r.sec===sec.id);
  const draft=DRAFTS[p.id+':'+sec.id];
  const body=bodyOf(p,sec.id),promptEditable=productionPromptAllowed(p,sec);
  const center=`<div class="pane-c"><div class="ed-h">
     <div class="row ed-top"><span class="eyebrow">${sec.chR}. ${esc(sec.chT)} ›</span><button class="ed-title sec-pick" title="다른 섹션으로 이동" data-act="${act((e,t)=>openSecPick(t,p))}"><span class="ellipsis">${sec.no} ${esc(sec.t)}</span>${ic('chev','sm')}</button><span class="spacer"></span>
       ${productionCommentButton(p,sec,S.pg)}<select class="inp st-sel" id="sec-state" title="섹션 상태" ${lockedFor(p,sec)?'disabled title="담당자만 바꿀 수 있습니다"':''}><option value="doing" ${sec.state!=='done'?'selected':''}>작성 중</option><option value="done" ${sec.state==='done'?'selected':''}>작성 완료</option></select></div>
     <div class="ai-line" id="ai-line" style="display:none"></div>
     ${draft?'':(S.tsel||[]).length>1?multiPrompt(p):lockedFor(p,sec)?`<div class="sl-lock">${ic('lock','sm')}<b>작성 완료 · 고정됨</b></div>`:(secLocked(p,sec)?`<div class="sl-own">${ic('lock','sm')}<b>작성 완료 · 고정됨</b><span class="meta">내가 담당한 섹션이라 수정할 수 있습니다</span><span class="spacer"></span><button class="btn xs" data-act="${act(()=>{stateOf(p)[sec.id][0]='doing';render();toast(sec.no+' 고정을 해제했습니다')})}">고정 해제</button></div>`:'')+((S.tsel||[]).length>1?multiPrompt(p):`<div class="sl-prompt ${promptEditable?'':'is-disabled'}"><div class="sl-body" contenteditable="${promptEditable}" aria-disabled="${!promptEditable}" role="textbox" aria-multiline="true" tabindex="${promptEditable?0:-1}" spellcheck="false" id="paper-sl" data-ph="이 슬라이드에 들어갈 내용을 입력하세요">${body}</div>
       <button class="sl-send" id="sl-send" ${promptEditable?'':'disabled'} title="${promptEditable?'슬라이드에 반영':'담당자만 프롬프트를 수정할 수 있습니다'}">${ic('arrow','sm')}</button></div>`)}</div>
    <div class="ed-wrap">
     ${draft?diffHtml(p,sec,draft):slideHtml(p,sec,S.pg,slideNoOf(p,sec.id,S.pg),cm,false)+cmtBlock(p,sec,S.pg)}${!draft&&(S.tsel||[]).length>1?multiStack(p,sec,cm):''}
    </div></div>`;
  const openN=cm.filter(c=>c.status==='open').length;
  const right=S.hideR?rail('r','출처',''):srcPanel(p,sec,S.pg);
  return `<div class="w3" id="w3" style="--wl:${S.wL||240}px;--wr:${S.wR||360}px">${S.hideL?rail('l','슬라이드',`<span class="meta">${slidesOf(p).length}</span>`):writeThumbs(p,sec,cm)+'<div class="w-split" data-ws="l" title="드래그해서 너비 조정"></div>'}${center}${S.hideR?'':'<div class="w-split" data-ws="r" title="드래그해서 너비 조정"></div>'}${right}</div>`;
}
/* 제작 왼쪽: 슬라이드 미리보기 (누르면 그 섹션 · 페이지로 이동) */
function writeThumbs(p,sec,cm){ const sl=slidesOf(p), mine=z=>whoOf(p,z.sec.id).includes(ME), tsel=S.tsel||[], multi=tsel.length>1;
  return `<div class="pane-l w-thumbs"><div class="toc-h"><div class="row"><b>슬라이드</b><span class="meta">${sl.length}장</span><span class="spacer"></span>${paneToggle('l','슬라이드')}</div></div><div class="pane-scroll thumbs">
    ${sl.map(z=>{ const on=z.sec.id===sec.id&&z.pi===S.pg, n=cm.filter(c=>c.sec===z.sec.id&&(c.page||0)===z.pi&&c.status==='open').length, my=mine(z);
      return `<button class="wthumb ${on?'on':''} ${my?'mine':''} ${secLocked(p,z.sec)?'locked':''} ${multi&&tsel.includes(z.sec.id+':'+z.pi)?'sel':''}" data-tsid="${z.sec.id}" data-tpi="${z.pi}" ${my?'title="내가 담당한 슬라이드"':''} data-act="${act(e=>thumbClick(e,p,z))}"><div class="cmp-scale">${slideHtml(p,z.sec,z.pi,z.no,[],false,{noid:true,cls:'wt-s',noPins:true})}</div>
        <div class="tn"><span class="num">${z.no}</span>${secLocked(p,z.sec)?ic('lock','sm'):''}<span class="ellipsis">${z.sec.no} ${esc(z.sec.t)}${z.n>1?` · ${z.pi+1}/${z.n}`:''}</span>${n?`<span class="count">${n}</span>`:''}</div></button>`; }).join('')}</div></div>`;
}
function slideHtml(p,sec,pi,no,cm,interactive,o={}){
  const tp=assetOf(p,sec,'tp').item, br=tplBrand(tp); const pages=pagesOf(p,sec.id); const pg=pages[pi]||pages[0];
  const pkey=sec.id+':'+pi, PL=o.noPins?[]:cmOf(p).filter(c=>c.sec===sec.id&&(c.page||0)===pi);
  const production=productionCommentSurface();
  const pins=production?PL.filter(c=>c.x!=null).map(c=>productionCommentPin(p,c,pkey)).join('')+(S.pinPos?.key===pkey&&!o.noPins?productionCommentPin(p,{...S.pinPos},pkey,true):''):PL.map((c,k)=>c.x==null?'':`<span class="pin ${c.status==='done'?'done':''} ${S.hl===c.id?'hl':''}" data-cid="${c.id}" style="left:${c.x}%;top:${c.y}%" data-act="${act(()=>{S.hl=S.hl===c.id?null:c.id;S._keepScroll=true;render()})}" title="${esc(c.author+': '+c.text)}">${k+1}</span>`).join('')
    +(S.pinPos&&S.pinPos.key===pkey&&!o.noPins?`<span class="pin new" style="left:${S.pinPos.x}%;top:${S.pinPos.y}%">${PL.length+1}</span>`:'');
  let pts=((bodyOf(p,sec.id)||'').match(/<li>(.*?)<\/li>/g)||['<li>핵심 내용 요약</li>','<li>추진 방안</li>','<li>기대 효과</li>']).slice(0,3).map(x=>x.replace(/<[^>]+>/g,''));
  if(pi>0&&!pg.dup) pts=['세부 내용 (계속)','근거 데이터 · 표','요약 및 시사점'];
  if(pg.blank) pts=[];
  if(pg.pts) pts=pg.pts;
  if(pg.paste?.pts) pts=pg.paste.pts;
  if(o.old) pts=oldPts(pts);
  const dk=pg.d&&!pg.paste&&!pg.blank&&!o.old&&!o.mark?pg.d:null;
  const bc=i=>!o.mark?'':i===0?'chg-mod':(i===pts.length-1&&pts.length>1&&!o.old?'chg-add':'');
  return `<div class="slide ${productionCommentTarget(sec.id,pi)&&!o.noPins?'pinning':''} ${o.cls||''}" ${o.noid?'':'id="slide"'} ${o.noPins?'':`data-skey="${pkey}"`} style="--tc:${br.colors.primary};background:${br.colors.bg};font-family:'${br.fonts.body}',var(--font)">${br.logo&&(br.logoScope==='all')?`<img class="s-logo" src="${br.logo}" alt="">`:''}<span class="s-no">Slide ${no}</span>${pages.length>1?`<span class="s-pg">${sec.no} · ${pi+1}/${pages.length}</span>`:''}${dk?`<div class="s-tag">${sec.no} ${esc(sec.t)}</div><div class="s-t">${esc(dk.t)}</div><div class="s-lead">${esc(dk.lead)}</div>`:`<div class="s-tag">${esc(sec.chT)}</div><div class="s-t">${sec.no} ${esc(sec.t)}${pi>0?` <span class="s-cont">(${pi+1})</span>`:''}</div>`}
    ${dk?deckBody(dk):pg.paste?.img?`<div class="s-paste"><img src="${pg.paste.img}" alt=""></div>`:pts.length?`<div class="s-g">${pts.map((t,i)=>`<div class="s-box ${bc(i)}"><b>0${i+1}</b>${esc(t)}</div>`).join('')}</div>`:'<div class="s-empty">빈 슬라이드</div>'}${o.tag?`<span class="s-ver">${o.tag}</span>`:pg.ai?`<span class="s-ver s-ai">AI · ${esc(pg.ai)}</span>`:pg.paste?`<span class="s-ver s-from">${esc(pg.paste.from)}</span>`:''}
    <div class="s-foot"><span>${esc(p.name)}</span><span>${esc(p.org)} 제안서</span></div>${pins}</div>`;
}
function ctxPanel(p,sec,cm,reqs){
  const secC=cm.filter(c=>c.sec===sec.id); const openN=secC.filter(c=>c.status==='open').length;
  if(!['rfp','refs','comments'].includes(S.ctx)) S.ctx='comments';
  const tabs=[['rfp',`RFP 근거 <span class="count gray">${reqs.length}</span>`],['refs',`자료 <span class="count gray">${FILES.length}</span>`],['comments',`의견 ${openN?`<span class="count">${openN}</span>`:`<span class="count gray">${secC.length}</span>`}`]];
  let b='', foot='';
  if(S.ctx==='ai'){ const pa_=assetOf(p,sec,'ps'), ps=pa_.item, sk=assetOf(p,sec,'sk').item;
```

## 출처 데이터/카드 · HTML 3845–3846

```text
function slidePts(p,sec,pi){ const pg=pagesOf(p,sec.id)[pi]||{}; if(pg.paste) return pg.paste; if(pg.blank) return {pts:[]}; if(pg.pts) return {pts:pg.pts}; if(pg.d) return {pts:pg.d.it.map(x=>x[0]+' · '+x[1])};
  if(pi>0&&!pg.dup) return {pts:['세부 내용 (계속)','근거 데이터 · 표','요약 및 시사점']};
```

## 출처 카드/모달 · HTML 3957–3996

```text
const SRC_LOC=['2장 1절','표 3-2','3장 4절 본문','부록 A','1장 개요','그림 2-1 설명','4장 2절','표 5-1'];
function srcOf(p,sec,pi){ const secs=sectionsOf(p), si=Math.max(0,secs.findIndex(s=>s.id===sec.id)), pts=slidePts(p,sec,pi).pts||[], F=FILES.filter(f=>f.pri!=='참조 제외');
  const rq=reqsOf(p).filter(r=>r.sec===sec.id).map(r=>({kind:'rfp',id:r.id,page:r.page,loc:`${r.id} · ${esc(r.t)}`,text:`${r.t}을(를) 위한 구체적인 구현 방안과 검증 방법을 제안서에 제시하여야 한다. 제안사는 관련 근거와 수행 일정을 함께 기술한다.`,box:null}));
  const fs=pts.map((t,i)=>{ const f=F[(si+i)%Math.max(1,F.length)]; if(!f) return null; const pg=f.via==='웹'?null:3+((si*7+i*5)%38);
    return {kind:'file',f,page:pg,loc:f.via==='웹'?'웹 문서 본문':SRC_LOC[(si+i*3)%SRC_LOC.length],text:`… ${t} — 관련 기준과 사례를 정리하면, 공공 부문 적용 시 단계별 검증과 운영 체계가 함께 마련되어야 한다 …`,box:i}; }).filter(Boolean);
  return {rq,fs}; }
function srcPanel(p,sec,pi){ const {rq,fs}=srcOf(p,sec,pi), no=slideNoOf(p,sec.id,pi);
  const item=(x)=>x.kind==='rfp'
    ? `<div class="src-it" role="button" data-act="${act(()=>openRfpAt(p,x.id))}"><div class="src-h"><span class="src-k rfp">RFP</span><b>p.${x.page}</b></div><div class="src-loc">${x.loc}</div><blockquote>${esc(x.text)}</blockquote></div>`
    : `<div class="src-it" role="button" data-act="${act(()=>openFileView(x.f.id))}"><div class="src-h">${x.box!=null?`<span class="src-n">0${x.box+1}</span>`:''}<span class="src-k">${ic(VIA[x.f.via].icon,'sm')}</span><b class="ellipsis">${esc(x.f.name.replace(/^\[테스트용\]\s*/,''))}</b></div>
        <div class="src-loc">${x.page?`p.${x.page} · `:''}${esc(x.loc)}</div><blockquote>${esc(x.text)}</blockquote></div>`;
  return `<div class="pane-r"><div class="ctx-tabs src-top"><b>출처</b><span class="meta">Slide ${no} · ${sec.no} ${esc(sec.t)}</span><span class="spacer"></span>${paneToggle('r','출처 패널')}</div>
    <div class="pane-scroll ctx-b"><div class="sec-t">RFP <span class="count gray">${rq.length}</span></div>${rq.map(item).join('')||'<div class="meta" style="padding:4px 2px 10px">이 슬라이드에 연결된 RFP 항목이 없습니다</div>'}
      <div class="sec-t">참조 자료 <span class="count gray">${fs.length}</span></div>${fs.map(item).join('')||'<div class="meta">참조한 자료가 없습니다</div>'}</div></div>`; }

/* 핀 꽂기: '핀' 버튼 → 슬라이드의 고칠 위치 클릭 → 번호 핀이 생기고 의견과 연결 */
document.addEventListener('click',e=>{ if(productionCommentSurface()) return; if(!S.pinFor) return; const sl=e.target.closest?.('.slide[data-skey]'); if(!sl||sl.dataset.skey!==S.pinFor||e.target.closest('.pin')) return;
  const r=sl.getBoundingClientRect(); S.pinPos={key:S.pinFor,x:Math.round((e.clientX-r.left)/r.width*1000)/10,y:Math.round((e.clientY-r.top)/r.height*1000)/10}; S.pinFor=null; S._keepScroll=true; render();
  setTimeout(()=>$(`[data-cin="${S.pinPos.key}"]`)?.focus(),0); },true);
/* 제작: 방향키로 슬라이드 이동 (위 · 오른쪽 = 다음, 아래 · 왼쪽 = 이전) */
document.addEventListener('keydown',e=>{ if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) return;
  if(S.route!=='project'||S.tab!=='write'||typing(e.target)||e.metaKey||e.ctrlKey||e.altKey||$('#admmodal.open')||$('#drawer.open')||$('#cmdk.open')||$('#th-menu')) return;
  const p=byId(S.pid), L=slidesOf(p), i=L.findIndex(z=>z.sec.id===S.sec&&z.pi===S.pg); if(i<0) return;
  const j=i+(e.key==='ArrowUp'||e.key==='ArrowRight'?1:-1); if(j<0||j>=L.length) return; e.preventDefault();
  const z=L[j]; S.tsel=[]; S.sec=z.sec.id; S.pgSec=z.sec.id; S.pg=z.pi; S.hl=null; render(); syncHash();
  $('.wthumb.on')?.scrollIntoView({block:'nearest'}); });

/* 출처의 RFP 클릭 → RFP 원문 팝업 + 해당 요구사항 위치로 이동 */
function openRfpAt(p,rid,fx){ const R=reqsOf(p), r=R.find(z=>z.id===rid); const m=$('#admmodal'); m.style.width='880px'; m.style.height='84vh';
  const pg=(n,title,html)=>`<div class="rfp-page" data-page="${n}"><div class="pg"><span>제안요청서</span><span>Page ${n} of 64</span></div><h5>${title}</h5>${html}</div>`;
  const base=rfpPages(p).split('<div class="rfp-page"').filter(Boolean).map(h=>'<div class="rfp-page"'+h);
  const byPage={}; R.forEach(z=>(byPage[z.page]=byPage[z.page]||[]).push(z));
  const extra=Object.entries(byPage).map(([n,L])=>pg(+n,'요구사항 상세',L.map(z=>`<p><b>${z.id}</b> <mark data-req="${z.id}">${esc(z.t)}을(를) 위한 구체적인 구현 방안과 검증 방법을 제안서에 제시하여야 한다. 제안사는 관련 근거와 수행 일정을 함께 기술한다.</mark></p>`).join('')));
  if(fx) extra.push(pg(fx.page,esc(fx.title),`<p>${esc(fx.pre||'')}<mark data-req="__fact">${esc(fx.quote)}</mark>${esc(fx.post||'')}</p>`));
  const all=[...base,...extra].sort((a,b)=>(+a.match(/data-page="(\d+)"/)[1])-(+b.match(/data-page="(\d+)"/)[1]));
  m.innerHTML=`<div class="modal-h"><div style="flex:1;min-width:0"><div class="h2">RFP 원문</div><div class="meta">${r?`${r.id} · p.${r.page} · ${esc(r.t)}`:fx?`p.${fx.page} · ${esc(fx.title)}`:''}</div></div><button class="icon-btn" title="닫기" data-act="${act(closeAdmModal)}">${ic('x')}</button></div>
    <div class="modal-b rfp-view" id="rfp-pop">${all.join('')}</div>`;
  m.classList.add('open'); $('#scrim').classList.add('open');
  setTimeout(()=>{ const mk=$(`#rfp-pop mark[data-req="${fx?'__fact':rid}"]`); if(mk){ mk.scrollIntoView({block:'center'}); mk.classList.add('flash'); } },60); }

```

## 공통 헤더 · HTML 5644–5658

```text
function projectHeader(p){
  const L=loopOf(p), snap=S.snap&&S.snap.pid===p.id, review=p.status==='review', fin=L.hist.filter(h=>h.kind!=='incomplete'),roles=myRoles(p).join(' · ');
  const round=!review?`<span class="ph-b round">${snap?`${S.snap.round}차 보관본`:L.state==='done'?`${L.round}차 완성`:L.round===1?'1차 작성 중':`${L.round}차 재작업 중`}</span>`:'';
  return `<header class="ph"><div class="ph-row"><div class="ph-lead">
    <button type="button" class="btn ph-sel" id="ph-project" aria-label="프로젝트 선택: ${esc(p.name)}" aria-haspopup="dialog" aria-expanded="false" aria-controls="header-project-picker" data-act="${act((e,el)=>openHeaderProjectPicker(el,p))}">
      <span class="ph-summary"><span class="ph-name" title="${esc(p.name)}">${esc(p.name)}</span><span class="ph-meta">${esc(p.org)} · 마감 ${esc(p.due.replaceAll('-','.'))}</span></span><span class="ph-b role" title="${esc(roles)}">${esc(roles)}</span>${fi('chevDown',16)}
    </button>${round}</div><div class="ph-acts">
    ${!snap&&!review&&can(p,'redo')?`<button type="button" class="btn ph-icon" data-header-action="redo" aria-haspopup="dialog" aria-expanded="false" aria-label="${L.round+1}차 재작업 시작" title="${L.round+1}차 재작업 시작" data-act="${act(()=>confirmRedo(p))}"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 6a5 5 0 1 1 0 4M3 2v4h4"/></svg></button>`:''}
    ${L.hist.length?`<button type="button" class="btn act" data-header-action="history" aria-haspopup="dialog" aria-expanded="false" data-act="${act((e,el)=>openLoopHist(el,p))}">${fi('history',16)}완성본 ${fin.length}</button>`:''}
    ${!snap&&!review&&can(p,'done')?`<button type="button" class="btn primary" data-header-action="complete" aria-haspopup="dialog" aria-expanded="false" ${L.state==='done'?'disabled':''} data-act="${act(()=>confirmDone(p))}">${fi('checkmark',16)}완성</button>`:''}
    <button type="button" class="btn act" title="프로젝트 설정" data-header-action="settings" aria-haspopup="dialog" aria-expanded="false" data-act="${act(()=>openSettings('info'))}">${fi('setup',16)}설정</button>
    </div></div></header>`;
}
function headerDeadlineDays(dueDate,now){
 if(now==null||!Number.isFinite(now))return null;
```

## 회차·완성본 · HTML 5714–5733

```text
function roundDialog(p,kind){const done=kind==='complete',L=loopOf(p),initialRound=L.round,c=pSummary(p),secs=sectionsOf(p);if(S.snap||p.status==='review'||!can(p,done?'done':'redo')||(done&&L.state==='done'))return;suspendHeaderComments();closePop();if(HEADER_UI.active==='settings')closeDrawer();const n=L.round+1,rd=RV_DRAFT[p.id]||[],rd0=rd[0],rdN=rd.length,fromRv=S.route==='project'&&S.tab==='review';
  const run=()=>{ if(S.snap||!can(p,done?'done':'redo')||L.round!==initialRound||(done&&L.state==='done'))return; if(done){ L.hist.push({round:L.round,at:'2026.10.21 '+new Date().toTimeString().slice(0,5),by:ME,done:c.done,doing:c.doing,slides:c.slides,kind:'done'}); L.state='done'; closeAdmModal(); render(); toast(`${L.round}차 완성본을 저장했습니다`); return; }
    if(L.state!=='done') L.hist.push({round:L.round,at:'2026.10.21 '+new Date().toTimeString().slice(0,5),by:ME,done:c.done,doing:c.doing,slides:c.slides,kind:'incomplete'});
    FILES.forEach(f=>f.rd=f.rd||L.round); const RD=RV_DRAFT[p.id]||[]; if(RD.length){ (COMMENTS[p.id]=COMMENTS[p.id]||[]).push(...RD.map(x=>({...x,draft:false,round:n,at:'재작업 '+n+'차'}))); RV_DRAFT[p.id]=[]; }
    L.round=n; L.state='writing'; S.upOpen={...(S.upOpen||{}),[n]:true}; closeAdmModal(); if(fromRv) openProject(p.id,'write',rdN?{sec:rd0.sec}:{}); else openProject(p.id,'files'); toast(`${n}차 재작업을 시작했습니다${rdN?` · 리뷰 코멘트 ${rdN}건을 제작으로 전달했습니다`:''}`); };

  const stats=done?`<dl class="header-round-stats">${[['작성 완료',c.done],['작성 중',c.doing],['미처리 의견',c.oc]].map(([label,count])=>`<div><dt class="header-overlay-meta">${label}</dt><dd class="${label==='작성 중'&&count?'doing':''}">${count}</dd></div>`).join('')}</dl><progress class="header-round-progress" value="${c.done}" max="${secs.length||1}" aria-label="섹션 작성 진행률" aria-valuetext="작성 완료 ${c.done} / 전체 ${secs.length}"></progress><ul class="header-round-sections">${secs.map(s=>`<li><span class="header-overlay-meta">${esc(s.no)}</span><span class="section-title" title="${esc(s.t)}">${esc(s.t)}</span><span class="section-state ${s.state==='done'?'done':'doing'}">${s.state==='done'?'작성 완료':'작성 중'}</span></li>`).join('')}</ul>${secs.length?'':'<p class="header-overlay-meta">표시할 섹션이 없습니다.</p>'}`:'';
  const groups=done?'':`${rdN?`<p class="header-round-notice">${headerOverlayIcon('comment')}<span><strong>리뷰 코멘트 ${rdN}건</strong>이 제작으로 전달됩니다</span></p>`:''}${L.state!=='done'?`<p class="header-round-warning">${headerOverlayIcon('warning')}<span>${L.round}차를 완성하지 않고 재작업합니다. ${L.round}차 완성본은 남지 않습니다.</span></p>`:''}<div class="header-rework-groups">${[['고정 (작성 완료)',true,secs.filter(s=>s.state==='done')],['다시 작업 (작성 중)',false,secs.filter(s=>s.state!=='done')]].map(([title,fixed,list])=>`<section><h3>${fixed?headerOverlayIcon('lock'):''}${title}<span class="header-round-count ${fixed?'fixed':''}">${list.length}</span></h3><ul>${list.map(s=>`<li title="${esc(s.no+' '+s.t)}"><span class="header-overlay-meta">${esc(s.no)}</span> ${esc(s.t)}</li>`).join('')}</ul>${list.length?'':'<div class="header-overlay-meta">없음</div>'}</section>`).join('')}</div>`;
  const title=done?L.round+'차 완성':n+'차 재작업 시작';
  frame(520,`${modalHead(title)}<div class="modal-b"><div class="header-round-content">${stats}${groups}</div></div><div class="modal-f"><button type="button" class="btn" data-act="${act(closeAdmModal)}">취소</button><button type="button" class="btn primary" id="rd-go" data-act="${act(run)}">${done?fi('checkmark',12):''}${title}</button></div>`);
  const modal=$('#admmodal');modal.classList.add('project-header-modal');modal.setAttribute('aria-label',title);bindHeaderOverlay(done?'complete':'redo',modal,closeAdmModal);
}
function confirmDone(p){ roundDialog(p,'complete'); }
function confirmRedo(p){ roundDialog(p,'rework'); }
function openLoopHist(anchor,p){
 suspendHeaderComments();if(HEADER_UI.active==='settings')closeDrawer();if(['redo','complete'].includes(HEADER_UI.active))closeAdmModal();
 const versions=loopOf(p).hist.filter(h=>h.kind!=='incomplete').slice().sort((a,b)=>b.round-a.round);
 popAt(anchor,`<div class="header-history-content"><h2>회차별 완성본</h2>${versions.map(h=>`<article class="header-history-version"><strong>${h.round}차 완성본</strong><span class="header-overlay-meta">${esc(h.at)} · ${esc(h.by)}</span><span class="header-overlay-meta">작성 완료 ${h.done} · 작성 중 ${h.doing} · 슬라이드 ${h.slides}장</span><div class="header-history-actions"><button type="button" class="btn" data-act="${act(()=>{S.snap={pid:p.id,round:h.round,kind:h.kind||'done'};closePop();render()})}">${headerOverlayIcon('eye')}보기</button><button type="button" class="btn" data-act="${act(()=>toast(h.round+'차 완성본 PPT를 내려받습니다 (시연)'))}">${headerOverlayIcon('download')}PPT</button></div></article>`).join('')||'<p class="header-overlay-meta header-history-empty">완성본이 없습니다.</p>'}</div>`,Math.min(300,innerWidth-32));
 const pop=$('#pop');pop.classList.add('project-header-history');pop.style.left=Math.max(16,Math.min(innerWidth-pop.offsetWidth-16,anchor.getBoundingClientRect().right-pop.offsetWidth))+'px';pop.style.maxHeight='70vh';pop.setAttribute('aria-label','완성본 이력');bindHeaderOverlay('history',pop,closePop,anchor);
}
```

## 설정 · HTML 5736–5770

```text
const HEADER_PERMISSION_COLUMNS=[['done','완성','작성이 끝났다고 보고 완성 처리'],['redo','재작업','파일 업로드부터 다시 진행 (작성 완료 섹션은 고정)'],['setup','제작 설정','제작 설정의 프롬프트 세트 · Skill · Template 선택과 프로젝트 프롬프트 수정'],['assign','담당 지정','목차 담당자 · 리뷰자 지정'],['grant','권한 부여','이 화면에서 다른 사람에게 권한 부여']];
const HEADER_NOTIFICATION_FIELDS=[['deadline','제출 마감 리마인더','7일 전 · 3일 전 · 1일 전 · 당일'],['complete','완성 알림','PM 및 프로젝트 참여자에게'],['rework','재작업 시작 알림','작성 중 섹션 담당자에게'],['comment','의견 등록 알림','담당 작성자에게']];
function headerSettingsDraft(p,reset=false){
 if(!reset&&HEADER_UI.settings?.pid===p.id)return HEADER_UI.settings;
 const permissions=permOf(p),members=[...new Set([p.pm,...(p.team||[])].filter(Boolean))];
 const draft={pid:p.id,name:p.name,organization:p.org,budgetEok:`${p.budget||0}억원`,dueDate:p.due,permissionsByMember:Object.fromEntries(members.map(name=>[name,name===p.pm?HEADER_PERMISSION_COLUMNS.map(c=>c[0]):[...(permissions[name]||[])]])),notifications:{deadline:true,complete:true,rework:true,comment:true,inApp:true,email:true,...(p.notifications||{})}};
 HEADER_UI.settings=draft;return draft;
}
function headerSettingPermission(p,name,key,checked){
 const draft=HEADER_UI.settings;if(!draft||draft.pid!==p.id||name===p.pm||!can(p,'grant')||S.snap||!HEADER_PERMISSION_COLUMNS.some(c=>c[0]===key))return;
 if(![p.pm,...(p.team||[])].includes(name))return;const current=draft.permissionsByMember[name]||[];draft.permissionsByMember[name]=checked?[...new Set([...current,key])]:current.filter(k=>k!==key);
}
function drawerHtml(){
 const p=byId(S.pid);if(!p)return '';const draft=headerSettingsDraft(p),tabs=[['info','기본정보'],['perm','권한'],['noti','알림'],['log','로그']],t=tabs.some(([k])=>k===S.setTab)?S.setTab:'info',ed=!S.snap&&can(p,'grant');
 let body='';
 if(t==='info'){
 const stage=({review:'진행 검토 중',active:'진행 중',done:'완료',drop:'진행안함'})[p.status]||p.status;
 body=`<div class="phs-fields">${[['name','제안 프로젝트명'],['organization','발주 기관'],['budgetEok','사업 예산'],['dueDate','제출 마감일']].map(([key,label])=>`<label class="phs-field" for="phs-${key}"><span>${label}</span><input class="inp" id="phs-${key}" data-header-info="${key}" value="${esc(draft[key])}" ${S.snap?'readonly':''}></label>`).join('')}<div class="phs-field phs-full"><span>진행 상태</span><div class="phs-state"><span class="phs-badge phs-stage">${esc(stage)}</span>${p.status==='active'?`<button type="button" class="btn phs-state-button" disabled>${fi('dismiss',12)}진행안함으로 전환</button>`:p.status==='drop'?'<button type="button" class="btn primary phs-state-button" disabled>진행 중으로 되돌리기</button>':''}</div></div></div>`;
 }
 if(t==='perm'){
 const members=[...new Set([p.pm,...(p.team||[])].filter(Boolean))];
 body=`<div class="phs-table-scroll"><table class="phs-table phs-permissions" aria-label="참여자별 프로젝트 권한"><thead><tr><th class="phs-name-column" scope="col">이름</th>${HEADER_PERMISSION_COLUMNS.map(([key,label,desc])=>`<th scope="col" title="${esc(desc)}" aria-label="${esc(label+': '+desc)}">${label}</th>`).join('')}</tr></thead><tbody>${members.map(name=>`<tr><th scope="row"><span class="phs-person"><span class="phs-avatar" title="${esc(name)}" aria-hidden="true">${esc(name[0]||'?')}</span><strong title="${esc(name)}">${esc(name)}</strong>${name===p.pm?'<span class="phs-badge">PM</span>':''}</span></th>${HEADER_PERMISSION_COLUMNS.map(([key,label])=>`<td><input type="checkbox" aria-label="${esc(name+' '+label)}" data-header-member="${esc(name)}" data-header-permission="${key}" ${name===p.pm||(draft.permissionsByMember[name]||[]).includes(key)?'checked':''} ${name===p.pm||!ed?'disabled':''}></td>`).join('')}</tr>`).join('')}</tbody></table>${members.length?'':'<p class="header-overlay-meta">참여자가 없습니다.</p>'}</div>`;
 }
 if(t==='noti')body=`${HEADER_NOTIFICATION_FIELDS.map(([key,label,description])=>`<label class="phs-notification"><input type="checkbox" data-header-notification="${key}" aria-describedby="phs-notification-${key}" ${draft.notifications[key]?'checked':''} ${S.snap?'disabled':''}><span><strong>${label}</strong><span class="header-overlay-meta" id="phs-notification-${key}">${description}</span></span></label>`).join('')}<h3 class="phs-delivery-title" id="phs-delivery-title">수신 방식</h3><div class="phs-delivery" role="group" aria-labelledby="phs-delivery-title">${[['inApp','앱 내 알림'],['email','이메일']].map(([key,label])=>`<button type="button" class="btn ${draft.notifications[key]?'active':''}" aria-pressed="${draft.notifications[key]}" ${S.snap?'disabled':''} data-act="${act(()=>{if(S.snap)return;draft.notifications[key]=!draft.notifications[key];renderOverlays();requestAnimationFrame(()=>$(`.phs-delivery [data-delivery="${key}"]`)?.focus());})}" data-delivery="${key}">${label}</button>`).join('')}</div>`;
 if(t==='log'){
 const logs=(p.logs||LOGS).map(l=>Array.isArray(l)?{name:l[0],department:l[1],role:l[2],detail:l[3],at:l[4]}:l);
 body=`<div class="phs-table-scroll"><table class="phs-table phs-logs" aria-label="프로젝트 변경 로그"><thead><tr>${['이름','권한','변경 내역','일시'].map(label=>`<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${logs.map(l=>`<tr><td><strong>${esc(l.name||'')}</strong> <span class="header-overlay-meta">${esc(l.department||'')}</span></td><td class="header-overlay-meta">${esc(l.role||'')}</td><td><div class="phs-log-detail">${esc(l.detail||'')}</div></td><td class="header-overlay-meta phs-nowrap">${esc(l.at||'')}</td></tr>`).join('')}</tbody></table>${logs.length?'':'<p class="header-overlay-meta">변경 내역이 없습니다.</p>'}</div>`;
 }
 return `<div class="phs-layout"><header class="phs-header">${fi('setup',18)}<h2 id="phs-title">프로젝트 설정</h2><span class="phs-project" id="phs-project" title="${esc(p.name)}">${esc(p.name)}</span><button type="button" class="btn ghost phs-close" aria-label="프로젝트 설정 닫기" data-act="${act(closeDrawer)}">${fi('dismiss',14)}</button></header><div class="phs-tabs" role="tablist" aria-label="프로젝트 설정 탭">${tabs.map(([key,label])=>`<button type="button" id="phs-tab-${key}" class="phs-tab ${t===key?'on':''}" role="tab" aria-selected="${t===key}" aria-controls="phs-panel-${key}" tabindex="${t===key?'0':'-1'}" data-settings-tab="${key}" data-act="${act(()=>{S.setTab=key;renderOverlays();requestAnimationFrame(()=>$('#phs-tab-'+key)?.focus());})}">${label}</button>`).join('')}</div><div class="phs-body"><div role="tabpanel" tabindex="0" id="phs-panel-${t}" aria-labelledby="phs-tab-${t}">${body}</div></div></div>`;
}
function bindHeaderSettings(p){
 const drawer=$('#drawer'),signal=HEADER_UI.abort.signal;
 drawer.addEventListener('input',e=>{const key=e.target.dataset.headerInfo,draft=HEADER_UI.settings;if(S.snap||draft?.pid!==p.id||!['name','organization','budgetEok','dueDate'].includes(key))return;draft[key]=e.target.value;},{signal});
 drawer.addEventListener('change',e=>{const key=e.target.dataset.headerNotification,draft=HEADER_UI.settings;if(S.snap||draft?.pid!==p.id)return;if(key&&HEADER_NOTIFICATION_FIELDS.some(f=>f[0]===key))draft.notifications[key]=e.target.checked;if(e.target.dataset.headerPermission)headerSettingPermission(p,e.target.dataset.headerMember,e.target.dataset.headerPermission,e.target.checked);},{signal});
 drawer.addEventListener('keydown',e=>{const tab=e.target.closest('[data-settings-tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const tabs=['info','perm','noti','log'],i=tabs.indexOf(tab.dataset.settingsTab),next=e.key==='Home'?0:e.key==='End'?3:(i+(e.key==='ArrowRight'?1:-1)+4)%4;S.setTab=tabs[next];renderOverlays();$('#phs-tab-'+S.setTab)?.focus();},{signal});
```
