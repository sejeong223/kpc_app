import type { StagedTemplateSource } from "@/types/admin-assets";
import type { TemplateProgress } from "@/types/pptx-template";
type Importer=(input:{file:File;signal:AbortSignal;onProgress:TemplateProgress})=>Promise<StagedTemplateSource>;
export class TemplateImportSession {
  private sequence=0;
  private controller:AbortController|null=null;
  private source:StagedTemplateSource|null=null;
  constructor(private readonly discard:(id:string)=>void){}
  cancel(){this.sequence++;this.controller?.abort();this.controller=null;}
  clear(){this.cancel();if(this.source){this.discard(this.source.id);this.source=null;}}
  async select(file:File,importer:Importer,progress:TemplateProgress):Promise<StagedTemplateSource|null>{
    this.clear();const sequence=this.sequence,controller=new AbortController();this.controller=controller;
    try{
      const source=await importer({file,signal:controller.signal,onProgress:message=>{if(sequence===this.sequence&&!controller.signal.aborted)progress(message);}});
      if(sequence!==this.sequence||controller.signal.aborted){this.discard(source.id);return null;}
      this.source=source;this.controller=null;return source;
    }catch(error){if(sequence!==this.sequence||controller.signal.aborted)return null;this.controller=null;throw error;}
  }
}
