import type {
  AssetPin,
  ProjectWorkspaceState,
  ProposalSlide,
} from "@/types/workspace-production";
import { workspaceAssert as check } from "./errors";
export function slidePinIds(slides: readonly ProposalSlide[]): string[] {
  return [
    ...new Set(
      slides
        .flatMap((s) => [
          s.template?.pinId,
          s.usedSettings.skillPinId,
          s.usedSettings.promptPinId,
        ])
        .filter((id): id is string => !!id),
    ),
  ];
}
export function pinsForSlides(
  state: ProjectWorkspaceState,
  slides: readonly ProposalSlide[],
): AssetPin[] {
  return slidePinIds(slides).map((id) => {
    const pin = state.pins.find((p) => p.id === id);
    check(!!pin, "ASSET_UNAVAILABLE", "사용 중인 자산 사본이 없습니다.");
    return pin;
  });
}
export function cloneClipboardSlide(
  source: ProposalSlide,
  sectionId: string,
  newId: () => string,
  pinMap: ReadonlyMap<string, string>,
  imageMap: ReadonlyMap<string, string>,
): ProposalSlide {
  const slide = structuredClone(source),
    blocks = new Map<string, string>();
  slide.id = newId();
  slide.sectionId = sectionId;
  slide.revision = 1;
  slide.state = "writing";
  for (const block of slide.content.blocks) {
    const old = block.id;
    block.id = newId();
    blocks.set(old, block.id);
    if (block.kind === "image")
      block.blobId = imageMap.get(block.blobId) ?? block.blobId;
  }
  if (slide.template) {
    slide.template.pinId =
      pinMap.get(slide.template.pinId) ?? slide.template.pinId;
    slide.template.bindings = slide.template.bindings.map((b) => ({
      ...b,
      key: blocks.get(b.key) ?? b.key,
    }));
  }
  for (const key of ["skillPinId", "promptPinId"] as const) {
    const id = slide.usedSettings[key];
    if (id) slide.usedSettings[key] = pinMap.get(id) ?? id;
  }
  return slide;
}
