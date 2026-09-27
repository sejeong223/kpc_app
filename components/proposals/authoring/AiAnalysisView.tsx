"use client";

import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Save,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { SAMPLE_RFP_DOCUMENT_PAGES } from "@/data/proposals/rfp-pages";
import type { ProposalProject, UploadedProposalFile } from "@/types/proposals";

export interface AiAnalysisCardItem {
  id: number;
  title: string;
  categoryName: string;
  content: string;
  rfpPage: number;
  rfpQuote: string;
  isWinTheme?: boolean;
}

export const KPC_AI_ANALYSIS_11_ITEMS: AiAnalysisCardItem[] = [
  {
    id: 1,
    title: '1. 프로젝트 요약',
    categoryName: '프로젝트 요약',
    content: '본 사업은 한국생산성본부(KPC) 임직원 및 기업 교육·컨설팅 고객을 대상으로 안전하고 고도화된 사내 전용 생성형 AI 업무혁신 플랫폼을 구축하는 프로젝트입니다. 총 사업예산 12억 원, 계약체결일로부터 8개월 동안 진행되며, 보안 무보존(ZDR) 아키텍처, M365 연계, Multi-LLM 라우팅 및 Agent 생태계 조성을 목표로 합니다.',
    rfpPage: 3,
    rfpQuote: '사업명: KPC 생성형 AI 플랫폼 구축 사업 / 사업기간: 계약체결일로부터 8개월 / 사업예산: 1,200,000,000원'
  },
  {
    id: 2,
    title: '2. 프로젝트 범위',
    categoryName: '프로젝트 범위',
    content: '1) 사내 지식 기반 RAG 검색 및 임베딩 파이프라인 구축 (KPC 규정, 교육 교재, 컨설팅 보고서 등)\n2) Enterprise Multi-LLM(Gemini, Claude, GPT) 지능형 라우팅 및 sLLM 연동\n3) Microsoft 365(Teams, Outlook, Word) 및 사내 ERP/그룹웨어 MCP/REST 연계\n4) KPC 직원이 코딩 없이 직접 사내 맞춤형 AI Agent를 생성·배포·공유할 수 있는 커뮤니티 허브 구현',
    rfpPage: 5,
    rfpQuote: '과업범위: 1. 사내 지식 RAG 플랫폼 구축 2. Multi-LLM 라우터 구현 3. M365 및 사내 ERP 연계 4. 직원 참여형 Agent 생태계 조성'
  },
  {
    id: 3,
    title: '3. 주요 일정',
    categoryName: '주요 일정',
    content: '• 입찰 마감: 2026년 10월 30일 17:00\n• 기술 제안서 평가(PT 발표): 2026년 11월 06일\n• 우선협상대상자 선정 및 기술협상: 2026년 11월 10일 ~ 11월 17일\n• 본 계약 체결 및 착수 보고: 2026년 11월 하순\n• 1차 파일럿 서비스(M365 연계 및 기본 RAG): 착수 후 3개월 차 (2027년 2월)\n• 최종 구축 완료 및 전사 오픈: 착수 후 8개월 차 (2027년 7월)',
    rfpPage: 8,
    rfpQuote: '제출기한: 2026.10.30 17:00 전자접수 / 제안서 설명회: 제안서 접수 후 개별 통보'
  },
  {
    id: 4,
    title: '4. 연결된 정보',
    categoryName: '연결된 정보',
    content: '• 사내 인증 체계: Microsoft Entra ID (Azure AD) Single Sign-On(SSO) 연동 필수\n• 연계 대상 시스템: KPC 통합 ERP(SAP), 그룹웨어(결재/일정), 교육 LMS, 컨설팅 지식DB\n• 통신 프로토콜: RESTful API 및 Model Context Protocol (MCP) 표준 프로토콜 준수',
    rfpPage: 15,
    rfpQuote: '기존 시스템 연계: Entra ID 기반 단일 로그인 지원 및 사내 4대 레거시 시스템과의 REST/MCP API 연계 필수'
  },
  {
    id: 5,
    title: '5. 참조사항',
    categoryName: '참조사항',
    content: '• 행정안전부 및 국가정보원 생성형 AI 보안 가이드라인 준수 필수\n• KPC 내부 보안 규정: AI 모델 제공업체(CSP)에 의한 사내 데이터 학습 및 저장 절대 금지(Zero Data Retention)\n• 제안서 분량: 본문 기준 100페이지 이내 권장 (별첨 기술 증빙 제외)',
    rfpPage: 12,
    rfpQuote: '보안 원칙: 외부 LLM API 호출 시 프롬프트 및 응답 데이터의 학습 금지(Zero Retention) 확약 필수'
  },
  {
    id: 6,
    title: '6. 방법론 및 절차',
    categoryName: '방법론 및 절차',
    content: '• 단계별 애자일(Agile) + 폭포수(Waterfall) 하이브리드 방법론 적용\n• 1단계: 요구사항 분석 및 AI 아키텍처 설계 (Sprint 1-2)\n• 2단계: 핵심 RAG 엔진 및 Multi-LLM 게이트웨이 구현 (Sprint 3-5)\n• 3단계: M365 및 레거시 연계, UI/UX 개발 (Sprint 6-8)\n• 4단계: 보안 감사, 부하 테스트, 전사 시범 운영 및 최종 오픈 (Sprint 9-10)',
    rfpPage: 18,
    rfpQuote: '수행 방법론: 본 사업의 신속한 PoC 검증과 안정적 본 서비스 론칭을 위한 반복 점진적 개발 방법론 제시 권장'
  },
  {
    id: 7,
    title: '7. 양식 및 법적 요구사항',
    categoryName: '양식 및 법적 요구사항',
    content: '• 입찰보증금 납부(입찰금액의 100분의 5 이상) 또는 지급확약서 제출\n• 소프트웨어사업자(컴퓨터관련서비스사업) 일반 현황 관리확인서\n• 개인정보보호 서약서, 청렴계약이행서약서, 비밀유지계약서(NDA) 제출\n• 하도급 제한: 소프트웨어 진흥법 제51조에 의거 단순 하도급 불허',
    rfpPage: 19,
    rfpQuote: '법적 요건: 소프트웨어 진흥법 및 국가계약법 준수, 하도급 승인 절차 엄수'
  },
  {
    id: 8,
    title: '8. 페인포인트',
    categoryName: '페인포인트',
    content: '• 임직원 개별 AI 사용으로 인한 기업 기밀 유출 및 저작권 리스크 상존\n• 사내 방대한 컨설팅 보고서와 교육자료가 사일로화되어 검색 및 재활용에 과도한 시간 소요 (일평균 50분)\n• 단일 LLM에 종속될 경우 비용 급증 및 서비스 장애 발생 시 업무 마비 우려\n• 개발 지식이 없는 일반 현업 직원이 업무용 AI를 직접 만들기 어려움',
    rfpPage: 34,
    rfpQuote: '현행 문제점: 분산된 사내 지식의 검색 비효율, 보안이 담보되지 않은 외부 AI 사용의 위험성'
  },
  {
    id: 9,
    title: '9. 발주사의 기대사항',
    categoryName: '발주사의 기대사항',
    content: '• 도입 첫날부터 KPC 임직원이 즉시 활용할 수 있는 직관적이고 완성도 높은 UI/UX\n• 제안서 및 보고서 작성 소요 시간 50% 이상 단축으로 컨설팅 생산성 획기적 제고\n• 안전하고 규정을 100% 준수하는 Enterprise AI 보안 표준 레퍼런스 확립\n• 전사 임직원의 자발적 AI 활용과 Agent 공유로 이어지는 디지털 혁신 문화 정착',
    rfpPage: 36,
    rfpQuote: '기대 효과: KPC 임직원의 업무 생산성 획기적 향상 및 공공/민간 기업 대상 AI 컨설팅 사업 역량 내재화'
  },
  {
    id: 10,
    title: '10. 잠재적 위험',
    categoryName: '잠재적 위험',
    content: '• HWP/HWPX 복합 서식 및 도표 포함 문서의 RAG 파싱 시 문맥 누락 리스크\n• Multi-LLM API 트래픽 폭증 시 예산 초과(Token Overuse) 및 응답 지연 리스크\n• 사내 레거시 ERP의 API 비표준화로 인한 연동 지연 가능성 (사전 PoC 연계 테스트 필요)',
    rfpPage: 23,
    rfpQuote: '위험 관리: 비정형 문서 파싱 정확도 및 다중 LLM 사용에 따른 비용 관리 방안 사전 수립 필수'
  },
  {
    id: 11,
    title: '11. Win Theme (수주 핵심 설득 테마)',
    categoryName: 'Win Theme',
    content: `① KPC 업무 특성에 최적화된 안전한 Enterprise AI: 제로 데이터 리텐션(ZDR)과 사내 권한 통제로 기밀 유출 완벽 차단\n② 기존 M365 자산을 활용한 빠른 확장성: Teams/Outlook/Word 내 직접 탑재로 별도 학습 없이 즉시 전사 사용\n③ Multi-LLM 기반 비용·성능 최적화: 업무 난이도별 최적 모델 자동 라우팅으로 토큰 비용 40% 절감\n④ KPC 직원이 직접 AI를 만들고 공유하는 Agent 생태계: 노코드 Agent Builder와 검증 거버넌스를 통한 전사 혁신`,
    rfpPage: 31,
    rfpQuote: '제안 전략: 발주기관의 특수성을 고려한 차별화된 제안 테마 및 비교우위 요소를 명확히 제시할 것',
    isWinTheme: true
  }
];

