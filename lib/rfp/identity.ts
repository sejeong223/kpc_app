import type { Session } from "next-auth";

import { resolveCommentIdentity } from "@/lib/comments/domain";

export interface RfpIdentity { namespace: string; actor: { id: string; name: string; isMock: boolean } }

// 사용자 판별 규칙(oid → upn → email, 인증 비활성 시 목업 사용자)은 코멘트와 같아야 하므로 복제하지 않고 위임한다.
export function resolveRfpIdentity(input: { authEnabled: boolean; session: Session | null; displayName: string }): RfpIdentity | null {
  const identity = resolveCommentIdentity(input);
  return identity ? { namespace: identity.scope.namespace, actor: { ...identity.actor } } : null;
}
