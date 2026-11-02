import type { AssetAudienceOptions, AssetVisibility } from "@/types/admin-assets";
export default function PromptVisibilitySummary({ value, audience }: { value: AssetVisibility; audience?: AssetAudienceOptions }): React.ReactElement {
  const names = value.targets.map(target => {
    const items = target.type === "department" ? audience?.departments : target.type === "group" ? audience?.groups : audience?.users;
    return items?.find(item => item.id === target.id)?.name ?? ({ department: "부서", group: "그룹", user: "사용자" }[target.type]);
  });
  return <span title={names.join(", ")} className="tw:text-[11px] tw:text-(--kpc-secondary)">{value.all ? "전사 공통" : names.length ? names.join(" · ") : "비공개"}</span>;
}
