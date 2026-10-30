import {z} from 'zod';

const dimension=z.number().finite().min(.01).max(200);
const color=z.string().regex(/^#[0-9a-f]{6}$/i,'색상은 #RRGGBB 형식으로 입력하세요.');
export const sharedTextSchema=z.strictObject({face:z.string().trim().min(1).max(100),size:z.number().finite().min(4).max(200),bold:z.boolean(),color,align:z.enum(['left','center','right']),lh:z.number().finite().min(.5).max(5),para:z.number().finite().min(0).max(100),padV:z.number().finite().min(0).max(10),padH:z.number().finite().min(0).max(10)});
// 기본 서식만 바꿀 때는 수정하지 않는 원본 크기·간격에 편집 범위를 강제하지 않습니다.
const preservedTextSchema=sharedTextSchema.extend({size:z.number().finite(),lh:z.number().finite(),para:z.number().finite(),padV:z.number().finite(),padH:z.number().finite()});
export const sharedEditSchema=z.strictObject({
  id:z.string().min(1).max(400),
  position:z.strictObject({x:z.number().finite().min(0).max(200),y:z.number().finite().min(0).max(200),w:dimension,h:dimension}).nullable(),
  text:preservedTextSchema.nullable(),
  textMode:z.enum(['full','appearance']).optional(),
  textFields:z.array(z.enum(['face','bold','color'])).min(1).max(3).optional(),
  fill:z.union([color,z.literal('transparent')]).nullable(),
}).refine(edit=>edit.position!==null||edit.text!==null||edit.fill!==null,'변경할 항목을 하나 이상 선택하세요.').superRefine((edit,context)=>{if(edit.text&&edit.textMode!=='appearance'){const result=sharedTextSchema.safeParse(edit.text);if(!result.success)for(const issue of result.error.issues)context.addIssue({...issue,path:['text',...issue.path]});}});
export type SharedDesignEdit=z.infer<typeof sharedEditSchema>;
export type AppearanceField=NonNullable<SharedDesignEdit['textFields']>[number];

export const SharedDesignEditSchema=sharedEditSchema;
export const SharedTextSchema=sharedTextSchema;
