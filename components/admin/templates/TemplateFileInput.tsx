"use client";
import { Button,Spinner } from "@fluentui/react-components";
import { useId,useState } from "react";
import { TEMPLATE_LIMITS } from "@/lib/pptx/limits";
interface TemplateFileInputProps {disabled:boolean;filename:string|null;progress:string|null;error:string|null;onSelect(file:File):void;onCancel():void;onUseExample():void}
export default function TemplateFileInput(props:TemplateFileInputProps){
  const id=useId(),[error,setError]=useState<string|null>(null);
  function select(files:FileList|null){if(props.disabled||props.progress||!files?.length)return;if(files.length!==1){setError("한 번에 파일 하나만 선택하세요.");return;}const file=files[0];if(!/\.(pptx|potx)$/i.test(file.name)){setError(".pptx 또는 .potx 파일만 선택하세요.");return;}if(file.size>TEMPLATE_LIMITS.fileBytes){setError("250 MiB 이하 파일을 선택하세요.");return;}setError(null);props.onSelect(file);}
  return <section aria-label="Template 원본 파일" onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();select(event.dataTransfer.files);}} className="tw:min-w-0 tw:rounded-lg tw:border tw:border-dashed tw:border-(--kpc-line-strong) tw:bg-(--kpc-bg) tw:p-4">
    <h3 className="tw:mt-0 tw:text-[13px]">PPTX / POTX 업로드</h3><p>파일 하나를 선택하거나 여기에 놓아 주세요.</p><p className="tw:text-[11px] tw:text-(--kpc-muted)">최대 250 MiB · 암호화·매크로·전자서명 파일은 지원하지 않습니다.</p>
    <label htmlFor={id}>원본 파일 선택</label><input id={id} type="file" accept=".pptx,.potx" disabled={props.disabled||Boolean(props.progress)} className="tw:mt-2 tw:block tw:w-full tw:min-w-0 tw:text-[12px]" onChange={event=>{select(event.currentTarget.files);event.currentTarget.value="";}}/>
    {props.filename&&<p className="tw:break-all">{props.filename}</p>}
    {props.progress?<div className="tw:mt-3 tw:flex tw:flex-wrap tw:items-center tw:gap-2"><Spinner size="tiny" label={props.progress}/><Button onClick={props.onCancel}>분석 취소</Button></div>:<Button className="tw:mt-3" disabled={props.disabled} onClick={props.onUseExample}>예시 파일로 시작</Button>}
    {(error||props.error)&&<p role="alert" className="tw:text-(--kpc-danger)">{error??props.error}</p>}
  </section>;
}
