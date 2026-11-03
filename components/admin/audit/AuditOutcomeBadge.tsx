import { Badge } from "@fluentui/react-components";
import { CheckmarkCircleRegular, DismissCircleRegular } from "@fluentui/react-icons";
import type { AdminAuditEvent } from "@/types/admin";

export default function AuditOutcomeBadge({ outcome }: Pick<AdminAuditEvent, "outcome">): React.ReactElement {
  const success = outcome === "success";
  return <Badge appearance="tint" shape="rounded" color={success ? "success" : "danger"}
    icon={success ? <CheckmarkCircleRegular aria-hidden="true" /> : <DismissCircleRegular aria-hidden="true" />}>
    {success ? "성공" : "실패"}
  </Badge>;
}
