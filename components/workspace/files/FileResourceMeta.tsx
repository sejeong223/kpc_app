import { REFERENCE_KINDS, WEB_PERIODS } from "@/config/workspace-files";
import type { FileResourceView } from "@/types/workspace-files";
export interface FileResourceMetaProps {
    resource: FileResourceView;
}
export function formatFileResourceMeta(resource: FileResourceView): string {
    const { asset, version } = resource, source = version.source;
    const sourceText = source.type === "web" ? `${new URL(source.url).hostname} · ${WEB_PERIODS.find(p => p.value === source.period)?.label}` : `${(source.byteLength / 1024).toLocaleString("ko-KR", { maximumFractionDigits: 1 })} KB`;
    return `${REFERENCE_KINDS.find(k => k.value === version.kind)?.label} · ${sourceText} · ${asset.ownerName} · ${new Date(version.createdAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}`;
}
export default function FileResourceMeta({ resource }: FileResourceMetaProps) { return <p className="tw:my-1 tw:break-words tw:text-xs tw:text-(--kpc-secondary)">{formatFileResourceMeta(resource)}</p>; }
