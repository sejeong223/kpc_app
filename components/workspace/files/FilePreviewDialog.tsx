"use client";
import ModalFrame from "@/components/ui/ModalFrame";
import { DadamButton } from "@/components/ui/DadamControls";
import AdminAsyncState from "@/components/admin/ui/AdminAsyncState";
import { REFERENCE_KINDS, REFERENCE_PRIORITIES, WEB_PERIODS } from "@/config/workspace-files";
import { useFilePreview } from "@/hooks/workspace/use-file-preview";
import type { FileResourceView } from "@/types/workspace-files";

export interface FilePreviewDialogProps { projectId: string; resource: FileResourceView; round: number; open: boolean; onClose(): void }
function FileMetadata({ resource, round }: Pick<FilePreviewDialogProps, "resource" | "round">): React.ReactElement {
  const { version, asset } = resource;
  return <div className="tw:flex tw:flex-wrap tw:gap-(--layout-control-gap) tw:text-xs tw:text-(--kpc-secondary)">
    <span>{round}차</span><span>{REFERENCE_KINDS.find(item => item.value === version.kind)?.label}</span>
    <span>{REFERENCE_PRIORITIES.find(item => item.value === version.priority)?.label}</span><span>{asset.ownerName}</span>
    <span>{new Date(version.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</span>
    {version.source.type === "file" && <span>{version.source.byteLength.toLocaleString("ko-KR")} bytes</span>}
  </div>;
}
function FileOriginalPreview(props: FilePreviewDialogProps): React.ReactElement {
  const preview = useFilePreview(props.open ? { projectId: props.projectId, round: props.round, versionId: props.resource.version.id } : null);
  const content = preview.content;
  return <ModalFrame open={props.open} title={props.resource.version.label} width={960} contentKey={props.resource.version.id} onClose={props.onClose}
    footer={<><span className="tw:mr-auto" /><DadamButton disabled={!preview.file} onClick={preview.download}>원본 다운로드</DadamButton><DadamButton onClick={props.onClose}>닫기</DadamButton></>}>
    <FileMetadata {...props} />
    {preview.status === "loading" && <AdminAsyncState state="loading" message="원본을 불러오는 중입니다." />}
    {preview.error && <AdminAsyncState state="error" message={preview.error.message} onRetry={preview.retry} />}
    {content?.type === "pdf" && <><object type="application/pdf" data={content.url} aria-label={props.resource.version.label + " PDF 미리보기"} className="tw:h-[55vh] tw:min-h-64 tw:w-full">
      <p>PDF 미리보기를 지원하지 않는 브라우저입니다. 원본 다운로드로 확인해 주세요.</p>
    </object><p className="tw:text-xs tw:text-(--kpc-secondary)">PDF가 보이지 않으면 원본 다운로드를 이용해 주세요.</p></>}
    {content?.type === "text" && <>{content.truncated && <p role="status">처음 256KiB만 표시합니다. 전체 내용은 원본을 다운로드해 확인해 주세요.</p>}
      <pre className="tw:m-0 tw:min-w-0 tw:whitespace-pre-wrap tw:break-words tw:rounded-lg tw:bg-(--kpc-bg) tw:p-(--layout-card-inset) tw:font-sans tw:text-sm tw:[overflow-wrap:anywhere]">{content.text}</pre></>}
    {content?.type === "metadata" && <p>{content.reason}</p>}
    {props.resource.version.instruction && <section><h3 className="tw:text-sm">활용 지침</h3><p className="tw:whitespace-pre-wrap tw:break-words">{props.resource.version.instruction}</p></section>}
  </ModalFrame>;
}
export default function FilePreviewDialog(props: FilePreviewDialogProps): React.ReactElement {
  const source = props.resource.version.source;
  if (source.type === "file") return <FileOriginalPreview {...props} />;
  return <ModalFrame open={props.open} title="웹 자료" subtitle={props.resource.version.label} width={960} contentKey={props.resource.version.id} onClose={props.onClose}
    footer={<><span className="tw:mr-auto" /><DadamButton onClick={props.onClose}>닫기</DadamButton></>}>
    <FileMetadata {...props} />
    <a href={source.url} target="_blank" rel="noopener noreferrer" className="tw:break-words tw:text-(--dadam-accent-ink) tw:[overflow-wrap:anywhere]">{source.url} ↗</a>
    <p>참고 기간 · {WEB_PERIODS.find(item => item.value === source.period)?.label}</p>
    <section><h3 className="tw:text-sm">활용 지침</h3><p className="tw:whitespace-pre-wrap tw:break-words">{props.resource.version.instruction || "등록한 지침이 없습니다."}</p></section>
  </ModalFrame>;
}
