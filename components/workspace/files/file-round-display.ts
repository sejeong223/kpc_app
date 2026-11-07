import type { FileResourceView, FileRoundView } from "@/types/workspace-files";

/** 목록에서만 등록 회차를 구분한다. 실제 참조 자료와 완성본은 필터링하지 않는다. */
export function getDisplayedFileResources(round: FileRoundView, snapshotId: string | null): FileResourceView[] {
  return snapshotId !== null
    ? [...round.resources]
    : round.resources.filter(resource => resource.version.createdInRound === round.number);
}
