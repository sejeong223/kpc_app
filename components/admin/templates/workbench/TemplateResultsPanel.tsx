"use client";
import { Button,Field,Input,Select } from "@fluentui/react-components";
import { useState } from "react";
import { resultRows,countResults,filterResults,RESULT_LABEL,SOURCE_LABEL,type ResultQuery } from "@/lib/pptx/template-results";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import AdminPager from "@/components/admin/ui/AdminPager";
import type { ObjectChange } from "@/types/pptx-template";
import type { TemplatePreviewData } from "@/types/template-work";
import TemplateSlidePreview from "./TemplateSlidePreview";
interface TemplateResultsPanelProps {before:TemplatePreviewData;after:TemplatePreviewData|null;changes:readonly ObjectChange[];warnings:readonly string[]}
export default function TemplateResultsPanel({before,after,changes,warnings}:TemplateResultsPanelProps){
  const [selection,setSelection]=useState<ResultQuery>({scope:"slide",slideIndex:0,filter:"all",query:""}),[selected,setSelected]=useState<string|null>(null),[page,setPage]=useState(1);
  const slideIndex=before.slides.find(s=>s.index===selection.slideIndex)?.index??before.slides[0]?.index??0;
  const rows=resultRows(before,after?{after,changes}:null),counts=countResults(rows),filtered=filterResults(rows,{...selection,slideIndex}),current=Math.min(page,Math.max(1,Math.ceil(filtered.length/20))),visible=filtered.slice((current-1)*20,current*20);
  const change=(patch:Partial<ResultQuery>)=>{setSelection({...selection,...patch});setPage(1);};
  return <div className="tw:flex tw:flex-col tw:gap-4"><AdminCard title="전후 구조 비교">
    <p className="tw:text-[11px] tw:text-(--kpc-muted)">PowerPoint와 동일한 화면이 아닙니다. 그룹·차트·병합 표는 간소화될 수 있으며 최종 모습은 출력 파일에서 확인하세요.</p>
    <Field label="비교 슬라이드"><Select value={slideIndex} onChange={(_,data)=>{change({slideIndex:Number(data.value)});setSelected(null);}}>{before.slides.map(s=><option key={s.index} value={s.index}>{s.index+1}쪽 · {s.name}</option>)}</Select></Field>
    <div className="tw:mt-3 tw:grid tw:gap-3 tw:lg:grid-cols-2"><div><h3 className="tw:text-[12px]">원본</h3><TemplateSlidePreview document={before} slideIndex={slideIndex} selectedObjectId={selected} onSelect={setSelected}/></div><div><h3 className="tw:text-[12px]">마지막 적용 결과</h3>{after?<TemplateSlidePreview document={after} slideIndex={slideIndex} selectedObjectId={selected} onSelect={setSelected}/>:<p>아직 적용한 결과가 없습니다.</p>}</div></div>
  </AdminCard><AdminCard title="요소별 적용 결과">
    <p>변경 {counts.changed} · 원본 유지 {counts.kept} · 적용 제외 {counts.skipped}</p><p className="tw:text-[11px] tw:text-(--kpc-muted)">표·그룹은 하나의 요소로 집계합니다. 그룹 내부 일부만 바뀌어도 변경으로 표시하며 내부 결과를 별도로 제공합니다. 공유 요소는 표시되는 페이지마다 집계합니다.</p>
    <div className="tw:flex tw:flex-wrap tw:items-end tw:gap-3"><Field label="결과 범위"><Select value={selection.scope} onChange={(_,data)=>change({scope:data.value==="document"?"document":"slide"})}><option value="slide">현재 슬라이드</option><option value="document">전체 문서</option></Select></Field><Field label="결과 상태"><Select value={selection.filter} onChange={(_,data)=>change({filter:data.value==="changed"||data.value==="kept"||data.value==="skipped"?data.value:"all"})}><option value="all">전체</option><option value="changed">변경</option><option value="kept">원본 유지</option><option value="skipped">적용 제외</option></Select></Field><Field label="요소·사유 검색"><Input value={selection.query} onChange={(_,data)=>change({query:data.value})}/></Field></div>
    <div className="tw:mt-3 tw:flex tw:flex-col tw:gap-2">{visible.map(row=><article key={row.key} className={"tw:rounded-lg tw:border tw:border-solid tw:p-3 "+(selected===row.object.id&&slideIndex===row.slide.index?"tw:border-(--kpc-brand)":"tw:border-(--kpc-line)")}><div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2"><strong>{row.slide.index+1}쪽 · {SOURCE_LABEL[row.object.source]} · {row.object.name}</strong><span>{row.change?RESULT_LABEL[row.change.status]:"미적용"}</span></div><p className="tw:line-clamp-2">{row.object.text||row.object.kind}</p>
      {row.change&&<><p className="tw:text-[11px]">전: {row.change.before}<br/>후: {row.change.after}</p><ul className="tw:pl-4">{row.change.details.map((reason,index)=><li key={index}>{reason}</li>)}</ul></>}
      {row.change?.children?.length?<details><summary>그룹 내부 결과 {row.change.children.length}개</summary>{row.change.children.map(child=><div key={child.id} className="tw:mt-2 tw:ml-3"><strong>{child.name} · {RESULT_LABEL[child.status]}</strong><p>{child.details.join(" ")}</p></div>)}</details>:null}
      <Button size="small" onClick={()=>{change({slideIndex:row.slide.index});setSelected(row.object.id);}}>비교 화면에서 선택</Button>
    </article>)}</div>{!visible.length&&<p>조건에 맞는 요소가 없습니다.</p>}<AdminPager page={current} total={filtered.length} pageSize={20} onChange={setPage}/>
    {warnings.length>0&&<details className="tw:mt-3"><summary>적용 안내 {warnings.length}개</summary><ul className="tw:max-h-64 tw:overflow-auto tw:pl-4">{warnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul></details>}
  </AdminCard></div>;
}
