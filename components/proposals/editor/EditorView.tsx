"use client";

import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { 
  FileText, 
  Sparkles, 
  MessageSquare, 
  CheckSquare, 
  Square,
  AlertCircle,
  Download, 
  Sliders, 
  Plus, 
  Trash2, 
  Edit2,
  Save, 
  Copy, 
  RotateCcw, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  Check, 
  X, 
  Printer,
  Shield, 
  ArrowRight,
  ArrowLeft,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Image as ImageIcon,
  Link as LinkIcon,
  Table as TableIcon,
  MoreVertical,
  Play,
  GripVertical,
  Clock,
  User,
  CheckCircle2,
  Target,
  LayoutGrid,
  FileDown,
  CornerDownRight,
} from 'lucide-react';
import type { ChecklistRequirement, EditorVersion, ProposalComment, ProposalProject, SectionReferenceConfig, UploadedProposalFile, UserRole } from '@/types/proposals';
import { INITIAL_KPC_CHECKLIST } from '@/data/proposals/authoring';
import { EnterpriseDataModal } from './EnterpriseDataModal';
import { SectionReferenceModal, ReferenceTabType } from './SectionReferenceModal';
import RfpAnalysisRequiredState from '@/components/proposals/authoring/RfpAnalysisRequiredState';

export type SectionStatusType = '시작 전' | '작성 중' | '검토 대기' | '검토 중' | '완료';

export const ALL_SECTION_STATUSES: SectionStatusType[] = [
  '시작 전',
  '작성 중',
  '검토 대기',
  '검토 중',
  '완료'
];

export const PRESET_AUTHORS = ['정소담', '김민수', '박지훈', '이서연', '최유진', '강동원'];
export const PRESET_REVIEWERS = ['김민수', '이서연', '정소담', '박지훈', '최유진', '강동원'];

export interface ProposalSectionItem {
  id: string;
  sectionNumber: string;
  title: string;
  level: number;
  status: SectionStatusType;
  author: string;
  reviewer: string;
  updatedAt: string;
  dueDate?: string;
  charLimit: number;
  currentCharCount: number;
  content: string;
  children?: ProposalSectionItem[];
}

export const INITIAL_PROPOSAL_SECTIONS: ProposalSectionItem[] = [
  {
    id: 'sec-1',
    sectionNumber: '1',
    title: '1. 사업 이해 및 추진전략',
    level: 1,
    status: '작성 중',
    author: '정소담',
    reviewer: '김민수',
    updatedAt: '2026-09-22',
    dueDate: '2026-09-22',
    charLimit: 4000,
    currentCharCount: 2450,
    content: `1.1 제안 배경 및 추진 목적
본 제안사는 한국생산성진흥회의 생성형 AI 도입 및 디지털 혁신 비전에 적극 동참하고자 엔터프라이즈 맞춤형 AX 플랫폼을 제안합니다. 특히 노규성 회장의 디지털 생산성 혁신기조에 발맞추어 전사 임직원 업무 효율을 40% 이상 극대화할 수 있도록 지원합니다.

1.2 추진 전략 및 파트너십
본 사업은 2024년도 AI 선도사업 수행 노하우와 삼성SDS의 컨소시엄 협업 체계를 기반으로 하여 무결점 서비스를 보장합니다. 착수 후 8개월 이내에 전사 포털 연계 및 AI 에이전트 마켓플레이스 구축을 완수할 것을 약속드립니다.`
  },
  {
    id: 'sec-2',
    sectionNumber: '2',
    title: '2. AI 플랫폼 구축방안',
    level: 1,
    status: '검토 대기',
    author: '박지훈',
    reviewer: '이서연',
    updatedAt: '2026-09-24',
    dueDate: '2026-09-24',
    charLimit: 6000,
    currentCharCount: 4200,
    content: `2.1 AI 플랫폼 전체 아키텍처
본 제안사는 마이크로서비스 아키텍처(MSA)를 기반으로 고가용성 멀티존 클라우드 인프라와 온프레미스 보안 영역을 유기적으로 연계하는 하이브리드 아키텍처를 설계하였습니다. 모든 서비스 컴포넌트는 쿠버네티스(K8s) 클러스터 상에서 컨테이너 기반으로 격리 배포되며, 트래픽 폭증 시 자동 오토스케일링(HPA)을 지원합니다.

2.2 Multi-LLM 운영 및 스마트 라우팅 방안
사용자의 질의 의도와 프롬프트 토큰 길이, 그리고 데이터 보안 등급을 실시간으로 분석하는 지능형 AI 라우터(Intelligent Model Gateway)를 구축합니다. 민감한 내부 규정 질의는 온프레미스 sLLM 또는 ZDR 승인 엔터프라이즈 모델로 자동 격리 처리되며, 복합 분석 작업은 최상위 추론 모델로 동적 분기됩니다.

2.3 사내 지식 기반 RAG 구축 방안
KPC 사내 지식자산(컨설팅 레포트, 교육 교재, 행정 규정집 등)을 표와 차트의 구조적 의미 손실 없이 청킹(Chunking)하는 지능형 HWP/PDF 파서를 적용하여 검색 정확도(Hit Rate) 94% 이상을 달성합니다. 하이브리드 검색(BM25 + Dense Vector Embedding) 및 Cross-Encoder 리랭커를 표준 탑재합니다.

2.4 KPC 맞춤형 AI Agent 구축 및 생태계 방안
현업 실무자가 프롬프트와 사내 문서 연결만으로 5분 내에 나만의 전용 에이전트를 구축할 수 있는 노코드(No-Code) Agent Builder를 제공합니다. 제작된 에이전트는 사내 마켓플레이스에서 보안 심사 후 원클릭 배포됩니다.`
  },
  {
    id: 'sec-2-1',
    sectionNumber: '2.1',
    title: '  2.1 플랫폼 전체 아키텍처',
    level: 2,
    status: '완료',
    author: '박지훈',
    reviewer: '이서연',
    updatedAt: '2026-09-24',
    dueDate: '2026-09-24',
    charLimit: 2000,
    currentCharCount: 1850,
    content: `본 플랫폼은 Enterprise AI Core를 중심으로 Presentation Layer, Service Mesh Layer, AI Routing Gateway, Vector DB & Storage Layer의 4계층 구조로 설계되었습니다. 모든 통신은 mTLS 및 TLS 1.3 암호화 구간을 통과하며, 클라우드 네이티브 아키텍처를 준수하여 99.99% 가용성을 보장합니다.`
  },
  {
    id: 'sec-2-2',
    sectionNumber: '2.2',
    title: '  2.2 Multi-LLM 운영 방안',
    level: 2,
    status: '검토 대기',
    author: '박지훈',
    reviewer: '이서연',
    updatedAt: '2026-09-24',
    dueDate: '2026-09-24',
    charLimit: 2000,
    currentCharCount: 1920,
    content: `Multi-LLM 운영을 위한 API 게이트웨이 및 모델별 레이트 리밋(Rate Limit)과 장애 시 자동 Failover를 구현합니다. CSP별 응답 속도, 비용, 쿼럼 상태를 실시간 모니터링하여 최적의 가성비와 응답 품질을 유지합니다.`
  },
  {
    id: 'sec-2-3',
    sectionNumber: '2.3',
    title: '  2.3 RAG 구축 방안',
    level: 2,
    status: '작성 중',
    author: '정소담',
    reviewer: '김민수',
    updatedAt: '2026-09-25',
    dueDate: '2026-09-25',
    charLimit: 2000,
    currentCharCount: 1850,
    content: `RAG 엔진은 하이브리드 검색(BM25 키워드 검색 + 밀집 벡터 임베딩 코사인 유사도 검색)과 리랭킹(Cross-Encoder Reranker) 파이프라인을 결합합니다. HWP 한글 문서 특화 청킹 엔진을 적용하여 표/각주 데이터의 누락을 원천 차단합니다.`
  },
  {
    id: 'sec-2-4',
    sectionNumber: '2.4',
    title: '  2.4 AI Agent 구축 방안',
    level: 2,
    status: '작성 중',
    author: '정소담',
    reviewer: '김민수',
    updatedAt: '2026-09-25',
    dueDate: '2026-09-25',
    charLimit: 2000,
    currentCharCount: 1400,
    content: `사내 에이전트 마켓플레이스를 제공하여 부서별 우수 에이전트를 원클릭으로 구독하고 조직 간 지식 전파를 극대화합니다. 권한 관리 및 프롬프트 인젝션 방어 필터를 내장하여 비인가 데이터 접근을 통제합니다.`
  },
  {
    id: 'sec-3',
    sectionNumber: '3',
    title: '3. 데이터 및 시스템 연계 방안',
    level: 1,
    status: '검토 중',
    author: '이서연',
    reviewer: '김민수',
    updatedAt: '2026-09-26',
    dueDate: '2026-09-26',
    charLimit: 5000,
    currentCharCount: 3200,
    content: `3.1 Microsoft 365 및 Entra ID 연계
Microsoft Graph API 및 Entra ID OAuth 2.0 프로토콜을 활용하여 단일 인증(SSO)과 M365 앱 간 원활한 문서 데이터 송수신을 구현합니다. Teams 봇 앱 및 Word Add-in을 기본 번들로 제공하여 임직원 업무 흐름의 단절 없는 AI 활용을 지원합니다.

3.2 사내 레거시 시스템 연계 (ERP / LMS / 그룹웨어)
표준 Model Context Protocol (MCP) 서버를 구축하여 사내 ERP 및 그룹웨어의 정형 데이터를 안전하게 호출할 수 있는 함수 호출(Function Calling) 체계를 완성합니다. 레거시 API 규격에 대한 표준 어댑터를 제공하여 연계 개발 공수를 40% 절감합니다.`
  },
  {
    id: 'sec-4',
    sectionNumber: '4',
    title: '4. 보안 및 데이터 보호 방안',
    level: 1,
    status: '완료',
    author: '최유진',
    reviewer: '강동원',
    updatedAt: '2026-09-27',
    dueDate: '2026-09-27',
    charLimit: 4000,
    currentCharCount: 2950,
    content: `4.1 데이터 무저장(Zero Data Retention) 원칙 및 개인정보 필터링
공공기관 보안 가이드라인에 의거하여 모든 입출력 프롬프트는 CSP에 영구 저장되거나 AI 모델 학습에 사용되지 않는 전용 Enterprise 계약을 체결합니다. 전송 전 단계에서 주민등록번호, 계좌번호, 전화번호 등 민감 개인정보(PII)를 실시간 마스킹하는 DLP 필터를 전진 배치합니다.

4.2 역할 기반 접근 제어 (RBAC) 및 보안 감사 로그
문서 단위 및 부서 단위의 엄격한 ACL(Access Control List)을 적용하여 직급 및 권한에 부합하는 지식만 RAG 검색 결과에 노출되도록 보장합니다. 모든 AI 사용 내역, 프롬프트 전송 기록, 다운로드 이력은 변경 불가능한 무결성 감사 로그로 최소 3년간 보관됩니다.`
  },
  {
    id: 'sec-5',
    sectionNumber: '5',
    title: '5. 운영 및 유지관리 방안',
    level: 1,
    status: '작성 중',
    author: '강동원',
    reviewer: '정소담',
    updatedAt: '2026-09-28',
    dueDate: '2026-09-28',
    charLimit: 3000,
    currentCharCount: 2200,
    content: `5.1 안정적 서비스 운영 및 장애 대응 체계
24x7 실시간 APM(Application Performance Monitoring) 모니터링 시스템을 가동하여 응답 지연 및 API 장애를 사전에 감지하고 즉각 조치합니다. 중대 장애 발생 시 30분 이내 긴급 대응 및 2시간 이내 정상 복구를 보장하는 전담 기술 지원 조직을 구성합니다.

5.2 사용자 교육 및 변화 관리 지원
단계별 임직원 AI 리터러시 교육 커리큘럼(입문, 실무, 에이전트 개발 과정)을 운영하고 온라인 동영상 매뉴얼 및 퀵 가이드를 제공합니다. 주기적인 사용자 만족도 조사 및 기능 개선 피드백 루프를 가동하여 플랫폼 안착률을 90% 이상으로 제고합니다.`
  },
  {
    id: 'sec-6',
    sectionNumber: '6',
    title: '6. 수행 조직 및 일정 관리',
    level: 1,
    status: '검토 대기',
    author: '김민수',
    reviewer: '정소담',
    updatedAt: '2026-09-30',
    dueDate: '2026-09-30',
    charLimit: 2500,
    currentCharCount: 1980,
    content: `6.1 프로젝트 추진 조직 및 투입 인력 계획
PM(프로젝트 관리자), AI 아키텍트, Full-stack 개발자, M365 연계 전문가, UI/UX 디자이너, QA 엔지니어 등 총 12명의 전문 정규직 인력을 전담 배치하여 품질과 납기를 책임집니다.

6.2 WBS 마일스톤 및 단계별 일정 계획
총 6개월간 분석/설계(1~2개월) → 플랫폼 구축 및 LLM 연계(3~4개월) → M365 통합 및 RAG 지식화(5개월) → 통합 테스트, 시범 운영 및 최종 오픈(6개월) 일정으로 차질 없이 완수합니다.`
  }
];

export interface EditorViewProps {
  activeProject?: ProposalProject | null;
  uploadedFiles?: UploadedProposalFile[];
  checklistRequirements?: ChecklistRequirement[];
  onUpdateChecklistRequirements?: (items: ChecklistRequirement[]) => void;
  onNavigateToProjects?: () => void;
  onNavigateToProjectRoot?: () => void;
  onShowToast: (msg: string) => void;
  onExportDone?: () => void;
  sections?: ProposalSectionItem[];
  onUpdateSections?: (sections: ProposalSectionItem[]) => void;
  initialSelectedSectionId?: string | null;
  userRole?: UserRole;
}

export const EditorView: React.FC<EditorViewProps> = (props) => {
  const { activeProject, uploadedFiles, onNavigateToProjectRoot } = props;

  if (activeProject && ((uploadedFiles && uploadedFiles.length === 0) || (activeProject.analysisStatus && activeProject.analysisStatus !== '분석 완료'))) {
    return (
      <RfpAnalysisRequiredState
        stepNumber="04"
        stepTitle="제안서 작성"
        projectName={activeProject.title}
        onNavigateToStep1={() => {
          if (onNavigateToProjectRoot) onNavigateToProjectRoot();
        }}
      />
    );
  }

  return <EditorViewContent {...props} />;
};

