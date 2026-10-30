import { ADMIN_RESOURCE_LABELS } from "@/config/admin-permissions";
import type { AuditAction, AuditResource, RfpStatus, UsageFeature } from "@/types/admin";
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = { apply: "서식 적용", create: "생성", read: "조회", update: "수정", delete: "삭제", approve: "승인", reject: "반려", export: "내보내기", generate: "AI 생성", restore: "복구" };
export const AUDIT_RESOURCE_LABELS: Record<AuditResource, string> = { ...ADMIN_RESOURCE_LABELS, rfp: "RFP", document: "제안 문서", usage: "AI 사용량" };
export const FEATURE_LABELS: Record<UsageFeature, string> = { rfp: "RFP 분석", draft: "초안 생성", polish: "문장 다듬기", slides: "슬라이드 생성", review: "검수·누락 점검" };
export const AUDIT_COMMAND_OPERATIONS: readonly { detail:string;resource:AuditResource;action:AuditAction;label:string }[] = [
  {detail:"create-user",resource:"users",action:"create",label:"사용자 등록"},
  {detail:"add-directory-users",resource:"users",action:"create",label:"조직도 사용자 등록"},
  {detail:"update-user",resource:"users",action:"update",label:"사용자 정보 수정"},
  {detail:"change-user-role",resource:"users",action:"update",label:"사용자 역할 변경"},
  {detail:"set-user-status",resource:"users",action:"update",label:"사용자 상태 변경"},
  {detail:"delete-users",resource:"users",action:"delete",label:"사용자 삭제"},
  {detail:"resend-invite",resource:"users",action:"update",label:"사용자 재초대"},
  {detail:"create-group",resource:"groups",action:"create",label:"그룹 생성"},
  {detail:"update-group",resource:"groups",action:"update",label:"그룹 수정"},
  {detail:"delete-group",resource:"groups",action:"delete",label:"그룹 삭제"},
  {detail:"undo-delete",resource:"users",action:"restore",label:"사용자 복구"},
  {detail:"undo-delete",resource:"groups",action:"restore",label:"그룹 복구"},
  {detail:"save-grants",resource:"permissions",action:"update",label:"역할별 권한 변경"},
  {detail:"save-model-defaults",resource:"modelSettings",action:"update",label:"기본 모델 변경"},
  {detail:"save-price",resource:"pricing",action:"update",label:"모델 단가 변경"},
  {detail:"save-fx",resource:"pricing",action:"update",label:"환율 변경"},
  {detail:"save-token-policy",resource:"tokenPolicies",action:"update",label:"전사 토큰 정책 변경"},
  {detail:"set-token-limit",resource:"tokenPolicies",action:"update",label:"개인 토큰 한도 변경"},
  {detail:"set-token-paused",resource:"tokenPolicies",action:"update",label:"토큰 사용 상태 변경"},
  {detail:"submit-token-request",resource:"tokenRequests",action:"create",label:"토큰 추가 신청"},
  {detail:"process-token-request",resource:"tokenRequests",action:"approve",label:"토큰 신청 승인"},
  {detail:"process-token-request",resource:"tokenRequests",action:"reject",label:"토큰 신청 반려"},
  {detail:"create-skill",resource:"skills",action:"create",label:"Skill 등록"},
  {detail:"update-skill",resource:"skills",action:"update",label:"Skill 수정"},
  {detail:"create-template",resource:"templates",action:"create",label:"Template 등록"},
  {detail:"update-template",resource:"templates",action:"update",label:"Template 수정"},
];
export const RFP_STATUS_LABELS: Record<RfpStatus, string> = { review: "검토 중", writing: "작성 중", submitted: "제출·결과 대기", won: "수주", lost: "수주 실패", dropped: "진행 안함" };
