import type { ProposalSectionTask } from "@/types/proposals";

export const SAMPLE_MY_TASKS: ProposalSectionTask[] = [
  {
    id: 'task-1',
    project: '공공기관 생성형 AI 업무혁신 플랫폼 구축',
    section: '3.1 AI 플랫폼 구축 방안',
    role: '작성자',
    status: '작성 중',
    deadline: '2026.09.22',
    progress: 65
  },
  {
    id: 'task-2',
    project: '공공기관 생성형 AI 업무혁신 플랫폼 구축',
    section: '1. 제안 개요 (전체 총괄)',
    role: '작성자',
    status: '작성 대기',
    deadline: '2026.09.15',
    progress: 100
  },
  {
    id: 'task-3',
    project: '공공기관 생성형 AI 업무혁신 플랫폼 구축',
    section: '2. 사업 이해 및 추진 전략',
    role: '작성자',
    status: '검토 요청',
    deadline: '2026.09.20',
    progress: 90
  },
  {
    id: 'task-4',
    project: '공공기관 AI 기반 교육서비스 혁신 컨설팅',
    section: '3.2 AI 튜터 아키텍처 설계',
    role: '검토자',
    status: '검토 중',
    deadline: '2026.09.18',
    progress: 80
  },
  {
    id: 'task-5',
    project: '공공 DX 및 생성형 AI 도입 전략 ISP 수립',
    section: '4.1 마스터플랜 수립 방안',
    role: '작성자',
    status: '작성 대기',
    deadline: '2026.10.02',
    progress: 20
  }
];



export const SAMPLE_TASKS = SAMPLE_MY_TASKS.map((t, idx) => ({
  ...t,
  sectionNumber: `${idx + 1}.1`,
  sectionTitle: t.section,
  targetPages: 8,
  targetWords: 3000,
  currentWords: 2100,
  assignee: '정소담',
  reviewer: '김민수'
}));
