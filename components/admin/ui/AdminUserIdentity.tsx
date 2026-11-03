import { Avatar } from "@fluentui/react-components";
import type { AdminUser } from "@/types/admin";

interface AdminUserIdentityProps extends Pick<AdminUser, "name"> {
  email: AdminUser["email"] | null;
  departmentName?: string;
}

export default function AdminUserIdentity({ name, email, departmentName }: AdminUserIdentityProps): React.ReactElement {
  return <div className="tw:flex tw:items-center tw:gap-(--layout-control-gap)">
    <Avatar name={name} initials={name.trim().slice(0, 1)} size={28} color="neutral" aria-hidden="true" />
    <div className="tw:min-w-24 tw:max-w-48">
      <div className="tw:flex tw:flex-wrap tw:items-baseline tw:gap-x-(--layout-control-gap)">
        <strong title={name} className="tw:block tw:truncate">{name}</strong>
        {departmentName && <span title={departmentName} className="tw:truncate tw:text-[11px] tw:text-(--kpc-muted)">{departmentName}</span>}
      </div>
      <div title={email ?? undefined} className="tw:truncate tw:text-[11px] tw:text-(--kpc-muted)">{email ?? "이메일 정보 없음"}</div>
    </div>
  </div>;
}
