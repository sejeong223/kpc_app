import type { SkillRules, PageRule, Align } from "@/lib/skills/schema";
export const OPT = {
  family: ['Pretendard', 'Noto Sans KR', '나눔스퀘어', '맑은 고딕', '본고딕'],
  weight: ['Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold'],
  title: [20,22,24,26,28,32,36,40], sub: [14,16,18,20,22,24], body: [10,11,12,13,14,16,18],
  lh: [1,1.2,1.3,1.4,1.5,1.6,1.8], gap: [.2,.3,.4,.5,.6,.8,1,1.2,1.5], para: [0,2,4,6,8,10,12],
  pad: [.05,.1,.15,.2,.25,.3,.4], rowH: [.5,.6,.7,.8,.9,1,1.2],
  align: ['왼쪽','가운데','오른쪽'], head: ['가운데 · 굵게','왼쪽 · 굵게','가운데 · 배경색','왼쪽 · 배경색'],
  snap: ['안내선 · 그리드에 맞춤','안내선에만 맞춤','자유 배치'],
  img: ['원본 비율 유지','영역 채우기 (잘라내기)','영역에 맞춤 (여백 허용)'],
  salign: ['위쪽 맞춤','가운데 맞춤','아래쪽 맞춤'], min: [2,3,4,6],
  mg: [.5,.8,1,1.2,1.5,1.8,2,2.5], cols: [6,8,12,16], rows: [2,3,4,6], grid: [.1,.2,.25,.5,1], tableRows: [8,10,12,15,20],
} as const;
export const PAGE_TYPES = ['cover','toc','div','body','table','appx'] as const;
export const PAGE_LABEL = { cover:'표지', toc:'목차', div:'간지', body:'본문', table:'표 중심', appx:'부록' } as const;
export const RULES = {
  cover: ['사업명 2줄까지 자동 줄바꿈','로고 우상단 고정','본문 규칙 미적용'],
  toc: ['장 번호 Ⅰ·Ⅱ·Ⅲ','장 번호 01·02·03','페이지 번호 오른쪽 정렬'],
  div: ['장 번호 크게 + 한 줄 메시지','장 제목만'],
  body: ['리딩 메시지 + 2~3블록','리딩 메시지 + 자유 배치'],
  table: ['머리글 반복 · 행 단위 분할','열 너비 내용에 맞춤'],
  appx: ['작은 글자 허용 (최소 9pt)','출처 표기 필수'],
} as const;

export { OPT as SKILL_OPTIONS, PAGE_LABEL as PAGE_LABELS, RULES as PAGE_RULES };
const page = (rule:string, title:number|null=null, body:number|null=null, lh:number|null=null, align:Align='왼쪽'): PageRule => ({rule,title,body,lh,align});
export const DEFAULT_SKILL_RULES: SkillRules = {
  font:{family:'Pretendard',title:[28,'Bold'],sub:[18,'SemiBold'],body:[14,'Regular'],lh:1.4},
  gap:{tb:.8,bt:.5,para:6},table:{padV:.15,padH:.25,rowH:.8,text:'왼쪽',num:'오른쪽',head:'가운데 · 굵게'},
  shape:{snap:'안내선 · 그리드에 맞춤',img:'원본 비율 유지',align:'위쪽 맞춤',min:4},mg:[1.2,1.5,1,1.5],cols:12,rows:3,grid:.25,
  guard:{shrink:true,split:true,overlap:true,inGuide:true,tableRows:15},
  pt:{cover:page(RULES.cover[0],40,null,null,'가운데'),toc:page(RULES.toc[0],null,16,1.6),div:page(RULES.div[0],36),body:page(RULES.body[0]),table:page(RULES.table[0],null,11,1.2),appx:page(RULES.appx[0],null,10,1.3)},
};
