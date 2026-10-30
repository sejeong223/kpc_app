import { ADMIN_RESOURCE_LABELS } from "@/config/admin-permissions";
import type { AuditAction, AuditResource, RfpStatus, UsageFeature } from "@/types/admin";
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = { apply: "서식 적용", create: "생성", read: "조회", update: "수정", delete: "삭제", approve: "승인", reject: "반려", export: "내보내기", generate: "AI 생성", restore: "복구" };
export const AUDIT_RESOURCE_LABELS: Record<AuditResource, string> = { ...ADMIN_RESOURCE_LABELS, rfp: "RFP", document: "제안 문서", usage: "AI 사용량" };
export const FEATURE_LABELS: Record<UsageFeature, string> = { rfp: "RFP 분석", draft: "초안 생성", polish: "문장 다듬기", slides: "슬라이드 생성", review: "검수·누락 점검" };
export const RFP_STATUS_LABELS: Record<RfpStatus, string> = { review: "검토 중", writing: "작성 중", submitted: "제출·결과 대기", won: "수주", lost: "수주 실패", dropped: "진행 안함" };