export interface RfpDocOption {
  id: string;
  name: string;
  pages: number;
  category: 'RFP 문서';
  tag: string;
}

export const RFP_ONLY_DOCUMENTS: RfpDocOption[] = [
  {
    id: 'rfp-doc-1',
    name: 'KPC_AI플랫폼_RFP.pdf',
    pages: 86,
    category: 'RFP 문서',
    tag: 'RFP 본문'
  },
  {
    id: 'rfp-doc-2',
    name: 'KPC_AI플랫폼_제안요청서_별첨규격서.pdf',
    pages: 34,
    category: 'RFP 문서',
    tag: '별첨 요구규격'
  },
  {
    id: 'rfp-doc-3',
    name: 'KPC_생성형AI_보안및인프라요건서.pdf',
    pages: 22,
    category: 'RFP 문서',
    tag: '보안/인프라'
  }
];

export interface AiAnalysisViewProps {
  activeProject?: ProposalProject | null;
  uploadedFiles?: UploadedProposalFile[];
  onNavigateNext: () => void;
  onNavigateToProjects?: () => void;
  onNavigateToProjectRoot?: () => void;
  onShowToast: (msg: string) => void;
}

export const AiAnalysisView: React.FC<AiAnalysisViewProps> = ({
  activeProject,
  uploadedFiles,
  onNavigateNext,
  onNavigateToProjects,
  onNavigateToProjectRoot,
  onShowToast
}) => {
  const [sections, setSections] = useState<AiAnalysisCardItem[]>(KPC_AI_ANALYSIS_11_ITEMS);

  // 해당 프로젝트에 업로드한 RFP 문서만 엄격히 필터링
  const projectRfpFiles = React.useMemo(() => {
    const list = (uploadedFiles || []).filter(f => f.category === 'RFP 문서');
    if (list.length > 0) {
      return list;
    }
    return [
      {
        id: `rfp-${activeProject?.id || 'default'}`,
        fileName: `${(activeProject?.title || 'KPC_AI플랫폼').replace(/\s+/g, '_')}_RFP.pdf`,
        category: 'RFP 문서' as const,
        size: '8.4 MB',
        pages: 86,
        uploader: activeProject?.manager || '정소담',
        uploadDate: '26.09.14',
        status: '분석 완료' as const,
        type: 'PDF'
      }
    ];
  }, [uploadedFiles, activeProject]);

  const [selectedDocId, setSelectedDocId] = useState<string>(() => projectRfpFiles[0]?.id || '');

  const effectiveSelectedDocId = projectRfpFiles.some(d => d.id === selectedDocId)
    ? selectedDocId
    : projectRfpFiles[0]?.id || '';

  const currentRfpDoc = projectRfpFiles.find(d => d.id === effectiveSelectedDocId) || projectRfpFiles[0];
  const selectedDocName = currentRfpDoc.fileName;
  const totalPages = currentRfpDoc.pages || 86;

  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: false,
    4: false,
    5: false,
    6: false,
    7: false,
    8: true,
    9: true,
    10: false,
    11: true
  });

  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  // Left Viewer State
  const [currentPage, setCurrentPage] = useState<number>(3);
  const [highlightedSnippet, setHighlightedSnippet] = useState<string>('사업명: KPC 생성형 AI 플랫폼 구축 사업 / 사업기간: 계약체결일로부터 8개월 / 사업예산: 1,200,000,000원');
  const [highlightedSectionId, setHighlightedSectionId] = useState<number | null>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [searchDocQuery, setSearchDocQuery] = useState<string>('');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const toggleAccordion = (id: number) => {
    setExpandedSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleStartEdit = (section: AiAnalysisCardItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSectionId(section.id);
    setEditingText(section.content);
  };

  const handleSaveEdit = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSections(prev => prev.map(s => s.id === id ? { ...s, content: editingText } : s));
    setEditingSectionId(null);
    onShowToast('분석 내용이 성공적으로 수정 및 저장되었습니다.');
  };

  const handleCopyText = (content: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    onShowToast('클립보드에 분석 내용이 복사되었습니다.');
  };

  const handleJumpToRfpLocation = (page: number, quote: string, sectionId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPage(page);
    setHighlightedSnippet(quote);
    setHighlightedSectionId(sectionId);
    onShowToast(`RFP 원문 p.${page} 위치로 이동하여 해당 문단을 강조 표시했습니다.`);
  };

  const handleDownload = (format: 'PDF' | 'Word') => {
    setShowDownloadMenu(false);
    onShowToast(`AI 분석 결과 리포트 (${format}) 생성을 완료하여 다운로드합니다.`);
  };

  // Safe fetch of current page content
  const activePageData = SAMPLE_RFP_DOCUMENT_PAGES[currentPage] || {
    pageNumber: currentPage,
    chapter: `제 ${currentPage} 페이지 - KPC AI 플랫폼 제안요청서`,
    subTitle: '세부 요구사항 및 사업 명세',
    contentLines: [
      { type: 'heading' as const, text: `【KPC RFP 원문 p.${currentPage}】` },
      { type: 'text' as const, text: highlightedSnippet || '발주기관 한국생산성본부의 제안 요청 내용입니다.' },
      { type: 'bullet' as const, text: '본 조항은 사업 수행 시 반드시 준수되어야 하는 필수 규격입니다.' }
    ]
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8F9FA]">
      {/* Top Header Bar */}
      <div className="px-6 py-3.5 bg-white border-b border-neutral-200 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-semibold mb-0.5">
            <button
              id="breadcrumb-all-projects-btn"
              type="button"
              onClick={onNavigateToProjects}
              className="hover:text-[#E60012] hover:underline cursor-pointer transition-colors"
            >
              전체 프로젝트
            </button>
            <span className="text-neutral-400">&gt;</span>
            <button
              id="breadcrumb-project-title-btn"
              type="button"
              onClick={onNavigateToProjectRoot}
              className="text-[#111111] font-bold hover:text-[#E60012] hover:underline cursor-pointer transition-colors truncate max-w-[280px]"
              title={activeProject?.title || 'KPC 생성형 AI 플랫폼 구축 사업'}
            >
              {activeProject?.title || 'KPC 생성형 AI 플랫폼 구축 사업'}
            </button>
            <span className="text-neutral-400">&gt;</span>
            <button
              id="breadcrumb-current-step-btn"
              type="button"
              onClick={() => {
                setCurrentPage(1);
                onShowToast('02 RFP 분석 화면 시작 위치로 이동했습니다.');
              }}
              className="text-[#E60012] font-black hover:underline cursor-pointer transition-colors"
            >
              02 RFP 분석
            </button>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-[#111111] tracking-tight">
              RFP 분석
            </h1>
            {/* Document Selector Dropdown (해당 프로젝트에 업로드한 RFP 문서만 노출) */}
            <div className="flex items-center gap-1.5 bg-neutral-100 px-3 py-1 rounded-lg border border-neutral-200 shadow-2xs">
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#E60012] text-white shrink-0">
                RFP 문서
              </span>
              <FileText className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
              <select
                id="rfp-document-dropdown"
                value={effectiveSelectedDocId}
                onChange={e => {
                  const newId = e.target.value;
                  setSelectedDocId(newId);
                  const matched = projectRfpFiles.find(d => d.id === newId);
                  if (matched) {
                    setCurrentPage(1);
                    onShowToast(`RFP 분석 대상 문서가 '${matched.fileName}' (${matched.pages}p)로 전환되었습니다.`);
                  }
                }}
                className="bg-transparent text-xs font-bold text-[#111111] focus:outline-none cursor-pointer pr-1 max-w-[220px] truncate"
              >
                {projectRfpFiles.map(doc => (
                  <option key={doc.id} value={doc.id}>
                    {doc.fileName} ({doc.pages}p)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Download Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="px-3 py-2 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-neutral-500" />
              <span>분석결과 다운로드</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>
            {showDownloadMenu && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-neutral-200 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => handleDownload('Word')}
                  className="w-full text-left px-3.5 py-2 text-xs text-[#111111] hover:bg-neutral-100 font-semibold flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Word (.docx) 다운로드</span>
                </button>
                <button
                  onClick={() => handleDownload('PDF')}
                  className="w-full text-left px-3.5 py-2 text-xs text-[#111111] hover:bg-neutral-100 font-semibold flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-red-600" />
                  <span>PDF (.pdf) 다운로드</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onNavigateNext}
            className="px-4 py-2 rounded-lg bg-[#E60012] text-white text-xs font-bold hover:bg-[#CC0010] shadow-xs hover:shadow transition-all flex items-center gap-1.5"
          >
            <span>체크리스트 이동 (다음 단계)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2-Column Split Workspace (45% : 55%) */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN (45%): RFP 원문 Viewer */}
        <div className="w-[45%] border-r border-neutral-200 bg-white flex flex-col h-full overflow-hidden select-text">
          {/* Viewer Toolbar */}
          <div className="px-4 py-2.5 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-neutral-500" />
              <span className="text-xs font-bold text-[#111111] truncate max-w-[140px]">
                {selectedDocName}
              </span>
            </div>

            {/* Page Navigator */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
                className="p-1 rounded hover:bg-neutral-200 text-neutral-600 disabled:opacity-30"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-neutral-700 px-1.5">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 rounded hover:bg-neutral-200 text-neutral-600 disabled:opacity-30"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search & Zoom */}
            <div className="flex items-center gap-1">
              <div className="relative">
                <Search className="w-3 h-3 text-neutral-400 absolute left-2 top-2" />
                <input
                  type="text"
                  placeholder="원문 검색..."
                  value={searchDocQuery}
                  onChange={e => setSearchDocQuery(e.target.value)}
                  className="w-24 focus:w-36 transition-all pl-6 pr-2 py-1 bg-white rounded border border-neutral-300 text-[11px] focus:outline-none focus:border-[#E60012]"
                />
              </div>
              <button
                onClick={() => setZoomLevel(prev => Math.max(70, prev - 10))}
                className="p-1 rounded hover:bg-neutral-200 text-neutral-600"
                title="축소"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-semibold text-neutral-500">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(150, prev + 10))}
                className="p-1 rounded hover:bg-neutral-200 text-neutral-600"
                title="확대"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Document Content Rendering */}
          <div className="flex-1 overflow-y-auto p-6 bg-neutral-100/60 font-sans">
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className="bg-white rounded-lg shadow-sm border border-neutral-300 p-8 min-h-[700px] text-xs text-[#111111] space-y-4 leading-relaxed transition-transform"
            >
              {/* Header metadata */}
              <div className="pb-3 border-b border-neutral-200 flex items-center justify-between text-neutral-400 text-[11px]">
                <span>KPC AI 플랫폼 구축 RFP</span>
                <span>Page {currentPage} of 86</span>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-black text-neutral-900">
                  {activePageData.chapter}
                </h3>
                <h4 className="text-xs font-bold text-neutral-700">
                  {activePageData.subTitle}
                </h4>

                {activePageData.contentLines?.map((line, idx) => {
                  const isHighlighted = highlightedSnippet && (line.text?.includes(highlightedSnippet) || highlightedSnippet.includes(line.text || ''));

                  if (line.type === 'heading') {
                    return (
                      <div key={idx} className="font-bold text-neutral-900 pt-2 border-t border-neutral-100">
                        {line.text}
                      </div>
                    );
                  }
                  if (line.type === 'table' && line.tableData) {
                    return (
                      <div key={idx} className="border border-neutral-300 rounded overflow-hidden my-2">
                        <table className="w-full text-[11px] text-left">
                          <thead className="bg-neutral-100 border-b border-neutral-300 font-bold text-neutral-700">
                            <tr>
                              {line.tableData.headers.map((h, hi) => (
                                <th key={hi} className="p-2 border-r last:border-r-0 border-neutral-300">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200">
                            {line.tableData.rows.map((row, ri) => (
                              <tr key={ri} className="hover:bg-neutral-50">
                                {row.map((cell, ci) => (
                                  <td key={ci} className="p-2 border-r last:border-r-0 border-neutral-200">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }
                  if (line.type === 'bullet') {
                    return (
                      <div key={idx} className={`flex items-start gap-1.5 pl-2 ${isHighlighted ? 'bg-amber-100 text-neutral-900 p-1.5 rounded border border-amber-300 font-medium' : 'text-neutral-700'}`}>
                        <span className="text-neutral-400">•</span>
                        <span>{line.text}</span>
                      </div>
                    );
                  }
                  return (
                    <p
                      key={idx}
                      className={`text-neutral-800 ${
                        isHighlighted
                          ? 'bg-amber-100 text-neutral-900 p-2 rounded border border-amber-300 font-semibold shadow-2xs'
                          : ''
                      }`}
                    >
                      {line.text}
                    </p>
                  );
                })}

                {/* Highlighted Quote Callout if navigated from card */}
                {highlightedSnippet && (
                  <div className="mt-6 p-3.5 rounded-lg bg-red-50/80 border border-[#E60012]/30 text-xs">
                    <div className="flex items-center gap-1.5 text-[#E60012] font-bold mb-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>AI 분석 연계 발췌문 (항목 {highlightedSectionId}번 연동)</span>
                    </div>
                    <p className="text-neutral-800 font-medium italic">
                      &quot;{highlightedSnippet}&quot;
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (55%): 11 AI Analysis Accordion Cards */}
        <div className="w-[55%] flex flex-col h-full overflow-y-auto bg-[#F8F9FA] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-[#111111]">
                AI 분석 리포트 (총 11개 항목)
              </h2>
            </div>
            <button
              onClick={() => {
                const allExpanded = Object.values(expandedSections).every(Boolean);
                const nextState: Record<number, boolean> = {};
                sections.forEach(s => {
                  nextState[s.id] = !allExpanded;
                });
                setExpandedSections(nextState);
              }}
              className="text-xs font-bold text-neutral-600 hover:text-[#E60012] transition-colors"
            >
              {Object.values(expandedSections).every(Boolean) ? '모두 접기' : '모두 펼치기'}
            </button>
          </div>

          {/* List of 11 Cards */}
          <div className="space-y-3.5">
            {sections.map(sec => {
              const isExpanded = !!expandedSections[sec.id];
              const isEditing = editingSectionId === sec.id;
              const isWinTheme = sec.isWinTheme;

              return (
                <div
                  key={sec.id}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden shadow-2xs ${
                    isWinTheme
                      ? 'border-[#E60012]/40 bg-white ring-1 ring-[#E60012]/10'
                      : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  {/* Card Header */}
                  <div
                    onClick={() => toggleAccordion(sec.id)}
                    className={`px-4 py-3.5 cursor-pointer flex items-center justify-between select-none ${
                      isWinTheme ? 'bg-red-50/40' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black ${
                        isWinTheme
                          ? 'bg-[#E60012] text-white'
                          : 'bg-neutral-100 text-neutral-700'
                      }`}>
                        {sec.id}
                      </div>
                      <h3 className={`text-xs font-bold ${
                        isWinTheme ? 'text-[#E60012] font-black' : 'text-[#111111]'
                      }`}>
                        {sec.title}
                      </h3>
                      {isWinTheme && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#E60012] text-white">
                          핵심 설득 전략
                        </span>
                      )}
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => handleJumpToRfpLocation(sec.rfpPage, sec.rfpQuote, sec.id, e)}
                        className="px-2 py-1 rounded bg-neutral-100 hover:bg-[#E60012] text-neutral-700 hover:text-white text-[11px] font-bold transition-colors flex items-center gap-1 shadow-2xs"
                        title="좌측 원문 뷰어로 이동"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>원문 위치 (p.{sec.rfpPage})</span>
                      </button>

                      <button
                        onClick={e => isEditing ? handleSaveEdit(sec.id, e) : handleStartEdit(sec, e)}
                        className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500 hover:text-[#111111] transition-colors"
                        title={isEditing ? '저장' : '수정'}
                      >
                        {isEditing ? <Save className="w-3.5 h-3.5 text-[#E60012]" /> : <Edit3 className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={e => handleCopyText(sec.content, e)}
                        className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500 hover:text-[#111111] transition-colors"
                        title="복사"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => toggleAccordion(sec.id)}
                        className="p-1 rounded text-neutral-400 hover:text-neutral-700"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Card Body */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-neutral-100 text-xs text-neutral-700 space-y-3">
                      {/* Content (or Editing Textarea) */}
                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingText}
                            onChange={e => setEditingText(e.target.value)}
                            rows={5}
                            className="w-full p-3 rounded-lg border border-neutral-300 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#E60012] leading-relaxed"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingSectionId(null)}
                              className="px-3 py-1 rounded text-neutral-500 hover:bg-neutral-100 text-xs font-bold"
                            >
                              취소
                            </button>
                            <button
                              onClick={e => handleSaveEdit(sec.id, e)}
                              className="px-3 py-1 rounded bg-[#E60012] text-white text-xs font-bold hover:bg-[#CC0010]"
                            >
                              저장
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="whitespace-pre-line leading-relaxed font-medium text-neutral-800 bg-neutral-50/60 p-3 rounded-lg border border-neutral-200/60">
                          {sec.content}
                        </div>
                      )}

                      {/* Source Citation Quote */}
                      <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
                        <span className="truncate max-w-md">
                          <strong>근거 발췌:</strong> &quot;{sec.rfpQuote}&quot;
                        </span>
                        <span className="font-semibold text-neutral-600 shrink-0">
                          RFP p.{sec.rfpPage}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiAnalysisView;
