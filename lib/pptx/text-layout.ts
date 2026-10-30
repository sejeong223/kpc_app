import type {SkillEngineInput as Skill,FontWeight as Weight,Align} from '@/lib/skills/schema';
export const SIZE = { width:33.87, height:19.05 };
export const cmToIn = (v:number):number => v/2.54;
export const cmToPt = (v:number):number => v*72/2.54;
export const ptToCm = (v:number):number => v*2.54/72;
export const alignValue = (v:Align):'left'|'center'|'right' => v==='왼쪽'?'left':v==='가운데'?'center':'right';
export const weightValue: Record<Weight,number> = {Regular:400,Medium:500,SemiBold:600,Bold:700,ExtraBold:800};
export function fontFace(s:Skill, weight:Weight):{face:string;bold:boolean;note:string} {
  const family = {Pretendard:'Pretendard','Noto Sans KR':'Noto Sans KR','나눔스퀘어':'NanumSquare','맑은 고딕':'Malgun Gothic','본고딕':'Source Han Sans K'}[s.font.family];
  if(weight==='Regular'||weight==='Bold') return {face:family,bold:weight==='Bold',note:''};
  if(s.font.family==='맑은 고딕') return {face:family,bold:weightValue[weight]>=600,note:`맑은 고딕에는 ${weight}가 없어 ${weightValue[weight]>=600?'Bold':'Regular'}로 대체합니다.`};
  if(s.font.family==='나눔스퀘어' && weight!=='ExtraBold') return {face:family,bold:weight==='SemiBold',note:`나눔스퀘어에는 ${weight}가 없어 ${weight==='SemiBold'?'Bold':'Regular'}로 대체합니다.`};
  return {face:s.font.family==='나눔스퀘어'?'NanumSquare ExtraBold':`${family} ${weight}`,bold:false,note:`${family} ${weight} 정적 글꼴이 출력 PC에 필요합니다.`};
}
// 브라우저와 생성 스크립트에 같은 측정기를 주입할 수 있습니다. 기본값은 보수적인 글자폭 추정입니다.
export type MeasureText = (text:string,face:string,size:number,weight:number)=>number;
let measure:MeasureText = (text,_face,size,weight) => Array.from(text).reduce((n,ch)=>n+(/[\u2E80-\uFFFF]/.test(ch)?1.02:/[MW@]/.test(ch)?.87:/\s/.test(ch)?.3:.58),0)*ptToCm(size)*(weight>=700?1.04:1);
export function setTextMeasurer(fn:MeasureText):void { measure=fn; }
export function wrapText(text:string,w:number,size:number,s:Skill,weight:Weight):string[] {
  return wrapTextWithFont(text,w,size,fontFace(s,weight).face,weightValue[weight]);
}
function wrapTextWithFont(text:string,w:number,size:number,face:string,weight:number):string[] {
  const out:string[]=[];
  for(const paragraph of text.split('\n')) {
    let line='';
    for(const ch of Array.from(paragraph)) { if(line && measure(line+ch,face,size,weight)>w*.96){out.push(line);line=ch;}else line+=ch; }
    out.push(line);
  }
  return out;
}
export function textHeightWithFont(text:string,w:number,style:{face:string;size:number;bold:boolean;lh:number;para:number}):number {
  return wrapTextWithFont(text,w,style.size,style.face,style.bold?700:400).length*ptToCm(style.size)*style.lh*1.25+Math.max(0,text.split('\n').length-1)*ptToCm(style.para)+.08;
}
export function textHeight(text:string,w:number,size:number,lh:number,para:number,s:Skill,weight:Weight):number {
  return wrapText(text,w,size,s,weight).length*ptToCm(size)*lh*1.25+Math.max(0,text.split('\n').length-1)*ptToCm(para)+.08;
}
