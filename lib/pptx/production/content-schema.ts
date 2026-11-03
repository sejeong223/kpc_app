import { z } from "zod";
import { ProposalSlideSchema } from "@/lib/workspace/production/schemas";
import {
  SkillAssetRevisionSchema,
  TemplateAssetRevisionSchema,
} from "@/lib/admin/assets/schemas";
import { WORKSPACE_LIMITS as L } from "@/config/workspace-production";
import { workspaceAssert as check } from "@/lib/workspace/production/errors";
export const RenderInputSchema = z.strictObject({
  slide: ProposalSlideSchema,
  templateFilename: z.string().min(1).max(255),
  templateRevision: TemplateAssetRevisionSchema,
  skill: SkillAssetRevisionSchema.nullable(),
});
export function inspectProductionImage(
  bytes: Uint8Array,
  mime: "image/png" | "image/jpeg",
): { width: number; height: number } {
  check(
    bytes instanceof Uint8Array &&
      bytes.length > 0 &&
      bytes.length <= L.imageBytes,
    "LIMIT",
    "이미지는 10 MiB 이하여야 합니다.",
  );
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0,
    height = 0;
  if (mime === "image/png") {
    check(
      bytes.length >= 33 &&
        [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v) &&
        view.getUint32(8) === 13 &&
        new TextDecoder().decode(bytes.slice(12, 16)) === "IHDR",
      "VALIDATION",
      "PNG 원본 형식이 다릅니다.",
    );
    width = view.getUint32(16);
    height = view.getUint32(20);
  } else {
    check(
      bytes.length > 4 &&
        bytes[0] === 255 &&
        bytes[1] === 216 &&
        bytes.at(-2) === 255 &&
        bytes.at(-1) === 217,
      "VALIDATION",
      "JPEG 원본 형식이 다릅니다.",
    );
    let at = 2;
    while (at + 4 <= bytes.length) {
      check(bytes[at] === 255, "VALIDATION", "JPEG 구조를 확인할 수 없습니다.");
      while (bytes[at] === 255) at++;
      const marker = bytes[at++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      check(
        at + 2 <= bytes.length,
        "VALIDATION",
        "JPEG 구조가 손상되었습니다.",
      );
      const length = view.getUint16(at);
      check(
        length >= 2 && at + length <= bytes.length,
        "VALIDATION",
        "JPEG 구성 범위가 잘못되었습니다.",
      );
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      ) {
        check(length >= 8, "VALIDATION", "JPEG 크기를 읽을 수 없습니다.");
        height = view.getUint16(at + 3);
        width = view.getUint16(at + 5);
        break;
      }
      at += length;
    }
  }
  check(
    width > 0 &&
      height > 0 &&
      width <= L.imageDimension &&
      height <= L.imageDimension &&
      width * height <= L.imagePixels,
    "LIMIT",
    "이미지는 가로·세로 8192px, 3200만 화소 이하여야 합니다.",
  );
  return { width, height };
}
