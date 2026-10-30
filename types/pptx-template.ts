import type {PageType, SkillEngineInput as Skill} from '@/lib/skills/schema';
import type {ZipArchive} from '@/lib/pptx/zip';
import type {SharedDesignEdit} from '@/lib/pptx/shared-schema';
export type {SharedDesignEdit} from '@/lib/pptx/shared-schema';

export type ObjectRole='title'|'sub'|'body'|'table'|'image'|'shape'|'keep';
export const ROLE_LABEL:Record<ObjectRole,string>={title:'제목',sub:'리딩 메시지',body:'본문',table:'표',image:'이미지',shape:'도형',keep:'원본 유지'};
export interface Box {x:number;y:number;w:number;h:number}
export interface TextStyle {face:string;size:number;bold:boolean;color:string;align:'left'|'center'|'right';lh:number;para:number;padV:number;padH:number}
export interface TemplateObject extends Box {
  id:string;name:string;kind:'text'|'shape'|'table'|'image'|'unsupported';role:ObjectRole;inferred:boolean;
  text:string;style:TextStyle;fill:string;stroke:string;geometry:string;rotation:number;
  cells:string[][];columnWidths:number[];rowHeights:number[];cellStyles:TextStyle[][];cellFills:string[][];
  imageData:string;imageWidth:number;imageHeight:number;crop:[number,number,number,number];
  reasons:string[];notices:string[];inherited:boolean;merged:boolean;index:number;source:'slide'|'layout'|'master';
  groupMembers?:GroupMember[];
}
export interface GroupMember extends TemplateObject {nodePath:number[];ancestors:string[];contextReasons:string[];previewBox:Box|null;previewScale:number}
export interface TemplateSlide {path:string;index:number;name:string;type:PageType;objects:TemplateObject[];decorations:TemplateObject[];background:string;warnings:string[];layoutPath:string;masterPath:string}
export interface TemplateImage {data:string;width:number;height:number;previewBytes:number;notice:string}
export type TemplateProgress=(message:string)=>void;
export interface TemplateReadOptions {signal?:AbortSignal;images?:Map<string,TemplateImage>;onProgress?:TemplateProgress}
export interface TemplateDocument {filename:string;bytes:Uint8Array;zip:ZipArchive;width:number;height:number;slides:TemplateSlide[];warnings:string[];images:Map<string,TemplateImage>}
export interface TemplateOptions {layout:boolean;images:boolean;selectedSlides:number[];pageTypes:Record<number,PageType>;roles:Record<string,ObjectRole>;excluded:string[];sharedEdits?:SharedDesignEdit[]}
export interface ObjectChange {slide:number;id:string;name:string;status:'changed'|'kept'|'skipped';details:string[];before:string;after:string;children?:ChildChange[]}
export type ChildChange=Pick<ObjectChange,'id'|'name'|'status'|'details'>;
export interface TemplateResult {bytes:Uint8Array;before:TemplateDocument;after:TemplateDocument;changes:ObjectChange[];warnings:string[];skill:Skill;modifiedParts:string[]}
