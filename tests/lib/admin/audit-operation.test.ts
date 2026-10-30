import { expect,it } from "vitest";
import { getAuditOperation,countAuditOperations,type AuditOperationSource } from "@/lib/admin/audit-operation";
import { createAdminSeed } from "@/config/admin-seed";

const cases:readonly (AuditOperationSource&{label:string})[]=[
  {resource:"groups",action:"create",detail:"create-group",label:"그룹 생성"},
  {resource:"groups",action:"update",detail:"update-group",label:"그룹 수정"},
  {resource:"tokenRequests",action:"approve",detail:"process-token-request",label:"토큰 신청 승인"},
  {resource:"tokenRequests",action:"reject",detail:"process-token-request",label:"토큰 신청 반려"},
  {resource:"skills",action:"create",detail:"duplicate-asset:a",label:"Skill 복제"},
  {resource:"templates",action:"create",detail:"duplicate-asset:b",label:"Template 복제"},
  {resource:"skills",action:"update",detail:"set-asset-visibility",label:"Skill 공개 범위 변경"},
  {resource:"templates",action:"delete",detail:"delete-asset",label:"Template 삭제"},
  {resource:"users",action:"restore",detail:"undo-delete",label:"사용자 복구"},
  {resource:"groups",action:"restore",detail:"undo-delete",label:"그룹 복구"},
  {resource:"templates",action:"apply",detail:'{"template":"v1"}',label:"PPT 서식 적용"},
  {resource:"templates",action:"export",detail:'{"template":"v2"}',label:"PPTX 다운로드"},
  {resource:"audit",action:"export",detail:'필터 {broken',label:"활동 로그 CSV 내보내기"},
  {resource:"users",action:"export",detail:"anything",label:"사용자 목록 CSV 내보내기"},
];
it.each(cases)("$resource/$action/$detail 작업 표시",({label,...source})=>{
  expect(getAuditOperation(source).label).toBe(label);
  expect(getAuditOperation(source).id).toMatch(new RegExp(`^${source.resource}:${source.action}:`));
});
it.each([['rfp','RFP 분석'],['draft','초안 생성'],['polish','문장 다듬기'],['slides','슬라이드 생성'],['review','검수·누락 점검']])("사용량 기능 %s",(detail,label)=>{
  expect(getAuditOperation({resource:"usage",action:"generate",detail})).toEqual({id:`usage:generate:${detail}`,label});
});
it.each(["{broken",'={"version":"v2"}',"create-group","rfp","\u0000internal"])("알 수 없거나 리소스가 다른 %s는 원문을 노출하지 않는다",detail=>{
  expect(getAuditOperation({resource:"templates",action:"update",detail})).toEqual({id:"templates:update:other",label:"Template 수정"});
});
it("refs·필터 차이와 실패를 안정된 작업으로 합치고 원본을 변경하지 않는다",()=>{
  const seed=createAdminSeed(),base=seed.audits[0];
  const events=[{...base,resource:"templates" as const,action:"apply" as const,detail:'{"revision":"v1"}',outcome:"success" as const},{...base,resource:"templates" as const,action:"apply" as const,detail:'{"revision":"v2"}',outcome:"failure" as const},...['{"from":"a"}','{"from":"b"}'].map(detail=>({...base,resource:"audit" as const,action:"export" as const,detail,outcome:"success" as const}))];
  const original=structuredClone(events);
  expect(countAuditOperations(events)).toEqual([{id:"audit:export:export-audit",label:"활동 로그 CSV 내보내기",count:2,failures:0},{id:"templates:apply:apply-template",label:"PPT 서식 적용",count:2,failures:1}]);
  expect(events).toEqual(original);
});
