import { expect,it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createDisposalLease } from "@/lib/admin/runtime-lifetime";
import { setupXmlDom } from "../../pptx/fixture";
import { workHarness } from "../../../services/admin/work-fixture";
setupXmlDom();
it("StrictMode 재연결은 업로드와 작업을 유지하고 실제 해제는 모두 정리한다",async()=>{
  const h=await workHarness(),client=new QueryClient();client.setQueryData(["identity"],"현재 사용자");
  const lease=createDisposalLease(()=>{h.works.dispose();h.files.dispose();client.clear();});
  const strictCleanup=lease();strictCleanup();const finalCleanup=lease();await Promise.resolve();
  expect(h.files.getSource(h.source.id).document.slides).toHaveLength(4);expect((await h.works.getWorks(h.otherActor))).toHaveLength(1);
  expect(client.getQueryData(["identity"])).toBe("현재 사용자");
  finalCleanup();await Promise.resolve();expect(h.works.canAccess(h.otherActor,h.view.work.id)).toBe(false);expect(()=>h.files.getSource(h.source.id)).toThrow();expect(client.getQueryData(["identity"])).toBeUndefined();
});
it("역할 변경은 저장소를 유지하지만 이전 역할의 작업 접근을 가린다",async()=>{
  const h=await workHarness();h.works.setActor({...h.otherActor,role:"user"});expect(h.works.canAccess(h.otherActor,h.view.work.id)).toBe(false);
  h.works.setActor(h.otherActor);expect((await h.works.getWorks(h.otherActor))[0].id).toBe(h.view.work.id);h.works.dispose();h.files.dispose();
});
