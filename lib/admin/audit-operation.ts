import { AUDIT_ACTION_LABELS,AUDIT_RESOURCE_LABELS,AUDIT_COMMAND_OPERATIONS,FEATURE_LABELS } from "@/config/admin-labels";
import { UsageFeatureSchema } from "@/lib/admin/schemas";
import type { AdminAuditEvent,NamedCount } from "@/types/admin";

export interface AuditOperation {id:string;label:string}
export type AuditOperationSource=Pick<AdminAuditEvent,"action"|"resource"|"detail">;
export function getAuditOperation(event:AuditOperationSource):AuditOperation {
  const {resource,action,detail}=event;
  const result=(operation:string,label:string):AuditOperation=>({id:`${resource}:${action}:${operation}`,label});
  if(resource==="usage"&&action==="generate"){
    const feature=UsageFeatureSchema.safeParse(detail);if(feature.success)return result(feature.data,FEATURE_LABELS[feature.data]);
  }
  if(resource==="templates"&&action==="apply")return result("apply-template","PPT 서식 적용");
  if(resource==="templates"&&action==="export")return result("export-pptx","PPTX 다운로드");
  if(resource==="audit"&&action==="export")return result("export-audit","활동 로그 CSV 내보내기");
  if(resource==="users"&&action==="export")return result("export-users","사용자 목록 CSV 내보내기");
  const command=AUDIT_COMMAND_OPERATIONS.find(item=>item.detail===detail&&item.resource===resource&&item.action===action);
  if(command)return result(detail,command.label);
  if(resource==="skills"||resource==="templates"){
    const asset=resource==="skills"?"Skill":"Template";
    if(action==="create"&&detail.startsWith("duplicate-asset:"))return result("duplicate-asset",asset+" 복제");
    if(action==="delete"&&detail==="delete-asset")return result(detail,asset+" 삭제");
    if(action==="update"&&detail==="set-asset-visibility")return result(detail,asset+" 공개 범위 변경");
    if(action==="update"&&detail==="set-asset-status")return result(detail,asset+" 상태 변경");
  }
  return result("other",`${AUDIT_RESOURCE_LABELS[resource]} ${AUDIT_ACTION_LABELS[action]}`);
}
export function countAuditOperations(events:readonly AdminAuditEvent[]):NamedCount[]{
  const counts=new Map<string,NamedCount>();
  for(const event of events){
    const operation=getAuditOperation(event),item=counts.get(operation.id)??{...operation,count:0,failures:0};
    item.count++;if(event.outcome==="failure")item.failures++;counts.set(operation.id,item);
  }
  return [...counts.values()].sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id));
}
