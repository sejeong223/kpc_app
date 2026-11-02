"use client";
import { Field } from "@fluentui/react-components";
import { DadamSelect as Select } from "@/components/ui/DadamControls";
import { useId,useState } from "react";
import { PAGE_TYPES,PAGE_LABEL } from "@/config/skill-options";
import type { PageType,SkillRules } from "@/lib/skills/schema";
import { weightValue } from "@/lib/pptx/text-layout";

const SLIDE_WIDTH=33.87,SLIDE_HEIGHT=19.05,CM=640/SLIDE_WIDTH,PT=CM*2.54/72;
const anchor={왼쪽:"start",가운데:"middle",오른쪽:"end"} as const;

export default function SkillStylePreview({rules}: {rules:SkillRules}){
  const id=useId(),[pageType,setPageType]=useState<PageType|null>(null);
  const page=pageType?rules.pt[pageType]:null;
  const titleSize=(page?.title??rules.font.title[0])*PT,bodySize=(page?.body??rules.font.body[0])*PT,subSize=rules.font.sub[0]*PT,lineHeight=page?.lh??rules.font.lh;
  const [top,left,bottom,right]=rules.mg.map(value=>value*CM),width=640-left-right,height=SLIDE_HEIGHT*CM-top-bottom;
  const align=page?.align??"왼쪽",textX=align==="가운데"?left+width/2:align==="오른쪽"?640-right:left;
  const titleY=top+titleSize,subY=titleY+rules.gap.tb*CM+subSize,bodyY=subY+bodySize*lineHeight+rules.gap.para*PT;
  const tableY=bodyY+bodySize*lineHeight+rules.gap.para*PT+rules.gap.bt*CM;
  const rowHeight=Math.max(rules.table.rowH*CM,bodySize+rules.table.padV*CM*2),tableWidths=[width*.38,width*.42,width*.2];
  const headAlign=rules.table.head.startsWith("가운데")?"가운데":"왼쪽";
  const cardWidth=Math.max((width-16)/3,width*rules.shape.min/rules.cols),cardY=tableY+rowHeight*3+rules.gap.bt*CM;
  return <aside className="tw:min-w-0 tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line) tw:bg-(--kpc-card) tw:p-(--layout-card-inset) tw:xl:sticky tw:xl:top-[calc(var(--layout-sticky-header-height,0px)+var(--layout-section-gap))]" aria-label="실시간 서식 미리보기">
    <h2 className="tw:mt-0 tw:mb-(--layout-section-gap) tw:text-[13px]">미리보기 — 이 규칙으로 배치하면</h2>
    <Field label="미리보기 페이지 유형"><Select value={pageType??""} onChange={(_,data)=>setPageType(PAGE_TYPES.find(type=>type===data.value)??null)}><option value="">공통 규칙</option>{PAGE_TYPES.map(type=><option key={type} value={type}>{PAGE_LABEL[type]}</option>)}</Select></Field>
    <svg className="tw:mt-(--layout-section-gap) tw:block tw:h-auto tw:w-full tw:rounded tw:border tw:border-solid tw:border-(--kpc-line) tw:bg-white" viewBox={`0 0 640 ${SLIDE_HEIGHT*CM}`} role="img" aria-labelledby={`${id}-title ${id}-description`}>
      <title id={`${id}-title`}>Skill 서식 예시</title>
      <desc id={`${id}-description`}>{`${rules.cols}열 · ${rules.rows}단 안내선, 눈금 ${rules.grid}cm, 여백 상 ${rules.mg[0]} · 좌 ${rules.mg[1]} · 하 ${rules.mg[2]} · 우 ${rules.mg[3]}cm`}</desc>
      <defs>
        <pattern id={`${id}-grid`} width={rules.grid*CM} height={rules.grid*CM} patternUnits="userSpaceOnUse"><path d={`M ${rules.grid*CM} 0 L 0 0 0 ${rules.grid*CM}`} fill="none" stroke="#dfe6ed" strokeWidth=".5"/></pattern>
        <clipPath id={`${id}-area`}><rect x={left} y={top} width={width} height={height}/></clipPath>
      </defs>
      <rect width="640" height={SLIDE_HEIGHT*CM} fill={`url(#${id}-grid)`}/>
      <g fill="none" stroke="#93b9c9" strokeWidth="1" strokeDasharray="4 4" aria-hidden="true">
        <rect data-preview-margins x={left} y={top} width={width} height={height}/>
        {Array.from({length:rules.cols-1},(_,index)=><line data-guide="column" key={`col-${index}`} x1={left+width*(index+1)/rules.cols} x2={left+width*(index+1)/rules.cols} y1={top} y2={top+height}/>)}
        {Array.from({length:rules.rows-1},(_,index)=><line data-guide="row" key={`row-${index}`} x1={left} x2={left+width} y1={top+height*(index+1)/rules.rows} y2={top+height*(index+1)/rules.rows}/>)}
      </g>
      <g clipPath={`url(#${id}-area)`} fontFamily={`${rules.font.family}, var(--dadam-font-family), sans-serif`} fill="#243747" aria-hidden="true">
        <text data-preview-title x={textX} y={titleY} textAnchor={anchor[align]} fontSize={titleSize} fontWeight={weightValue[rules.font.title[1]]}>3.3 보안 체계 (CSAP 망연계)</text>
        <text x={textX} y={subY} textAnchor={anchor[align]} fontSize={subSize} fontWeight={weightValue[rules.font.sub[1]]}>안전한 업무 환경을 위한 보안 체계</text>
        <text x={textX} y={bodyY} textAnchor={anchor[align]} fontSize={bodySize} fontWeight={weightValue[rules.font.body[1]]}>
          <tspan x={textX}>• 보안성 검토 기준 충족 망연계 게이트웨이</tspan>
          <tspan x={textX} dy={bodySize*lineHeight+rules.gap.para*PT}>• 입·출력 프롬프트 비식별화 및 금칙어 필터</tspan>
        </text>
        {[["요구사항","대응 방안","쪽"],["SER-001","단방향 전송","12"],["SER-003","비식별화","14"]].map((row,rowIndex)=>row.map((text,column)=>{
          const x=left+tableWidths.slice(0,column).reduce((sum,value)=>sum+value,0),w=tableWidths[column];
          const cellAlign=rowIndex===0?headAlign:column===2?rules.table.num:rules.table.text;
          const tx=cellAlign==="가운데"?x+w/2:cellAlign==="오른쪽"?x+w-rules.table.padH*CM:x+rules.table.padH*CM;
          return <g key={`${rowIndex}-${column}`}><rect x={x} y={tableY+rowIndex*rowHeight} width={w} height={rowHeight} fill={rowIndex===0&&rules.table.head.includes("배경")?"#dcecef":"#ffffffdd"} stroke="#a2b5bf" strokeWidth=".7"/><text x={tx} y={tableY+rowIndex*rowHeight+rowHeight/2} dominantBaseline="central" textAnchor={anchor[cellAlign]} fontSize={bodySize} fontWeight={rowIndex===0&&rules.table.head.includes("굵게")?700:weightValue[rules.font.body[1]]}>{text}</text></g>;
        }))}
        {[0,1,2].map(index=><rect key={index} x={left+index*(cardWidth+8)} y={cardY+(rules.shape.align==="가운데 맞춤"?5:rules.shape.align==="아래쪽 맞춤"?10:0)} width={cardWidth} height="30" rx="4" fill="#d6e9ef" fillOpacity=".85" stroke="#89aebc"/>)}
      </g>
    </svg>
    <p className="tw:mb-1 tw:text-[11px]">{rules.cols}열 · {rules.rows}단 안내선 / 눈금 {rules.grid}cm</p>
    <p className="tw:my-1 tw:text-[11px]">여백 상 {rules.mg[0]} · 좌 {rules.mg[1]} · 하 {rules.mg[2]} · 우 {rules.mg[3]}cm</p>
    {page&&<p className="tw:text-[11px]">{page.rule}</p>}
    <p className="tw:mb-0 tw:text-[11px] tw:text-(--kpc-muted)">값을 바꾸면 바로 반영되는 33.87 × 19.05cm 축소 예시입니다. 글꼴은 이 기기에 설치된 경우 표시됩니다. 실제 PPT의 내용·이미지·넘침 처리는 적용 결과에서 확인하세요.</p>
  </aside>;
}
