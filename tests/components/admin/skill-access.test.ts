import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect,it,vi } from "vitest";
import { DEFAULT_SKILL_RULES } from "@/config/skill-options";
import { assetHarness,createSkill } from "../../services/admin/asset-fixture";
const mocks=vi.hoisted(()=>({runtime:vi.fn()}));
vi.mock("@/components/admin/AdminRuntimeProvider",()=>({useAdminRuntime:mocks.runtime}));
import AssetListPanel,{defaultAssetQuery} from "@/components/admin/assets/AssetListPanel";
import SkillRuleFields from "@/components/admin/skills/SkillRuleFields";
import type { AssetList } from "@/types/admin-assets";
it("다른 부서 공개 자산은 조회·복제만 렌더링하고 소유 부서 작업을 숨긴다",async()=>{
  const h=assetHarness(),receipt=await createSkill(h.service,h.departmentActor),detail=await h.service.getAsset(h.otherActor,receipt.assetId),access=await h.service.getAccess(h.otherActor);
  mocks.runtime.mockReturnValue({access});
  const list:AssetList={rows:{items:[detail.asset],page:1,pageSize:20,total:1,totalPages:1},activeCount:1,inactiveCount:0};
  const props={kind:"skill" as const,query:defaultAssetQuery("skill"),list,loading:false,error:null,canCreate:true,onQueryChange:vi.fn(),onOpen:vi.fn(),onCreate:vi.fn(),onDuplicate:vi.fn(),onToggle:vi.fn(),onDelete:vi.fn()};
  const html=renderToStaticMarkup(createElement(AssetListPanel,props));expect(html).toContain("검증 서식");expect(html).toContain(">복제<");expect(html).not.toContain(">삭제<");expect(html).not.toContain(">비활성화<");
  mocks.runtime.mockReturnValue({access:{...access,grants:{...access.grants,skills:{read:true,create:false,update:false,delete:false}}}});
  const readonly=renderToStaticMarkup(createElement(AssetListPanel,props));expect(readonly).not.toContain(">복제<");expect(readonly).not.toContain("+ Skill 등록");
  mocks.runtime.mockReturnValue({access:null});const denied=renderToStaticMarkup(createElement(AssetListPanel,props));expect(denied).not.toContain("검증 서식");expect(denied).toContain("권한이 없습니다");
});
it("2~8 영역을 허용값으로 제공하고 미지원 규칙 안내를 표시한다",()=>{
  const html=renderToStaticMarkup(createElement(SkillRuleFields,{value:DEFAULT_SKILL_RULES,disabled:false,fieldErrors:{},onChange:vi.fn()}));
  for(const title of ["2. 글꼴","3. 요소","4. 표","5. 도형","6. 여백","7. 보호","8. 페이지"])expect(html).toContain(title);
  expect(html).toContain("공통 규칙");expect(html).toContain("자동 분할은 수행하지 않습니다");
});
