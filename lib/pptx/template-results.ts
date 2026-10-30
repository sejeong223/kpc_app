import type {ObjectChange,TemplateDocument,TemplateObject,TemplateResult,TemplateSlide} from '@/types/pptx-template';

export type ResultStatus=ObjectChange['status'];
export type ResultFilter='all'|ResultStatus;
export interface ResultRow {key:string;slide:TemplateSlide;object:TemplateObject;change:ObjectChange|null;next:TemplateObject|null}
export interface ResultQuery {scope:'slide'|'document';slideIndex:number;filter:ResultFilter;query:string}
export const RESULT_LABEL:Record<ResultStatus,string>={changed:'변경',skipped:'적용 제외',kept:'원본 유지'};
export const SOURCE_LABEL:Record<TemplateObject['source'],string>={slide:'슬라이드',layout:'레이아웃',master:'마스터'};
export const resultKey=(slide:number,id:string):string=>`${slide}:${id}`;

export function resultRows(doc:Pick<TemplateDocument,'slides'>|null,result:{changes:readonly ObjectChange[];after:Pick<TemplateResult['after'],'slides'>}|null):ResultRow[]{
  if(!doc)return [];
  const changes=new Map(result?.changes.map(change=>[resultKey(change.slide,change.id),change])??[]);
  const after=new Map<string,TemplateObject>();
  for(const slide of result?.after.slides??[])for(const object of [...slide.objects,...slide.decorations])after.set(resultKey(slide.index+1,object.id),object);
  return doc.slides.flatMap(slide=>[...slide.objects,...slide.decorations].map(object=>{const key=resultKey(slide.index+1,object.id);return {key,slide,object,change:changes.get(key)??null,next:after.get(key)??null};}));
}
export function countResults(rows:readonly ResultRow[]):Record<ResultStatus,number>{
  const counts:Record<ResultStatus,number>={changed:0,skipped:0,kept:0};
  for(const row of rows)if(row.change)counts[row.change.status]++;
  return counts;
}
export function filterResults(rows:readonly ResultRow[],selection:ResultQuery):ResultRow[]{
  const query=selection.query.trim().toLocaleLowerCase();
  return rows.filter(row=>{
    if(selection.scope==='slide'&&row.slide.index!==selection.slideIndex)return false;
    if(selection.filter!=='all'&&row.change?.status!==selection.filter)return false;
    const text=[row.object.name,row.object.text,SOURCE_LABEL[row.object.source],...row.object.reasons,...row.object.notices,...(row.change?.details??[]),...(row.object.groupMembers??[]).flatMap(member=>[member.name,member.text]),...(row.change?.children??[]).flatMap(child=>[child.name,...child.details])].join(' ').toLocaleLowerCase();
    return !query||text.includes(query);
  });
}
