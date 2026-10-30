"use client";
import { Button,Checkbox } from "@fluentui/react-components";
import type { AssetAudienceOptions,AssetVisibility,AssetAudienceTarget } from "@/types/admin-assets";
interface AssetVisibilityFieldProps {value:AssetVisibility;candidates:AssetAudienceOptions;disabled:boolean;onChange(value:AssetVisibility):void}
export default function AssetVisibilityField({value,candidates,disabled,onChange}:AssetVisibilityFieldProps){
  const groups=[{type:"department",label:"부서",items:candidates.departments},{type:"group",label:"그룹",items:candidates.groups},{type:"user",label:"사용자",items:candidates.users}] as const;
  const toggle=(target:AssetAudienceTarget,checked:boolean)=>onChange({all:false,targets:checked?[...value.targets,target]:value.targets.filter(t=>t.type!==target.type||t.id!==target.id)});
  return <fieldset disabled={disabled} className="tw:m-0 tw:min-w-0 tw:rounded-lg tw:border tw:border-solid tw:border-(--kpc-line) tw:p-3">
    <legend className="tw:px-1 tw:font-semibold">공개 범위</legend>
    <Checkbox label="전사 공개" checked={value.all} disabled={disabled} onChange={(_,data)=>onChange({all:data.checked===true,targets:[]})}/>
    <p className="tw:text-[11px] tw:text-(--kpc-muted)">공개 대상은 조회·적용할 수 있습니다. 편집 권한은 소유 부서에 유지됩니다.</p>
    {!value.all&&<>
      <div className="tw:flex tw:flex-wrap tw:gap-1">{value.targets.map(target=>{const group=groups.find(g=>g.type===target.type),name=group?.items.find(i=>i.id===target.id)?.name??"기존 대상";return <Button key={target.type+target.id} size="small" disabled={disabled} aria-label={name+" 공개 대상 제거"} onClick={()=>toggle(target,false)}>{group?.label} · {name} ×</Button>;})}</div>
      <div className="tw:mt-2 tw:grid tw:gap-3 tw:sm:grid-cols-3">{groups.map(group=><div key={group.type}><p className="tw:m-0 tw:font-semibold">{group.label}</p><div className="tw:max-h-36 tw:overflow-y-auto">{group.items.length?group.items.map(item=><Checkbox key={item.id} label={item.name} disabled={disabled} checked={value.targets.some(t=>t.type===group.type&&t.id===item.id)} onChange={(_,data)=>toggle({type:group.type,id:item.id},data.checked===true)}/>):<p className="tw:text-(--kpc-muted)">선택 가능한 대상 없음</p>}</div></div>)}</div>
      {!value.targets.length&&<p className="tw:mb-0 tw:text-[11px] tw:text-(--kpc-muted)">비공개 · 소유 부서 관리자와 슈퍼 관리자만 접근합니다.</p>}
    </>}
  </fieldset>;
}
