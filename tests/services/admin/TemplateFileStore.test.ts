import { expect, it } from "vitest";
import { TemplateFileStore } from "@/services/admin/TemplateFileStore";
import { fixtureFile, setupXmlDom } from "../../lib/pptx/fixture";

setupXmlDom();
it("250 MiB 메타데이터 경계에서 초과 파일을 바이트 읽기 전에 차단한다", async () => {
  const store = new TemplateFileStore();
  const boundary = await fixtureFile();
  // 실제 대용량 처리 성능 검사가 아닌 입력 크기 상한 검사다.
  Object.defineProperty(boundary, "size", { value: 250 * 1024 * 1024 });
  expect((await store.importFile("u-a", boundary)).byteLength).toBe(50079);
  const above = await fixtureFile();
  Object.defineProperty(above, "size", { value: 250 * 1024 * 1024 + 1 });
  Object.defineProperty(above, "arrayBuffer", { value: () => { throw new Error("바이트를 읽으면 안 됩니다."); } });
  await expect(store.importFile("u-a", above)).rejects.toMatchObject({ code: "LIMIT" });
  store.dispose();
});
it("본인 임시 업로드와 공유 보유 참조의 수명을 구분한다", async () => {
  const store = new TemplateFileStore(), source = await store.importFile("u-a", await fixtureFile());
  expect(source.sha256).toBe("d3b09a2900b346a549fd75b4a4cb398efc0e081b57701855e80879c45378a6c7");
  expect(() => store.discardStaged("u-b", source.id)).toThrow("다른 사용자");
  store.retain(source.id, "revision:1"); store.retain(source.id, "work:1");
  store.discardStaged("u-a", source.id);
  store.release(source.id, "revision:1");
  expect(store.getSource(source.id).document.slides).toHaveLength(4);
  store.release(source.id, "work:1");
  expect(() => store.getSource(source.id)).toThrow("파일을 찾을 수 없습니다");
});
it("취소·확장자 오류와 종료된 저장소를 거절한다", async () => {
  const store = new TemplateFileStore(), controller = new AbortController(); controller.abort();
  await expect(store.importFile("u-a", await fixtureFile(), controller.signal)).rejects.toMatchObject({ code: "CANCELLED" });
  await expect(store.importFile("u-a", new File(["test"], "bad.ppt"))).rejects.toMatchObject({ code: "UNSUPPORTED" });
  const source = await store.importFile("u-a", await fixtureFile()); store.discardStaged("u-a", source.id);
  expect(() => store.getSource(source.id)).toThrow();
  store.dispose();
  await expect(store.importFile("u-a", await fixtureFile())).rejects.toMatchObject({ code: "CANCELLED" });
});
