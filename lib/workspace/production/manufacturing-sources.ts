import { MFG_DEMO_PROJECT_ID, MFG_DEMO_FILES, MFG_DEMO_SECTIONS, manufacturingSlideSeed } from "@/config/production-mfg-demo";
import type { ProjectView, ProposalSlide } from "@/types/workspace-production";

export interface ManufacturingDemoSource {
  id: string; kind: "rfp" | "file"; targetId: string; title: string;
  page: number; location: string; quote: string; boxIndex: number | null;
}
const locations = ["2장 1절", "표 3-2", "3장 4절 본문", "부록 A", "1장 개요", "그림 2-1 설명", "4장 2절", "표 5-1"];
export function selectManufacturingSources(view: ProjectView, slide: ProposalSlide): ManufacturingDemoSource[] {
  if (view.project.id !== MFG_DEMO_PROJECT_ID || !slide.demoSourceKey) return [];
  const seed = manufacturingSlideSeed(slide.demoSourceKey);
  if (!seed) return [];
  const si = Math.max(0, MFG_DEMO_SECTIONS.findIndex(section => section.id === seed.sectionId));
  return [
    ...view.state.body.requirements.filter(r => r.sectionId === slide.sectionId && r.page !== null).map(r => ({
      id: `rfp:${r.id}`, kind: "rfp" as const, targetId: r.id, title: r.title, page: r.page!, location: `${r.id} · ${r.title}`,
      quote: r.excerpt ?? "", boxIndex: null,
    })),
    ...seed.items.map(([heading, text], i) => {
      const file = MFG_DEMO_FILES[(si + i) % MFG_DEMO_FILES.length];
      return { id: `file:${slide.id}:${i}`, kind: "file" as const, targetId: file.id, title: file.name,
        page: 3 + ((si * 7 + i * 5) % 38), location: locations[(si + i * 3) % locations.length], boxIndex: i,
        quote: `… ${heading} · ${text} — 관련 기준과 사례를 정리하면, 공공 부문 적용 시 단계별 검증과 운영 체계가 함께 마련되어야 한다 …`,
      };
    }),
  ];
}
