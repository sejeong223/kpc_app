import { expect,it } from "vitest";
import { QueryClient,QueryObserver } from "@tanstack/react-query";
import { adminQueryKey,retireAdminQueries } from "@/lib/admin/query-keys";
import { assetHarness,assetQuery } from "../../../services/admin/asset-fixture";
it("자산 범위와 작업 진행 revision을 캐시에서 분리한다",()=>{
  const {departmentActor:actor}=assetHarness(),client=new QueryClient();
  const key=adminQueryKey({actor,revision:1,kind:"assets",filter:assetQuery});client.setQueryData(key,"비공개 자산");
  for(const next of [adminQueryKey({actor,revision:2,kind:"assets",filter:assetQuery}),adminQueryKey({actor:{...actor,role:"user"},revision:1,kind:"assets",filter:assetQuery}),adminQueryKey({actor,revision:1,kind:"asset",filter:{assetId:"다른 자산"}})])expect(client.getQueryData(next)).toBeUndefined();
  const work=adminQueryKey({actor,revision:1,kind:"work",filter:{workId:"w1",workRevision:1}});client.setQueryData(work,{status:"running"});
  expect(client.getQueryData(adminQueryKey({actor,revision:1,kind:"work",filter:{workId:"w1",workRevision:2}}))).toBeUndefined();client.clear();
});
it("예전 자산 캐시를 정리하면서 현재 관찰 중인 새 쿼리는 유지한다",async()=>{
  const {departmentActor:actor}=assetHarness(),client=new QueryClient();const oldKey=adminQueryKey({actor,revision:1,kind:"asset",filter:{assetId:"a1"}}),newKey=adminQueryKey({actor,revision:2,kind:"asset",filter:{assetId:"a1"}});
  client.setQueryData(oldKey,"이전 공개 범위");const observer=new QueryObserver(client,{queryKey:newKey,queryFn:async()=>"새 공개 범위"});const stop=observer.subscribe(()=>{});
  await observer.refetch();await retireAdminQueries(client,actor,2);expect(client.getQueryData(oldKey)).toBeUndefined();expect(client.getQueryData(newKey)).toBe("새 공개 범위");stop();client.clear();
});
