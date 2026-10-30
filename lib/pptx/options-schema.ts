import {z} from 'zod';
import {sharedEditSchema} from './shared-schema';
import {PptxError} from './errors';
import type {TemplateDocument,TemplateObject,TemplateOptions} from '@/types/pptx-template';
export const TemplateOptionsSchema=z.strictObject({layout:z.boolean(),images:z.boolean(),selectedSlides:z.array(z.number().int().min(0).max(199)).max(200).transform(values=>[...new Set(values)]),pageTypes:z.record(z.string(),z.enum(['cover','toc','div','body','table','appx'])),roles:z.record(z.string(),z.enum(['title','sub','body','table','image','shape','keep'])),excluded:z.array(z.string().min(1).max(400)).max(200000).transform(values=>[...new Set(values)]),sharedEdits:z.array(sharedEditSchema).max(1000).default([])});

export function validateOptionsForDocument(doc:Pick<TemplateDocument,'slides'>,options:TemplateOptions):void {
  const slideIds=new Set(doc.slides.map(slide=>slide.index)),objects=new Set<string>(),shared=new Set<string>();
  const collect=(items:TemplateObject[],ids:Set<string>)=>{for(const item of items){ids.add(item.id);collect(item.groupMembers??[],ids);}};
  for(const slide of doc.slides){collect(slide.objects,objects);collect(slide.decorations,shared);}
  if(options.selectedSlides.some(id=>!slideIds.has(id))||Object.keys(options.pageTypes).some(id=>!/^\d+$/.test(id)||!slideIds.has(Number(id)))||Object.keys(options.roles).some(id=>!objects.has(id)&&!shared.has(id))||options.excluded.some(id=>!objects.has(id)&&!shared.has(id))||options.sharedEdits?.some(edit=>!shared.has(edit.id)))throw new PptxError('VALIDATION','문서에서 적용 대상을 찾을 수 없습니다.');
}
