"use client";
import { Button,Field,Input,Select } from "@fluentui/react-components";
import { useAdminRuntime } from "@/components/admin/AdminRuntimeProvider";
import { AssetQuerySchema } from "@/lib/admin/assets/schemas";
import { AdminCard } from "@/components/admin/ui/AdminPrimitives";
import AdminTable,{type AdminColumn} from "@/components/admin/ui/AdminTable";
import AdminPager from "@/components/admin/ui/AdminPager";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import AssetVersionBadge from "./AssetVersionBadge";
import type { AssetKind,AssetQuery,AssetList,AssetRow } from "@/types/admin-assets";
export interface AssetListPanelProps {
  kind:AssetKind;query:AssetQuery;onQueryChange(value:AssetQuery):void;list:AssetList;loading:boolean;error:string|null;
  onOpen(id:string):void;onCreate():void;onDuplicate(row:AssetRow):void;onToggle(row:AssetRow):void;onDelete(row:AssetRow):void;canCreate:boolean;
  onApply?(row:AssetRow):void;
}
export const ASSET_DATA_NOTICE="관리 정보는 임시 저장되며 새로고침하면 초기화됩니다. 업로드 파일은 실제로 분석합니다.";
export const emptyAssetList:AssetList={rows:{items:[],total:0,page:1,pageSize:20,totalPages:1},activeCount:0,inactiveCount:0};
export function defaultAssetQuery(kind:AssetKind):AssetQuery{return {kind,search:"",visibility:"all",status:"all",page:1,pageSize:20,sort:"updatedAt",direction:"desc"};}
export default function AssetListPanel(props:AssetListPanelProps){
  const {access}=useAdminRuntime(),grant=access?.grants[props.kind==="skill"?"skills":"templates"];
  const change=(patch:Partial<AssetQuery>)=>{const parsed=AssetQuerySchema.safeParse({...props.query,...patch,page:1});if(parsed.success)props.onQueryChange(parsed.data);};
  if(!grant?.read)return <AdminAsyncState state="forbidden"/>;
  const columns:AdminColumn<AssetRow>[]=[
    {id:"name",label:"이름 / 약칭",sortable:true,render:row=><div><Button appearance="transparent" size="small" onClick={()=>props.onOpen(row.id)}>{row.name}</Button><div className="tw:px-2 tw:text-[11px] tw:text-(--kpc-muted)">{row.short}</div></div>},
    {id:"owner",label:"소유 부서",render:row=>row.ownerDepartmentName},
    {id:"visibility",label:"공개 범위",render:row=>row.visibility.all?"전사 공개":row.visibility.targets.length?`선택 공개 ${row.visibility.targets.length}곳`:"비공개"},
    {id:"status",label:"상태",render:row=><span className={row.status==="active"?"tw:text-(--kpc-success)":"tw:text-(--kpc-muted)"}>{row.status==="active"?"활성":"비활성"}</span>},
    {id:"revision",label:"내용 버전",render:row=><AssetVersionBadge currentRevision={row.currentRevision}/>},
    {id:"updatedAt",label:"수정일",sortable:true,render:row=>new Date(row.updatedAt).toLocaleDateString("ko-KR",{timeZone:"Asia/Seoul"})},
    {id:"actions",label:"작업",render:row=><div className="tw:flex tw:flex-wrap tw:gap-1">
      {props.onApply&&row.capabilities.apply&&access?.grants.skills.read&&access.grants.templates.read&&<Button size="small" onClick={()=>props.onApply?.(row)}>적용 테스트</Button>}
      {row.capabilities.update&&grant.update&&<Button size="small" onClick={()=>props.onToggle(row)}>{row.status==="active"?"비활성화":"활성화"}</Button>}
      {row.capabilities.duplicate&&grant.create&&<Button size="small" onClick={()=>props.onDuplicate(row)}>복제</Button>}
      {row.capabilities.delete&&grant.delete&&<Button size="small" onClick={()=>props.onDelete(row)}>삭제</Button>}
    </div>},
  ];
  return <AdminCard title={`${props.kind==="skill"?"Skill":"Template"} 목록`} actions={props.canCreate&&grant.create?<Button appearance="primary" onClick={props.onCreate}>+ {props.kind==="skill"?"Skill":"Template"} 등록</Button>:undefined}>
    <div className="tw:mb-4 tw:flex tw:flex-wrap tw:items-end tw:gap-3">
      <Field label="검색"><Input value={props.query.search} placeholder="이름·약칭·설명 검색" onChange={(_,data)=>change({search:data.value})}/></Field>
      <Field label="공개 범위"><Select value={props.query.visibility} onChange={(_,data)=>change({visibility:AssetQuerySchema.shape.visibility.parse(data.value)})}><option value="all">전체</option><option value="organization">전사 공개</option><option value="department">부서 공개</option><option value="group">그룹 공개</option><option value="user">사용자 공개</option></Select></Field>
      <Field label="상태"><Select value={props.query.status} onChange={(_,data)=>change({status:AssetQuerySchema.shape.status.parse(data.value)})}><option value="all">전체</option><option value="active">활성</option><option value="inactive">비활성</option></Select></Field>
      <Field label="표시 개수"><Select value={props.query.pageSize} onChange={(_,data)=>change({pageSize:AssetQuerySchema.shape.pageSize.parse(Number(data.value))})}>{[10,20,50].map(n=><option key={n} value={n}>{n}개</option>)}</Select></Field>
      <span className="tw:pb-2 tw:text-(--kpc-muted)">활성 {props.list.activeCount} · 비활성 {props.list.inactiveCount}</span>
    </div>
    {props.error?<AdminAsyncState state="error" message={props.error}/>:props.loading?<AdminAsyncState state="loading"/>:<>
      <AdminTable label="자산 목록" rows={props.list.rows.items.filter(row=>row.capabilities.read)} columns={columns} emptyMessage="등록된 자산이 없거나 검색 조건에 맞는 결과가 없습니다." sort={{columnId:props.query.sort,direction:props.query.direction}} onSort={id=>change({sort:id==="name"?"name":"updatedAt",direction:props.query.sort===id&&props.query.direction==="desc"?"asc":"desc"})}/>
      <AdminPager page={props.list.rows.page} total={props.list.rows.total} pageSize={props.list.rows.pageSize} onChange={page=>props.onQueryChange({...props.query,page})}/>
    </>}
  </AdminCard>;
}
