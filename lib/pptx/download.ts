import { safePptxFilename } from "./errors";
const pending=new Map<string,ReturnType<typeof setTimeout>>();
export function clearPptxDownloads():void {for(const [url,timer] of pending){clearTimeout(timer);URL.revokeObjectURL(url);}pending.clear();}
export function downloadPptxBytes(bytes:Uint8Array,filename:string):void {
  const name=safePptxFilename(filename).replace(/\.potx$/i,".pptx"),url=URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer],{type:"application/vnd.openxmlformats-officedocument.presentationml.presentation"}));
  const anchor=document.createElement("a");anchor.href=url;anchor.download=/\.pptx$/i.test(name)?name:name+".pptx";document.body.appendChild(anchor);
  try{anchor.click();}finally{anchor.remove();pending.set(url,setTimeout(()=>{URL.revokeObjectURL(url);pending.delete(url);},1000));}
}