const EditorViewContent: React.FC<EditorViewProps> = ({
  activeProject,
  checklistRequirements,
  onUpdateChecklistRequirements,
  onNavigateToProjects,
  onNavigateToProjectRoot,
  onShowToast,
  onExportDone,
  sections: externalSections,
  onUpdateSections,
  initialSelectedSectionId,
  userRole = 'admin'
}) => {
  const initialSections = externalSections || INITIAL_PROPOSAL_SECTIONS;
  const initialSection = initialSections.find(
    section => section.id === initialSelectedSectionId
  ) || initialSections[0];

  // Mode: 'overview' (Section Table) or 'detail' (60:40 Writing Canvas)
  const [viewMode, setViewMode] = useState<'overview' | 'detail'>(
    initialSelectedSectionId ? 'detail' : 'overview'
  );

  // Sections State
  const [sections, setSections] = useState<ProposalSectionItem[]>(initialSections);
  const [selectedSection, setSelectedSection] = useState<ProposalSectionItem>(initialSection);
  const [activeRightTab, setActiveRightTab] = useState<'storyboard' | 'writing' | 'review' | 'comments'>('storyboard');
  const [editorText, setEditorText] = useState(initialSection.content);
  const [sectionTitle, setSectionTitle] = useState(initialSection.title);

  // Helper to update sections and notify parent
  const updateSectionsAndNotify = useCallback((newSections: ProposalSectionItem[] | ((prev: ProposalSectionItem[]) => ProposalSectionItem[])) => {
    setSections(prev => {
      const next = typeof newSections === 'function' ? newSections(prev) : newSections;
      if (onUpdateSections) {
        Promise.resolve().then(() => {
          onUpdateSections(next);
        });
      }
      return next;
    });
  }, [onUpdateSections]);

// Predefined AI Review Criteria Results Data
const REVIEW_RESULTS_DATA = [
  {
    id: 1,
    category: '준수사항',
    issue: 'RFP 2.4 보안 요구사항의 국정원 보안성 검토 대비 구체적 암호화 알고리즘(ARIA-256) 언급이 다소 부족합니다.',
    suggestion: '1.2 핵심 추진 전략 부분에 "전송 및 저장 구간 국가 표준 ARIA-256bit 암호화 적용" 문구를 명시할 것을 권장합니다.',
    location: '1번째 문단 (1.2절)'
  },
  {
    id: 2,
    category: '차별성',
    issue: '경쟁사 대비 KPC 고유의 60년 생산성 컨설팅 지표(NCSI, 생산성 지수) 연계 방안이 강조되면 배점이 향상될 수 있습니다.',
    suggestion: 'Win Theme 4번 Agent 생태계에 "KPC 보유 공공/민간 생산성 평가 프레임워크 사전 탑재"를 추가하세요.',
    location: '4번째 문단 (1.2절)'
  },
  {
    id: 3,
    category: '견고성',
    issue: 'Multi-LLM 장애 시 Failover 자동 전환 소요 시간(RTO/RPO) 정량 지표가 누락되어 있습니다.',
    suggestion: '본문에 "장애 발생 시 5초 이내 Sub-LLM으로 자동 무중단 전환(RTO < 5s)"을 보강하십시오.',
    location: '2.2절 Multi-LLM 운영 방안'
  }
];

  // Custom prompt input in TAB 2 [작성]
  const [writingPromptInput, setWritingPromptInput] = useState('');

  // Prompt-guided drafts options generator helper
  function generateOptionsFromPrompt(prompt: string, sectionTitle: string) {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      return [
        {
          id: 1,
          title: `[옵션 1] ${sectionTitle} - 전략 및 개요 중심 초안`,
          desc: '',
          content: `1. '${sectionTitle}' 추진 개요 및 핵심 목표\n- 본 제안을 통해 KPC의 생성형 AI 도입 목표를 달성하고, 업무 프로세스 전반의 디지털 혁신을 주도합니다.\n- 사용자 친화적 인터페이스와 강력한 데이터 보호 체계를 기반으로 안정적인 서비스 환경을 구현합니다.`,
          mode: 'replace-all' as const
        },
        {
          id: 2,
          title: `[옵션 2] ${sectionTitle} - 실행 방안 및 기술 구조 초안`,
          desc: '',
          content: `2. '${sectionTitle}' 세부 실행 방안\n- 사내 마이데이터 연동 및 M365 API 확장을 통한 업무 자동화 모듈을 단계적으로 구축합니다.\n- ZDR(Zero Data Retention) 보안 가이드라인 준수로 데이터 유출 없는 안심 AI 인프라를 마련합니다.`,
          mode: 'replace-all' as const
        },
        {
          id: 3,
          title: `[옵션 3] ${sectionTitle} - 성과 지표 및 차별화 초안`,
          desc: '',
          content: `3. '${sectionTitle}' 정량적 기대효과 및 차별화 요소\n- 반복 행정 업무 시간 60% 절감 및 수작업 문서 작성 오류 90% 방지 효과를 실현합니다.\n- Multi-LLM 하이브리드 자동 전환 아키텍처를 도입하여 비용 효율성을 최적화합니다.`,
          mode: 'replace-all' as const
        }
      ];
    }

    // Dynamic extraction helper based on user input
    const hasSecurity = /보안|안정|통제|ZDR|안심|위험/.test(cleanPrompt);
    const hasHistory = /노하우|60년|역사|KPC|자산|전통/.test(cleanPrompt);
    const hasTech = /engine|LLM|AI|엔진|시스템|라우팅|기술|아키텍처/.test(cleanPrompt);
    const hasStats = /정량|지표|수치|%|시간|절감|단축/.test(cleanPrompt);

    // Option 1: Standard comprehensive proposal draft
    let opt1Content = `1.1 [${sectionTitle}] 요구사항 통합 제안안\n`;
    opt1Content += `본 제안서는 입력하신 핵심 요구사항인 "${cleanPrompt}"을 완벽히 수용하여 고안되었습니다.\n`;
    if (hasHistory) {
      opt1Content += `- [KPC 독보적 자산 연계] 한국생산성본부(KPC)의 60년 이상 축적된 교육·컨설팅 도메인 노하우와 지식 자산을 본 추진전략 전반에 체계적으로 투영하여 맞춤형 최적화를 보장합니다.\n`;
    } else {
      opt1Content += `- [KPC 운영 표준화] 60년 전통의 업무 생산성 모델을 분석하여, 제안 요구사항의 빠른 정착과 사용자 편의성을 동시에 도모합니다.\n`;
    }
    if (hasSecurity) {
      opt1Content += `- [보안 안정성 극대화] 제로 데이터 리텐션(Zero Data Retention) 규격을 엄격히 적용하며, 민감 정보 노출을 근본적으로 차단하는 국가 표준 보안 아키텍처를 기반으로 설계됩니다.\n`;
    } else {
      opt1Content += `- [무결성 확보] 데이터 처리 흐름 전반에 정밀 필터링 및 안정화 레이어를 도입하여 시스템 운영상의 변수를 통제합니다.\n`;
    }
    if (hasTech) {
      opt1Content += `- [Multi-LLM 하이브리드 엔진] 작업의 중요도와 예산 목적에 맞추어 성능과 리스크 비용을 지능적으로 분기·조율하는 차세대 자동 라우팅 시스템을 탑재합니다.\n`;
    }

    // Option 2: Action plans & concrete specifications
    let opt2Content = `2.1 [${sectionTitle}] 실행 구체화 및 상세 설계안\n`;
    opt2Content += `핵심 구체화 목표: "${cleanPrompt}"의 정량적 달성 및 이행 안정성 확보\n`;
    if (hasTech) {
      opt2Content += `- [마이크로서비스 아키텍처] 모든 인프라를 클라우드 및 온프레미스 연계형 쿠버네티스(K8s) 상에 격리 설계하여 신속한 스케일 아웃과 탄력적 이행 속도를 구현합니다.\n`;
    } else {
      opt2Content += `- [단계별 이행 프로세스] 기술 부하를 사전에 검증하기 위한 3단계 PoC(개념 실증)를 선제 수행하여 현업의 사용 수용도를 100% 만족시킵니다.\n`;
    }
    if (hasStats) {
      opt2Content += `- [정량적 효율 가속화] 문서 초안 및 자료 요약 공수를 평균 65% 이상 단축하고, 수작업 리스크 요인을 무장애 가동율 99.9% 수준으로 정밀 관리합니다.\n`;
    } else {
      opt2Content += `- [수작업 절감 로드맵] 업무 효율 지표를 상시 정량화하고 보고서 검토 및 승인 시간을 단축하기 위한 실시간 실증 분석 대시보드를 연계합니다.\n`;
    }

    // Option 3: Strategic superiority & expected outcomes
    let opt3Content = `3.1 [${sectionTitle}] 전략적 차별화 및 비즈니스 기대효과\n`;
    opt3Content += `전략적 차별성: 타 제안사 대비 압도적 품질 및 비즈니스 시너지 실현\n`;
    opt3Content += `- [사용자 친화적 맞춤화] 현업 담당자들이 노코드(No-Code) 방식으로 요구사항("${cleanPrompt}")에 맞춘 AI 모듈을 신속하게 조합 및 생성할 수 있는 자생적 가동 인프라를 이식합니다.\n`;
    opt3Content += `- [TCO 비용 최적화] 분기별 성능 대비 투입 자원을 정교하게 측정 및 조율하여 연간 클라우드 토큰 운용 비용을 최대 40% 절감하는 최적 경로를 정렬합니다.\n`;
    if (hasSecurity || hasHistory) {
      opt3Content += `- [신뢰 및 규정 만족] 정부 및 과기정통부 인공지능 가이드라인을 100% 준수함과 동시에 KPC 독자 노하우를 융합하여 국가 차원의 선도형 제안 우위를 확정합니다.\n`;
    }

    return [
      {
        id: 1,
        title: `[반영 옵션 1] ${sectionTitle} - 요구사항 맞춤형 전략 및 종합 초안`,
        desc: '',
        content: opt1Content,
        mode: 'replace-all' as const
      },
      {
        id: 2,
        title: `[반영 옵션 2] ${sectionTitle} - 고신뢰 구체화 및 정량 실행안`,
        desc: '',
        content: opt2Content,
        mode: 'replace-all' as const
      },
      {
        id: 3,
        title: `[반영 옵션 3] ${sectionTitle} - 차별적 경쟁 우위 및 기대효과 극대화안`,
        desc: '',
        content: opt3Content,
        mode: 'replace-all' as const
      }
    ];
  }

  // AI Recommendations in TAB 2 [작성] - Demo simulation ready
  const [hasGeneratedDrafts, setHasGeneratedDrafts] = useState(true);
  const [isGeneratingDrafts, setIsGeneratingDrafts] = useState(false);
  const [aiDraftOptions, setAiDraftOptions] = useState<Array<{
    id: number;
    title: string;
    content: string;
    desc: string;
    mode?: 'replace-selection' | 'append-selection' | 'replace-all' | 'append-all';
  }>>(() => generateOptionsFromPrompt('', initialSection.title));
  const [promptContext, setPromptContext] = useState<{
    promptText: string;
    selectedText?: string;
    range?: { start: number; end: number };
  } | null>(null);

  const resetDraftOptionsForSection = (section: ProposalSectionItem) => {
    setWritingPromptInput('');
    setAiDraftOptions(generateOptionsFromPrompt('', section.title));
    setHasGeneratedDrafts(true);
  };

  // Storyboard Accordion State (9 Cards)
  const [storyboardOpen, setStoryboardOpen] = useState<Record<string, boolean>>({
    'task': true,
    'draft': false,
    'requirements': true,
    'context': false,
    'evalCriteria': true,
    'winTheme': true,
    'expectations': false,
    'guide': false,
    'resources': true
  });

  // Checklist Requirements (Synced with Step 3)
  const [localChecklistItems, setLocalChecklistItems] = useState<ChecklistRequirement[]>(INITIAL_KPC_CHECKLIST);
  const checklistItems = checklistRequirements || localChecklistItems;

  const handleToggleRequirementCheck = (id: string) => {
    const updated = checklistItems.map(item => {
      if (item.id === id) {
        const nextChecked = !item.checked;
        onShowToast(`[${item.id}] 제안서 반영 상태가 '${nextChecked ? '반영 완료' : '반영 해제'}'(으)로 체크리스트에 동기화되었습니다.`);
        return {
          ...item,
          checked: nextChecked,
          status: nextChecked ? '확인' : '미확인'
        };
      }
      return item;
    });

    if (onUpdateChecklistRequirements) {
      onUpdateChecklistRequirements(updated);
    } else {
      setLocalChecklistItems(updated);
    }
  };

  // AI Review Checks (7 items) - Demo simulation ready (initially empty)
  const [reviewChecks, setReviewChecks] = useState({
    compliance: true,
    winPlan: true,
    methodology: true,
    evidence: true,
    robustness: true,
    differentiation: true,
    grammar: true
  });
  const [hasRunReview, setHasRunReview] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResults, setReviewResults] = useState<Array<{ id: number; category: string; issue: string; suggestion: string; location: string }>>([]);

  // Comments State
  const [comments, setComments] = useState<ProposalComment[]>([
    {
      id: 'c-1',
      author: '김민수 수석',
      date: '26.09.14 10:20',
      text: '@정소담 팀장님, 1장 추진전략 부분에 ZDR 외에 Entra ID 보안 인가 흐름도 도식 1장 추가하면 좋겠습니다.',
      resolved: false,
      selectedTextSnippet: 'Microsoft Entra ID (Azure AD) Single Sign-On(SSO)',
      replies: [
        {
          id: 'r-1',
          author: '정소담 (나)',
          date: '26.09.14 10:35',
          text: '확인했습니다. Entra ID OAuth 2.0 및 ZDR 보안 아키텍처 흐름도를 반영해두겠습니다.'
        }
      ]
    }
  ]);
  const [newCommentInput, setNewCommentInput] = useState('');
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyInputText, setReplyInputText] = useState('');
  const replyIdCounter = useRef(2);

  // Dropdown & Prompt Popups
  const [, setShowAiPromptBox] = useState(false);
  const [aiWritePrompt, setAiWritePrompt] = useState('');
  const [isAiWriting, setIsAiWriting] = useState(false);

  const [showProofMenu, setShowProofMenu] = useState(false);
  const [showProofExpandInMenu, setShowProofExpandInMenu] = useState(false);
  const [showRefineReduceInMenu, setShowRefineReduceInMenu] = useState(false);
  const [showRefineMenu, setShowRefineMenu] = useState(false);

  // Floating Selection State (드래그/선택 시 툴바)
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false);
  const [showSelectionRefineMenu, setShowSelectionRefineMenu] = useState(false);
  const [showSelectionProofMenu, setShowSelectionProofMenu] = useState(false);
  const [showSelectionProofExpand, setShowSelectionProofExpand] = useState(false);
  const [showSelectionRefineReduce, setShowSelectionRefineReduce] = useState(false);
  const [selectionExpandCount, setSelectionExpandCount] = useState<number>(300);
  const [selectionReduceCount, setSelectionReduceCount] = useState<number>(30);
  const [isSelectionExpanding, setIsSelectionExpanding] = useState(false);
  const [isSelectionReducing, setIsSelectionReducing] = useState(false);
  const [floatingPos, setFloatingPos] = useState<{ x: number; y: number } | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const floatingToolbarRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss floating popup when selection is cleared or clicking outside
  useEffect(() => {
    const handleDocumentSelectionCheck = (e: MouseEvent) => {
      if (floatingToolbarRef.current && floatingToolbarRef.current.contains(e.target as Node)) {
        return;
      }
      const textarea = textareaRef.current;
      if (textarea) {
        if (textarea.selectionStart === textarea.selectionEnd) {
          setShowFloatingToolbar(false);
          setShowSelectionRefineMenu(false);
          setShowSelectionProofMenu(false);
          setFloatingPos(null);
        }
      }
    };

    document.addEventListener('mouseup', handleDocumentSelectionCheck);
    document.addEventListener('mousedown', handleDocumentSelectionCheck);
    return () => {
      document.removeEventListener('mouseup', handleDocumentSelectionCheck);
      document.removeEventListener('mousedown', handleDocumentSelectionCheck);
    };
  }, []);

  // Inline Content Expansion State (증빙 > 내용확장 인라인 패널)
  const [customExpandCount, setCustomExpandCount] = useState<number>(500);
  const [isExpanding, setIsExpanding] = useState(false);

  // Inline Word reduction/shortening state (수정 > 단어 수 줄이기 인라인 패널)
  const [customReduceCount, setCustomReduceCount] = useState<number>(30);
  const [isReducing, setIsReducing] = useState(false);

  // Version History Modal & Save states
  const [showSaveVersionModal, setShowSaveVersionModal] = useState(false);
  const [saveVersionInput, setSaveVersionInput] = useState('');
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editingVersionTitle, setEditingVersionTitle] = useState('');

  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionHistory, setVersionHistory] = useState<EditorVersion[]>([
    {
      id: 'v-1',
      versionCode: 'v1',
      title: 'AI 최초 초안',
      createdAt: '26.09.13 14:00',
      author: 'AI 자동생성',
      content: `1. 사업 이해 및 추진전략 - 최초 작성본

KPC 전사 생성형 AI AX 혁신 도입 사업을 성공적으로 이행하기 위한 사업 전략 개요를 서술합니다.
사용자 수용도를 최우선으로 확보하고, 공공 수준의 규격을 만족하는 탄력적 클라우드 플랫폼 이행 마일스톤을 확정합니다.`
    }
  ]);
  const [selectedVersionPreview, setSelectedVersionPreview] = useState<EditorVersion>({
    id: 'v-1',
    versionCode: 'v1',
    title: 'AI 최초 초안',
    createdAt: '26.09.13 14:00',
    author: 'AI 자동생성',
    content: `1. 사업 이해 및 추진전략 - 최초 작성본

KPC 전사 생성형 AI AX 혁신 도입 사업을 성공적으로 이행하기 위한 사업 전략 개요를 서술합니다.
사용자 수용도를 최우선으로 확보하고, 공공 수준의 규격을 만족하는 탄력적 클라우드 플랫폼 이행 마일스톤을 확정합니다.`
  });

  // Sub-section Collapse/Expand State for Level 1 chapters
  const [collapsedChapterIds, setCollapsedChapterIds] = useState<Record<string, boolean>>({});

  // Full Document Overview Modal State
  const [showFullDocModal, setShowFullDocModal] = useState(false);
  const [copiedFullDoc, setCopiedFullDoc] = useState(false);

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDocType, setExportDocType] = useState<'default_word' | 'template_word'>('default_word');
  const [selectedTemplateName, setSelectedTemplateName] = useState('KPC_표준_제안서_템플릿.dotx');
  const [exportOptions, setExportOptions] = useState({
    includeCover: true,
    autoToc: true,
    pageNumber: true,
    headerFooter: true,
    excludeRfpQuote: false
  });

  // Enterprise Data Tree Modal
  const [showEnterpriseDataModal, setShowEnterpriseDataModal] = useState(false);

  // Section Reference Modal (내부저장소, 업로드, 웹검색 - 현재 섹션 전용)
  const [showSectionRefModal, setShowSectionRefModal] = useState(false);
  const [sectionRefModalTab] = useState<ReferenceTabType>('internal');
  const [sectionReferenceConfigs, setSectionReferenceConfigs] = useState<Record<string, SectionReferenceConfig>>({});

  // Current Section Reference Config (섹션별 스코프 유지)
  const currentSectionRefConfig: SectionReferenceConfig = useMemo(() => {
    const currentSecId = selectedSection?.id || 'sec-default';
    if (sectionReferenceConfigs[currentSecId]) {
      return sectionReferenceConfigs[currentSecId];
    }
    return {
      sectionId: currentSecId,
      internalKnowledge: {
        selectedFileIds: ['ent-1', 'ent-2'],
        files: [
          {
            id: 'ent-1',
            title: '행정안전부 디지털플랫폼정부 생성형 AI 공통기반 연계 표준안',
            category: '기존 제안서',
            fileFormat: 'PDF',
            size: '18.4 MB',
            updatedAt: '2026.08.15',
            relevanceScore: 98
          },
          {
            id: 'ent-2',
            title: '공공기관 망분리 환경 온프레미스 LLM/RAG 구축 아키텍처 가이드',
            category: '기술역량',
            fileFormat: 'DOCX',
            size: '12.1 MB',
            updatedAt: '2026.07.28',
            relevanceScore: 96
          }
        ]
      },
      uploadedFiles: [
        {
          id: `up-init-${currentSecId}-1`,
          fileName: `${selectedSection?.title || '섹션'}_요구사항_상세대비표.xlsx`,
          fileSize: '3.8 MB',
          format: 'XLSX',
          category: '섹션 전용 참고자료',
          uploadDate: '2026.09.08',
          uploader: '김민수 (작성자)',
          status: '참조 적용됨',
          selected: true
        },
        {
          id: `up-init-${currentSecId}-2`,
          fileName: `${selectedSection?.title || '섹션'}_기술규격_및_인프라_구성안.pdf`,
          fileSize: '8.4 MB',
          format: 'PDF',
          category: '섹션 전용 참고자료',
          uploadDate: '2026.09.11',
          uploader: '박지원 (기술지원)',
          status: '참조 적용됨',
          selected: true
        },
        {
          id: `up-init-${currentSecId}-3`,
          fileName: `${selectedSection?.title || '섹션'}_유사_구축사례_검증데이터.docx`,
          fileSize: '5.2 MB',
          format: 'DOCX',
          category: '섹션 전용 참고자료',
          uploadDate: '2026.09.13',
          uploader: '이정훈 (PM)',
          status: '참조 적용됨',
          selected: true
        }
      ],
      webSearch: {
        enabled: true,
        includeUrls: ['https://www.kpc.or.kr', 'https://www.g2b.go.kr'],
        excludeUrls: ['namu.wiki', 'blog.naver.com']
      }
    };
  }, [selectedSection?.id, selectedSection?.title, sectionReferenceConfigs]);

  const handleSaveSectionReferenceConfig = (newConfig: SectionReferenceConfig) => {
    setSectionReferenceConfigs(prev => ({
      ...prev,
      [newConfig.sectionId]: newConfig
    }));
  };

  // Drag & Drop State for Sections Table
  const [draggedSecId, setDraggedSecId] = useState<string | null>(null);
  const [dropTargetSecId, setDropTargetSecId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('after');

  // Settings Context Menu & Edit Modal State
  const [activeSettingsMenuId, setActiveSettingsMenuId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<ProposalSectionItem | null>(null);

  // Overview View Mode (목록 / 상태별 칸반)
  const [overviewViewMode, setOverviewViewMode] = useState<'list' | 'kanban'>('list');

  // Quick Inline Click-to-Edit States (상태, 작성자, 검토자, 마감일, 글자수 제한)
  const [activeStatusMenuId, setActiveStatusMenuId] = useState<string | null>(null);
  const [activeAuthorMenuId, setActiveAuthorMenuId] = useState<string | null>(null);
  const [activeReviewerMenuId, setActiveReviewerMenuId] = useState<string | null>(null);
  const [activeDueDateMenuId, setActiveDueDateMenuId] = useState<string | null>(null);
  const [activeCharLimitMenuId, setActiveCharLimitMenuId] = useState<string | null>(null);
  const [customAuthorInput, setCustomAuthorInput] = useState('');
  const [customReviewerInput, setCustomReviewerInput] = useState('');
  const [customDueDateInput, setCustomDueDateInput] = useState('');
  const [customCharLimitInput, setCustomCharLimitInput] = useState('');
  const [showModalExportMenu, setShowModalExportMenu] = useState(false);
  const modalExportMenuRef = React.useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      setActiveSettingsMenuId(null);
      setActiveStatusMenuId(null);
      setActiveAuthorMenuId(null);
      setActiveReviewerMenuId(null);
      setActiveDueDateMenuId(null);
      setActiveCharLimitMenuId(null);
      if (modalExportMenuRef.current && !modalExportMenuRef.current.contains(e.target as Node)) {
        setShowModalExportMenu(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Helper to clean title number prefix and get auto-renumbered title
  const cleanTitleName = (title: string): string => {
    return title.replace(/^\s*(?:\[?[0-9]+(?:\.[0-9]+)*\]?|\d+\.\d+\.?|\d+\.|\d+장|\d+)\s*/, '').trim();
  };

  const getNewTitle = (level: number, title: string, newSecNum: string): string => {
    const name = cleanTitleName(title);
    if (level === 1) {
      return `${newSecNum}. ${name || title.trim()}`;
    } else {
      return `  ${newSecNum} ${name || title.trim()}`;
    }
  };

  const renumberSectionsList = (list: ProposalSectionItem[]): ProposalSectionItem[] => {
    let l1 = 0;
    let l2 = 0;
    return list.map(s => {
      if (s.level === 1) {
        l1 += 1;
        l2 = 0;
        const newNum = String(l1);
        const newTitle = getNewTitle(1, s.title, newNum);
        return {
          ...s,
          sectionNumber: newNum,
          title: newTitle
        };
      } else {
        l2 += 1;
        const newNum = `${l1 > 0 ? l1 : 1}.${l2}`;
        const newTitle = getNewTitle(2, s.title, newNum);
        return {
          ...s,
          sectionNumber: newNum,
          title: newTitle
        };
      }
    });
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, secId: string) => {
    e.dataTransfer.setData('text/plain', secId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedSecId(secId);
  };

  const handleDragOver = (e: React.DragEvent, secId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedSecId === secId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const pos = e.clientY < midY ? 'before' : 'after';

    setDropTargetSecId(secId);
    setDropPosition(pos);
  };

  const handleDragLeave = () => {
    // Only clear if leaving to outside
  };

  const handleDrop = (e: React.DragEvent, targetSecId: string) => {
    e.preventDefault();
    const srcId = draggedSecId || e.dataTransfer.getData('text/plain');
    if (!srcId || srcId === targetSecId) {
      setDraggedSecId(null);
      setDropTargetSecId(null);
      return;
    }

    updateSectionsAndNotify(prev => {
      const list = [...prev];
      const srcIndex = list.findIndex(s => s.id === srcId);
      if (srcIndex === -1) return prev;

      const movedItem = list[srcIndex];
      // If moving a Level 1 section (Chapter), also move all of its sub-sections (Level 2)
      let itemsToMove: ProposalSectionItem[] = [];
      if (movedItem.level === 1) {
        let endIndex = srcIndex + 1;
        while (endIndex < list.length && list[endIndex].level > 1) {
          endIndex++;
        }
        itemsToMove = list.splice(srcIndex, endIndex - srcIndex);
      } else {
        itemsToMove = list.splice(srcIndex, 1);
      }

      let targetIndex = list.findIndex(s => s.id === targetSecId);
      if (targetIndex === -1) {
        list.push(...itemsToMove);
      } else {
        if (dropPosition === 'after') {
          // If both are level 1, place after the target's sub-sections
          if (list[targetIndex].level === 1 && movedItem.level === 1) {
            let childEnd = targetIndex + 1;
            while (childEnd < list.length && list[childEnd].level > 1) {
              childEnd++;
            }
            targetIndex = childEnd;
          } else {
            targetIndex += 1;
          }
        }
        list.splice(targetIndex, 0, ...itemsToMove);
      }
      
      const renumberedList = renumberSectionsList(list);

      // Keep selectedSection in sync
      const updatedSelected = renumberedList.find(s => s.id === selectedSection?.id);
      if (updatedSelected) {
        Promise.resolve().then(() => {
          setSelectedSection(updatedSelected);
          setSectionTitle(updatedSelected.title);
        });
      }

      return renumberedList;
    });

    const movedSec = sections.find(s => s.id === srcId);
    onShowToast(`'${movedSec?.title || '섹션'}'의 위치(순서)와 목차 번호가 자동으로 재계산되어 반영되었습니다.`);
    setDraggedSecId(null);
    setDropTargetSecId(null);
  };

  const handleDragEnd = () => {
    setDraggedSecId(null);
    setDropTargetSecId(null);
  };

  // Section Settings Menu Handlers
  const handleToggleSettingsMenu = (e: React.MouseEvent, secId: string) => {
    e.stopPropagation();
    setActiveSettingsMenuId(prev => (prev === secId ? null : secId));
  };

  const handleOpenEditSection = (e: React.MouseEvent, sec: ProposalSectionItem) => {
    e.stopPropagation();
    setActiveSettingsMenuId(null);
    setEditingSection({
      ...sec,
      dueDate: sec.dueDate || sec.updatedAt || '2026-09-25'
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteSection = (e: React.MouseEvent, secId: string) => {
    e.stopPropagation();
    setActiveSettingsMenuId(null);
    const target = sections.find(s => s.id === secId);
    if (sections.length <= 1) {
      onShowToast('최소 1개 이상의 섹션이 유지되어야 합니다.');
      return;
    }
    
    updateSectionsAndNotify(prev => {
      const filtered = prev.filter(s => s.id !== secId);
      const renumbered = renumberSectionsList(filtered);
      return renumbered;
    });

    onShowToast(`'${target?.title || '섹션'}'이(가) 삭제되었습니다.`);
    
    const remaining = renumberSectionsList(sections.filter(s => s.id !== secId));
    if (selectedSection?.id === secId) {
      if (remaining.length > 0) {
        setSelectedSection(remaining[0]);
        setEditorText(remaining[0].content);
        setSectionTitle(remaining[0].title);
        resetDraftOptionsForSection(remaining[0]);
      }
    } else {
      const updatedSelected = remaining.find(s => s.id === selectedSection?.id);
      if (updatedSelected) {
        setSelectedSection(updatedSelected);
        setSectionTitle(updatedSelected.title);
      }
    }
  };

  const handleSaveEditedSection = (updated: ProposalSectionItem) => {
    const finalItem: ProposalSectionItem = {
      ...updated,
      dueDate: updated.dueDate || updated.updatedAt,
      updatedAt: updated.dueDate || updated.updatedAt
    };
    updateSectionsAndNotify(prev => {
      const list = prev.map(s => s.id === finalItem.id ? finalItem : s);
      const renumbered = renumberSectionsList(list);
      return renumbered;
    });

    // Sync selectedSection with renumbered details
    setTimeout(() => {
      setSections(current => {
        const match = current.find(s => s.id === updated.id);
        if (match && selectedSection?.id === updated.id) {
          setSelectedSection(match);
          setSectionTitle(match.title);
        }
        return current;
      });
    }, 50);

    setIsEditModalOpen(false);
    setEditingSection(null);
    onShowToast(`'${updated.title}' 섹션 정보 및 목차가 정렬 및 수정되었습니다.`);
  };

  // Quick Inline Click-to-Edit Handlers
  const handleQuickUpdateStatus = (secId: string, newStatus: SectionStatusType) => {
    updateSectionsAndNotify(prev => prev.map(s => s.id === secId ? { ...s, status: newStatus } : s));
    if (selectedSection?.id === secId) {
      setSelectedSection(prev => prev ? { ...prev, status: newStatus } : prev);
    }
    setActiveStatusMenuId(null);
    const sec = sections.find(s => s.id === secId);
    onShowToast(`'${sec?.title || '섹션'}' 상태가 [${newStatus}](으)로 변경되었습니다.`);
  };

  const handleQuickUpdateAuthor = (secId: string, newAuthor: string) => {
    if (userRole !== 'admin') {
      onShowToast('목차별 업무 담당자(작성자) 배정은 프로젝트 관리자만 가능합니다.');
      return;
    }
    if (!newAuthor.trim()) return;
    updateSectionsAndNotify(prev => prev.map(s => s.id === secId ? { ...s, author: newAuthor.trim() } : s));
    if (selectedSection?.id === secId) {
      setSelectedSection(prev => prev ? { ...prev, author: newAuthor.trim() } : prev);
    }
    setActiveAuthorMenuId(null);
    setCustomAuthorInput('');
    onShowToast(`작성자가 '${newAuthor.trim()}'(으)로 변경되었습니다.`);
  };

  const handleQuickUpdateReviewer = (secId: string, newReviewer: string) => {
    if (userRole !== 'admin') {
      onShowToast('목차별 업무 담당자(검토자) 배정은 프로젝트 관리자만 가능합니다.');
      return;
    }
    if (!newReviewer.trim()) return;
    updateSectionsAndNotify(prev => prev.map(s => s.id === secId ? { ...s, reviewer: newReviewer.trim() } : s));
    if (selectedSection?.id === secId) {
      setSelectedSection(prev => prev ? { ...prev, reviewer: newReviewer.trim() } : prev);
    }
    setActiveReviewerMenuId(null);
    setCustomReviewerInput('');
    onShowToast(`검토자가 '${newReviewer.trim()}'(으)로 변경되었습니다.`);
  };

  const handleQuickUpdateDueDate = (secId: string, newDueDate: string) => {
    if (userRole !== 'admin') {
      onShowToast('목차별 마감일 설정은 프로젝트 관리자만 가능합니다.');
      return;
    }
    if (!newDueDate.trim()) return;
    updateSectionsAndNotify(prev => prev.map(s => s.id === secId ? { ...s, dueDate: newDueDate.trim(), updatedAt: newDueDate.trim() } : s));
    if (selectedSection?.id === secId) {
      setSelectedSection(prev => prev ? { ...prev, dueDate: newDueDate.trim(), updatedAt: newDueDate.trim() } : prev);
    }
    setActiveDueDateMenuId(null);
    const sec = sections.find(s => s.id === secId);
    onShowToast(`'${sec?.title || '섹션'}' 마감일이 '${newDueDate.trim()}'(으)로 변경되었습니다.`);
  };

  const handleQuickUpdateCharLimit = (secId: string, newLimit: number) => {
    if (userRole !== 'admin') {
      onShowToast('목표 글자 수 제한 설정은 프로젝트 관리자만 가능합니다.');
      return;
    }
    if (!newLimit || newLimit <= 0) return;
    updateSectionsAndNotify(prev => prev.map(s => s.id === secId ? { ...s, charLimit: newLimit } : s));
    if (selectedSection?.id === secId) {
      setSelectedSection(prev => prev ? { ...prev, charLimit: newLimit } : prev);
    }
    setActiveCharLimitMenuId(null);
    const sec = sections.find(s => s.id === secId);
    onShowToast(`'${sec?.title || '섹션'}' 목표 글자 수가 ${newLimit.toLocaleString()}자로 변경되었습니다.`);
  };

  const handleDropOnKanbanColumn = (e: React.DragEvent, targetStatus: SectionStatusType) => {
    e.preventDefault();
    const srcId = draggedSecId || e.dataTransfer.getData('text/plain');
    if (!srcId) return;
    handleQuickUpdateStatus(srcId, targetStatus);
    setDraggedSecId(null);
  };

  // Helper Handlers
  const handleSelectSection = (sec: ProposalSectionItem) => {
    setSelectedSection(sec);
    setSectionTitle(sec.title);
    setEditorText(sec.content);
    resetDraftOptionsForSection(sec);
    setViewMode('detail');
  };

  const handleBackToOverview = () => {
    // Save current changes to section array
    updateSectionsAndNotify(prev => prev.map(s => s.id === selectedSection.id ? {
      ...s,
      title: sectionTitle,
      content: editorText,
      currentCharCount: editorText.length,
      status: (s.status === '시작 전' && editorText.trim().length > 0) ? '작성 중' : s.status
    } : s));
    onShowToast('현재까지 작업하던 내용이 제안서 섹션에 성공적으로 저장되었습니다.');
    setViewMode('overview');
  };

  const handleAddNewSection = () => {
    const newSecId = `sec-${Date.now()}`;
    const newSectionNum = String(sections.length + 1);
    const newSec: ProposalSectionItem = {
      id: newSecId,
      sectionNumber: newSectionNum,
      title: `추가 제안 사항`, // renumberSectionsList will auto-prefix correctly
      level: 1,
      status: '시작 전',
      author: '정소담',
      reviewer: '김민수',
      updatedAt: '2026-09-30',
      dueDate: '2026-09-30',
      charLimit: 3000,
      currentCharCount: 0,
      content: ''
    };
    updateSectionsAndNotify(prev => {
      const newList = [...prev, newSec];
      return renumberSectionsList(newList);
    });
    onShowToast(`목록의 마지막에 새 하위 섹션 [${newSectionNum}. 추가 제안 사항]이 추가되었습니다.`);
  };

  const handleCopyFullDocument = () => {
    // Compile all sections into one clean document text
    const docLines: string[] = [];
    docLines.push(`[${activeProject?.title || '한국생산성본부(KPC) 맞춤형 생성형 AI 플랫폼 구축 사업'} - 제안서 통합본]`);
    docLines.push(`기준일시: 2026.09.14 | 총 섹션: ${sections.length}개\n`);
    docLines.push('========================================\n');

    sections.forEach(sec => {
      const activeContent = (sec.id === selectedSection.id && viewMode === 'detail') ? editorText : (sec.content || '');
      docLines.push(`[제 ${sec.sectionNumber}장] ${sec.title}`);
      docLines.push(`상태: ${sec.status} | 작성자: ${sec.author} | 검토자: ${sec.reviewer}`);
      docLines.push('----------------------------------------');
      docLines.push(activeContent.trim() ? activeContent : '(내용 작성 중)');
      docLines.push('\n');
    });

    const fullText = docLines.join('\n');
    navigator.clipboard.writeText(fullText).then(() => {
      setCopiedFullDoc(true);
      onShowToast('제안서 전체 파트의 본문이 클립보드에 복사되었습니다.');
      setTimeout(() => setCopiedFullDoc(false), 2000);
    }).catch(() => {
      onShowToast('클립보드 복사에 실패했습니다. 브라우저 권한을 확인해주세요.');
    });
  };

  const handleTriggerAiDraftGeneration = () => {
    setIsGeneratingDrafts(true);
    setTimeout(() => {
      setIsGeneratingDrafts(false);
      setHasGeneratedDrafts(true);
      const generated = generateOptionsFromPrompt(writingPromptInput, selectedSection?.title || '제안서 섹션');
      setAiDraftOptions(generated);
      if (writingPromptInput.trim()) {
        onShowToast('입력하신 프롬프트를 반영하여 3가지 맞춤형 추천안이 생성되었습니다.');
      } else {
        onShowToast('스토리보드 및 RFP 요구사항을 분석하여 3가지 AI 추천안이 생성되었습니다.');
      }
    }, 700);
  };

  const handleReviewFixRequest = (suggestion: string, category: string) => {
    setActiveRightTab('writing');
    const targetPrompt = `${category} 개선안 반영: ${suggestion}`;
    setWritingPromptInput(targetPrompt);
    
    setIsGeneratingDrafts(true);
    setHasGeneratedDrafts(false);
    setTimeout(() => {
      setIsGeneratingDrafts(false);
      const generated = generateOptionsFromPrompt(targetPrompt, selectedSection?.title || '제안서 섹션');
      setAiDraftOptions(generated);
      setHasGeneratedDrafts(true);
      onShowToast(`AI 검토 결과('${category}')가 작성 프롬프트에 자동 입력되어 맞춤형 추천안 3종이 구성되었습니다.`);
    }, 700);
  };

  const handleApplyAiDraft = (content: string, mode?: 'replace-selection' | 'append-selection' | 'replace-all' | 'append-all') => {
    const finalMode = mode || (promptContext?.selectedText ? 'replace-selection' : 'append-all');

    if (finalMode === 'replace-all') {
      setEditorText(content);
      onShowToast('선택한 AI 추천안으로 본문 전체가 교체되었습니다.');
    } else if (finalMode === 'append-all') {
      if (!editorText || editorText.trim() === '') {
        setEditorText(content);
      } else {
        setEditorText(prev => `${prev}\n\n${content}`);
      }
      onShowToast('선택한 AI 추가안이 본문 끝에 성공적으로 추가되었습니다.');
    } else if (finalMode === 'replace-selection' && promptContext?.selectedText && promptContext?.range) {
      const { start, end } = promptContext.range;
      if (editorText.substring(start, end) === promptContext.selectedText) {
        const newText = editorText.substring(0, start) + content + editorText.substring(end);
        setEditorText(newText);
      } else if (editorText.includes(promptContext.selectedText)) {
        setEditorText(editorText.replace(promptContext.selectedText, content));
      } else {
        setEditorText(prev => prev ? `${prev}\n\n${content}` : content);
      }
      onShowToast('선택한 AI 수정안이 선택 영역에 성공적으로 반영되었습니다.');
    } else if (finalMode === 'append-selection' && promptContext?.selectedText && promptContext?.range) {
      const { start, end } = promptContext.range;
      if (editorText.substring(start, end) === promptContext.selectedText) {
        const newText = editorText.substring(0, start) + promptContext.selectedText + " " + content + editorText.substring(end);
        setEditorText(newText);
      } else if (editorText.includes(promptContext.selectedText)) {
        setEditorText(editorText.replace(promptContext.selectedText, promptContext.selectedText + " " + content));
      } else {
        setEditorText(prev => prev ? `${prev}\n\n${content}` : content);
      }
      onShowToast('선택한 AI 보강안이 선택 영역 뒤에 성공적으로 보강되었습니다.');
    } else {
      if (!editorText || editorText.trim() === '') {
        setEditorText(content);
      } else {
        setEditorText(prev => `${prev}\n\n${content}`);
      }
      onShowToast('선택한 AI 추천안이 본문에 성공적으로 반영되었습니다.');
    }
  };

  const handleRunAiReview = () => {
    setIsReviewing(true);
    onShowToast('AI가 7대 평가 기준(준수사항, Win Plan, 방법론, 근거, 견고성, 차별성, 문법)을 정밀 검토 중입니다...');
    setTimeout(() => {
      setIsReviewing(false);
      setHasRunReview(true);
      setReviewResults(REVIEW_RESULTS_DATA);
      onShowToast('7대 평가 기준 정밀 검토가 완료되었습니다. 검토 결과 카드를 확인하세요.');
    }, 800);
  };

  // Text selection handler on textarea with precise cursor coordinates
  const updateSelectionAndPosition = (clientX?: number, clientY?: number) => {
    const textarea = textareaRef.current;
    const container = editorContainerRef.current;
    if (!textarea || !container) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (end > start) {
      const txt = textarea.value.substring(start, end);
      if (txt.trim().length > 0) {
        setSelectedText(txt);
        setSelectionRange({ start, end });

        const containerRect = container.getBoundingClientRect();
        let posX = 0;
        let posY = 0;

        if (clientX !== undefined && clientY !== undefined) {
          posX = clientX - containerRect.left;
          posY = clientY - containerRect.top + container.scrollTop;
        } else {
          const textareaRect = textarea.getBoundingClientRect();
          posX = (textareaRect.left + textareaRect.right) / 2 - containerRect.left;
          posY = textareaRect.top - containerRect.top + 60 + container.scrollTop;
        }

        // Bounded within container width
        const minX = 140;
        const maxX = Math.max(minX, containerRect.width - 140);
        const clampedX = Math.max(minX, Math.min(maxX, posX));
        const clampedY = Math.max(30, posY - 8);

        setFloatingPos({ x: clampedX, y: clampedY });
        setShowFloatingToolbar(true);
        return;
      }
    }

    // When selection is empty/cleared, dismiss popup immediately
    setShowFloatingToolbar(false);
    setShowSelectionRefineMenu(false);
    setShowSelectionProofMenu(false);
    setSelectedText('');
    setSelectionRange(null);
    setFloatingPos(null);
  };

  const handleEditorTextChange = (nextText: string) => {
    setEditorText(nextText);
    setShowFloatingToolbar(false);
    setShowSelectionRefineMenu(false);
    setShowSelectionProofMenu(false);

    const currentSection = sections.find(section => section.id === selectedSection.id);
    if (
      viewMode === 'detail' &&
      currentSection?.status === '시작 전' &&
      nextText.trim().length > 0
    ) {
      setSelectedSection(previous => ({ ...previous, status: '작성 중' }));
      updateSectionsAndNotify(previous => previous.map(section =>
        section.id === selectedSection.id
          ? { ...section, status: '작성 중' }
          : section
      ));
      onShowToast(`'${selectedSection.title}' 섹션 작성이 시작되어 상태가 자동으로 [작성 중]으로 변경되었습니다.`);
    }
  };

  const handleTextSelect = () => {
    updateSelectionAndPosition();
  };

  const handleSelectionProofAction = (proofType: string) => {
    if (!selectionRange || !selectedText) return;
    onShowToast(`선택 영역 '${proofType}' 보강 추천 옵션 3종을 생성 중입니다...`);
    setTimeout(() => {
      let add1 = '', add2 = '', add3 = '';
      if (proofType === '출처 삽입' || proofType === '사내 근거 및 출처 삽입') {
        add1 = ` (KPC 정보보안 기본지침 제12조 및 RFP 기술요구사항 검토서 기준 준용)`;
        add2 = ` (한국생산성본부(KPC) 공공 혁신 제안 가이드라인(2026.04) 기준 준용)`;
        add3 = ` (과학기술정보통신부 초거대 AI 가이드 준용 가용 사양서 기준 준용)`;
      } else if (proofType === '설명 추가') {
        add1 = `\n- 이에 따라 KPC 고유 인프라 연계 구조 및 운영 검증 프로토콜을 적극적으로 준수하게 됩니다.`;
        add2 = `\n- 아울러 24시간 가용성을 완벽히 검증하기 위해 정밀 점검 절차와 자동 복구 시나리오를 설계 보강합니다.`;
        add3 = `\n- 또한 다중 클라우드 가동 규격 및 표준 백업 체계를 완전히 정렬하여 높은 신뢰도를 정밀 입증합니다.`;
      } else if (proofType === '통계 추가') {
        add1 = ` (관련 KPC 지표: 99.8% 달성률 및 3.5배 성능 향상 실적 확보)`;
        add2 = ` (실증 통계: 연간 제안 수행 운영 공수 65% 절감 및 수작업 오류 99% 배제 성과)`;
        add3 = ` (통계 검증: 누적 2.4만 시간 안정 가동 이력 기준 상시 안정 신뢰도 99.9% 보증)`;
      } else if (proofType === '사례 연구 추가') {
        add1 = ` (유사 사례: 2026 행정안전부 디지털플랫폼정부 공통기반 연계 1위 수주 및 성공 사례 적극 반영)`;
        add2 = ` (사례 연구: KPC 1위 보안 프레임워크 적용 성과 모델 및 대규모 인프라 다중 가용 구축 실적 연동)`;
        add3 = ` (사례 연구: 정부 표준 가이드라인 등재 우수 모범 벤치마킹 연계 아키텍처 모델 수렴 적용)`;
      } else if (proofType === '내용 확장') {
        add1 = ` (또한, 본 과제의 지속 가능한 운영을 위해 핵심 전담 인력 매칭 및 단계별 가용성 검증 시나리오를 설계하여 실행 타당성을 한층 강화합니다.)`;
        add2 = ` (이에 가제안 이탈률 방지를 위한 보조 가이드라인 수립과 가상 가동 안정 실증 평가를 전면 보완합니다.)`;
        add3 = ` (더불어, 예외적 시나리오 제어 및 이중화 백업 시스템의 장기 보장 로드맵을 설계하여 높은 완성도를 입증합니다.)`;
      }

      const options = [
        { id: 1, title: `옵션 1: ${proofType} 표준 보강안`, desc: '', content: add1.trim(), mode: 'append-selection' as const },
        { id: 2, title: `옵션 2: ${proofType} 구체성 강화안`, desc: '', content: add2.trim(), mode: 'append-selection' as const },
        { id: 3, title: `옵션 3: ${proofType} 경쟁 차별화안`, desc: '', content: add3.trim(), mode: 'append-selection' as const }
      ];

      setAiDraftOptions(options);
      setHasGeneratedDrafts(true);
      setPromptContext({
        promptText: `선택 영역 보강: ${proofType}`,
        selectedText,
        range: selectionRange
      });
      setShowFloatingToolbar(false);
      setShowSelectionProofMenu(false);
      setActiveRightTab('writing');
      onShowToast(`[보강 - ${proofType}] 추천 옵션 3종이 생성되어 [작성] 탭에 표시됩니다.`);
    }, 450);
  };

  const handleSelectionRefine = (refineType: string) => {
    if (!selectionRange || !selectedText) return;
    onShowToast(`선택 영역 '${refineType}' 수정 추천 옵션 3종을 생성 중입니다...`);
    setTimeout(() => {
      let r1 = selectedText, r2 = selectedText, r3 = selectedText;
      if (refineType === '문법교정' || refineType === '문법 교정') {
        r1 = selectedText.replace(/임다/g, '입니다').replace(/겠읍니다/g, '겠습니다').replace(/함니/g, '합니다').replace(/요\./g, '습니다.');
        r2 = selectedText.replace(/임다/g, '입니다.').replace(/겠읍니다/g, '겠습니다.').replace(/요\./g, '습니다.').replace(/했음/g, '했습니다.');
        r3 = selectedText.replace(/함/g, '하며,').replace(/임다/g, '입니다.').replace(/요\./g, '습니다.').replace(/수 있음/g, '할 수 있습니다.');
      } else if (refineType === '문장 다듬기') {
        r1 = selectedText.replace(/합니다\./g, '하여 최상의 안정성과 성능 품질을 보장합니다.').replace(/됩니다\./g, '되도록 선제적으로 철저하게 검증합니다.');
        r2 = selectedText.replace(/합니다\./g, '하여 생산 효율성을 극대화하며 최신 보안 규격을 철저하게 충족합니다.').replace(/됩니다\./g, '되도록 완벽한 무장애 수행 프로세스를 완성합니다.');
        r3 = selectedText.replace(/합니다\./g, '하여 차별적인 고객 만족을 주도합니다.').replace(/됩니다\./g, '되도록 정량적 점검 절차를 체계적으로 적용합니다.');
      } else if (refineType === '단어수 줄이기' || refineType === '단어 수 줄이기') {
        const words = selectedText.split(/\s+/);
        r1 = words.slice(0, Math.max(2, Math.ceil(words.length * 0.75))).join(' ') + '...';
        r2 = words.slice(0, Math.max(2, Math.ceil(words.length * 0.6))).join(' ') + '...';
        r3 = words.slice(0, Math.max(1, Math.ceil(words.length * 0.45))).join(' ') + '...';
      }

      const options = [
        { id: 1, title: `옵션 1: ${refineType} 표준 교정안`, desc: '', content: r1, mode: 'replace-selection' as const },
        { id: 2, title: `옵션 2: ${refineType} 공식 비즈니스안`, desc: '', content: r2, mode: 'replace-selection' as const },
        { id: 3, title: `옵션 3: ${refineType} 고급 신뢰안`, desc: '', content: r3, mode: 'replace-selection' as const }
      ];

      setAiDraftOptions(options);
      setHasGeneratedDrafts(true);
      setPromptContext({
        promptText: `선택 영역 수정: ${refineType}`,
        selectedText,
        range: selectionRange
      });
      setShowFloatingToolbar(false);
      setShowSelectionRefineMenu(false);
      setActiveRightTab('writing');
      onShowToast(`[수정 - ${refineType}] 추천 옵션 3종이 생성되어 [작성] 탭에 표시됩니다.`);
    }, 450);
  };

  const handleSelectionComment = () => {
    if (!selectedText) return;
    setActiveRightTab('comments');
    setNewCommentInput(`@팀원 [선택 문구 검토 요청] "${selectedText.slice(0, 30)}..." 부분의 추가 검토가 필요합니다.`);
    setShowFloatingToolbar(false);
    setShowSelectionRefineMenu(false);
    onShowToast(`선택 문구에 대한 검토 댓글 작성창으로 이동했습니다.`);
  };

  const handleExecuteSelectionExpand = () => {
    if (!selectionRange || !selectedText) return;
    setIsSelectionExpanding(true);
    onShowToast(`선택 영역에 대해 +${selectionExpandCount}자 분량의 추천 옵션 3종을 생성 중입니다...`);
    setTimeout(() => {
      setIsSelectionExpanding(false);
      setShowSelectionProofMenu(false);
      setShowFloatingToolbar(false);

      const addition1 = ` (추가 내용 확장: KPC 핵심 추진 표준 프레임워크와 결합하여 고도의 성능 가속화를 견인함은 물론, 본 사업의 장기 가동 안정성을 ${selectionExpandCount}자 규모로 실증 보강하여 완벽한 실행력을 체계적으로 확보 및 입증합니다.)`;
      const addition2 = ` (상세 추가 확장: 다중 가용 인프라 자원 연계 가이드라인을 구체화하여 예외 상황에서도 서비스 이탈 현상을 원천 배제하고, 장기 무장애 운영을 견인하는 신뢰 높은 로드맵을 ${selectionExpandCount}자로 추가 설계합니다.)`;
      const addition3 = ` (기술 추가 확장: 국가 보안 표준(Zero Data Retention) 규격을 엄격히 반영하는 한편, 상시 전담 센터의 대응력을 구체화하여 공인 기술 검증 수준의 완벽한 신뢰를 입증하는 ${selectionExpandCount}자 상세안을 탑재합니다.)`;

      const options = [
        { id: 1, title: '옵션 1: 타당성 실증 확장안', desc: '', content: addition1.trim(), mode: 'append-selection' as const },
        { id: 2, title: '옵션 2: 무장애 연속성 보완안', desc: '', content: addition2.trim(), mode: 'append-selection' as const },
        { id: 3, title: '옵션 3: 국가 보안 규격 준수안', desc: '', content: addition3.trim(), mode: 'append-selection' as const }
      ];

      setAiDraftOptions(options);
      setHasGeneratedDrafts(true);
      setPromptContext({
        promptText: `선택 영역 내용 확장 (+${selectionExpandCount}자)`,
        selectedText,
        range: selectionRange
      });
      setActiveRightTab('writing');
      onShowToast(`[보강 - 내용 확장] 추천 옵션 3종이 생성되어 [작성] 탭에 표시됩니다.`);
    }, 450);
  };

  const handleExecuteSelectionReduce = () => {
    if (!selectionRange || !selectedText) return;
    setIsSelectionReducing(true);
    onShowToast(`선택 영역을 ${selectionReduceCount}% 수준으로 압축한 추천 옵션 3종을 생성 중입니다...`);
    setTimeout(() => {
      setIsSelectionReducing(false);
      setShowSelectionRefineMenu(false);
      setShowFloatingToolbar(false);
      
      const ratio = (100 - selectionReduceCount) / 100;
      const wordCount = selectedText.split(/\s+/).length;
      
      const keepWords1 = Math.max(2, Math.ceil(wordCount * ratio));
      const reduced1 = selectedText.split(/\s+/).slice(0, keepWords1).join(' ') + '... (표준 압축)';
      
      const keepWords2 = Math.max(1, Math.ceil(wordCount * (ratio * 0.9)));
      const reduced2 = selectedText.split(/\s+/).slice(0, keepWords2).join(' ') + '... (핵심 단어 요약)';
      
      const keepWords3 = Math.max(1, Math.ceil(wordCount * (ratio * 0.8)));
      const reduced3 = selectedText.split(/\s+/).slice(0, keepWords3).join(' ') + ' (개조식 명확화)';

      const options = [
        { id: 1, title: '옵션 1: 핵심 의미 보존안', desc: '', content: reduced1, mode: 'replace-selection' as const },
        { id: 2, title: '옵션 2: 고밀도 정보 요약안', desc: '', content: reduced2, mode: 'replace-selection' as const },
        { id: 3, title: '옵션 3: 개조식 명제 단축안', desc: '', content: reduced3, mode: 'replace-selection' as const }
      ];

      setAiDraftOptions(options);
      setHasGeneratedDrafts(true);
      setPromptContext({
        promptText: `선택 영역 단어 수 줄이기 (${selectionReduceCount}%)`,
        selectedText,
        range: selectionRange
      });
      setActiveRightTab('writing');
      onShowToast(`[수정 - 단어 수 줄이기] 추천 옵션 3종이 생성되어 [작성] 탭에 표시됩니다.`);
    }, 450);
  };

  const handleExecuteAiPromptWrite = () => {
    const promptText = aiWritePrompt.trim();
    if (!promptText) {
      onShowToast('AI 작성 프롬프트를 입력해 주세요.');
      return;
    }
    setIsAiWriting(true);
    onShowToast(`[AI 작성] "${promptText.slice(0, 20)}..." 프롬프트에 맞춰 3가지 옵션 추천안 생성 중...`);
    setTimeout(() => {
      setIsAiWriting(false);
      setShowAiPromptBox(false);

      const currentSelText = selectedText.trim() ? selectedText : undefined;
      const currentRange = selectionRange ? { ...selectionRange } : undefined;

      const options = [
        {
          id: 1,
          title: '옵션 1: 요구사항 표준 보강안',
          desc: '입력한 지시사항을 반영한 표준 추천안입니다.',
          content: currentSelText 
            ? `${currentSelText} 관련하여 제시된 요구사항인 "${promptText}"을 완벽히 이행하며, KPC Enterprise AI 아키텍처 및 Zero Data Retention(ZDR) 보안 프레임워크를 연계 준수하여 안정적인 가동 기반을 정밀하게 확보합니다.`
            : `제시된 요구사항인 "${promptText}"을 완벽히 이행하며, KPC Enterprise AI 아키텍처 및 Zero Data Retention(ZDR) 보안 프레임워크를 연계 준수하여 안정적인 가동 기반을 정밀하게 확보합니다.`,
          mode: currentSelText ? ('replace-selection' as const) : ('append-all' as const)
        },
        {
          id: 2,
          title: '옵션 2: 정량 수치 & 실행 구체화안',
          desc: '구체적인 정량적 목표 수치와 세부 실행 절차를 보강한 추천안입니다.',
          content: currentSelText
            ? `${currentSelText} 추진 시 요구사항인 "${promptText}"에 맞추어 실무 단계별 이행 수치를 보강합니다. 이를 통해 수작업 검토 시간을 65% 절감하고 99.9% 서비스 무장애 가동률을 달성하는 정량적 지표를 확보합니다.`
            : `요구사항인 "${promptText}"에 맞추어 실무 단계별 이행 수치를 보강합니다. 이를 통해 수작업 검토 시간을 65% 절감하고 99.9% 서비스 무장애 가동률을 달성하는 정량적 지표를 확보합니다.`,
          mode: currentSelText ? ('replace-selection' as const) : ('append-all' as const)
        },
        {
          id: 3,
          title: '옵션 3: 전략적 차별화 & 우위안',
          desc: '독보적 노하우와 자산을 결합하여 제안의 우위와 차별성을 강조한 추천안입니다.',
          content: currentSelText
            ? `${currentSelText} 전략에 부합하도록 "${promptText}"을 최적화 적용하고, KPC의 60년 독보적 노하우 자산과 Multi-LLM 하이브리드 자동 전환 솔루션을 결합하여 압도적인 제안 우위를 완성합니다.`
            : `전략에 부합하도록 "${promptText}"을 최적화 적용하고, KPC의 60년 독보적 노하우 자산과 Multi-LLM 하이브리드 자동 전환 솔루션을 결합하여 압도적인 제안 우위를 완성합니다.`,
          mode: currentSelText ? ('replace-selection' as const) : ('append-all' as const)
        }
      ];

      setAiDraftOptions(options);
      setHasGeneratedDrafts(true);
      setPromptContext({
        promptText,
        selectedText: currentSelText,
        range: currentRange
      });
      setActiveRightTab('writing');
      onShowToast('[AI 작성] 프롬프트 맞춤 3대 옵션 추천안이 생성되었습니다. [작성] 탭에서 확인하세요.');
      setAiWritePrompt('');
    }, 600);
  };

  const handleExecuteDropdownExpand = () => {
    setIsExpanding(true);
    setShowProofMenu(false);
    onShowToast(`보강 기반 본문내용(+${customExpandCount}자)의 추천 옵션 3종을 생성 중입니다...`);
    setTimeout(() => {
      setIsExpanding(false);
      const addition1 = `본 사업의 완벽한 이행을 위해 KPC 전담 지원 센터를 상시 가동하며, 분기별 AI 성능 평가 지표(응답 정확도 95% 이상, 장애 조치 30분 이내)를 정량화하여 측정합니다. 또한 공공기관 대상 60년 컨설팅 방법론을 접목하여 현업 업무 효율 50% 향상을 달성합니다.`;
      const addition2 = `실행력을 강화하기 위한 상세 이행 조직 매칭과 2차 검증 프로토콜을 가동합니다. 장애 발생 시 상시 헬프데스크가 즉각 작동하여 무장애 보장 수준을 99.99%로 유지하고, 정기 리포트를 제공해 지속적인 보장성을 증명합니다.`;
      const addition3 = `KPC Multi-LLM 하이브리드 엔진 아키텍처의 연동 유연성을 확장하고, 데이터 보존 및 무장애 가속 프로토콜을 준수하는 다중 가용 백업 시스템을 가동하여 인적 공수 절감율을 65% 이상 실현합니다.`;

      const options = [
        { id: 1, title: '옵션 1: 보강 중심 표준 확장안', desc: '', content: addition1.trim(), mode: 'append-all' as const },
        { id: 2, title: '옵션 2: 상세 운영체계 보완안', desc: '', content: addition2.trim(), mode: 'append-all' as const },
        { id: 3, title: '옵션 3: 이중화 아키텍처 실증안', desc: '', content: addition3.trim(), mode: 'append-all' as const }
      ];
      setAiDraftOptions(options);
      setHasGeneratedDrafts(true);
      setPromptContext(null);
      setActiveRightTab('writing');
      onShowToast(`[보강 - 내용 확장] 추천 옵션 3종이 생성되어 [작성] 탭에 표시됩니다.`);
    }, 450);
  };

  const handleExecuteDropdownReduce = () => {
    setIsReducing(true);
    setShowRefineMenu(false);
    onShowToast(`본문 내용(축소율 ${customReduceCount}%)의 추천 옵션 3종을 생성 중입니다...`);
    setTimeout(() => {
      setIsReducing(false);
      if (!editorText || !editorText.trim()) {
        onShowToast('줄일 텍스트 내용이 없습니다.');
        return;
      }
      const paragraphs = editorText.split('\n');
      const ratio = (100 - customReduceCount) / 100;
      
      const keepLines1 = Math.max(3, Math.ceil(paragraphs.length * ratio));
      const text1 = paragraphs.slice(0, keepLines1).join('\n');
      
      const keepLines2 = Math.max(2, Math.ceil(paragraphs.length * (ratio * 0.9)));
      const text2 = paragraphs.slice(0, keepLines2).join('\n');
      
      const keepLines3 = Math.max(1, Math.ceil(paragraphs.length * (ratio * 0.8)));
      const text3 = paragraphs.slice(0, keepLines3).join('\n');

      const options = [
        { id: 1, title: '옵션 1: 표준 압축안', desc: '', content: text1, mode: 'replace-all' as const },
        { id: 2, title: '옵션 2: 핵심 요약안', desc: '', content: text2, mode: 'replace-all' as const },
        { id: 3, title: '옵션 3: 보고서형 간결안', desc: '', content: text3, mode: 'replace-all' as const }
      ];
      setAiDraftOptions(options);
      setHasGeneratedDrafts(true);
      setPromptContext(null);
      setActiveRightTab('writing');
      onShowToast(`[수정 - 단어 수 줄이기] 추천 옵션 3종이 생성되어 [작성] 탭에 표시됩니다.`);
    }, 450);
  };

  const handleGlobalProofAction = (proofType: string) => {
    setShowProofMenu(false);
    onShowToast(`전체 대상 '${proofType}' 보강 추천 옵션 3종을 생성 중입니다...`);
    setTimeout(() => {
      let add1 = '', add2 = '', add3 = '';
      if (proofType === '설명 추가') {
        add1 = `본 사업의 이행을 완벽히 수렴하여 KPC 고유 인프라 가이드라인 및 국가 보안 규격을 철저히 준수합니다.`;
        add2 = `24시간 무중단 자동 복구 시나리오를 통합하여 예측하기 어려운 장애 변수로부터 완벽한 실행 안정성을 확보하겠습니다.`;
        add3 = `인프라 가용성 검증 시나리오와 Multi-LLM 하이브리드 엔진 규격을 완전히 탑재하여 일관된 수행 능력을 입증합니다.`;
      } else if (proofType === '통계 추가') {
        add1 = `유사 대형 인프라 구축의 누적 데이터를 정밀 분석한 결과, 연간 운영 시간 65% 절감 성과 및 시스템 신뢰도 99.8% 달성 지표를 확보하였습니다.`;
        add2 = `자체 실적 메타 분석 기준, 업무 재배치 효율 35% 증가 및 초기 도입 자원 효율 3.5배의 성능 가속 지표를 결합합니다.`;
        add3 = `자동 검증 엔진 도입 시 오작동율 99.9% 감소 및 실시간 장애 대응 속도 4.5배 개선 실증 통계를 반영합니다.`;
      } else if (proofType === '사례 연구 추가') {
        add1 = `2026 행정안전부 디지털플랫폼정부 공통기반 연계 1위 수주 사례 및 유사 보안 프레임워크 적용 성과 모델을 적극 벤치마킹하여 투영합니다.`;
        add2 = `공공기관 EA 표준 검증 가이드에 수록된 대규모 다중 가용 시스템 연계 및 성공적인 이행 프로세스 수립 실적 사례를 수록합니다.`;
        add3 = `행정업무 간소화 및 표준 검증 가이드라인의 우수 등재 모델을 벤치마킹하여 성능 완성도를 정밀 구축하였습니다.`;
      } else if (proofType === '출처 삽입') {
        add1 = `한국생산성본부(KPC) 공공 혁신 제안 가이드라인(2026.04) 및 과학기술정보통신부 초거대 AI 가이드 준수 사항을 완벽히 보장합니다.`;
        add2 = `KPC 사내 정보보안 기본지침 제12조 및 RFP 공식 기술요구사항 검토 사양 기준을 적극 준용합니다.`;
        add3 = `디지털플랫폼정부 공통기반 연계 기준 고시 제2026-4호 표준 아키텍처 설계 수립 규격을 철저히 충실 준수합니다.`;
      }

      const options = [
        { id: 1, title: `옵션 1: ${proofType} 표준 반영안`, desc: '', content: add1.trim(), mode: 'append-all' as const },
        { id: 2, title: `옵션 2: ${proofType} 실행 구체화안`, desc: '', content: add2.trim(), mode: 'append-all' as const },
        { id: 3, title: `옵션 3: ${proofType} 차별성 부각안`, desc: '', content: add3.trim(), mode: 'append-all' as const }
      ];
      setAiDraftOptions(options);
      setHasGeneratedDrafts(true);
      setPromptContext(null);
      setActiveRightTab('writing');
      onShowToast(`[보강 - ${proofType}] 추천 옵션 3종이 생성되어 [작성] 탭에 표시됩니다.`);
    }, 450);
  };

  const handleGlobalRefineAction = (refineType: string) => {
    setShowRefineMenu(false);
    if (!editorText || !editorText.trim()) {
      onShowToast('문서 내용이 비어있어 수정 작업을 진행할 수 없습니다.');
      return;
    }
    onShowToast(`전체 대상 '${refineType}' 수정 추천 옵션 3종을 생성 중입니다...`);
    setTimeout(() => {
      let text1 = editorText, text2 = editorText, text3 = editorText;
      if (refineType === '문법 교정') {
        text1 = editorText.replace(/임다/g, '입니다').replace(/겠읍니다/g, '겠습니다').replace(/함니/g, '합니다').replace(/요\./g, '습니다.');
        text2 = editorText.replace(/임다/g, '입니다.').replace(/겠읍니다/g, '겠습니다.').replace(/요\./g, '습니다.').replace(/했음/g, '했습니다.');
        text3 = editorText.replace(/함/g, '하며,').replace(/임다/g, '입니다.').replace(/요\./g, '습니다.').replace(/수 있음/g, '할 수 있습니다.');
      } else if (refineType === '문장 다듬기') {
        text1 = editorText.replace(/합니다\./g, '하여 최상의 안정성과 성능 품질을 보장합니다.').replace(/됩니다\./g, '되도록 선제적으로 철저하게 검증합니다.');
        text2 = editorText.replace(/합니다\./g, '하여 생산 효율성을 극대화하며 최신 보안 규격을 철저하게 충족합니다.').replace(/됩니다\./g, '되도록 완벽한 무장애 수행 프로세스를 완성합니다.');
        text3 = editorText.replace(/합니다\./g, '하여 차별적인 고객 만족을 주도합니다.').replace(/됩니다\./g, '되도록 정량적 점검 절차를 체계적으로 적용합니다.');
      } else if (refineType === '요약') {
        text1 = `[요약 1안]\n본 제안서는 한국생산성본부(KPC)의 공공 디지털 혁신 표준 가이드 및 보안 표준을 만족하는 고성능 솔루션을 제안합니다.\n\n${editorText}`;
        text2 = `[요약 2안]\n인프라 연계 안정성 99.8% 달성 및 운영 생산성 50% 혁신을 도모하는 핵심 로드맵 요약본입니다.\n\n${editorText}`;
        text3 = `[요약 3안]\nMulti-LLM 하이브리드 엔진 및 사내 지식자산 활용을 통한 차별적 제안 경쟁 우위 요약본입니다.\n\n${editorText}`;
      }

      const options = [
        { id: 1, title: `옵션 1: ${refineType} 표준 완성안`, desc: '', content: text1, mode: 'replace-all' as const },
        { id: 2, title: `옵션 2: ${refineType} 세련된 문체 적용안`, desc: '', content: text2, mode: 'replace-all' as const },
        { id: 3, title: `옵션 3: ${refineType} 비즈니스 신뢰안`, desc: '', content: text3, mode: 'replace-all' as const }
      ];
      setAiDraftOptions(options);
      setHasGeneratedDrafts(true);
      setPromptContext(null);
      setActiveRightTab('writing');
      onShowToast(`[수정 - ${refineType}] 추천 옵션 3종이 생성되어 [작성] 탭에 표시됩니다.`);
    }, 450);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentInput.trim()) return;
    const newComm: ProposalComment = {
      id: `c-${Date.now()}`,
      author: '정소담 (나)',
      date: '방금 전',
      text: newCommentInput.trim(),
      resolved: false,
      selectedTextSnippet: '핵심 추진 전략',
      replies: []
    };
    setComments(prev => [newComm, ...prev]);
    setNewCommentInput('');
    onShowToast('새 검토 댓글이 등록되었습니다.');
  };

  const handleAddReply = (commentId: string) => {
    if (!replyInputText.trim()) return;
    const now = new Date();
    const dateStr = `${now.getFullYear().toString().slice(-2)}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newReply = {
      id: `r-${replyIdCounter.current++}`,
      author: '정소담 (나)',
      date: dateStr,
      text: replyInputText.trim()
    };

    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return {
          ...c,
          replies: [...(c.replies || []), newReply]
        };
      }
      return c;
    }));

    setReplyInputText('');
    setReplyingCommentId(null);
    onShowToast('답글이 등록되었습니다.');
  };

  const handleExportProposal = (format: 'Word' | 'PDF') => {
    setShowExportModal(false);
    onShowToast(`KPC 제안서 전체 완본(${format})이 지정된 옵션으로 성공적으로 생성되었습니다.`);
    if (onExportDone) onExportDone();
  };

  const handleRestoreVersion = (ver: EditorVersion) => {
    setEditorText(ver.content);
    setShowVersionModal(false);
    onShowToast(`버전 [${ver.versionCode}] '${ver.title}'(으)로 에디터 본문이 복원되었습니다.`);
  };

  const handleOpenSaveVersionModal = () => {
    const nextVerCode = `v${versionHistory.length + 1}`;
    setSaveVersionInput(`사용자 수동 저장본_${nextVerCode}`);
    setShowSaveVersionModal(true);
  };

  const handleConfirmSaveVersion = (customTitle: string) => {
    const finalTitle = customTitle.trim() || '사용자 수동 저장본';

    // 1. Sync current state back to active sections list
    updateSectionsAndNotify(prev => prev.map(s => s.id === selectedSection.id ? {
      ...s,
      title: sectionTitle,
      content: editorText,
      currentCharCount: editorText.length,
      status: s.status === '시작 전' ? '작성 중' : s.status
    } : s));

    // 2. Add manual save version to history state
    const now = new Date();
    const formattedDate = `26.09.14 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const nextVerCode = `v${versionHistory.length + 1}`;
    const newVersion: EditorVersion = {
      id: `v-${Date.now()}`,
      versionCode: nextVerCode,
      title: finalTitle,
      createdAt: formattedDate,
      author: '정소담',
      content: editorText
    };

    setVersionHistory(prev => [newVersion, ...prev]);
    setSelectedVersionPreview(newVersion);
    setShowSaveVersionModal(false);
    onShowToast(`현재 내용이 [${nextVerCode}] '${finalTitle}' 버전으로 성공적으로 저장되었습니다.`);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8F9FA]">
      {/* CASE 1: 제안서 전체 구성 화면 (목차 리스트 / 섹션 관리 테이블) */}
      {viewMode === 'overview' && (
        <div className="flex-1 flex flex-col h-full overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            {/* Top Breadcrumb & Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-200 gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs text-neutral-500 font-semibold mb-1">
                  <button
                    type="button"
                    onClick={onNavigateToProjects}
                    className="hover:text-[#E60012] hover:underline cursor-pointer transition-colors"
                  >
                    전체 프로젝트
                  </button>
                  <span className="text-neutral-400">&gt;</span>
                  <button
                    type="button"
                    onClick={onNavigateToProjectRoot}
                    className="text-[#111111] font-bold hover:text-[#E60012] hover:underline cursor-pointer transition-colors truncate max-w-[280px]"
                    title={activeProject?.title || 'KPC 생성형 AI 플랫폼 구축 사업'}
                  >
                    {activeProject?.title || 'KPC 생성형 AI 플랫폼 구축 사업'}
                  </button>
                  <span className="text-neutral-400">&gt;</span>
                  <span className="text-[#E60012] font-black">04 제안서 작성</span>
                </div>
                <h1 className="text-2xl font-black text-[#111111] tracking-tight">
                  제안서 작성
                </h1>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0">
                {/* View Mode Toggle (목록 형태 / 칸반 형태) */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-neutral-200 shadow-2xs shrink-0">
                  <button
                    id="overview-view-list-btn"
                    onClick={() => setOverviewViewMode('list')}
                    className={`p-1.5 rounded transition-all cursor-pointer shrink-0 ${
                      overviewViewMode === 'list'
                        ? 'bg-[#111111] text-white shadow-2xs'
                        : 'text-neutral-500 hover:text-[#111111] hover:bg-neutral-100'
                    }`}
                    title="목록 형태로 보기"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    id="overview-view-kanban-btn"
                    onClick={() => setOverviewViewMode('kanban')}
                    className={`p-1.5 rounded transition-all cursor-pointer shrink-0 ${
                      overviewViewMode === 'kanban'
                        ? 'bg-[#111111] text-white shadow-2xs'
                        : 'text-neutral-500 hover:text-[#111111] hover:bg-neutral-100'
                    }`}
                    title="상태별 칸반 형태로 보기"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* VIEW MODE 1: LIST / TABLE VIEW */}
            {overviewViewMode === 'list' ? (
              <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-visible">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-[#F8F9FA] border-b border-neutral-200 text-neutral-600 font-bold">
                      <th className="py-3 px-3 w-12 text-center whitespace-nowrap">이동</th>
                      <th className="py-3 px-4 w-80">제목 (목차)</th>
                      <th className="py-3 px-3 w-32 text-center whitespace-nowrap">상태</th>
                      <th className="py-3 px-3 w-32 text-center whitespace-nowrap">작성자</th>
                      <th className="py-3 px-3 w-32 text-center whitespace-nowrap">검토자</th>
                      <th className="py-3 px-3 w-32 text-center whitespace-nowrap">마감일</th>
                      <th className="py-3 px-3 w-28 text-right whitespace-nowrap">글자 제한</th>
                      <th className="py-3 px-3 w-28 text-right whitespace-nowrap">현재 글자 수</th>
                      <th className="py-3 px-4 w-36 text-center whitespace-nowrap">작업 / 설정</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {(() => {
                      // Pre-calculate parent-child map for sub-section collapse
                      const chapterChildCounts: Record<string, number> = {};
                      let currentL1Id = '';
                      const itemParentMap: Record<string, string> = {};

                      sections.forEach(sec => {
                        if (sec.level === 1) {
                          currentL1Id = sec.id;
                          chapterChildCounts[currentL1Id] = 0;
                        } else if (sec.level === 2 && currentL1Id) {
                          chapterChildCounts[currentL1Id] = (chapterChildCounts[currentL1Id] || 0) + 1;
                          itemParentMap[sec.id] = currentL1Id;
                        }
                      });

                      return sections.map(sec => {
                        const isDragging = draggedSecId === sec.id;
                        const isDropBefore = dropTargetSecId === sec.id && dropPosition === 'before';
                        const isDropAfter = dropTargetSecId === sec.id && dropPosition === 'after';

                        // Check if this level-2 sub-section's parent is collapsed
                        if (sec.level === 2) {
                          const parentId = itemParentMap[sec.id];
                          if (parentId && collapsedChapterIds[parentId]) {
                            return null;
                          }
                        }

                        const childCount = sec.level === 1 ? (chapterChildCounts[sec.id] || 0) : 0;
                        const isCollapsed = !!collapsedChapterIds[sec.id];

                        return (
                          <React.Fragment key={sec.id}>
                            {/* Drop Top Indicator */}
                            {isDropBefore && (
                              <tr className="bg-transparent border-none">
                                <td colSpan={9} className="p-0">
                                  <div className="h-1 bg-[#E60012] rounded-full my-0.5 animate-pulse shadow-xs" />
                                </td>
                              </tr>
                            )}

                            <tr
                              draggable
                              onDragStart={e => handleDragStart(e, sec.id)}
                              onDragOver={e => handleDragOver(e, sec.id)}
                              onDragLeave={handleDragLeave}
                              onDrop={e => handleDrop(e, sec.id)}
                              onDragEnd={handleDragEnd}
                              onClick={() => handleSelectSection(sec)}
                              className={`hover:bg-neutral-50/90 cursor-pointer transition-all ${
                                sec.level === 2 ? 'bg-neutral-50/50' : ''
                              } ${
                                isDragging
                                  ? 'opacity-40 bg-red-50/50 border-dashed border-[#E60012] scale-[0.99]'
                                  : ''
                              }`}
                            >
                              {/* Drag Column */}
                              <td
                                className="py-3.5 px-3 text-center text-neutral-400 hover:text-[#E60012] cursor-grab active:cursor-grabbing"
                                onClick={e => e.stopPropagation()}
                                title="잡고 드래그하여 순서 변경"
                              >
                                <GripVertical className="w-4 h-4 mx-auto" />
                              </td>

                              {/* Title with Sub-section Collapsible Button */}
                              <td className="py-3.5 px-4 font-bold text-[#111111]">
                                {sec.level === 1 ? (
                                  <div className="flex items-center gap-1.5">
                                    {childCount > 0 ? (
                                      <button
                                        type="button"
                                        onClick={e => {
                                          e.stopPropagation();
                                          setCollapsedChapterIds(prev => ({
                                            ...prev,
                                            [sec.id]: !prev[sec.id]
                                          }));
                                        }}
                                        className="p-1 rounded hover:bg-neutral-200 text-neutral-600 transition-colors shrink-0 cursor-pointer"
                                        title={isCollapsed ? '소목차 펼치기' : '소목차 접기'}
                                      >
                                        {isCollapsed ? (
                                          <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
                                        ) : (
                                          <ChevronDown className="w-3.5 h-3.5 text-neutral-600" />
                                        )}
                                      </button>
                                    ) : (
                                      <span className="w-5 shrink-0" />
                                    )}
                                    <FileText className="w-3.5 h-3.5 shrink-0 text-[#E60012]" />
                                    <span className="hover:text-[#E60012] transition-colors truncate">
                                      {sec.title}
                                    </span>
                                    {isCollapsed && childCount > 0 && (
                                      <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded-md border border-neutral-200 ml-1.5 shrink-0">
                                        소목차 {childCount}개
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 pl-7">
                                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
                                    <FileText className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                                    <span className="hover:text-[#E60012] transition-colors truncate text-neutral-700 font-medium">
                                      {sec.title.trim()}
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Status (Click-to-Edit with Popover) */}
                              <td className="py-3.5 px-3 text-center relative whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setActiveAuthorMenuId(null);
                                    setActiveReviewerMenuId(null);
                                    setActiveSettingsMenuId(null);
                                    setActiveStatusMenuId(prev => prev === sec.id ? null : sec.id);
                                  }}
                                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors cursor-pointer whitespace-nowrap shrink-0 min-w-[84px] ${
                                    sec.status === '완료'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      : sec.status === '검토 중'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                      : sec.status === '검토 대기'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                      : sec.status === '작성 중'
                                      ? 'bg-red-50 text-[#E60012] border-[#E60012]/30 hover:bg-red-100'
                                      : 'bg-neutral-100 text-neutral-600 border-neutral-300 hover:bg-neutral-200'
                                  }`}
                                  title="클릭하여 상태 수정"
                                >
                                  <span className="whitespace-nowrap">{sec.status}</span>
                                  <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
                                </button>

                                {activeStatusMenuId === sec.id && (
                                  <div
                                    onClick={e => e.stopPropagation()}
                                    className="absolute left-1/2 -translate-x-1/2 mt-1 w-32 bg-white rounded-xl shadow-xl border border-neutral-200 py-1.5 z-50 animate-in fade-in duration-100 text-left"
                                  >
                                    {ALL_SECTION_STATUSES.map(st => (
                                      <button
                                        key={st}
                                        onClick={() => handleQuickUpdateStatus(sec.id, st)}
                                        className={`w-full text-left px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer flex items-center justify-between whitespace-nowrap ${
                                          sec.status === st
                                            ? 'bg-red-50 text-[#E60012]'
                                            : 'text-neutral-700 hover:bg-neutral-100'
                                        }`}
                                      >
                                        <span className="whitespace-nowrap">{st}</span>
                                        {sec.status === st && <CheckCircle2 className="w-3.5 h-3.5 text-[#E60012] shrink-0" />}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </td>

                              {/* Author (Click-to-Edit with Popover - Admin Only) */}
                              <td className="py-3.5 px-3 text-center font-medium text-neutral-700 relative whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    if (userRole !== 'admin') {
                                      onShowToast('목차별 업무 담당자(작성자) 배정은 프로젝트 관리자만 가능합니다.');
                                      return;
                                    }
                                    setActiveStatusMenuId(null);
                                    setActiveReviewerMenuId(null);
                                    setActiveSettingsMenuId(null);
                                    setActiveAuthorMenuId(prev => prev === sec.id ? null : sec.id);
                                  }}
                                  className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md border border-transparent font-semibold text-xs whitespace-nowrap shrink-0 min-w-[64px] transition-colors ${
                                    userRole === 'admin'
                                      ? 'hover:bg-neutral-100 hover:text-[#E60012] hover:border-neutral-200 text-neutral-700 cursor-pointer'
                                      : 'text-neutral-600 cursor-default'
                                  }`}
                                  title={userRole === 'admin' ? '클릭하여 작성자 변경' : `작성자: ${sec.author} (관리자 배정)`}
                                >
                                  <span className={`whitespace-nowrap ${userRole === 'admin' ? 'hover:underline' : ''}`}>{sec.author}</span>
                                </button>

                                {userRole === 'admin' && activeAuthorMenuId === sec.id && (
                                  <div
                                    onClick={e => e.stopPropagation()}
                                    className="absolute left-1/2 -translate-x-1/2 mt-1 w-44 bg-white rounded-xl shadow-xl border border-neutral-200 p-2 z-50 animate-in fade-in duration-100"
                                  >
                                    <div className="text-[10px] font-bold text-neutral-400 px-1 mb-1">작성자 선택</div>
                                    <div className="space-y-0.5">
                                      {PRESET_AUTHORS.map(mem => (
                                        <button
                                          key={mem}
                                          onClick={() => handleQuickUpdateAuthor(sec.id, mem)}
                                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-between whitespace-nowrap ${
                                            sec.author === mem
                                              ? 'bg-red-50 text-[#E60012]'
                                              : 'text-neutral-700 hover:bg-neutral-100'
                                          }`}
                                        >
                                          <span className="whitespace-nowrap">{mem}</span>
                                          {sec.author === mem && <Check className="w-3 h-3 text-[#E60012] shrink-0" />}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center gap-1">
                                      <input
                                        type="text"
                                        placeholder="직접 입력"
                                        value={customAuthorInput}
                                        onChange={e => setCustomAuthorInput(e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') handleQuickUpdateAuthor(sec.id, customAuthorInput);
                                        }}
                                        className="flex-1 bg-neutral-50 border border-neutral-200 px-2 py-1 rounded text-xs text-[#111111]"
                                      />
                                      <button
                                        onClick={() => handleQuickUpdateAuthor(sec.id, customAuthorInput)}
                                        className="p-1 bg-[#E60012] text-white rounded hover:bg-[#CC0010] cursor-pointer shrink-0"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Reviewer (Click-to-Edit with Popover - Admin Only) */}
                              <td className="py-3.5 px-3 text-center font-medium text-neutral-700 relative whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    if (userRole !== 'admin') {
                                      onShowToast('목차별 업무 담당자(검토자) 배정은 프로젝트 관리자만 가능합니다.');
                                      return;
                                    }
                                    setActiveStatusMenuId(null);
                                    setActiveAuthorMenuId(null);
                                    setActiveSettingsMenuId(null);
                                    setActiveReviewerMenuId(prev => prev === sec.id ? null : sec.id);
                                  }}
                                  className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md border border-transparent font-semibold text-xs whitespace-nowrap shrink-0 min-w-[64px] transition-colors ${
                                    userRole === 'admin'
                                      ? 'hover:bg-neutral-100 hover:text-[#E60012] hover:border-neutral-200 text-neutral-700 cursor-pointer'
                                      : 'text-neutral-600 cursor-default'
                                  }`}
                                  title={userRole === 'admin' ? '클릭하여 검토자 변경' : `검토자: ${sec.reviewer} (관리자 배정)`}
                                >
                                  <span className={`whitespace-nowrap ${userRole === 'admin' ? 'hover:underline' : ''}`}>{sec.reviewer}</span>
                                </button>

                                {userRole === 'admin' && activeReviewerMenuId === sec.id && (
                                  <div
                                    onClick={e => e.stopPropagation()}
                                    className="absolute left-1/2 -translate-x-1/2 mt-1 w-44 bg-white rounded-xl shadow-xl border border-neutral-200 p-2 z-50 animate-in fade-in duration-100"
                                  >
                                    <div className="text-[10px] font-bold text-neutral-400 px-1 mb-1">검토자 선택</div>
                                    <div className="space-y-0.5">
                                      {PRESET_REVIEWERS.map(mem => (
                                        <button
                                          key={mem}
                                          onClick={() => handleQuickUpdateReviewer(sec.id, mem)}
                                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-between whitespace-nowrap ${
                                            sec.reviewer === mem
                                              ? 'bg-red-50 text-[#E60012]'
                                              : 'text-neutral-700 hover:bg-neutral-100'
                                          }`}
                                        >
                                          <span className="whitespace-nowrap">{mem}</span>
                                          {sec.reviewer === mem && <Check className="w-3 h-3 text-[#E60012] shrink-0" />}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center gap-1">
                                      <input
                                        type="text"
                                        placeholder="직접 입력"
                                        value={customReviewerInput}
                                        onChange={e => setCustomReviewerInput(e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') handleQuickUpdateReviewer(sec.id, customReviewerInput);
                                        }}
                                        className="flex-1 bg-neutral-50 border border-neutral-200 px-2 py-1 rounded text-xs text-[#111111]"
                                      />
                                      <button
                                        onClick={() => handleQuickUpdateReviewer(sec.id, customReviewerInput)}
                                        className="p-1 bg-[#E60012] text-white rounded hover:bg-[#CC0010] cursor-pointer shrink-0"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Deadline (마감일) - Click-to-Edit with Popover for Admin */}
                              <td className="py-3.5 px-3 text-center text-neutral-700 font-medium whitespace-nowrap relative" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    if (userRole !== 'admin') {
                                      onShowToast('목차별 마감일 설정은 프로젝트 관리자만 가능합니다.');
                                      return;
                                    }
                                    setActiveStatusMenuId(null);
                                    setActiveAuthorMenuId(null);
                                    setActiveReviewerMenuId(null);
                                    setActiveCharLimitMenuId(null);
                                    setActiveSettingsMenuId(null);
                                    setActiveDueDateMenuId(prev => prev === sec.id ? null : sec.id);
                                    setCustomDueDateInput(sec.dueDate || sec.updatedAt || '2026-09-25');
                                  }}
                                  className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md border border-transparent text-xs font-mono transition-colors ${
                                    userRole === 'admin'
                                      ? 'hover:bg-neutral-100 hover:text-[#E60012] hover:border-neutral-200 text-neutral-700 cursor-pointer font-bold'
                                      : 'text-neutral-600 cursor-default'
                                  }`}
                                  title={userRole === 'admin' ? '클릭하여 마감일 변경' : `마감일: ${sec.dueDate || sec.updatedAt} (관리자 설정)`}
                                >
                                  <span>{sec.dueDate || sec.updatedAt}</span>
                                </button>

                                {userRole === 'admin' && activeDueDateMenuId === sec.id && (
                                  <div
                                    onClick={e => e.stopPropagation()}
                                    className="absolute left-1/2 -translate-x-1/2 mt-1 w-52 bg-white rounded-xl shadow-xl border border-neutral-200 p-2.5 z-50 animate-in fade-in duration-100 text-left"
                                  >
                                    <div className="text-[10px] font-bold text-neutral-400 px-1 mb-1.5 flex items-center justify-between">
                                      <span>마감일 설정 (관리자)</span>
                                    </div>
                                    <input
                                      type="date"
                                      value={customDueDateInput}
                                      onChange={e => setCustomDueDateInput(e.target.value)}
                                      className="w-full bg-neutral-50 border border-neutral-200 px-2.5 py-1.5 rounded-lg text-xs text-[#111111] mb-2 font-mono"
                                    />
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => setActiveDueDateMenuId(null)}
                                        className="px-2 py-1 rounded text-xs text-neutral-500 hover:bg-neutral-100 cursor-pointer"
                                      >
                                        취소
                                      </button>
                                      <button
                                        onClick={() => handleQuickUpdateDueDate(sec.id, customDueDateInput)}
                                        className="px-2.5 py-1 rounded bg-[#E60012] hover:bg-[#CC0010] text-white text-xs font-bold cursor-pointer flex items-center gap-1"
                                      >
                                        <Check className="w-3 h-3" />
                                        <span>적용</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Character Limit (글자 수 제한) - Click-to-Edit for Admin */}
                              <td className="py-3.5 px-3 text-right text-neutral-700 font-mono relative whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    if (userRole !== 'admin') {
                                      onShowToast('목표 글자 수 제한 설정은 프로젝트 관리자만 가능합니다.');
                                      return;
                                    }
                                    setActiveStatusMenuId(null);
                                    setActiveAuthorMenuId(null);
                                    setActiveReviewerMenuId(null);
                                    setActiveDueDateMenuId(null);
                                    setActiveSettingsMenuId(null);
                                    setActiveCharLimitMenuId(prev => prev === sec.id ? null : sec.id);
                                    setCustomCharLimitInput(String(sec.charLimit));
                                  }}
                                  className={`inline-flex items-center justify-end gap-1 px-2 py-1 rounded-md border border-transparent text-xs font-mono transition-colors ${
                                    userRole === 'admin'
                                      ? 'hover:bg-neutral-100 hover:text-[#E60012] hover:border-neutral-200 text-neutral-700 cursor-pointer font-bold'
                                      : 'text-neutral-600 cursor-default'
                                  }`}
                                  title={userRole === 'admin' ? '클릭하여 글자 수 제한 변경' : `글자 제한: ${sec.charLimit.toLocaleString()} (관리자 설정)`}
                                >
                                  <span>{sec.charLimit.toLocaleString()}</span>
                                </button>

                                {userRole === 'admin' && activeCharLimitMenuId === sec.id && (
                                  <div
                                    onClick={e => e.stopPropagation()}
                                    className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-neutral-200 p-2.5 z-50 animate-in fade-in duration-100 text-left"
                                  >
                                    <div className="text-[10px] font-bold text-neutral-400 px-1 mb-1.5">
                                      글자 수 제한 설정 (관리자)
                                    </div>
                                    <div className="grid grid-cols-2 gap-1 mb-2">
                                      {[2000, 3000, 4000, 5000].map(lim => (
                                        <button
                                          key={lim}
                                          onClick={() => handleQuickUpdateCharLimit(sec.id, lim)}
                                          className={`px-2 py-1 rounded text-xs font-mono font-bold transition-colors cursor-pointer text-center ${
                                            sec.charLimit === lim
                                              ? 'bg-red-50 text-[#E60012] border border-[#E60012]/30'
                                              : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border border-neutral-200'
                                          }`}
                                        >
                                          {lim.toLocaleString()}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="flex items-center gap-1 pt-1.5 border-t border-neutral-100">
                                      <input
                                        type="number"
                                        placeholder="직접 입력"
                                        value={customCharLimitInput}
                                        onChange={e => setCustomCharLimitInput(e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') handleQuickUpdateCharLimit(sec.id, Number(customCharLimitInput));
                                        }}
                                        className="flex-1 bg-neutral-50 border border-neutral-200 px-2 py-1 rounded text-xs text-[#111111] font-mono"
                                      />
                                      <button
                                        onClick={() => handleQuickUpdateCharLimit(sec.id, Number(customCharLimitInput))}
                                        className="p-1 bg-[#E60012] text-white rounded hover:bg-[#CC0010] cursor-pointer shrink-0"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Current Characters (Numbers only, no '자') */}
                              <td className="py-3.5 px-3 text-right font-mono font-bold">
                                <span className={sec.currentCharCount > 0 ? 'text-[#E60012]' : 'text-neutral-400'}>
                                  {sec.currentCharCount.toLocaleString()}
                                </span>
                              </td>

                              {/* Actions & Vertical 3-dots Settings Menu */}
                              <td className="py-3.5 px-4 text-center" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleSelectSection(sec)}
                                    className="p-1.5 rounded-lg bg-neutral-100 hover:bg-[#E60012] text-neutral-700 hover:text-white transition-colors flex items-center justify-center cursor-pointer shadow-2xs group"
                                    title="작성하기"
                                  >
                                    <Play className="w-3.5 h-3.5 fill-current text-neutral-600 group-hover:text-white" />
                                  </button>

                                  {/* Settings Vertical 3-dots Menu Button & Dropdown (수정, 삭제) */}
                                  <div className="relative inline-block text-left">
                                    <button
                                      id={`sec-settings-btn-${sec.id}`}
                                      onClick={e => handleToggleSettingsMenu(e, sec.id)}
                                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                        activeSettingsMenuId === sec.id
                                          ? 'bg-neutral-800 text-white border-neutral-800'
                                          : 'bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-600'
                                      }`}
                                      title="설정 (수정, 삭제)"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {activeSettingsMenuId === sec.id && (
                                      <div
                                        onClick={e => e.stopPropagation()}
                                        className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-xl border border-neutral-200 py-1.5 z-50 animate-in fade-in duration-100 text-left"
                                      >
                                        <button
                                          id={`sec-edit-btn-${sec.id}`}
                                          onClick={e => handleOpenEditSection(e, sec)}
                                          className="w-full text-left px-3.5 py-2 text-xs text-[#111111] hover:bg-neutral-100 font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                        >
                                          <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                                          <span>수정</span>
                                        </button>
                                        <button
                                          id={`sec-delete-btn-${sec.id}`}
                                          onClick={e => handleDeleteSection(e, sec.id)}
                                          className="w-full text-left px-3.5 py-2 text-xs text-[#E60012] hover:bg-red-50 font-bold flex items-center gap-2 transition-colors cursor-pointer border-t border-neutral-100"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 text-[#E60012]" />
                                          <span>삭제</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>

                            {/* Drop Bottom Indicator */}
                            {isDropAfter && (
                              <tr className="bg-transparent border-none">
                                <td colSpan={9} className="p-0">
                                  <div className="h-1 bg-[#E60012] rounded-full my-0.5 animate-pulse shadow-xs" />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
                {/* Bottom Add Section Button in Table */}
                <div className="p-3 border-t border-neutral-100 bg-[#F8F9FA]/50">
                  <button
                    id="add-new-section-table-bottom-btn"
                    onClick={handleAddNewSection}
                    className="w-full py-2.5 rounded-lg border border-dashed border-neutral-300 hover:border-[#E60012] bg-white hover:bg-red-50/50 text-neutral-600 hover:text-[#E60012] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs group"
                  >
                    <Plus className="w-4 h-4 text-neutral-400 group-hover:text-[#E60012] transition-colors" />
                    <span>+ 새 섹션 추가</span>
                  </button>
                </div>
              </div>
            ) : (
              /* VIEW MODE 2: KANBAN BOARD VIEW (상태별 칸반) */
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 overflow-x-auto min-h-[460px]">
                {ALL_SECTION_STATUSES.map(status => {
                  const itemsInStatus = sections.filter(s => s.status === status);

                  return (
                    <div
                      key={status}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => handleDropOnKanbanColumn(e, status)}
                      className="flex flex-col bg-neutral-100/70 rounded-xl border border-neutral-200/80 p-2.5 h-full min-h-[420px] shadow-2xs"
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between mb-2.5 px-1 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            status === '완료' ? 'bg-emerald-500' :
                            status === '검토 중' ? 'bg-blue-500' :
                            status === '검토 대기' ? 'bg-amber-500' :
                            status === '작성 중' ? 'bg-[#E60012]' : 'bg-neutral-400'
                          }`} />
                          <span className="text-xs font-black text-[#111111]">{status}</span>
                        </div>
                        <span className="text-[10px] font-bold text-neutral-500 bg-white px-2 py-0.5 rounded-full border border-neutral-200">
                          {itemsInStatus.length}
                        </span>
                      </div>

                      {/* Cards Container */}
                      <div className="flex-1 space-y-2.5 overflow-y-auto pr-0.5">
                        {itemsInStatus.map(sec => (
                          <div
                            key={sec.id}
                            draggable
                            onDragStart={e => handleDragStart(e, sec.id)}
                            onClick={() => handleSelectSection(sec)}
                            className="bg-white rounded-xl p-3 border border-neutral-200 shadow-2xs hover:shadow-md hover:border-neutral-300 transition-all cursor-pointer group space-y-2 relative"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 font-mono">
                                  Sec {sec.sectionNumber}
                                </span>
                                <span className="text-[10px] text-neutral-500 font-mono bg-neutral-50 px-1.5 py-0.5 rounded border border-neutral-200/70" title="마감일">
                                  <span>{sec.dueDate || sec.updatedAt}</span>
                                </span>
                              </div>
                              {/* Vertical 3-dots Settings Button */}
                              <div className="relative inline-block text-left" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={e => handleToggleSettingsMenu(e, `kb-${sec.id}`)}
                                  className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded transition-colors"
                                  title="설정"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                                {activeSettingsMenuId === `kb-${sec.id}` && (
                                  <div
                                    onClick={e => e.stopPropagation()}
                                    className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-xl border border-neutral-200 py-1 z-50 animate-in fade-in duration-100 text-left"
                                  >
                                    <button
                                      onClick={e => handleOpenEditSection(e, sec)}
                                      className="w-full text-left px-3 py-1.5 text-xs text-[#111111] hover:bg-neutral-100 font-bold flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <Edit2 className="w-3 h-3 text-blue-600" />
                                      <span>수정</span>
                                    </button>
                                    <button
                                      onClick={e => handleDeleteSection(e, sec.id)}
                                      className="w-full text-left px-3 py-1.5 text-xs text-[#E60012] hover:bg-red-50 font-bold flex items-center gap-1.5 cursor-pointer border-t border-neutral-100"
                                    >
                                      <Trash2 className="w-3 h-3 text-[#E60012]" />
                                      <span>삭제</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            <h3 className="text-xs font-bold text-[#111111] group-hover:text-[#E60012] transition-colors leading-snug line-clamp-2">
                              {sec.title}
                            </h3>

                            {/* Author & Reviewer - Click to edit directly */}
                            <div className="flex flex-col gap-1.5 text-[11px] pt-1 border-t border-neutral-100">
                              <div className="flex items-center justify-between text-neutral-500 relative" onClick={e => e.stopPropagation()}>
                                <span>작성:</span>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    if (userRole !== 'admin') {
                                      onShowToast('목차별 업무 담당자(작성자) 배정은 프로젝트 관리자만 가능합니다.');
                                      return;
                                    }
                                    setActiveStatusMenuId(null);
                                    setActiveReviewerMenuId(null);
                                    setActiveSettingsMenuId(null);
                                    setActiveAuthorMenuId(prev => prev === `kb-${sec.id}` ? null : `kb-${sec.id}`);
                                  }}
                                  className={`px-1.5 py-0.5 rounded font-semibold text-neutral-800 transition-colors ${
                                    userRole === 'admin'
                                      ? 'hover:text-[#E60012] hover:underline hover:bg-neutral-100 cursor-pointer'
                                      : 'cursor-default'
                                  }`}
                                  title={userRole === 'admin' ? '클릭하여 작성자 변경' : `작성자: ${sec.author} (관리자 배정)`}
                                >
                                  {sec.author}
                                </button>

                                {userRole === 'admin' && activeAuthorMenuId === `kb-${sec.id}` && (
                                  <div
                                    onClick={e => e.stopPropagation()}
                                    className="absolute right-0 top-6 w-44 bg-white rounded-xl shadow-xl border border-neutral-200 p-2 z-50 animate-in fade-in duration-100 text-left"
                                  >
                                    <div className="text-[10px] font-bold text-neutral-400 px-1 mb-1">작성자 선택</div>
                                    <div className="space-y-0.5">
                                      {PRESET_AUTHORS.map(mem => (
                                        <button
                                          key={mem}
                                          onClick={() => handleQuickUpdateAuthor(sec.id, mem)}
                                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-between whitespace-nowrap ${
                                            sec.author === mem
                                              ? 'bg-red-50 text-[#E60012]'
                                              : 'text-neutral-700 hover:bg-neutral-100'
                                          }`}
                                        >
                                          <span className="whitespace-nowrap">{mem}</span>
                                          {sec.author === mem && <Check className="w-3 h-3 text-[#E60012] shrink-0" />}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center gap-1">
                                      <input
                                        type="text"
                                        placeholder="직접 입력"
                                        value={customAuthorInput}
                                        onChange={e => setCustomAuthorInput(e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') handleQuickUpdateAuthor(sec.id, customAuthorInput);
                                        }}
                                        className="flex-1 bg-neutral-50 border border-neutral-200 px-2 py-1 rounded text-xs text-[#111111]"
                                      />
                                      <button
                                        onClick={() => handleQuickUpdateAuthor(sec.id, customAuthorInput)}
                                        className="p-1 bg-[#E60012] text-white rounded hover:bg-[#CC0010] cursor-pointer shrink-0"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between text-neutral-500 relative" onClick={e => e.stopPropagation()}>
                                <span>검토:</span>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    if (userRole !== 'admin') {
                                      onShowToast('목차별 업무 담당자(검토자) 배정은 프로젝트 관리자만 가능합니다.');
                                      return;
                                    }
                                    setActiveStatusMenuId(null);
                                    setActiveAuthorMenuId(null);
                                    setActiveSettingsMenuId(null);
                                    setActiveReviewerMenuId(prev => prev === `kb-${sec.id}` ? null : `kb-${sec.id}`);
                                  }}
                                  className={`px-1.5 py-0.5 rounded font-semibold text-neutral-800 transition-colors ${
                                    userRole === 'admin'
                                      ? 'hover:text-[#E60012] hover:underline hover:bg-neutral-100 cursor-pointer'
                                      : 'cursor-default'
                                  }`}
                                  title={userRole === 'admin' ? '클릭하여 검토자 변경' : `검토자: ${sec.reviewer} (관리자 배정)`}
                                >
                                  {sec.reviewer}
                                </button>

                                {userRole === 'admin' && activeReviewerMenuId === `kb-${sec.id}` && (
                                  <div
                                    onClick={e => e.stopPropagation()}
                                    className="absolute right-0 top-6 w-44 bg-white rounded-xl shadow-xl border border-neutral-200 p-2 z-50 animate-in fade-in duration-100 text-left"
                                  >
                                    <div className="text-[10px] font-bold text-neutral-400 px-1 mb-1">검토자 선택</div>
                                    <div className="space-y-0.5">
                                      {PRESET_REVIEWERS.map(mem => (
                                        <button
                                          key={mem}
                                          onClick={() => handleQuickUpdateReviewer(sec.id, mem)}
                                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-between whitespace-nowrap ${
                                            sec.reviewer === mem
                                              ? 'bg-red-50 text-[#E60012]'
                                              : 'text-neutral-700 hover:bg-neutral-100'
                                          }`}
                                        >
                                          <span className="whitespace-nowrap">{mem}</span>
                                          {sec.reviewer === mem && <Check className="w-3 h-3 text-[#E60012] shrink-0" />}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center gap-1">
                                      <input
                                        type="text"
                                        placeholder="직접 입력"
                                        value={customReviewerInput}
                                        onChange={e => setCustomReviewerInput(e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') handleQuickUpdateReviewer(sec.id, customReviewerInput);
                                        }}
                                        className="flex-1 bg-neutral-50 border border-neutral-200 px-2 py-1 rounded text-xs text-[#111111]"
                                      />
                                      <button
                                        onClick={() => handleQuickUpdateReviewer(sec.id, customReviewerInput)}
                                        className="p-1 bg-[#E60012] text-white rounded hover:bg-[#CC0010] cursor-pointer shrink-0"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Progress bar for character count - numbers only */}
                            <div className="space-y-1 pt-1">
                              <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                                <span>{sec.currentCharCount.toLocaleString()}</span>
                                <span>/ {sec.charLimit.toLocaleString()}</span>
                              </div>
                              <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#E60012] rounded-full transition-all"
                                  style={{ width: `${Math.min(100, Math.round((sec.currentCharCount / (sec.charLimit || 1)) * 100))}%` }}
                                />
                              </div>
                            </div>

                            {/* Action Button - Play icon */}
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleSelectSection(sec);
                              }}
                              className="w-full mt-2 py-1.5 rounded-lg bg-neutral-100 hover:bg-[#E60012] text-neutral-700 hover:text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer group"
                            >
                              <Play className="w-3 h-3 fill-current text-neutral-600 group-hover:text-white" />
                              <span>작성</span>
                            </button>
                          </div>
                        ))}

                        {itemsInStatus.length === 0 && (
                          <div className="h-28 border-2 border-dashed border-neutral-300/80 rounded-xl flex items-center justify-center text-[11px] text-neutral-400 font-medium">
                            섹션을 드래그하세요
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3.5">
                <button
                  id="add-new-section-kanban-bottom-btn"
                  onClick={handleAddNewSection}
                  className="w-full py-2.5 rounded-lg border border-dashed border-neutral-300 hover:border-[#E60012] bg-white hover:bg-red-50/50 text-neutral-600 hover:text-[#E60012] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs group"
                >
                  <Plus className="w-4 h-4 text-neutral-400 group-hover:text-[#E60012] transition-colors" />
                  <span>+ 새 섹션 추가</span>
                </button>
              </div>
            </>
          )}
          </div>
        </div>
      )}

      {/* CASE 2: 개별 섹션 상세 작성 화면 (좌우 60:40 분할 레이아웃) */}
      {viewMode === 'detail' && (
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT 60%: Rich Writing Canvas & AI Toolbars */}
          <div className="w-[60%] border-r border-neutral-200 bg-white flex flex-col h-full overflow-hidden">
            {/* Top Navigation & Title Bar */}
            <div className="px-5 py-3 border-b border-neutral-200 bg-neutral-50/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBackToOverview}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold text-neutral-600 hover:text-[#E60012] hover:bg-white border border-transparent hover:border-neutral-200 transition-all shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>제안서로 돌아가기</span>
                </button>
                <div className="h-4 w-px bg-neutral-300 mx-1" />
                {/* Inline Editable Title */}
                <input
                  type="text"
                  value={sectionTitle}
                  onChange={e => setSectionTitle(e.target.value)}
                  className="bg-transparent font-black text-sm text-[#111111] focus:outline-none focus:bg-white px-1.5 py-0.5 rounded border border-transparent focus:border-neutral-300 w-80 truncate"
                />
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-1.5">
                {/* Reference Location Button (File Icon) - 바로 모달 팝업 열기 */}
                <button
                  onClick={() => setShowSectionRefModal(true)}
                  className={`p-1.5 rounded-lg border transition-all flex items-center justify-center shadow-2xs cursor-pointer relative ${
                    showSectionRefModal
                      ? 'border-[#E60012] bg-red-50 text-[#E60012]'
                      : 'border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 hover:text-[#E60012]'
                  }`}
                  title="참조 위치 설정 (내부저장소, 업로드, 웹 검색 - 현재 섹션 전용)"
                >
                  <FileText className="w-4 h-4" />
                </button>

                {/* Save Button (Icon Only) */}
                <button
                  onClick={handleOpenSaveVersionModal}
                  className="p-1.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 text-[#E60012] hover:text-[#CC0010] transition-all flex items-center justify-center shadow-2xs cursor-pointer"
                  title="현재 내용 버전 저장"
                >
                  <Save className="w-4 h-4" />
                </button>

                {/* Version History Button (Icon Only) */}
                <button
                  onClick={() => setShowVersionModal(true)}
                  className="p-1.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-600 hover:text-[#111111] transition-all flex items-center justify-center shadow-2xs cursor-pointer"
                  title="버전 기록"
                >
                  <Clock className="w-4 h-4 text-neutral-500" />
                </button>
              </div>
            </div>

            {/* AI Action Toolbars */}
            <div className="px-5 py-2.5 border-b border-neutral-200 bg-white flex flex-wrap items-center justify-between gap-2 shrink-0">
              {/* AI Controls */}
              <div className="flex items-center gap-2">
                {/* 2. 보강 Dropdown (내용 확장을 드롭다운 내부에서 처리) */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowProofMenu(prev => !prev);
                      setShowAiPromptBox(false);
                      setShowRefineMenu(false);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-neutral-500" />
                    <span>보강</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showProofMenu && (
                    <div className="absolute left-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-neutral-200 py-2 px-2.5 z-50 animate-in fade-in duration-150 space-y-1.5">
                      {/* Sub-section: 내용 확장 (드롭다운 내에서 직접 처리) */}
                      <div className="border-b border-neutral-100 pb-1.5">
                        <button
                          onClick={() => setShowProofExpandInMenu(prev => !prev)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 font-bold text-xs text-[#111111] flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-[#E60012]" />
                            <span>내용 확장</span>
                          </div>
                          <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ${showProofExpandInMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown-embedded expansion panel */}
                        {showProofExpandInMenu && (
                          <div className="mt-1.5 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-2 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between text-xs pb-1 border-b border-neutral-200/60">
                              <span className="text-[11px] font-bold text-neutral-600">현재 글자 수</span>
                              <span className="font-mono font-bold text-[#111111]">{editorText.length.toLocaleString()}자</span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-neutral-700">목표 확장 글자 수</span>
                              <div className="flex items-center gap-1 bg-white border border-neutral-300 rounded px-2 py-0.5 focus-within:border-[#E60012]">
                                <input
                                  type="number"
                                  min={50}
                                  step={50}
                                  value={customExpandCount}
                                  onChange={e => setCustomExpandCount(Math.max(50, parseInt(e.target.value) || 0))}
                                  className="w-14 text-xs font-bold text-[#111111] focus:outline-none"
                                />
                                <span className="text-[10px] text-neutral-400 font-bold">자</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 flex-wrap">
                              {[300, 500, 1000, 1500].map(cnt => (
                                <button
                                  key={cnt}
                                  onClick={() => setCustomExpandCount(cnt)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                                    customExpandCount === cnt
                                      ? 'bg-[#E60012] text-white'
                                      : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                                  }`}
                                >
                                  +{cnt.toLocaleString()}자
                                </button>
                              ))}
                            </div>

                            <button
                              onClick={handleExecuteDropdownExpand}
                              disabled={isExpanding}
                              className="w-full py-1 rounded bg-[#E60012] hover:bg-[#CC0010] text-white text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>{isExpanding ? '확장 중...' : '확장 실행'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setShowProofMenu(false);
                          handleGlobalProofAction('설명 추가');
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#111111] hover:bg-neutral-100 font-semibold cursor-pointer"
                      >
                        설명 추가
                      </button>
                      <button
                        onClick={() => {
                          setShowProofMenu(false);
                          handleGlobalProofAction('통계 추가');
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#111111] hover:bg-neutral-100 font-semibold cursor-pointer"
                      >
                        통계 추가
                      </button>
                      <button
                        onClick={() => {
                          setShowProofMenu(false);
                          handleGlobalProofAction('사례 연구 추가');
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#111111] hover:bg-neutral-100 font-semibold cursor-pointer"
                      >
                        사례 연구 추가
                      </button>
                      <button
                        onClick={() => {
                          setShowProofMenu(false);
                          handleGlobalProofAction('출처 삽입');
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#111111] hover:bg-neutral-100 cursor-pointer"
                      >
                        출처 삽입
                      </button>
                    </div>
                  )}
                </div>
 
                {/* 3. 수정 Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowRefineMenu(prev => !prev);
                      setShowAiPromptBox(false);
                      setShowProofMenu(false);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-neutral-500" />
                    <span>수정</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showRefineMenu && (
                    <div className="absolute left-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-neutral-200 py-2 px-2.5 z-50 animate-in fade-in duration-150 space-y-1.5">
                      {/* Sub-section: 단어 수 줄이기 (드롭다운 내에서 직접 처리) */}
                      <div className="border-b border-neutral-100 pb-1.5">
                        <button
                          onClick={() => setShowRefineReduceInMenu(prev => !prev)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 font-bold text-xs text-[#111111] flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                            <span>단어 수 줄이기</span>
                          </div>
                          <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ${showRefineReduceInMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown-embedded reduction panel */}
                        {showRefineReduceInMenu && (
                          <div className="mt-1.5 p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-2 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between text-xs pb-1 border-b border-neutral-200/60">
                              <span className="text-[11px] font-bold text-neutral-600">현재 글자 수</span>
                              <span className="font-mono font-bold text-[#111111]">{editorText.length.toLocaleString()}자</span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-neutral-700">목표 축소 비율</span>
                              <div className="flex items-center gap-1 bg-white border border-neutral-300 rounded px-2 py-0.5 focus-within:border-emerald-500">
                                <input
                                  type="number"
                                  min={10}
                                  max={90}
                                  step={10}
                                  value={customReduceCount}
                                  onChange={e => setCustomReduceCount(Math.min(90, Math.max(10, parseInt(e.target.value) || 0)))}
                                  className="w-10 text-xs font-bold text-[#111111] focus:outline-none"
                                />
                                <span className="text-[10px] text-neutral-400 font-bold">%</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 flex-wrap">
                              {[20, 30, 50, 70].map(pct => (
                                <button
                                  key={pct}
                                  onClick={() => setCustomReduceCount(pct)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                                    customReduceCount === pct
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                                  }`}
                                >
                                  -{pct}%
                                </button>
                              ))}
                            </div>

                            <button
                              onClick={handleExecuteDropdownReduce}
                              disabled={isReducing}
                              className="w-full py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                              <span>{isReducing ? '축소 중...' : '축소 실행'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleGlobalRefineAction('문법 교정')}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#111111] hover:bg-neutral-100 font-semibold cursor-pointer"
                      >
                        문법 교정
                      </button>
                      <button
                        onClick={() => handleGlobalRefineAction('문장 다듬기')}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-[#111111] hover:bg-neutral-100 font-semibold cursor-pointer"
                      >
                        문장 다듬기
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Formatting Toolbar */}
              <div className="flex items-center gap-1 text-neutral-600">
                <button className="p-1 rounded hover:bg-neutral-100" title="굵게"><Bold className="w-3.5 h-3.5" /></button>
                <button className="p-1 rounded hover:bg-neutral-100" title="기울임"><Italic className="w-3.5 h-3.5" /></button>
                <button className="p-1 rounded hover:bg-neutral-100" title="밑줄"><Underline className="w-3.5 h-3.5" /></button>
                <div className="h-3 w-px bg-neutral-200 mx-1" />
                <button className="p-1 rounded hover:bg-neutral-100" title="글머리 기호"><List className="w-3.5 h-3.5" /></button>
                <button className="p-1 rounded hover:bg-neutral-100" title="번호 매기기"><ListOrdered className="w-3.5 h-3.5" /></button>
                <button className="p-1 rounded hover:bg-neutral-100" title="표 삽입"><TableIcon className="w-3.5 h-3.5" /></button>
                <button className="p-1 rounded hover:bg-neutral-100" title="이미지"><ImageIcon className="w-3.5 h-3.5" /></button>
                <button className="p-1 rounded hover:bg-neutral-100" title="링크"><LinkIcon className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {/* Editor Text Area & Floating Selection Context Toolbar */}
            <div ref={editorContainerRef} className="flex-1 p-8 overflow-y-auto bg-neutral-50/30 relative">
              {/* Floating Selection Popup (Appears directly above dragged text, auto-dismisses on deselect) */}
              {showFloatingToolbar && floatingPos && selectedText.trim().length > 0 && (
                <div
                  ref={floatingToolbarRef}
                  style={{
                    left: `${floatingPos.x}px`,
                    top: `${floatingPos.y}px`
                  }}
                  className="absolute z-[100] -translate-x-1/2 -translate-y-full mb-2 flex items-center bg-[#111111] text-white px-2.5 py-1.5 rounded-xl shadow-2xl border border-neutral-700/80 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
                >
                  {/* Downward indicator arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-x-5 border-x-transparent border-t-5 border-t-[#111111]" />

                  <div className="flex items-center gap-2 p-0.5">
                    {/* Auto Prompt Input Field */}
                    <input
                      type="text"
                      placeholder="프롬프트 입력..."
                      value={aiWritePrompt}
                      onChange={e => setAiWritePrompt(e.target.value)}
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => e.stopPropagation()}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleExecuteAiPromptWrite();
                        }
                      }}
                      className="w-48 sm:w-56 px-2.5 py-1 text-xs rounded-lg bg-neutral-900 border border-neutral-700 text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#E60012] select-text"
                    />

                    {/* AI 작성 Button */}
                    <button
                      onMouseDown={e => e.preventDefault()}
                      onClick={handleExecuteAiPromptWrite}
                      disabled={isAiWriting}
                      className="px-2.5 py-1 rounded-lg bg-[#E60012] hover:bg-[#CC0010] text-white text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs whitespace-nowrap disabled:opacity-50"
                      title="선택한 문구와 프롬프트를 바탕으로 AI 추천안 3종 생성"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isAiWriting ? '작성 중...' : 'AI 작성'}</span>
                    </button>

                    <div className="h-4 w-px bg-neutral-700 my-auto mx-0.5" />

                    {/* 댓글 Button */}
                    {/* Floating 보강 Dropdown Button */}
                    <div className="relative">
                      <button
                        onMouseDown={e => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSelectionProofMenu(prev => !prev);
                          setShowSelectionRefineMenu(false);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                        title="선택 영역 보강 (설명, 통계, 사례 추가)"
                      >
                        <Shield className="w-3 h-3 text-amber-400" />
                        <span>보강</span>
                        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                      </button>

                      {showSelectionProofMenu && (
                        <div className="absolute left-0 top-full mt-2 w-64 bg-neutral-900 rounded-xl shadow-2xl border border-neutral-700 p-2 z-[110] animate-in fade-in duration-150 space-y-1.5">
                          {/* Sub-section: 내용 확장 (드롭다운 내에서 직접 처리) */}
                          <div className="border-b border-neutral-800 pb-1.5 mb-1.5">
                            <button
                              onMouseDown={e => e.preventDefault()}
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowSelectionProofExpand(prev => !prev);
                              }}
                              className="w-full text-left px-2.5 py-1 rounded-lg hover:bg-neutral-800 font-bold text-xs text-neutral-200 flex items-center justify-between cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                <span>내용 확장</span>
                              </div>
                              <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ${showSelectionProofExpand ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown-embedded expansion panel */}
                            {showSelectionProofExpand && (
                              <div className="mt-1.5 p-2 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2 animate-in fade-in duration-150">
                                <div className="flex items-center justify-between text-[10px] pb-1 border-b border-neutral-800">
                                  <span className="font-bold text-neutral-400">현재 글자 수</span>
                                  <span className="font-mono font-bold text-neutral-200">{selectedText.length}자</span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-neutral-300">목표 추가</span>
                                  <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5">
                                    <input
                                      type="number"
                                      min={100}
                                      max={1000}
                                      step={100}
                                      value={selectionExpandCount}
                                      onMouseDown={e => e.stopPropagation()}
                                      onChange={e => setSelectionExpandCount(Math.min(1000, Math.max(100, parseInt(e.target.value) || 100)))}
                                      className="w-10 text-[10px] font-bold text-white bg-transparent focus:outline-none"
                                    />
                                    <span className="text-[9px] text-neutral-500 font-bold">자</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 flex-wrap">
                                  {[100, 200, 300, 500].map(cnt => (
                                    <button
                                      key={cnt}
                                      onMouseDown={e => e.preventDefault()}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectionExpandCount(cnt);
                                      }}
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer ${
                                        selectionExpandCount === cnt
                                          ? 'bg-amber-600 text-white'
                                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                      }`}
                                    >
                                      +{cnt}자
                                    </button>
                                  ))}
                                </div>

                                <button
                                  onMouseDown={e => e.preventDefault()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExecuteSelectionExpand();
                                  }}
                                  disabled={isSelectionExpanding}
                                  className="w-full py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>{isSelectionExpanding ? '확장 중...' : '확장 실행'}</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {['설명 추가', '통계 추가', '사례 연구 추가', '출처 삽입'].map(opt => (
                            <button
                              key={opt}
                              onMouseDown={e => e.preventDefault()}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectionProofAction(opt);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-neutral-200 hover:bg-neutral-800 hover:text-white font-semibold cursor-pointer"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Floating 수정 Dropdown Button */}
                    <div className="relative">
                      <button
                        onMouseDown={e => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSelectionRefineMenu(prev => !prev);
                          setShowSelectionProofMenu(false);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                        title="선택 영역 수정 (요약, 다듬기, 교정)"
                      >
                        <Sliders className="w-3 h-3 text-emerald-400" />
                        <span>수정</span>
                        <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                      </button>

                      {showSelectionRefineMenu && (
                        <div className="absolute left-0 top-full mt-2 w-64 bg-neutral-900 rounded-xl shadow-2xl border border-neutral-700 p-2 z-[110] animate-in fade-in duration-150 space-y-1.5">
                          {/* Sub-section: 단어수 줄이기 (드롭다운 내에서 직접 처리) */}
                          <div className="border-b border-neutral-800 pb-1.5 mb-1.5">
                            <button
                              onMouseDown={e => e.preventDefault()}
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowSelectionRefineReduce(prev => !prev);
                              }}
                              className="w-full text-left px-2.5 py-1 rounded-lg hover:bg-neutral-800 font-bold text-xs text-neutral-200 flex items-center justify-between cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5">
                                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                                <span>단어수 줄이기</span>
                              </div>
                              <ChevronDown className={`w-3 h-3 text-neutral-400 transition-transform ${showSelectionRefineReduce ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown-embedded reduction panel */}
                            {showSelectionRefineReduce && (
                              <div className="mt-1.5 p-2 bg-neutral-950 rounded-lg border border-neutral-800 space-y-2 animate-in fade-in duration-150">
                                <div className="flex items-center justify-between text-[10px] pb-1 border-b border-neutral-800">
                                  <span className="font-bold text-neutral-400">현재 글자 수</span>
                                  <span className="font-mono font-bold text-neutral-200">{selectedText.length}자</span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-neutral-300">목표 축소</span>
                                  <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5">
                                    <input
                                      type="number"
                                      min={10}
                                      max={90}
                                      step={10}
                                      value={selectionReduceCount}
                                      onMouseDown={e => e.stopPropagation()}
                                      onChange={e => setSelectionReduceCount(Math.min(90, Math.max(10, parseInt(e.target.value) || 10)))}
                                      className="w-8 text-[10px] font-bold text-white bg-transparent focus:outline-none"
                                    />
                                    <span className="text-[9px] text-neutral-500 font-bold">%</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 flex-wrap">
                                  {[20, 30, 50, 70].map(pct => (
                                    <button
                                      key={pct}
                                      onMouseDown={e => e.preventDefault()}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectionReduceCount(pct);
                                      }}
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer ${
                                        selectionReduceCount === pct
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                      }`}
                                    >
                                      -{pct}%
                                    </button>
                                  ))}
                                </div>

                                <button
                                  onMouseDown={e => e.preventDefault()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExecuteSelectionReduce();
                                  }}
                                  disabled={isSelectionReducing}
                                  className="w-full py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-all flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>{isSelectionReducing ? '축소 중...' : '축소 실행'}</span>
                                </button>
                              </div>
                            )}
                          </div>

                          {['문법교정', '문장 다듬기'].map(opt => (
                            <button
                              key={opt}
                              onMouseDown={e => e.preventDefault()}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectionRefine(opt);
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-neutral-200 hover:bg-neutral-800 hover:text-white font-semibold cursor-pointer"
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="h-4 w-px bg-neutral-700 my-auto mx-0.5" />

                    <button
                      onMouseDown={e => e.preventDefault()}
                      onClick={handleSelectionComment}
                      className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                      title="선택한 문구에 대한 검토 댓글 등록"
                    >
                      <MessageSquare className="w-3 h-3 text-blue-400" />
                      <span>댓글</span>
                    </button>
                  </div>
                </div>
              )}

              <textarea
                ref={textareaRef}
                value={editorText}
                onChange={e => handleEditorTextChange(e.target.value)}
                onSelect={handleTextSelect}
                onMouseUp={e => updateSelectionAndPosition(e.clientX, e.clientY)}
                onMouseDown={e => {
                  if (floatingToolbarRef.current && floatingToolbarRef.current.contains(e.target as Node)) {
                    return;
                  }
                  setShowFloatingToolbar(false);
                  setShowSelectionRefineMenu(false);
                  setShowSelectionProofMenu(false);
                }}
                onKeyUp={() => updateSelectionAndPosition()}
                placeholder="제안서 본문 내용을 입력하거나, 텍스트를 드래그하여 [작성/보강/수정/댓글] 작업을 실행하세요..."
                className="w-full h-full min-h-[500px] p-6 bg-white rounded-xl border border-neutral-200 shadow-xs text-xs text-[#111111] font-sans leading-relaxed resize-none focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-200 selection:bg-red-100 selection:text-red-950 font-medium"
              />
            </div>

            {/* Bottom Status Footnote */}
            <div className="px-5 py-2.5 border-t border-neutral-200 bg-white flex items-center justify-between text-[11px] text-neutral-500 shrink-0">
              <div className="flex items-center gap-3">
                <span>현재 글자 수: <strong className="text-[#E60012]">{editorText.length.toLocaleString()}</strong> / {selectedSection.charLimit.toLocaleString()}</span>
                <span>단어 수: {editorText.split(/\s+/).filter(Boolean).length}단어</span>
                <span className="h-3 w-px bg-neutral-200" />
                <span className="font-mono">
                  <span>마감일: <strong className="text-neutral-700">{selectedSection.dueDate || selectedSection.updatedAt}</strong></span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                <Check className="w-3.5 h-3.5" />
                <span>자동 저장됨 (방금 전)</span>
              </div>
            </div>
          </div>

          {/* RIGHT 40%: 4 Functional Tabs (스토리보드, 작성, AI 검토, 댓글) */}
          <div className="w-[40%] bg-white flex flex-col h-full overflow-hidden">
            {/* 4 Tabs Header */}
            <div className="px-4 pt-3 border-b border-neutral-200 bg-neutral-50/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1">
                {[
                  { key: 'storyboard', label: '스토리보드', count: null },
                  { key: 'writing', label: '작성', count: hasGeneratedDrafts ? aiDraftOptions.length : 0 },
                  { key: 'review', label: 'AI 검토', count: hasRunReview ? reviewResults.length : 0 },
                  { key: 'comments', label: '댓글', count: comments.length }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveRightTab(tab.key as any)}
                    className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeRightTab === tab.key
                        ? 'border-[#E60012] text-[#E60012]'
                        : 'border-transparent text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== null && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        activeRightTab === tab.key ? 'bg-red-100 text-[#E60012]' : 'bg-neutral-200 text-neutral-600'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#F8F9FA] space-y-3">
              {/* TAB 1: 스토리보드 (9개 아코디언 카드) */}
              {activeRightTab === 'storyboard' && (
                <div className="space-y-3">
                  {/* 1. 작성 과제 */}
                  <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-2xs">
                    <div
                      onClick={() => setStoryboardOpen(p => ({ ...p, task: !p.task }))}
                      className="px-4 py-3 cursor-pointer flex items-center justify-between bg-neutral-50/50"
                    >
                      <span className="text-xs font-bold text-[#111111]">1. 작성 과제</span>
                      {storyboardOpen.task ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                    {storyboardOpen.task && (
                      <div className="p-4 border-t border-neutral-100 text-xs space-y-2 text-neutral-700">
                        <p className="leading-relaxed">
                          본 섹션에서는 KPC 생성형 AI 플랫폼의 사업 목적과 핵심 4대 전략(ZDR 보안, M365 연계, Multi-LLM, Agent 생태계)을 설득력 있게 제시해야 합니다.
                        </p>
                        <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-500">
                          <span>글자 제한: <strong>4,000자</strong></span>
                          <span>담당자: <strong>정소담</strong></span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. 초안 */}
                  <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-2xs">
                    <div
                      onClick={() => setStoryboardOpen(p => ({ ...p, draft: !p.draft }))}
                      className="px-4 py-3 cursor-pointer flex items-center justify-between bg-neutral-50/50"
                    >
                      <span className="text-xs font-bold text-[#111111]">2. 초안 요약</span>
                      {storyboardOpen.draft ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                    {storyboardOpen.draft && (
                      <div className="p-4 border-t border-neutral-100 text-xs text-neutral-700 leading-relaxed">
                        KPC의 60년 전문성과 Enterprise AI 기술의 융합을 핵심 메시지로 전달하는 기본 골자 수립 완료.
                      </div>
                    )}
                  </div>

                  {/* 3. 요구사항 (체크리스트 연동) */}
                  <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-2xs">
                    <div
                      onClick={() => setStoryboardOpen(p => ({ ...p, requirements: !p.requirements }))}
                      className="px-4 py-3 cursor-pointer flex items-center justify-between bg-neutral-50/50"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#111111]">3. 제출 체크리스트</span>
                        {(() => {
                          const reqs = checklistItems;
                          const checkedCount = reqs.filter(r => r.checked).length;
                          return (
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded transition-colors ${
                              checkedCount === reqs.length && reqs.length > 0
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-neutral-100 text-neutral-600'
                            }`}>
                              완료 {checkedCount}/{reqs.length}
                            </span>
                          );
                        })()}
                      </div>
                      {storyboardOpen.requirements ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                    {storyboardOpen.requirements && (
                      <div className="p-3.5 border-t border-neutral-100 text-xs space-y-2.5 max-h-72 overflow-y-auto">
                        <div className="text-[11px] text-neutral-500 flex items-center justify-between px-0.5 pb-0.5">
                          <span>제안서 점검 및 준수 항목을 체크하세요.</span>
                          <span className="text-[10px] text-neutral-400">체크리스트 연동</span>
                        </div>
                        {checklistItems
                          .map(req => {
                            const isChecked = !!req.checked;
                            return (
                              <div 
                                key={req.id} 
                                onClick={() => handleToggleRequirementCheck(req.id)}
                                className={`p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                                  isChecked 
                                    ? 'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50/70' 
                                    : 'bg-neutral-50 border-neutral-200/80 hover:border-neutral-300 hover:bg-neutral-100/50'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleRequirementCheck(req.id);
                                    }}
                                    className="mt-0.5 p-0.5 rounded transition-colors cursor-pointer shrink-0 text-neutral-400 hover:text-emerald-600"
                                    title={isChecked ? '체크리스트 반영 완료 해제' : '제안서 반영 완료 체크 (체크리스트에 실시간 동기화)'}
                                  >
                                    {isChecked ? (
                                      <CheckSquare className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                                    ) : (
                                      <Square className="w-4 h-4 text-neutral-400 hover:text-neutral-600" />
                                    )}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[10px] font-mono font-bold text-neutral-400 shrink-0">
                                        {req.id}
                                      </span>
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-neutral-200/70 text-neutral-700">
                                        {req.category}
                                      </span>
                                      {isChecked && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700">
                                          반영 완료
                                        </span>
                                      )}
                                    </div>
                                    <p className={`font-medium block leading-snug mt-1 transition-colors ${
                                      isChecked ? 'line-through text-neutral-400' : 'text-neutral-900'
                                    }`}>
                                      {req.text}
                                    </p>
                                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-neutral-500">
                                      <span className="truncate max-w-[120px]">{req.source}</span>
                                      {isChecked ? (
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                                          <FileText className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                          <span className="truncate max-w-[140px]">본문: {req.assignedSection || '3. 기술 및 기능 제안'}</span>
                                        </span>
                                      ) : (
                                        req.assignedSection && (
                                          <span className="px-1.5 py-0.5 rounded bg-neutral-200/60 text-neutral-700 font-medium">
                                            {req.assignedSection}
                                          </span>
                                        )
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* 4. 맥락 */}
                  <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-2xs">
                    <div
                      onClick={() => setStoryboardOpen(p => ({ ...p, context: !p.context }))}
                      className="px-4 py-3 cursor-pointer flex items-center justify-between bg-neutral-50/50"
                    >
                      <span className="text-xs font-bold text-[#111111]">4. 맥락 및 배경</span>
                      {storyboardOpen.context ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                    {storyboardOpen.context && (
                      <div className="p-4 border-t border-neutral-100 text-xs text-neutral-700 leading-relaxed">
                        공공 행정 및 기업 교육 DX 컨설팅 시장에서 KPC의 주도권을 확보하기 위한 전략적 인프라 구축 배경.
                      </div>
                    )}
                  </div>

                  {/* 5. 평가기준 */}
                  <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-2xs">
                    <div
                      onClick={() => setStoryboardOpen(p => ({ ...p, evalCriteria: !p.evalCriteria }))}
                      className="px-4 py-3 cursor-pointer flex items-center justify-between bg-neutral-50/50"
                    >
                      <span className="text-xs font-bold text-[#111111]">5. 기술 평가기준</span>
                      {storyboardOpen.evalCriteria ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                    {storyboardOpen.evalCriteria && (
                      <div className="p-4 border-t border-neutral-100 text-xs space-y-1.5 text-neutral-700">
                        <p>• 전략 및 방법론의 우수성 (20점)</p>
                        <p>• 기술 및 기능 요구사항 부합도 (25점)</p>
                        <p>• 보안 및 안정성 대책 (15점)</p>
                      </div>
                    )}
                  </div>

                  {/* 6. Win Theme (STEP 2 연계) */}
                  <div className="rounded-xl border border-[#E60012]/30 bg-red-50/30 overflow-hidden shadow-2xs">
                    <div
                      onClick={() => setStoryboardOpen(p => ({ ...p, winTheme: !p.winTheme }))}
                      className="px-4 py-3 cursor-pointer flex items-center justify-between bg-red-50/60"
                    >
                      <div className="flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-[#E60012]" />
                        <span className="text-xs font-black text-[#E60012]">6. Win Theme (핵심 설득 메시지)</span>
                      </div>
                      {storyboardOpen.winTheme ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                    {storyboardOpen.winTheme && (
                      <div className="p-4 border-t border-red-100 text-xs space-y-2 text-neutral-800">
                        <div className="p-2 rounded bg-white border border-red-200">
                          ① KPC 업무 특성에 최적화된 안전한 Enterprise AI
                        </div>
                        <div className="p-2 rounded bg-white border border-red-200">
                          ② 기존 M365 자산을 활용한 빠른 확장성
                        </div>
                        <div className="p-2 rounded bg-white border border-red-200">
                          ③ Multi-LLM 기반 비용·성능 최적화
                        </div>
                        <div className="p-2 rounded bg-white border border-red-200">
                          ④ KPC 직원이 직접 AI를 만들고 공유하는 Agent 생태계
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 7. 발주사 기대사항 */}
                  <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-2xs">
                    <div
                      onClick={() => setStoryboardOpen(p => ({ ...p, expectations: !p.expectations }))}
                      className="px-4 py-3 cursor-pointer flex items-center justify-between bg-neutral-50/50"
                    >
                      <span className="text-xs font-bold text-[#111111]">7. 발주사 기대사항</span>
                      {storyboardOpen.expectations ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                    {storyboardOpen.expectations && (
                      <div className="p-4 border-t border-neutral-100 text-xs text-neutral-700 leading-relaxed">
                        문서 작성 소요 시간 50% 단축 및 임직원의 자발적 AI Agent 활용 생태계 안착.
                      </div>
                    )}
                  </div>

                  {/* 8. 추가 안내 */}
                  <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-2xs">
                    <div
                      onClick={() => setStoryboardOpen(p => ({ ...p, guide: !p.guide }))}
                      className="px-4 py-3 cursor-pointer flex items-center justify-between bg-neutral-50/50"
                    >
                      <span className="text-xs font-bold text-[#111111]">8. 추가 안내 및 주의사항</span>
                      {storyboardOpen.guide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </div>
                    {storyboardOpen.guide && (
                      <div className="p-4 border-t border-neutral-100 text-xs text-neutral-700 leading-relaxed">
                        특정 상용 클라우드 업체 종속(Lock-in) 방지를 위한 표준 인터페이스 설계 필수.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: 작성 (3개 AI 추천안 카드 & 비교/반영) */}
              {activeRightTab === 'writing' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Prompt Input Block (Always visible) */}
                  <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#E60012]" />
                        <span>AI 자연어 프롬프트 작성</span>
                      </span>
                      {writingPromptInput && (
                        <button
                          onClick={() => {
                            setWritingPromptInput('');
                            const defaultOptions = generateOptionsFromPrompt('', selectedSection?.title || '제안서 섹션');
                            setAiDraftOptions(defaultOptions);
                          }}
                          className="text-[10px] text-neutral-400 hover:text-neutral-600 cursor-pointer"
                        >
                          초기화
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      placeholder="작성 방향이나 추가 요구사항을 입력하세요. (예: '보안 통제 방안에 국정원 가이드를 준수하도록 ARIA-256 암호화를 보강해줘.')"
                      value={writingPromptInput}
                      onChange={e => setWritingPromptInput(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#E60012] focus:ring-1 focus:ring-red-100 placeholder:text-neutral-400 resize-none font-medium leading-relaxed"
                    />
                    <div className="flex items-center justify-end">
                      <button
                        onClick={handleTriggerAiDraftGeneration}
                        disabled={isGeneratingDrafts}
                        className="px-4 py-1.5 rounded-lg bg-[#E60012] hover:bg-[#CC0010] text-white text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isGeneratingDrafts ? '추천안 구성 중...' : 'AI 추천안 3종 생성'}</span>
                      </button>
                    </div>
                  </div>

                  {isGeneratingDrafts && (
                    <div className="p-3.5 bg-neutral-50 rounded-xl text-[11px] text-neutral-600 border border-neutral-200/80 animate-pulse text-center">
                      🤖 입력하신 요구사항에 맞춰 3가지 맞춤형 추천안을 구성하고 있습니다...
                    </div>
                  )}

                  {/* Recommendations Display */}
                  {hasGeneratedDrafts && !isGeneratingDrafts && (
                    <div className="space-y-4">


                      {aiDraftOptions.map((opt, idx) => (
                        <div key={opt.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-2xs space-y-3 hover:border-neutral-300 transition-all animate-in fade-in duration-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#111111]">{opt.title}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                              {idx === 0 ? '추천 1위' : `추천안 ${opt.id}`}
                            </span>
                          </div>
                          <div className="p-3 bg-neutral-50 rounded-lg text-xs font-medium text-neutral-800 whitespace-pre-line leading-relaxed border border-neutral-200/60 font-sans">
                            {opt.content}
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              onClick={() => handleApplyAiDraft(opt.content, opt.mode)}
                              className="px-3.5 py-1.5 rounded-lg bg-[#E60012] text-white text-xs font-bold hover:bg-[#CC0010] shadow-2xs flex items-center gap-1 cursor-pointer"
                            >
                              <span>본문에 반영</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!hasGeneratedDrafts && !isGeneratingDrafts && (
                    <div className="bg-white rounded-xl border border-neutral-200 p-6 text-center shadow-2xs space-y-2">
                      <p className="text-[11px] text-neutral-500 leading-relaxed">
                        상단에 프롬프트를 입력하고 <strong>&apos;AI 추천안 3종 생성&apos;</strong> 버튼을 클릭하면, RFP 요구사항 및 사내 지식자산과 연계된 3가지 맞춤형 추천안을 확인할 수 있습니다.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: AI 검토 (7대 검토 항목) */}
              {activeRightTab === 'review' && (
                <div className="space-y-4">
                  {/* 7 Checkboxes */}
                  <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                      <span className="text-xs font-bold text-[#111111]">7대 AI 검토 기준</span>
                      <button
                        onClick={() => {
                          const allChecked = Object.values(reviewChecks).every(Boolean);
                          setReviewChecks({
                            compliance: !allChecked,
                            winPlan: !allChecked,
                            methodology: !allChecked,
                            evidence: !allChecked,
                            robustness: !allChecked,
                            differentiation: !allChecked,
                            grammar: !allChecked
                          });
                        }}
                        className="text-[11px] font-bold text-[#E60012] hover:underline cursor-pointer"
                      >
                        전체 선택
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 text-xs text-neutral-700">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reviewChecks.compliance}
                          onChange={e => setReviewChecks(p => ({ ...p, compliance: e.target.checked }))}
                          className="accent-[#E60012]"
                        />
                        <span>준수사항 (스토리보드의 요구사항, 맥락 및 평가기준)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reviewChecks.winPlan}
                          onChange={e => setReviewChecks(p => ({ ...p, winPlan: e.target.checked }))}
                          className="accent-[#E60012]"
                        />
                        <span>Win Plan (Win Theme, 차별점, 페인포인트 반영)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reviewChecks.methodology}
                          onChange={e => setReviewChecks(p => ({ ...p, methodology: e.target.checked }))}
                          className="accent-[#E60012]"
                        />
                        <span>접근법과 방법론 (구체성 및 실행 가능성)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reviewChecks.evidence}
                          onChange={e => setReviewChecks(p => ({ ...p, evidence: e.target.checked }))}
                          className="accent-[#E60012]"
                        />
                        <span>근거 검토 (주장에 충분한 근거와 상세 보강 확보)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reviewChecks.robustness}
                          onChange={e => setReviewChecks(p => ({ ...p, robustness: e.target.checked }))}
                          className="accent-[#E60012]"
                        />
                        <span>견고성 (내용의 구체성, 완성도 및 실현 가능성)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reviewChecks.differentiation}
                          onChange={e => setReviewChecks(p => ({ ...p, differentiation: e.target.checked }))}
                          className="accent-[#E60012]"
                        />
                        <span>차별성 (경쟁사 대비 제안의 차별성 확보)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reviewChecks.grammar}
                          onChange={e => setReviewChecks(p => ({ ...p, grammar: e.target.checked }))}
                          className="accent-[#E60012]"
                        />
                        <span>철자 및 문법 (맞춤법, 문법 및 문장 품질)</span>
                      </label>
                    </div>

                    <button
                      onClick={handleRunAiReview}
                      disabled={isReviewing}
                      className="w-full mt-2 py-2 rounded-lg bg-[#111111] text-white text-xs font-bold hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#E60012]" />
                      <span>{isReviewing ? 'AI 정밀 검토 실행 중...' : 'AI 검토 시작'}</span>
                    </button>
                  </div>

                  {/* Review Results Section */}
                  {!hasRunReview ? (
                    <div className="bg-white rounded-xl border border-neutral-200 p-6 text-center shadow-2xs space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-500 flex items-center justify-center mx-auto">
                        <Shield className="w-5 h-5 text-neutral-400" />
                      </div>
                      <h4 className="text-xs font-bold text-[#111111]">검토 결과가 아직 없습니다</h4>
                      <p className="text-[11px] text-neutral-500 leading-relaxed max-w-xs mx-auto">
                        위의 7대 기준 항목을 체크하고 <strong>&apos;AI 검토 시작&apos;</strong>을 누르면 본문 정밀 진단 보고서가 도출됩니다.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      {reviewResults.map(res => (
                        <div key={res.id} className="bg-white rounded-xl border border-neutral-200 p-4 shadow-2xs space-y-2 text-xs hover:border-neutral-300 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                              {res.category}
                            </span>
                            <span className="text-[11px] text-neutral-500">{res.location}</span>
                          </div>
                          <div>
                            <strong className="text-neutral-900 block mb-0.5">문제점:</strong>
                            <p className="text-neutral-700 leading-relaxed">{res.issue}</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200">
                            <strong className="text-emerald-700 block mb-0.5">AI 권장 개선안:</strong>
                            <p className="text-neutral-800 leading-relaxed font-medium">{res.suggestion}</p>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              onClick={() => handleReviewFixRequest(res.suggestion, res.category)}
                              className="px-2.5 py-1 rounded bg-red-50 text-[#E60012] text-[11px] font-extrabold hover:bg-red-100 cursor-pointer flex items-center gap-1 transition-colors"
                            >
                              <Sparkles className="w-3 h-3 text-[#E60012]" />
                              <span>수정하기</span>
                            </button>
                            <button
                              onClick={() => onShowToast(`본문 ${res.location} 위치로 포커스 이동`)}
                              className="px-2.5 py-1 rounded bg-neutral-100 text-neutral-700 text-[11px] font-bold hover:bg-neutral-200 cursor-pointer"
                            >
                              원문 위치 보기
                            </button>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(res.suggestion);
                                onShowToast('권장 개선안이 복사되었습니다.');
                              }}
                              className="px-2.5 py-1 rounded bg-neutral-100 text-neutral-700 text-[11px] font-bold hover:bg-neutral-200 cursor-pointer"
                            >
                              복사
                            </button>
                            <button
                              onClick={() => {
                                setReviewResults(prev => prev.filter(r => r.id !== res.id));
                                onShowToast('검토 항목이 해결완료 처리되어 목록에서 제거되었습니다.');
                              }}
                              className="px-2.5 py-1 rounded bg-red-50 text-[#E60012]/80 text-[11px] font-bold hover:bg-red-100 cursor-pointer"
                            >
                              해결완료
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: 댓글 (인라인 멘션, 작성자, 시간, 답글 기능) */}
              {activeRightTab === 'comments' && (
                <div className="space-y-4">
                  {/* New Comment Input */}
                  <form onSubmit={handleAddComment} className="bg-white rounded-xl border border-neutral-200 p-3 shadow-2xs space-y-2">
                    <textarea
                      rows={2}
                      placeholder="@김민수 팀원 멘션 및 검토 의견 입력..."
                      value={newCommentInput}
                      onChange={e => setNewCommentInput(e.target.value)}
                      className="w-full p-2 rounded-lg border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#E60012] resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-neutral-400">@입력 시 팀원 자동 완성</span>
                      <button
                        type="submit"
                        className="px-3 py-1 rounded-lg bg-[#111111] text-white text-xs font-bold hover:bg-neutral-800 cursor-pointer"
                      >
                        댓글 등록
                      </button>
                    </div>
                  </form>

                  {/* Comment List */}
                  <div className="space-y-3">
                    {comments.map(comm => (
                      <div key={comm.id} className="bg-white rounded-xl border border-neutral-200 p-3.5 shadow-2xs space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-neutral-500" />
                            <strong className="text-neutral-900">{comm.author}</strong>
                          </div>
                          <span className="text-[10px] text-neutral-400">{comm.date}</span>
                        </div>
                        {comm.selectedTextSnippet && (
                          <div className="p-1.5 rounded bg-neutral-100 text-[11px] text-neutral-600 italic border-l-2 border-[#E60012]">
                            &quot;{comm.selectedTextSnippet}&quot;
                          </div>
                        )}
                        <p className="text-neutral-800 leading-relaxed font-medium">
                          {comm.text}
                        </p>

                        {/* Existing Replies */}
                        {comm.replies && comm.replies.length > 0 && (
                          <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-neutral-200">
                            {comm.replies.map(reply => (
                              <div key={reply.id} className="bg-neutral-50 p-2 rounded-lg text-xs space-y-0.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-neutral-800 text-[11px]">{reply.author}</span>
                                  <span className="text-[10px] text-neutral-400 font-mono">{reply.date}</span>
                                </div>
                                <p className="text-neutral-700 text-[11px] leading-snug">{reply.text}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actions & Inline Reply Input */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => {
                              setReplyingCommentId(replyingCommentId === comm.id ? null : comm.id);
                              setReplyInputText('');
                            }}
                            className="text-[11px] text-neutral-600 hover:text-black font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <CornerDownRight className="w-3 h-3 text-neutral-400" />
                            <span>답글 ({comm.replies?.length || 0})</span>
                          </button>
                        </div>

                        {replyingCommentId === comm.id && (
                          <div className="mt-2.5 p-2 bg-neutral-50 rounded-lg border border-neutral-200 space-y-2 animate-in fade-in duration-150">
                            <textarea
                              rows={2}
                              value={replyInputText}
                              onChange={e => setReplyInputText(e.target.value)}
                              placeholder="답글 내용을 입력하세요..."
                              className="w-full bg-white p-2 rounded border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#E60012] resize-none"
                            />
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setReplyingCommentId(null)}
                                className="px-2.5 py-1 text-[11px] text-neutral-600 font-semibold hover:bg-neutral-200 rounded cursor-pointer"
                              >
                                취소
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddReply(comm.id)}
                                className="px-3 py-1 text-[11px] bg-[#111111] hover:bg-neutral-800 text-white font-bold rounded cursor-pointer"
                              >
                                답글 등록
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4-1. 현재상황전체보기 모달 (각각 작성된 모든 파트 통합 뷰) */}
      {showFullDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-[#E60012]">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black text-[#111111]">제안서 현재 상황 전체보기</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-200/80 text-neutral-700">
                      총 {sections.length}개 파트
                    </span>
                  </div>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyFullDocument}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    copiedFullDoc 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                      : 'border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700'
                  }`}
                  title="전체 제안서 본문 클립보드 복사"
                >
                  {copiedFullDoc ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-neutral-500" />}
                  <span>{copiedFullDoc ? '복사 완료!' : '전체 복사'}</span>
                </button>

                {/* Combined Export Button with Dropdown */}
                <div className="relative inline-block text-left" ref={modalExportMenuRef}>
                  <button
                    onClick={() => setShowModalExportMenu(prev => !prev)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#E60012] hover:bg-[#CC0010] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="제안서 내보내기 (Word / PDF / 인쇄)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>내보내기</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showModalExportMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showModalExportMenu && (
                    <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-neutral-200 py-1.5 z-50 animate-in fade-in duration-100">
                      <button
                        onClick={() => {
                          setShowModalExportMenu(false);
                          setShowFullDocModal(false);
                          setShowExportModal(true);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-[#111111] hover:bg-red-50 hover:text-[#E60012] font-bold flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <FileDown className="w-4 h-4 text-[#E60012]" />
                        <div>
                          <div>Word(.docx) 내보내기</div>
                          <div className="text-[10px] text-neutral-400 font-normal">표준 제안서 워드 파일 다운로드</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setShowModalExportMenu(false);
                          onShowToast('인쇄 미리보기 창을 호출합니다.');
                          window.print();
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-[#111111] hover:bg-neutral-100 font-bold flex items-center gap-2 transition-colors cursor-pointer border-t border-neutral-100"
                      >
                        <Printer className="w-4 h-4 text-neutral-500" />
                        <div>
                          <div>A4 인쇄 / PDF 저장</div>
                          <div className="text-[10px] text-neutral-400 font-normal">A4 인쇄 미리보기 및 PDF 출력</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                <div className="h-4 w-px bg-neutral-300 mx-1" />

                <button
                  onClick={() => setShowFullDocModal(false)}
                  className="p-1.5 rounded-lg hover:bg-neutral-200/80 text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
                  title="닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Status Stats Bar */}
            <div className="px-6 py-2.5 bg-white border-b border-neutral-200/90 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-4 text-[11px]">
                {(() => {
                  const totalWords = sections.reduce((acc, s) => {
                    const cnt = (s.id === selectedSection.id && viewMode === 'detail') ? editorText.length : (s.currentCharCount || 0);
                    return acc + cnt;
                  }, 0);
                  const totalTarget = sections.reduce((acc, s) => acc + (s.charLimit || 0), 0);
                  const completedSecs = sections.filter(s => s.status === '완료').length;
                  const inProgressSecs = sections.filter(s => s.status === '작성 중' || s.status === '검토 중' || s.status === '검토 대기').length;
                  const notStartedSecs = sections.filter(s => s.status === '시작 전').length;

                  return (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-500">작성 진척도:</span>
                        <span className="font-bold text-neutral-900 font-mono">
                          {completedSecs}/{sections.length} 완료 ({Math.round((completedSecs / sections.length) * 100)}%)
                        </span>
                      </div>
                      <div className="h-3 w-px bg-neutral-200" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-500">총 글자 수:</span>
                        <span className="font-bold text-[#E60012] font-mono">{totalWords.toLocaleString()}자</span>
                        <span className="text-neutral-400">/ 목표 {totalTarget.toLocaleString()}자</span>
                      </div>
                      <div className="h-3 w-px bg-neutral-200" />
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">완료 {completedSecs}</span>
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">진행 {inProgressSecs}</span>
                        <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 font-medium">대기 {notStartedSecs}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Modal Body: Left TOC & Right Unified Document Paper */}
            <div className="flex-1 flex overflow-hidden bg-neutral-100/60">
              {/* Left TOC Outline */}
              <div className="w-64 border-r border-neutral-200 bg-white p-4 overflow-y-auto shrink-0 hidden md:block">
                <div className="text-xs font-bold text-neutral-900 mb-2.5 flex items-center justify-between">
                  <span>목차 바로가기</span>
                  <span className="text-[10px] text-neutral-400 font-mono">{sections.length}개 항목</span>
                </div>
                <div className="space-y-1">
                  {sections.map(sec => {
                    const activeContentLen = (sec.id === selectedSection.id && viewMode === 'detail') 
                      ? editorText.length 
                      : (sec.currentCharCount || 0);
                    return (
                      <button
                        key={sec.id}
                        onClick={() => {
                          const el = document.getElementById(`doc-sec-${sec.id}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-start gap-1.5 cursor-pointer hover:bg-neutral-100 ${
                          sec.level === 2 ? 'pl-5 text-neutral-600' : 'font-bold text-neutral-800'
                        }`}
                      >
                        <span className="text-[10px] font-mono font-bold text-neutral-400 shrink-0 mt-0.5">
                          {sec.sectionNumber}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-xs">{sec.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[9px] px-1.5 py-0.2 rounded ${
                              sec.status === '완료' ? 'bg-emerald-100 text-emerald-700 font-bold' :
                              sec.status === '작성 중' ? 'bg-red-100 text-[#E60012] font-bold' : 'bg-neutral-100 text-neutral-500'
                            }`}>
                              {sec.status}
                            </span>
                            <span className="text-[9px] font-mono text-neutral-400">
                              {activeContentLen.toLocaleString()}자
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Document Paper Viewer (A4 Sheet Presentation) */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center">
                <div className="w-full max-w-4xl bg-white border border-neutral-200/90 rounded-xl shadow-md p-8 sm:p-12 space-y-10">
                  
                  {/* Document Cover Header */}
                  <div className="border-b-2 border-neutral-900 pb-8 space-y-4">
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span className="font-mono font-bold text-[#E60012]">KPC PROPOSAL DRAFT · 통합 열람본</span>
                      <span>문서 버전: v1.0 (2026.09.14)</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight leading-tight">
                      {activeProject?.title || '한국생산성본부(KPC) 맞춤형 생성형 AI 플랫폼 구축 사업'}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600 pt-2 border-t border-neutral-100">
                      <span>발주기관: <strong>한국생산성본부(KPC)</strong></span>
                      <span>제안 총괄: <strong>정소담</strong></span>
                      <span>검토 총괄: <strong>김민수</strong></span>
                      <span>최종 갱신: <strong>2026.09.14</strong></span>
                    </div>
                  </div>

                  {/* All Sections Sequentially Rendered */}
                  <div className="space-y-10">
                    {sections.map(sec => {
                      const activeContent = (sec.id === selectedSection.id && viewMode === 'detail') 
                        ? editorText 
                        : (sec.content || '');
                      const activeLength = activeContent.length;

                      return (
                        <div 
                          key={sec.id} 
                          id={`doc-sec-${sec.id}`}
                          className="scroll-mt-6 pb-8 border-b border-neutral-200 last:border-b-0 space-y-3"
                        >
                          {/* Section Header Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-50 p-3 rounded-lg border border-neutral-200/80">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-neutral-200 text-neutral-800">
                                Sec {sec.sectionNumber}
                              </span>
                              <h2 className={`font-black text-neutral-900 ${sec.level === 1 ? 'text-base' : 'text-sm'}`}>
                                {sec.title}
                              </h2>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                sec.status === '완료' ? 'bg-emerald-100 text-emerald-800' :
                                sec.status === '검토 중' ? 'bg-blue-100 text-blue-800' :
                                sec.status === '작성 중' ? 'bg-red-100 text-[#E60012]' : 'bg-neutral-100 text-neutral-600'
                              }`}>
                                {sec.status}
                              </span>
                              <span className="text-[11px] text-neutral-500 font-medium">
                                작성자: <strong className="text-neutral-700">{sec.author}</strong>
                              </span>
                              <span className="text-[11px] text-neutral-500 font-medium font-mono">
                                <span>마감: <strong className="text-neutral-700">{sec.dueDate || sec.updatedAt}</strong></span>
                              </span>
                              <span className="text-[11px] font-mono text-neutral-500">
                                ({activeLength.toLocaleString()}자 / 목표 {sec.charLimit.toLocaleString()}자)
                              </span>
                              <button
                                onClick={() => {
                                  setShowFullDocModal(false);
                                  handleSelectSection(sec);
                                }}
                                className="ml-1 px-2.5 py-1 rounded bg-white hover:bg-[#E60012] text-neutral-700 hover:text-white border border-neutral-300 hover:border-[#E60012] text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="이 파트 개별 편집기로 이동"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>편집</span>
                              </button>
                            </div>
                          </div>

                          {/* Section Content Body */}
                          <div className="px-2 pt-1">
                            {activeContent.trim() ? (
                              <div className="text-xs leading-relaxed text-neutral-800 whitespace-pre-wrap font-sans space-y-2">
                                {activeContent}
                              </div>
                            ) : (
                              <div className="p-6 rounded-xl bg-neutral-50 border border-dashed border-neutral-300 text-center space-y-2">
                                <p className="text-xs text-neutral-400 font-medium italic">
                                  아직 작성된 본문 내용이 없습니다.
                                </p>
                                <button
                                  onClick={() => {
                                    setShowFullDocModal(false);
                                    handleSelectSection(sec);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-[#E60012] text-white text-xs font-bold hover:bg-[#CC0010] inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>지금 내용 작성하기</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Document End Marker */}
                  <div className="pt-8 border-t border-neutral-200 text-center text-xs text-neutral-400 space-y-1">
                    <p className="font-semibold text-neutral-600">[제안서 전체 파트 작성 현황 끝]</p>
                    <p>한국생산성본부(KPC) 생성형 AI 사업단 제안 총괄 드래프트</p>
                  </div>

                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between shrink-0">
              <div className="text-xs text-neutral-500">
                각 섹션을 수정하려면 우측 상단의 <strong>[편집]</strong> 버튼을 누르거나, 모달을 닫고 목록에서 섹션을 선택하세요.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyFullDocument}
                  className="px-4 py-2 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Copy className="w-3.5 h-3.5 text-neutral-500" />
                  <span>전체 본문 복사</span>
                </button>
                <button
                  onClick={() => setShowFullDocModal(false)}
                  className="px-5 py-2 rounded-lg bg-[#111111] hover:bg-neutral-800 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  닫기
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 4-2. 제안서 내보내기 모달 */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-[#E60012]" />
                <h2 className="text-sm font-black text-[#111111]">제안서 내보내기</h2>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded hover:bg-neutral-200 text-neutral-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Export Format Mode */}
              <div>
                <label className="block font-bold text-neutral-700 mb-2">내보내기 서식 선택</label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setExportDocType('default_word')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      exportDocType === 'default_word'
                        ? 'border-[#E60012] bg-[#E60012]/5 font-bold'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <span className="block text-neutral-900">기본 Word 문서</span>
                    <span className="text-[11px] text-neutral-500 font-normal">표준 서식 및 스타일로 자동 생성</span>
                  </div>

                  <div
                    onClick={() => setExportDocType('template_word')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      exportDocType === 'template_word'
                        ? 'border-[#E60012] bg-[#E60012]/5 font-bold'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <span className="block text-neutral-900">템플릿을 사용하여 내보내기</span>
                    <span className="text-[11px] text-neutral-500 font-normal">KPC 공식 템플릿 또는 등록 서식 적용</span>
                  </div>
                </div>
              </div>

              {/* Template Select (If template mode) */}
              {exportDocType === 'template_word' && (
                <div className="p-3.5 rounded-lg bg-neutral-50 border border-neutral-200 space-y-2">
                  <label className="block font-bold text-neutral-700">적용 템플릿 파일</label>
                  <select
                    value={selectedTemplateName}
                    onChange={e => setSelectedTemplateName(e.target.value)}
                    className="w-full p-2 rounded-lg border border-neutral-300 bg-white font-medium text-xs focus:outline-none focus:border-[#E60012]"
                  >
                    <option value="KPC_표준_제안서_템플릿.dotx">KPC 표준 제안서 템플릿 (Red Theme)</option>
                    <option value="공공기관_입찰_표준양식.dotx">공공기관 입찰 표준양식 (기술평가본)</option>
                  </select>
                </div>
              )}

              {/* Options Checkboxes */}
              <div>
                <label className="block font-bold text-neutral-700 mb-2">포함 옵션 설정</label>
                <div className="space-y-2 bg-neutral-50 p-3.5 rounded-lg border border-neutral-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeCover}
                      onChange={e => setExportOptions(p => ({ ...p, includeCover: e.target.checked }))}
                      className="accent-[#E60012]"
                    />
                    <span>표지 포함</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.autoToc}
                      onChange={e => setExportOptions(p => ({ ...p, autoToc: e.target.checked }))}
                      className="accent-[#E60012]"
                    />
                    <span>목차 자동 생성</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.pageNumber}
                      onChange={e => setExportOptions(p => ({ ...p, pageNumber: e.target.checked }))}
                      className="accent-[#E60012]"
                    />
                    <span>페이지 번호 자동 삽입</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.headerFooter}
                      onChange={e => setExportOptions(p => ({ ...p, headerFooter: e.target.checked }))}
                      className="accent-[#E60012]"
                    />
                    <span>머리말 / 꼬리말 포함</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportOptions.excludeRfpQuote}
                      onChange={e => setExportOptions(p => ({ ...p, excludeRfpQuote: e.target.checked }))}
                      className="accent-[#E60012]"
                    />
                    <span>RFP 출처 주석 제외 (최종 제출본용)</span>
                  </label>
                </div>
              </div>

              {/* Incomplete Checklist Warning Banner */}
              {(() => {
                const incompleteCount = (checklistItems || []).filter(item => !item.checked).length;
                if (incompleteCount > 0) {
                  return (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-[#E60012] font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>제출 전 확인이 필요한 체크리스트가 {incompleteCount}개 남아 있습니다.</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="px-6 py-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleExportProposal('PDF')}
                className="px-4 py-2 rounded-lg bg-neutral-800 text-white text-xs font-bold hover:bg-neutral-900"
              >
                PDF 출력
              </button>
              <button
                type="button"
                onClick={() => handleExportProposal('Word')}
                className="px-5 py-2 rounded-lg bg-[#E60012] text-white text-xs font-bold hover:bg-[#CC0010] shadow-xs"
              >
                Word 파일 생성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4-4. 버전 기록 모달 */}
      {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-neutral-200 w-full max-w-4xl h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#E60012]" />
                <h2 className="text-sm font-black text-[#111111]">
                  버전 기록 - [{selectedSection.title}]
                </h2>
              </div>
              <button
                onClick={() => setShowVersionModal(false)}
                className="p-1 rounded hover:bg-neutral-200 text-neutral-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Left Preview */}
              <div className="w-3/5 p-6 border-r border-neutral-200 overflow-y-auto bg-neutral-50/40">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-700">
                    선택 버전: <strong>{selectedVersionPreview.versionCode} - {selectedVersionPreview.title}</strong>
                  </span>
                  <span className="text-[11px] text-neutral-400">{selectedVersionPreview.createdAt}</span>
                </div>
                <div className="bg-white p-5 rounded-xl border border-neutral-200 text-xs text-[#111111] leading-relaxed whitespace-pre-line shadow-2xs font-medium">
                  {selectedVersionPreview.content}
                </div>
              </div>

              {/* Right Versions List */}
              <div className="w-2/5 p-4 overflow-y-auto bg-white space-y-2.5">
                <span className="text-xs font-bold text-neutral-500 block mb-2">저장된 버전 목록</span>
                {versionHistory.map(ver => {
                  const isEditing = editingVersionId === ver.id;
                  return (
                    <div
                      key={ver.id}
                      onClick={() => !isEditing && setSelectedVersionPreview(ver)}
                      className={`p-3 rounded-xl border transition-all ${
                        !isEditing ? 'cursor-pointer' : ''
                      } ${
                        selectedVersionPreview.id === ver.id
                          ? 'border-[#E60012] bg-[#E60012]/5 ring-1 ring-[#E60012]/20'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {isEditing ? (
                          <div className="flex-1 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingVersionTitle}
                              onChange={e => setEditingVersionTitle(e.target.value)}
                              className="flex-1 bg-white border border-neutral-300 px-2 py-0.5 rounded text-xs font-bold text-[#111111] focus:outline-none focus:border-[#E60012]"
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const trimmed = editingVersionTitle.trim();
                                  setVersionHistory(prev => prev.map(item => item.id === ver.id ? { ...item, title: trimmed || item.title } : item));
                                  setSelectedVersionPreview(prev => prev.id === ver.id ? { ...prev, title: trimmed || prev.title } : prev);
                                  setEditingVersionId(null);
                                  onShowToast('버전 이름이 성공적으로 변경되었습니다.');
                                }
                              }}
                              autoFocus
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const trimmed = editingVersionTitle.trim();
                                setVersionHistory(prev => prev.map(item => item.id === ver.id ? { ...item, title: trimmed || item.title } : item));
                                setSelectedVersionPreview(prev => prev.id === ver.id ? { ...prev, title: trimmed || prev.title } : prev);
                                setEditingVersionId(null);
                                onShowToast('버전 이름이 성공적으로 변경되었습니다.');
                              }}
                              className="px-2 py-1 bg-neutral-900 hover:bg-black text-white rounded text-[10px] font-bold"
                            >
                              적용
                            </button>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-between gap-1.5 min-w-0">
                            <span className="text-xs font-bold text-neutral-900 truncate">
                              {ver.versionCode} - {ver.title}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingVersionId(ver.id);
                                setEditingVersionTitle(ver.title || ver.versionName || '');
                              }}
                              className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 shrink-0"
                              title="버전 이름 변경"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[11px] text-neutral-500">
                        <span>{ver.author}</span>
                        <span>{ver.createdAt}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowVersionModal(false)}
                className="px-4 py-2 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
              >
                닫기
              </button>
              <button
                onClick={() => handleRestoreVersion(selectedVersionPreview)}
                className="px-5 py-2 rounded-lg bg-[#E60012] text-white text-xs font-bold hover:bg-[#CC0010] shadow-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>이 버전으로 복원</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4-4-2. 수동 버전 저장시 이름 설정 모달 */}
      {showSaveVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-[#E60012] flex items-center justify-center">
                  <Save className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#111111]">현재 버전 저장</h3>
                  <p className="text-[11px] text-neutral-500">지정된 이름으로 현재 상태의 백업 버전을 저장합니다.</p>
                </div>
              </div>
              <button
                onClick={() => setShowSaveVersionModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  버전 이름 <span className="text-[#E60012]">*</span>
                </label>
                <input
                  type="text"
                  value={saveVersionInput}
                  onChange={e => setSaveVersionInput(e.target.value)}
                  placeholder="예: 보안 아키텍처 보강본"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#E60012]"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleConfirmSaveVersion(saveVersionInput);
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>
            <div className="px-6 py-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowSaveVersionModal(false)}
                className="px-4 py-2 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={() => handleConfirmSaveVersion(saveVersionInput)}
                className="px-5 py-2 rounded-lg bg-[#E60012] text-white text-xs font-bold hover:bg-[#CC0010] shadow-xs cursor-pointer"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Data Modal (+ 사내자료 연결) */}
      {showEnterpriseDataModal && (
        <EnterpriseDataModal
          isOpen={showEnterpriseDataModal}
          onClose={() => setShowEnterpriseDataModal(false)}
          onShowToast={onShowToast}
        />
      )}

      {/* Section Reference Modal (내부저장소, 업로드, 웹검색 - 현재 섹션 전용) */}
      {showSectionRefModal && (
        <SectionReferenceModal
          isOpen={showSectionRefModal}
          initialTab={sectionRefModalTab}
          sectionId={selectedSection?.id || 'sec-default'}
          sectionTitle={selectedSection?.title || sectionTitle || '제안서 섹션'}
          config={currentSectionRefConfig}
          onSaveConfig={handleSaveSectionReferenceConfig}
          onClose={() => setShowSectionRefModal(false)}
          onShowToast={onShowToast}
        />
      )}

      {/* Section Edit Modal (수정) */}
      {isEditModalOpen && editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-200 bg-[#F8F9FA] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-[#E60012] flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#111111]">섹션 정보 수정</h3>
                  <p className="text-[11px] text-neutral-500">목차명, 상태, 마감일, 글자 수 제한 및 담당자를 수정합니다.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingSection(null);
                }}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  섹션 제목 <span className="text-[#E60012]">*</span>
                </label>
                <input
                  type="text"
                  value={editingSection.title}
                  onChange={e => setEditingSection({ ...editingSection, title: e.target.value })}
                  placeholder="예: 1. 사업 이해 및 추진전략"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#E60012]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    목차 번호
                  </label>
                  <input
                    type="text"
                    value={editingSection.sectionNumber}
                    onChange={e => setEditingSection({ ...editingSection, sectionNumber: e.target.value })}
                    placeholder="예: 1, 2.1"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#E60012]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    계층 레벨
                  </label>
                  <select
                    value={editingSection.level}
                    onChange={e => setEditingSection({ ...editingSection, level: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#E60012] bg-white"
                  >
                    <option value={1}>1단계 (대분류 장)</option>
                    <option value={2}>2단계 (중분류 절)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    작성 상태
                  </label>
                  <select
                    value={editingSection.status}
                    onChange={e => setEditingSection({ ...editingSection, status: e.target.value as SectionStatusType })}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs text-[#111111] focus:outline-none focus:border-[#E60012] bg-white"
                  >
                    <option value="시작 전">시작 전</option>
                    <option value="작성 중">작성 중</option>
                    <option value="검토 대기">검토 대기</option>
                    <option value="검토 중">검토 중</option>
                    <option value="완료">완료</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center justify-between">
                    <span>마감일</span>
                    {userRole !== 'admin' && <span className="text-[10px] text-neutral-400 font-normal">관리자 설정</span>}
                  </label>
                  <input
                    type="date"
                    value={editingSection.dueDate || editingSection.updatedAt || '2026-09-25'}
                    disabled={userRole !== 'admin'}
                    onChange={e => setEditingSection({ 
                      ...editingSection, 
                      dueDate: e.target.value,
                      updatedAt: e.target.value
                    })}
                    className={`w-full px-3 py-2 rounded-lg border text-xs text-[#111111] focus:outline-none font-mono ${
                      userRole === 'admin'
                        ? 'border-neutral-300 focus:border-[#E60012] bg-white cursor-pointer'
                        : 'border-neutral-200 bg-neutral-100 cursor-not-allowed text-neutral-500'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center justify-between">
                    <span>목표 글자 수 제한</span>
                    {userRole !== 'admin' && <span className="text-[10px] text-neutral-400 font-normal">관리자 설정</span>}
                  </label>
                  <input
                    type="number"
                    value={editingSection.charLimit}
                    disabled={userRole !== 'admin'}
                    onChange={e => setEditingSection({ ...editingSection, charLimit: Math.max(100, Number(e.target.value) || 0) })}
                    placeholder="4000"
                    className={`w-full px-3 py-2 rounded-lg border text-xs text-[#111111] focus:outline-none font-mono ${
                      userRole === 'admin'
                        ? 'border-neutral-300 focus:border-[#E60012] bg-white'
                        : 'border-neutral-200 bg-neutral-100 cursor-not-allowed text-neutral-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    현재 작성 글자 수
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${editingSection.currentCharCount.toLocaleString()}자`}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-100 text-neutral-500 text-xs font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center justify-between">
                    <span>작성자</span>
                    {userRole !== 'admin' && <span className="text-[10px] text-neutral-400 font-normal">관리자 설정</span>}
                  </label>
                  <input
                    type="text"
                    value={editingSection.author}
                    disabled={userRole !== 'admin'}
                    onChange={e => setEditingSection({ ...editingSection, author: e.target.value })}
                    placeholder="정소담"
                    className={`w-full px-3 py-2 rounded-lg border text-xs text-[#111111] focus:outline-none ${
                      userRole === 'admin'
                        ? 'border-neutral-300 focus:border-[#E60012] bg-white'
                        : 'border-neutral-200 bg-neutral-100 cursor-not-allowed text-neutral-500'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1 flex items-center justify-between">
                    <span>검토자</span>
                    {userRole !== 'admin' && <span className="text-[10px] text-neutral-400 font-normal">관리자 설정</span>}
                  </label>
                  <input
                    type="text"
                    value={editingSection.reviewer}
                    disabled={userRole !== 'admin'}
                    onChange={e => setEditingSection({ ...editingSection, reviewer: e.target.value })}
                    placeholder="김민수"
                    className={`w-full px-3 py-2 rounded-lg border text-xs text-[#111111] focus:outline-none ${
                      userRole === 'admin'
                        ? 'border-neutral-300 focus:border-[#E60012] bg-white'
                        : 'border-neutral-200 bg-neutral-100 cursor-not-allowed text-neutral-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-neutral-50 border-t border-neutral-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingSection(null);
                }}
                className="px-4 py-2 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleSaveEditedSection(editingSection)}
                className="px-5 py-2 rounded-lg bg-[#E60012] hover:bg-[#CC0010] text-white text-xs font-bold shadow-xs hover:shadow transition-all"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
