"use client";
import type { TemplateExtraction } from "@/types/admin-assets";
export default function TemplateExtractionPanel({value}:{value:TemplateExtraction}){
  return <section aria-label="실제 파일 추출 정보" className="tw:min-w-0 tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line) tw:p-3">
    <h3 className="tw:mt-0 tw:text-[13px]">실제 파일 추출 정보</h3><p className="tw:break-all">{value.filename}</p><p>{value.slideCount}장 · {value.widthCm.toFixed(2)} × {value.heightCm.toFixed(2)} cm · {(value.byteLength/1024).toFixed(1)} KiB</p>
    <details><summary>글꼴 {value.fonts.length}개</summary><p className="tw:break-words">{value.fonts.join(", ")||"직접 지정된 글꼴 없음"}</p></details>
    <details><summary>테마 {value.themes.length}개</summary>{value.themes.map(theme=><div key={theme.path}><p>{theme.name||theme.path}</p><p>제목 {theme.majorFont??"상속"} / 본문 {theme.minorFont??"상속"}</p><div className="tw:flex tw:flex-wrap tw:gap-1">{theme.colors.map(color=><span key={color.slot} title={color.slot+" "+color.color} className="tw:inline-flex tw:items-center tw:gap-1 tw:rounded tw:border tw:border-solid tw:border-(--kpc-line) tw:p-1"><span style={{backgroundColor:color.color.startsWith("#")?color.color:"#"+color.color}} className="tw:inline-block tw:h-3 tw:w-3"/>{color.slot}</span>)}</div></div>)}</details>
    <details><summary>레이아웃 {value.layouts.length}개</summary><ul className="tw:pl-4">{value.layouts.map(layout=><li key={layout.path}>{layout.name||layout.path} · 연결 {layout.slideIndices.map(i=>i+1).join(", ")}쪽 · 자리 표시자 {layout.placeholderCount}개</li>)}</ul></details>
    <details><summary>로고 후보 {value.logoCandidates.length}개</summary><p>공유 이미지 후보입니다. 로고로 자동 확정하거나 새로 삽입하지 않습니다.</p><ul className="tw:pl-4">{value.logoCandidates.map(candidate=><li key={candidate.objectId} className="tw:break-all">{candidate.objectId} · {candidate.slideIndices.map(i=>i+1).join(", ")}쪽</li>)}</ul></details>
    {value.warnings.length>0&&<details><summary>분석 안내 {value.warnings.length}개</summary><ul className="tw:pl-4">{value.warnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul></details>}
    <p className="tw:mb-0 tw:text-[11px] tw:text-(--kpc-muted)">색상·글꼴은 추출 정보입니다. 전역 브랜드 색상 변경과 새 로고 삽입은 후속 범위입니다.</p>
  </section>;
}
