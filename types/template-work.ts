import type { z } from "zod";
import type { TemplateWorkSchema,WorkCommandSchema,WorkResultSummarySchema } from "@/lib/admin/assets/work-schemas";
import type { AdminActor } from "./admin";
import type { ObjectChange,TemplateDocument } from "./pptx-template";
import type { SharedDesign } from "@/lib/pptx/shared-design";

export type TemplateWork = z.infer<typeof TemplateWorkSchema>;
export type WorkStatus = TemplateWork["status"];
export type WorkResultSummary = z.infer<typeof WorkResultSummarySchema>;
export type WorkCommand = z.infer<typeof WorkCommandSchema>;
export interface WorkView { work:TemplateWork;templateName:string;skillName:string;newer:{template:boolean;skill:boolean};canReapply:boolean;canApplyLatest:boolean;canDownload:boolean }
export interface TemplateWorkListItem extends Pick<TemplateWork,"id"|"createdAt"|"updatedAt"|"status"> {templateName:string;skillName:string}
export type TemplatePreviewData = Pick<TemplateDocument,"width"|"height"|"slides"|"warnings">;
export interface WorkDownload {bytes:Uint8Array;filename:string}
export interface TemplateWorkDataService {
  getWorks(actor:AdminActor):Promise<TemplateWorkListItem[]>;
  getWork(actor:AdminActor,id:string):Promise<WorkView>;
  execute(actor:AdminActor,command:WorkCommand):Promise<WorkView|null>;
  download(actor:AdminActor,workId:string,resultId:string):Promise<WorkDownload>;
  canAccess(actor:AdminActor,workId:string):boolean;
  getPreview(actor:AdminActor,workId:string,side:"before"|"after"):TemplatePreviewData|null;
  getChanges(actor:AdminActor,workId:string):ObjectChange[];
  getSharedDesigns(actor:AdminActor,workId:string):SharedDesign[];
  setActor(actor:AdminActor):void;
  subscribe(listener:()=>void):()=>void;
  getRevision():number;
  dispose():void;
}
